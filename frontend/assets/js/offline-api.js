const OFFLINE_MODE = window.__STUDYBUDDY_OFFLINE_MODE__ ?? (window.__STUDYBUDDY_BYPASS_AUTH__ ?? true);

const STORE_KEYS = {
  lessons: "studybuddy:offline:lessons",
  exams: "studybuddy:offline:exams",
  tasks: "studybuddy:offline:tasks",
  events: "studybuddy:offline:events",
  ids: "studybuddy:offline:ids"
};

const DEFAULT_IDS = {
  lessons: 1,
  exams: 1,
  tasks: 1,
  events: 1
};

function readArray(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
}

function writeArray(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function readIds() {
  try {
    return { ...DEFAULT_IDS, ...(JSON.parse(localStorage.getItem(STORE_KEYS.ids) || "{}")) };
  } catch {
    return { ...DEFAULT_IDS };
  }
}

function nextId(type) {
  const ids = readIds();
  const id = ids[type] || 1;
  ids[type] = id + 1;
  localStorage.setItem(STORE_KEYS.ids, JSON.stringify(ids));
  return id;
}

function todayIso() {
  return new Date().toISOString();
}

function toDateOnly(value) {
  if (!value) return "";
  return String(value).split("T")[0];
}

function withLessonMeta(event) {
  const lessons = readArray(STORE_KEYS.lessons);
  const lesson = lessons.find((item) => item.id === event.lessonId);
  return {
    ...event,
    lessonName: lesson?.name || null,
    lessonColor: lesson?.color || null
  };
}

function handleLessons(method, endpoint, payload) {
  let lessons = readArray(STORE_KEYS.lessons);

  if (method === "GET" && endpoint === "/lessons") {
    return { lessons };
  }

  if (method === "POST" && endpoint === "/lessons") {
    const lesson = {
      id: nextId("lessons"),
      name: payload?.name || "Untitled Lesson",
      color: payload?.color || "#4A90E2",
      createdAt: todayIso()
    };
    lessons.push(lesson);
    writeArray(STORE_KEYS.lessons, lessons);
    return { lesson };
  }

  const deleteLessonMatch = endpoint.match(/^\/lessons\/(\d+)$/);
  if (method === "DELETE" && deleteLessonMatch) {
    const lessonId = Number(deleteLessonMatch[1]);
    lessons = lessons.filter((item) => item.id !== lessonId);
    writeArray(STORE_KEYS.lessons, lessons);

    const exams = readArray(STORE_KEYS.exams).filter((item) => item.lessonId !== lessonId);
    writeArray(STORE_KEYS.exams, exams);
    return { success: true };
  }

  return null;
}

function handleExams(method, endpoint, payload) {
  let exams = readArray(STORE_KEYS.exams);

  if (method === "GET" && endpoint === "/lessons/events") {
    return { events: exams.map(withLessonMeta) };
  }

  if (method === "POST" && endpoint === "/lessons/events") {
    const exam = {
      id: nextId("exams"),
      lessonId: Number(payload?.lessonId),
      eventDate: payload?.eventDate || todayIso(),
      createdAt: todayIso()
    };
    exams.push(exam);
    writeArray(STORE_KEYS.exams, exams);
    return { event: withLessonMeta(exam) };
  }

  const deleteExamMatch = endpoint.match(/^\/lessons\/events\/(\d+)$/);
  if (method === "DELETE" && deleteExamMatch) {
    const examId = Number(deleteExamMatch[1]);
    exams = exams.filter((item) => item.id !== examId);
    writeArray(STORE_KEYS.exams, exams);
    return { success: true };
  }

  return null;
}

function handleTasks(method, endpoint, payload) {
  let tasks = readArray(STORE_KEYS.tasks);

  if (method === "GET" && endpoint === "/tasks") {
    return { tasks };
  }

  if (method === "POST" && endpoint === "/tasks") {
    const task = {
      id: nextId("tasks"),
      title: payload?.title || "",
      dueDate: payload?.dueDate || null,
      due_date: payload?.dueDate || null,
      completed: false,
      createdAt: todayIso()
    };
    tasks.push(task);
    writeArray(STORE_KEYS.tasks, tasks);
    return { task };
  }

  const patchTaskMatch = endpoint.match(/^\/tasks\/(\d+)$/);
  if (method === "PATCH" && patchTaskMatch) {
    const taskId = Number(patchTaskMatch[1]);
    tasks = tasks.map((item) =>
      item.id === taskId ? { ...item, completed: Boolean(payload?.completed) } : item
    );
    writeArray(STORE_KEYS.tasks, tasks);
    return { success: true };
  }

  const deleteTaskMatch = endpoint.match(/^\/tasks\/(\d+)$/);
  if (method === "DELETE" && deleteTaskMatch) {
    const taskId = Number(deleteTaskMatch[1]);
    tasks = tasks.filter((item) => item.id !== taskId);
    writeArray(STORE_KEYS.tasks, tasks);
    return { success: true };
  }

  return null;
}

function handleEvents(method, endpoint, payload) {
  let events = readArray(STORE_KEYS.events);

  if (method === "GET" && endpoint.startsWith("/events")) {
    const queryIndex = endpoint.indexOf("?");
    if (queryIndex === -1) {
      return { events: events.map(withLessonMeta) };
    }

    const params = new URLSearchParams(endpoint.slice(queryIndex + 1));
    const startDate = params.get("startDate");
    const endDate = params.get("endDate");
    const filtered = events.filter((event) => {
      const eventDay = toDateOnly(event.eventDate);
      if (startDate && eventDay < startDate) return false;
      if (endDate && eventDay > endDate) return false;
      return true;
    });

    return { events: filtered.map(withLessonMeta) };
  }

  if (method === "POST" && endpoint === "/events") {
    const event = {
      id: nextId("events"),
      title: payload?.title || "",
      eventDate: payload?.eventDate || todayIso(),
      lessonId: payload?.lessonId ?? null,
      color: "#4A90E2",
      createdAt: todayIso()
    };
    events.push(event);
    writeArray(STORE_KEYS.events, events);
    return { event: withLessonMeta(event) };
  }

  const deleteEventMatch = endpoint.match(/^\/events\/(\d+)$/);
  if (method === "DELETE" && deleteEventMatch) {
    const eventId = Number(deleteEventMatch[1]);
    events = events.filter((item) => item.id !== eventId);
    writeArray(STORE_KEYS.events, events);
    return { success: true };
  }

  return null;
}

export function isOfflineMode() {
  return OFFLINE_MODE;
}

export async function offlineRequest(method, endpoint, payload) {
  const normalizedMethod = String(method || "GET").toUpperCase();
  const normalizedEndpoint = endpoint || "";

  const handlers = [handleLessons, handleExams, handleTasks, handleEvents];
  for (const handler of handlers) {
    const result = handler(normalizedMethod, normalizedEndpoint, payload);
    if (result !== null) {
      return result;
    }
  }

  throw new Error(`Offline mode: unsupported endpoint ${normalizedMethod} ${normalizedEndpoint}`);
}
