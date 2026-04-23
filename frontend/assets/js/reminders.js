import { getTranslation, getCurrentLanguage } from "./i18n.js";
import { isOfflineMode, offlineRequest } from "./offline-api.js";

const reminderForm = document.getElementById("reminder-form");
const remindersListPage = document.getElementById("reminders-list-page");
const reminderLessonSelect = reminderForm?.querySelector('select[name="lessonId"]');

let config = {
  apiBase: "",
  tokenProvider: () => null,
  showToast: () => {}
};

let events = [];
let lessons = [];
let remindersInitialized = false;

function authHeader() {
  const token = config.tokenProvider();
  return token ? { Authorization: `Bearer ${token}` } : {};
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

async function fetchEvents() {
  try {
    const data = await request("GET", "/events");
    events = data.events ?? [];
    renderReminders();
  } catch (error) {
    console.error("Failed to fetch events", error);
    config.showToast(error.message, "error");
  }
}

function renderReminders() {
  if (!remindersListPage) return;
  
  remindersListPage.innerHTML = "";

  if (events.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = getTranslation("reminders.empty");
    remindersListPage.appendChild(emptyState);
    return;
  }

  // Sort by date
  const sortedEvents = [...events].sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

  sortedEvents.forEach((event) => {
    const reminderItem = document.createElement("div");
    reminderItem.className = "reminder-item";

    const eventDate = new Date(event.eventDate);
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

    const lessonName = event.lessonName ? ` (${event.lessonName})` : "";
    const displayColor = event.lessonColor || event.color || "#4A90E2";
    
    reminderItem.innerHTML = `
      <div class="reminder-content">
        <div class="reminder-date">${dateFormatter.format(eventDate)}</div>
        <div class="reminder-title">${event.title}${lessonName}</div>
      </div>
      <div class="reminder-actions">
        <button class="reminder-delete-btn" data-event-id="${event.id}" title="${getTranslation("dashboard.deleteReminder")}">×</button>
      </div>
      <div class="reminder-color" style="background-color: ${displayColor}"></div>
    `;

    // Add delete button event listener
    const deleteBtn = reminderItem.querySelector(".reminder-delete-btn");
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      handleDeleteReminder(event.id);
    });

    remindersListPage.appendChild(reminderItem);
  });
}

function renderReminderLessonSelect() {
  if (!reminderLessonSelect) return;

  reminderLessonSelect.innerHTML = '<option value="">None</option>';
  lessons.forEach((lesson) => {
    const option = document.createElement("option");
    option.value = lesson.id;
    option.textContent = lesson.name;
    reminderLessonSelect.appendChild(option);
  });
}

async function handleCreateReminder(event) {
  event.preventDefault();
  const formData = new FormData(reminderForm);
  const lessonIdValue = formData.get("lessonId");
  const payload = {
    title: formData.get("title").trim(),
    eventDate: formData.get("eventDate"),
    lessonId: lessonIdValue && lessonIdValue !== "" ? parseInt(lessonIdValue, 10) : null
  };

  if (!payload.title || !payload.eventDate) {
    config.showToast(getTranslation("notifications.error"), "error");
    return;
  }

  try {
    await request("POST", "/events", payload);
    config.showToast(getTranslation("notifications.eventSaved"), "success");
    reminderForm.reset();
    await fetchEvents();
    document.dispatchEvent(new CustomEvent("events:updated"));
  } catch (error) {
    config.showToast(error.message, "error");
  }
}

async function handleDeleteReminder(eventId) {
  if (!confirm(getTranslation("dashboard.confirmDeleteReminder"))) return;
  
  try {
    await request("DELETE", `/events/${eventId}`);
    config.showToast(getTranslation("notifications.removed"), "success");
    await fetchEvents();
    document.dispatchEvent(new CustomEvent("events:updated"));
  } catch (error) {
    config.showToast(error.message, "error");
  }
}

export function initReminders(options) {
  config = { ...config, ...options };

  // Only add event listeners once
  if (!remindersInitialized) {
    reminderForm?.addEventListener("submit", handleCreateReminder);

    document.addEventListener("lessons:updated", (event) => {
      lessons = event.detail || [];
      renderReminderLessonSelect();
    });

    document.addEventListener("events:updated", () => {
      fetchEvents();
    });

    document.addEventListener("language:changed", () => {
      renderReminders();
    });

    remindersInitialized = true;
  }

  renderReminderLessonSelect();
  return fetchEvents();
}

export function refreshReminders() {
  return fetchEvents();
}

