import { getTranslation, getCurrentLanguage } from "./i18n.js";
import { isOfflineMode, offlineRequest } from "./offline-api.js";

const dashboardCalendarGrid = document.getElementById("dashboard-calendar-grid");
const dashboardCalendarMonthYear = document.getElementById("dashboard-calendar-month-year");
const dashboardCalendarPrevBtn = document.getElementById("dashboard-calendar-prev");
const dashboardCalendarNextBtn = document.getElementById("dashboard-calendar-next");
const remindersList = document.getElementById("reminders-list");
const dashboardTasksList = document.getElementById("dashboard-tasks-list");
// Removed dashboard forms - adding is done from calendar and tasks pages

let config = {
  apiBase: "",
  tokenProvider: () => null,
  showToast: () => {}
};

let currentDate = new Date();
let events = []; // General events (reminders)
let lessonEvents = []; // Exam events
let tasks = [];
let lessons = [];
let dashboardInitialized = false;

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

  dashboardCalendarMonthYear.textContent = monthYearFormatter.format(currentDate);

  const { start, end } = getMonthStartEnd(year, month);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayNamesTr = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  const dayNamesCs = ["Ne", "Po", "Út", "St", "Čt", "Pá", "So"];

  const lang = getCurrentLanguage();
  const names = lang === "tr" ? dayNamesTr : lang === "cs" ? dayNamesCs : dayNames;

  dashboardCalendarGrid.innerHTML = "";

  names.forEach((name) => {
    const header = document.createElement("div");
    header.className = "calendar-day-header";
    header.textContent = name;
    dashboardCalendarGrid.appendChild(header);
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

    // Get all items for this day
    // Normalize dates to YYYY-MM-DD format for comparison
    const dayEvents = events.filter((e) => {
      if (!e.eventDate) return false;
      const eventDateStr = e.eventDate.split("T")[0]; // Extract date part if ISO string
      return eventDateStr === dayStr;
    });
    const dayExams = lessonEvents.filter((e) => {
      if (!e.eventDate) return false;
      const examDateStr = e.eventDate.split("T")[0]; // Extract date part if ISO string
      return examDateStr === dayStr;
    });
    const dayTasks = tasks.filter((t) => {
      if (t.completed) return false;
      // Show tasks on their due date, or today if no due date
      if (t.due_date) {
        const taskDateStr = t.due_date.split("T")[0]; // Extract date part if ISO string
        return taskDateStr === dayStr;
      }
      // If no due date, show on today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return day.getTime() === today.getTime();
    });

    // Helper function to convert hex to rgba
    function hexToRgba(hex, alpha = 0.1) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Show exams (lesson events) - Google Calendar style
    dayExams.forEach((exam) => {
      const examItem = document.createElement("div");
      examItem.className = "calendar-event-item calendar-exam-item";
      const displayColor = exam.lessonColor || "#4A90E2";
      examItem.style.borderLeftColor = displayColor;
      examItem.style.backgroundColor = hexToRgba(displayColor, 0.15);
      
      const examText = document.createElement("span");
      examText.className = "calendar-event-text";
      examText.textContent = `${getTranslation("lessons.exam")}: ${exam.lessonName}`;
      examItem.appendChild(examText);
      
      examItem.addEventListener("click", (e) => {
        e.stopPropagation();
        showExamDetails(exam, dayCell);
      });
      eventsContainer.appendChild(examItem);
    });

    // Show general events (reminders) - Google Calendar style
    dayEvents.forEach((event) => {
      const eventItem = document.createElement("div");
      eventItem.className = "calendar-event-item calendar-reminder-item";
      const displayColor = event.lessonColor || event.color || "#4A90E2";
      eventItem.style.borderLeftColor = displayColor;
      eventItem.style.backgroundColor = hexToRgba(displayColor, 0.15);
      
      const eventText = document.createElement("span");
      eventText.className = "calendar-event-text";
      eventText.textContent = event.title;
      eventItem.appendChild(eventText);
      
      eventItem.addEventListener("click", (e) => {
        e.stopPropagation();
        showEventDetails(event, dayCell);
      });
      eventsContainer.appendChild(eventItem);
    });

    // Show tasks on their due date - Google Calendar style
    dayTasks.forEach((task) => {
      const taskItem = document.createElement("div");
      taskItem.className = "calendar-event-item calendar-task-item";
      const taskColor = "#7ac7a5";
      taskItem.style.borderLeftColor = taskColor;
      taskItem.style.backgroundColor = hexToRgba(taskColor, 0.15);
      
      const taskText = document.createElement("span");
      taskText.className = "calendar-event-text";
      taskText.textContent = `✓ ${task.title}`;
      taskItem.appendChild(taskText);
      
      taskItem.addEventListener("click", (e) => {
        e.stopPropagation();
        // Could show task details here if needed
      });
      eventsContainer.appendChild(taskItem);
    });

    dayCell.addEventListener("click", () => {
      if (dayEvents.length > 0) {
        showEventDetails(dayEvents[0], dayCell);
      } else if (dayExams.length > 0) {
        showExamDetails(dayExams[0], dayCell);
      }
    });

    dayCell.appendChild(eventsContainer);
    dashboardCalendarGrid.appendChild(dayCell);
  }
}

