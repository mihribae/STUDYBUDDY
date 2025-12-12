import { getTranslation, getCurrentLanguage } from "./i18n.js";

const calendarGrid = document.getElementById("calendar-grid");
const calendarMonthYear = document.getElementById("calendar-month-year");
const calendarPrevBtn = document.getElementById("calendar-prev");
const calendarNextBtn = document.getElementById("calendar-next");
const eventFormGeneral = document.getElementById("event-form-general");
const eventLessonSelect = eventFormGeneral?.querySelector('select[name="lessonId"]');

let config = {
  apiBase: "",
  tokenProvider: () => null,
  showToast: () => {}
};

let currentDate = new Date();
let events = [];
let lessons = [];

function authHeader() {
  const token = config.tokenProvider();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, endpoint, payload) {
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

function getMonthStartEnd(year, month) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  const startDate = new Date(start);
  startDate.setDate(startDate.getDate() - startDate.getDay());
  const endDate = new Date(end);
  endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

  return {
    start: startDate.toISOString().split("T")[0],
    end: endDate.toISOString().split("T")[0]
  };
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const localeMap = {
    en: "en-US",
    tr: "tr-TR",
    cs: "cs-CZ"
  };
  const locale = localeMap[getCurrentLanguage()] ?? "en-US";

  const monthYearFormatter = new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric"
  });

  calendarMonthYear.textContent = monthYearFormatter.format(currentDate);

  const { start, end } = getMonthStartEnd(year, month);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayNamesTr = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  const dayNamesCs = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

  const lang = getCurrentLanguage();
  const names = lang === "tr" ? dayNamesTr : lang === "cs" ? dayNamesCs : dayNames;

  calendarGrid.innerHTML = "";

  names.forEach((name) => {
    const header = document.createElement("div");
    header.className = "calendar-day-header";
    header.textContent = name;
    calendarGrid.appendChild(header);
  });

  const startDate = new Date(start);
  const endDate = new Date(end);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const day = new Date(d);
    const dayStr = day.toISOString().split("T")[0];
    const isCurrentMonth = day.getMonth() === month;
    const isToday = day.getTime() === today.getTime();

    const dayCell = document.createElement("div");
    dayCell.className = `calendar-day ${!isCurrentMonth ? "other-month" : ""} ${isToday ? "today" : ""}`;
    dayCell.dataset.date = dayStr;

    const dayNumber = document.createElement("div");
    dayNumber.className = "calendar-day-number";
    dayNumber.textContent = day.getDate();
    dayCell.appendChild(dayNumber);

    const eventsContainer = document.createElement("div");
    eventsContainer.className = "calendar-day-events";

    const dayEvents = events.filter((e) => e.eventDate === dayStr);
    dayEvents.forEach((event) => {
      const eventDot = document.createElement("div");
      eventDot.className = "calendar-event-dot";
      // Use lesson color if available, otherwise use event color
      const displayColor = event.lessonColor || event.color || "#4A90E2";
      eventDot.style.backgroundColor = displayColor;
      eventDot.title = event.title;
      eventDot.textContent = event.title;
      eventsContainer.appendChild(eventDot);
    });

    dayCell.appendChild(eventsContainer);
    calendarGrid.appendChild(dayCell);
  }
}

function renderLessonSelect() {
  if (!eventLessonSelect) return;

  eventLessonSelect.innerHTML = '<option value="">None</option>';
  lessons.forEach((lesson) => {
    const option = document.createElement("option");
    option.value = lesson.id;
    option.textContent = lesson.name;
    eventLessonSelect.appendChild(option);
  });
}

async function fetchEvents() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const { start, end } = getMonthStartEnd(year, month);

  const data = await request("GET", `/events?startDate=${start}&endDate=${end}`);
  events = data.events ?? [];
  renderCalendar();
}

async function handleCreateEvent(event) {
  event.preventDefault();
  const formData = new FormData(eventFormGeneral);
  const payload = {
    title: formData.get("title").trim(),
    eventDate: formData.get("eventDate"),
    lessonId: formData.get("lessonId") || null,
    color: formData.get("color")
  };

  if (!payload.title || !payload.eventDate) {
    config.showToast(getTranslation("notifications.error"), "error");
    return;
  }

  try {
    await request("POST", "/events", payload);
    config.showToast(getTranslation("notifications.eventSaved"), "success");
    eventFormGeneral.reset();
    await fetchEvents();
    // Dispatch event for dashboard to refresh
    document.dispatchEvent(new CustomEvent("events:updated"));
  } catch (error) {
    config.showToast(error.message, "error");
  }
}

function handlePrevMonth() {
  currentDate.setMonth(currentDate.getMonth() - 1);
  fetchEvents();
}

function handleNextMonth() {
  currentDate.setMonth(currentDate.getMonth() + 1);
  fetchEvents();
}

export function initCalendar(options) {
  config = { ...config, ...options };

  calendarPrevBtn?.addEventListener("click", handlePrevMonth);
  calendarNextBtn?.addEventListener("click", handleNextMonth);
  eventFormGeneral?.addEventListener("submit", handleCreateEvent);

  document.addEventListener("lessons:updated", (event) => {
    lessons = event.detail || [];
    renderLessonSelect();
  });

  document.addEventListener("language:changed", () => {
    renderCalendar();
    renderLessonSelect();
  });

  return fetchEvents();
}

export function syncLessonsForCalendar(updatedLessons = []) {
  lessons = updatedLessons || [];
  renderLessonSelect();
}

