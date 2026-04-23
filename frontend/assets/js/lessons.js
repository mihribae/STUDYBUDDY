import { getTranslation, getCurrentLanguage } from "./i18n.js";
import { isOfflineMode, offlineRequest } from "./offline-api.js";

let lessons = [];
let events = [];

const lessonsList = document.getElementById("lessons-list");
const lessonForm = document.getElementById("lesson-form");
const examForm = document.getElementById("exam-form");
const examLessonSelect = document.getElementById("exam-lesson-select");
const examsList = document.getElementById("exams-list");

let config = {
  apiBase: "",
  tokenProvider: () => null,
  showToast: () => {}
};

let languageWired = false;
let lessonsInitialized = false;

function broadcastLessons() {
  document.dispatchEvent(
    new CustomEvent("lessons:updated", {
      detail: lessons
    })
  );
}

function authHeader() {
  const token = config.tokenProvider();
  return token
    ? {
        Authorization: `Bearer ${token}`
      }
    : {};
}

async function request(method, endpoint, payload) {
  if (isOfflineMode()) {
    return offlineRequest(method, endpoint, payload);
  }

  const response = await fetch(`${config.apiBase}${endpoint}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...authHeader()
    },
    body: payload ? JSON.stringify(payload) : undefined
  });

  if (!response.ok) {
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      localStorage.removeItem("studybuddy:token");
      window.location.href = "login.html";
      throw new Error("Invalid or expired token.");
    }
    
    const errorPayload = await response.json().catch(() => ({}));
    const message = errorPayload?.message ?? "Request failed.";
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function renderLessons() {
  lessonsList.innerHTML = "";
  if (!lessons.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = getTranslation("lessons.empty");
    lessonsList.appendChild(emptyState);
    return;
  }

  lessons.forEach((lesson) => {
    const card = document.createElement("article");
    card.className = "lesson-card";
    card.style.setProperty("--lesson-color", lesson.color || "#4A90E2");

    const content = document.createElement("div");
    content.className = "lesson-card-content";

    const title = document.createElement("h4");
    title.textContent = lesson.name;

    const meta = document.createElement("small");
    meta.textContent = `${getTranslation("lessons.meta.color")}: ${lesson.color}`;

    const actions = document.createElement("div");
    actions.className = "lesson-actions";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "ghost-btn";
    deleteBtn.textContent = getTranslation("lessons.actions.delete");
    deleteBtn.addEventListener("click", () => handleDeleteLesson(lesson.id));

    actions.appendChild(deleteBtn);

    content.appendChild(title);
    content.appendChild(meta);
    card.appendChild(content);
    card.appendChild(actions);
    lessonsList.appendChild(card);
  });
}

function renderExamLessonSelect() {
  if (!examLessonSelect) return;
  examLessonSelect.innerHTML = "";

  lessons.forEach((lesson) => {
    const option = document.createElement("option");
    option.value = lesson.id;
    option.textContent = lesson.name;
    examLessonSelect.appendChild(option);
  });
}

async function fetchLessons() {
  const data = await request("GET", "/lessons");
  lessons = data.lessons ?? [];
  renderLessons();
  renderExamLessonSelect();
  broadcastLessons();
}

async function fetchExams() {
  try {
    const data = await request("GET", "/lessons/events");
    events = data.events ?? [];
    renderExams();
  } catch (error) {
    console.error("Failed to fetch exams", error);
  }
}

function renderExams() {
  if (!examsList) return;
  
  examsList.innerHTML = "";

  if (events.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = getTranslation("lessons.noExams");
    examsList.appendChild(emptyState);
    return;
  }

  // Sort by date
  const sortedExams = [...events].sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

  sortedExams.forEach((exam) => {
    const examItem = document.createElement("div");
    examItem.className = "exam-item";

    const examDate = new Date(exam.eventDate);
    const localeMap = {
      en: "en-US",
      tr: "tr-TR",
      cs: "cs-CZ"
    };
    const locale = localeMap[getCurrentLanguage()] ?? "en-US";
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      weekday: "long"
    });

    const lesson = lessons.find(l => l.id === exam.lessonId);
    const lessonName = lesson ? lesson.name : "";
    const lessonColor = lesson ? lesson.color : "#4A90E2";
    
    examItem.innerHTML = `
      <div class="exam-content">
        <div class="exam-date">${dateFormatter.format(examDate)}</div>
        <div class="exam-title" style="color: ${lessonColor}">${getTranslation("lessons.exam")}: ${lessonName}</div>
      </div>
      <div class="exam-actions">
        <button class="exam-delete-btn" data-exam-id="${exam.id}" title="${getTranslation("lessons.deleteExam")}">×</button>
      </div>
      <div class="exam-color" style="background-color: ${lessonColor}"></div>
    `;

    // Add delete button event listener
    const deleteBtn = examItem.querySelector(".exam-delete-btn");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleDeleteExam(exam.id);
    });

    examsList.appendChild(examItem);
  });
}

async function handleDeleteExam(examId) {
  if (!confirm(getTranslation("lessons.confirmDeleteExam"))) return;
  
  try {
    await request("DELETE", `/lessons/events/${examId}`);
    config.showToast(getTranslation("notifications.removed"), "success");
    await fetchExams();
    document.dispatchEvent(new CustomEvent("exams:updated"));
  } catch (error) {
    config.showToast(error.message, "error");
  }
}

async function handleCreateLesson(event) {
  event.preventDefault();
  const formData = new FormData(lessonForm);
  const payload = {
    name: formData.get("name"),
    color: formData.get("color")
  };
  try {
    await request("POST", "/lessons", payload);
    config.showToast(getTranslation("notifications.lessonSaved"), "success");
    lessonForm.reset();
    await fetchLessons();
  } catch (error) {
    config.showToast(error.message, "error");
  }
}

async function handleDeleteLesson(lessonId) {
  if (!confirm(getTranslation("lessons.confirm.delete"))) return;
  try {
    await request("DELETE", `/lessons/${lessonId}`);
    lessons = lessons.filter((lesson) => lesson.id !== lessonId);
    renderLessons();
    renderExamLessonSelect();
    broadcastLessons();
    config.showToast(getTranslation("notifications.lessonRemoved"), "info");
  } catch (error) {
    config.showToast(error.message, "error");
  }
}

async function handleCreateExam(event) {
  event.preventDefault();
  const formData = new FormData(examForm);
  const payload = {
    lessonId: parseInt(formData.get("lessonId")),
    eventDate: formData.get("eventDate")
  };
  try {
    await request("POST", "/lessons/events", payload);
    config.showToast(getTranslation("notifications.examSaved"), "success");
    examForm.reset();
    await fetchExams();
    // Dispatch event to refresh dashboard calendar
    document.dispatchEvent(new CustomEvent("exams:updated"));
  } catch (error) {
    config.showToast(error.message, "error");
  }
}

export async function initLessons(options) {
  config = { ...config, ...options };

  // Only add event listeners once
  if (!lessonsInitialized) {
    lessonForm?.addEventListener("submit", handleCreateLesson);
    examForm?.addEventListener("submit", handleCreateExam);

    if (!languageWired) {
      document.addEventListener("language:changed", () => {
        renderLessons();
        renderExamLessonSelect();
        renderExams();
      });
      languageWired = true;
    }

    // Listen for exam updates
    document.addEventListener("exams:updated", () => {
      fetchExams();
    });

    lessonsInitialized = true;
  }

  await fetchLessons();
  await fetchExams();
  
  return lessons;
}

export async function refreshLessons() {
  await fetchLessons();
  return lessons;
}

export function getLessons() {
  return lessons;
}

export function getLessonOptionsForTimer() {
  return lessons.map((lesson) => ({
    id: lesson.id,
    name: lesson.name,
    color: lesson.color
  }));
}