function showEventDetails(event, dayCell) {
  // Remove existing popup
  const existingPopup = document.querySelector(".event-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement("div");
  popup.className = "event-popup";
  
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
    weekday: "long"
  });

  const lessonName = event.lessonName ? ` (${event.lessonName})` : "";

  popup.innerHTML = `
    <div class="event-popup-content">
      <h4>${event.title}${lessonName}</h4>
      <p>${dateFormatter.format(eventDate)}</p>
    </div>
  `;

  const rect = dayCell.getBoundingClientRect();
  popup.style.position = "absolute";
  popup.style.top = `${rect.bottom + 10}px`;
  popup.style.left = `${rect.left}px`;
  popup.style.zIndex = "1000";

  document.body.appendChild(popup);

  // Close popup when clicking outside
  setTimeout(() => {
    const closePopup = (e) => {
      if (!popup.contains(e.target) && !dayCell.contains(e.target)) {
        popup.remove();
        document.removeEventListener("click", closePopup);
      }
    };
    document.addEventListener("click", closePopup);
  }, 100);
}

function showExamDetails(exam, dayCell) {
  // Remove existing popup
  const existingPopup = document.querySelector(".event-popup");
  if (existingPopup) {
    existingPopup.remove();
  }

  const popup = document.createElement("div");
  popup.className = "event-popup";
  
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
    weekday: "long"
  });

  popup.innerHTML = `
    <div class="event-popup-content">
      <h4>${getTranslation("lessons.exam")}: ${exam.lessonName}</h4>
      <p>${dateFormatter.format(examDate)}</p>
    </div>
  `;

  const rect = dayCell.getBoundingClientRect();
  popup.style.position = "absolute";
  popup.style.top = `${rect.bottom + 10}px`;
  popup.style.left = `${rect.left}px`;
  popup.style.zIndex = "1000";

  document.body.appendChild(popup);

  // Close popup when clicking outside
  setTimeout(() => {
    const closePopup = (e) => {
      if (!popup.contains(e.target) && !dayCell.contains(e.target)) {
        popup.remove();
        document.removeEventListener("click", closePopup);
      }
    };
    document.addEventListener("click", closePopup);
  }, 100);
}

