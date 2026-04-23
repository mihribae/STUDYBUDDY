import { getTranslation, getCurrentLanguage } from "./i18n.js";
import { isOfflineMode, offlineRequest } from "./offline-api.js";

const taskForm = document.getElementById("task-form");
const tasksList = document.getElementById("tasks-list");

let config = {
  apiBase: "",
  tokenProvider: () => null,
  showToast: () => {}
};

let tasks = [];
let tasksInitialized = false;

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

function renderTasks() {
  if (!tasksList) return;
  
  tasksList.innerHTML = "";

  if (!tasks.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = getTranslation("tasks.empty");
    tasksList.appendChild(emptyState);
    return;
  }

  tasks.forEach((task) => {
    const item = document.createElement("div");
    item.className = `task-item ${task.completed ? "completed" : ""}`;

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

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "ghost-btn";
    deleteBtn.textContent = getTranslation("tasks.delete");
    deleteBtn.addEventListener("click", () => handleDeleteTask(task.id));

    actions.appendChild(deleteBtn);
    item.appendChild(checkbox);
    item.appendChild(title);
    item.appendChild(actions);
    tasksList.appendChild(item);
  });
}

async function fetchTasks() {
  const data = await request("GET", "/tasks");
// Convert snake_case to camelCase for due_date
  tasks = (data.tasks ?? []).map(task => ({
    ...task,
    dueDate: task.due_date || task.dueDate
  }));
  renderTasks();
}

async function handleCreateTask(event) {
  event.preventDefault();
  if (!taskForm) return;
  
  const formData = new FormData(taskForm);
  const payload = {
    title: formData.get("title")?.trim() || "",
    dueDate: formData.get("dueDate") || null
  };

  if (!payload.title) {
    config.showToast(getTranslation("notifications.error"), "error");
    return;
  }

  try {
    await request("POST", "/tasks", payload);
    config.showToast(getTranslation("notifications.saved"), "success");
    taskForm.reset();
    await fetchTasks();
    // Dispatch event for dashboard to refresh
    document.dispatchEvent(new CustomEvent("tasks:updated"));
  } catch (error) {
    config.showToast(error.message, "error");
  }
}

async function handleToggleTask(taskId, completed) {
  try {
    await request("PATCH", `/tasks/${taskId}`, { completed });
    await fetchTasks();
    // Dispatch event for dashboard to refresh
    document.dispatchEvent(new CustomEvent("tasks:updated"));
  } catch (error) {
    config.showToast(error.message, "error");
    await fetchTasks();
  }
}

async function handleDeleteTask(taskId) {
  if (!confirm(getTranslation("tasks.delete") + "?")) return;

  try {
    await request("DELETE", `/tasks/${taskId}`);
    config.showToast(getTranslation("notifications.removed"), "info");
    await fetchTasks();
    // Dispatch event for dashboard to refresh
    document.dispatchEvent(new CustomEvent("tasks:updated"));
  } catch (error) {
    config.showToast(error.message, "error");
  }
}

export function initTasks(options) {
  config = { ...config, ...options };

  // Only add event listeners once
  if (!tasksInitialized) {
    taskForm?.addEventListener("submit", handleCreateTask);
    tasksInitialized = true;
  }

  return fetchTasks();
}

export function refreshTasks() {
  return fetchTasks();
}