function renderReminders() {
  remindersList.innerHTML = "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Get only today's events
  const todayEvents = events
    .filter((event) => {
      const eventDate = new Date(event.eventDate);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === today.getTime();
    })
    .sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

  if (todayEvents.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = getTranslation("dashboard.noRemindersToday");
    remindersList.appendChild(emptyState);
    return;
  }

  todayEvents.forEach((event) => {
    const reminderItem = document.createElement("div");
    reminderItem.className = "reminder-item";

    const eventDate = new Date(event.eventDate);
    const dateLabel = getTranslation("dashboard.today");

    const lessonName = event.lessonName ? ` (${event.lessonName})` : "";

    // Use lesson color if available, otherwise use event color
    const displayColor = event.lessonColor || event.color || "#4A90E2";
    
    reminderItem.innerHTML = `
      <div class="reminder-content">
        <div class="reminder-date">${dateLabel}</div>
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

    remindersList.appendChild(reminderItem);
  });
}

function renderTasks() {
  dashboardTasksList.innerHTML = "";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Get only today's tasks
  const todayTasks = tasks
    .filter((task) => {
      if (task.completed) return false;
      if (!task.dueDate) return false;
      // Handle both date string formats (YYYY-MM-DD or ISO string)
      const dueDate = new Date(task.dueDate + (task.dueDate.includes('T') ? '' : 'T00:00:00'));
      dueDate.setHours(0, 0, 0, 0);
      return dueDate.getTime() === today.getTime();
    })
    .sort((a, b) => {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });

  if (todayTasks.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = getTranslation("dashboard.noTasksToday");
    dashboardTasksList.appendChild(emptyState);
    return;
  }

  todayTasks.forEach((task) => {
    const item = document.createElement("div");
    item.className = "task-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "task-checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => handleToggleTask(task.id, !task.completed));

    const title = document.createElement("span");
    title.className = "task-title";
    
    // Add date if available
    let titleText = task.title;
    if (task.dueDate) {
      const dueDate = new Date(task.dueDate);
      const localeMap = {
        en: "en-US",
        tr: "tr-TR",
        cs: "cs-CZ"
      };
      const locale = localeMap[getCurrentLanguage()] ?? "en-US";
      const dateFormatter = new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
      titleText = `${task.title} (${dateFormatter.format(dueDate)})`;
    }
    title.textContent = titleText;

    item.appendChild(checkbox);
    item.appendChild(title);
    dashboardTasksList.appendChild(item);
  });
}

async function handleToggleTask(taskId, completed) {
  try {
    await request("PATCH", `/tasks/${taskId}`, { completed });
    await fetchTasks();
  } catch (error) {
    config.showToast(error.message, "error");
    await fetchTasks();
  }
}

async function fetchEvents() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const { start, end } = getMonthStartEnd(year, month);

  try {
    // Fetch general events (reminders)
    const eventsData = await request("GET", `/events?startDate=${start}&endDate=${end}`);
    events = eventsData.events ?? [];
    
    // Fetch lesson events (exams)
    const examsData = await request("GET", "/lessons/events");
    lessonEvents = examsData.events ?? [];
    
    renderCalendar();
    renderReminders();
  } catch (error) {
    console.error("Failed to fetch events:", error);
  }
}

async function fetchTasks() {
  try {
    const data = await request("GET", "/tasks");
  // Convert snake_case to camelCase for due_date
    tasks = (data.tasks ?? []).map(task => ({
      ...task,
      dueDate: task.due_date || task.dueDate
    }));
    renderTasks();
  } catch (error) {
    console.error("Failed to fetch tasks:", error);
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

function renderReminderLessonSelect() {
  if (!dashboardReminderLessonSelect) return;

  dashboardReminderLessonSelect.innerHTML = '<option value="">None</option>';
  lessons.forEach((lesson) => {
    const option = document.createElement("option");
    option.value = lesson.id;
    option.textContent = lesson.name;
    dashboardReminderLessonSelect.appendChild(option);
  });
}

async function handleCreateReminder(event) {
  event.preventDefault();
  const formData = new FormData(dashboardReminderForm);
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
    dashboardReminderForm.reset();
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

async function handleCreateTask(event) {
  event.preventDefault();
  const formData = new FormData(dashboardTaskForm);
  const payload = {
    title: formData.get("title").trim(),
    dueDate: formData.get("dueDate") || null
  };

  if (!payload.title) {
    config.showToast(getTranslation("notifications.error"), "error");
    return;
  }

  try {
    await request("POST", "/tasks", payload);
    config.showToast(getTranslation("notifications.saved"), "success");
    dashboardTaskForm.reset();
    await fetchTasks();
    document.dispatchEvent(new CustomEvent("tasks:updated"));
  } catch (error) {
    config.showToast(error.message, "error");
  }
}

export function initDashboard(options) {
  config = { ...config, ...options };

  // Only add event listeners once
  if (!dashboardInitialized) {
    dashboardCalendarPrevBtn?.addEventListener("click", handlePrevMonth);
    dashboardCalendarNextBtn?.addEventListener("click", handleNextMonth);

    document.addEventListener("lessons:updated", (event) => {
      lessons = event.detail || [];
    });

    document.addEventListener("language:changed", () => {
      renderCalendar();
      renderReminders();
    });

    // Refresh dashboard when events, exams or tasks are updated
    document.addEventListener("events:updated", () => {
      fetchEvents();
    });

    document.addEventListener("exams:updated", () => {
      fetchEvents();
    });

    document.addEventListener("tasks:updated", () => {
      fetchTasks();
    });

    dashboardInitialized = true;
  }

  // Always refresh data when dashboard is shown
  return Promise.all([fetchEvents(), fetchTasks()]);
}

export function refreshDashboard() {
  return Promise.all([fetchEvents(), fetchTasks()]);
}

