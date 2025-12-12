import { initI18n, getCurrentLanguage, getTranslation } from "./i18n.js";
import { getAuthToken, logout } from "./auth.js";
import { initLessons, refreshLessons } from "./lessons.js";
import { initStudyRoom, syncLessonsForTimer } from "./study-room.js";
import { initStats } from "./stats.js";
import { initDashboard, refreshDashboard } from "./dashboard.js";
import { initProfile } from "./profile.js";
import { syncLessonsForCalendar } from "./calendar.js";
import { initReminders, refreshReminders } from "./reminders.js";
import { initTasks, refreshTasks } from "./tasks.js";

const API_BASE = window.__STUDYBUDDY_API__ ?? "http://localhost:4000/api";

const tabs = Array.from(document.querySelectorAll(".sidebar-nav-btn"));
const panels = Array.from(document.querySelectorAll(".tab-panel"));
const logoutBtn = document.getElementById("logout-btn");
const logoutBtnMobile = document.getElementById("logout-btn-mobile");
const languageSelector = document.getElementById("language-selector");
const languageSelectorMobile = document.getElementById("language-selector-mobile");

const TOAST_DURATION = 3200;
let toastTimeout;

function showToast(message, tone = "info") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, TOAST_DURATION);
}

function setActiveTab(tabId) {
  tabs.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabId);
  });
  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === tabId);
  });
}

function protectTabSwitch(targetTab, isAuthenticated) {
  if (!isAuthenticated) {
    showToast(getTranslation("notifications.loginRequired"), "error");
    window.location.href = "login.html";
    return false;
  }
  return true;
}

// Track which modules have been initialized
const initializedModules = new Set();

function setupTabs() {
  tabs.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.tab;
      if (!protectTabSwitch(target, Boolean(getAuthToken()))) return;
      setActiveTab(target);
      
      // Only initialize once, then just refresh data
      if (target === "dashboard") {
        if (!initializedModules.has("dashboard")) {
          initDashboard({ apiBase: API_BASE, tokenProvider: getAuthToken, showToast });
          initializedModules.add("dashboard");
        } else {
          refreshDashboard();
        }
      } else if (target === "stats") {
        if (!initializedModules.has("stats")) {
          initStats({ apiBase: API_BASE, tokenProvider: getAuthToken, showToast });
          initializedModules.add("stats");
        }
      } else if (target === "profile") {
        if (!initializedModules.has("profile")) {
          initProfile({ apiBase: API_BASE, tokenProvider: getAuthToken, showToast });
          initializedModules.add("profile");
        }
      } else if (target === "lessons") {
        if (!initializedModules.has("lessons")) {
          initLessons({ apiBase: API_BASE, tokenProvider: getAuthToken, showToast })
            .then((lessons) => {
              syncLessonsForTimer(lessons);
              syncLessonsForCalendar(lessons);
            })
            .catch((error) => {
              console.error("Lessons init failed", error);
            });
          initializedModules.add("lessons");
        } else {
          refreshLessons();
        }
      } else if (target === "reminders") {
        if (!initializedModules.has("reminders")) {
          initReminders({ apiBase: API_BASE, tokenProvider: getAuthToken, showToast });
          initializedModules.add("reminders");
        } else {
          refreshReminders();
        }
      } else if (target === "tasks") {
        if (!initializedModules.has("tasks")) {
          initTasks({ apiBase: API_BASE, tokenProvider: getAuthToken, showToast });
          initializedModules.add("tasks");
        } else {
          refreshTasks();
        }
      }
    });
  });
}

function handleAuthenticated() {
  if (logoutBtn) logoutBtn.hidden = false;
  if (logoutBtnMobile) logoutBtnMobile.hidden = false;
  
  setActiveTab("dashboard");
  
  // Initialize all modules once
  initLessons({ apiBase: API_BASE, tokenProvider: getAuthToken, showToast })
    .then((lessons) => {
      syncLessonsForTimer(lessons);
      syncLessonsForCalendar(lessons);
    })
    .catch((error) => {
      console.error("Lessons init failed", error);
      showToast(getTranslation("notifications.lessonsError"), "error");
    });
  initStudyRoom({ apiBase: API_BASE, tokenProvider: getAuthToken, showToast, getCurrentLanguage });
  initStats({ apiBase: API_BASE, tokenProvider: getAuthToken, showToast });
  initDashboard({ apiBase: API_BASE, tokenProvider: getAuthToken, showToast });
  initReminders({ apiBase: API_BASE, tokenProvider: getAuthToken, showToast });
  initTasks({ apiBase: API_BASE, tokenProvider: getAuthToken, showToast });
  
  // Mark modules as initialized
  initializedModules.add("lessons");
  initializedModules.add("dashboard");
  initializedModules.add("reminders");
  initializedModules.add("tasks");
}

function handleLoggedOut() {
  if (logoutBtn) logoutBtn.hidden = true;
  if (logoutBtnMobile) logoutBtnMobile.hidden = true;
  window.location.href = "login.html";
}

function initLogout() {
  logoutBtn?.addEventListener("click", () => {
    logout();
  });
  logoutBtnMobile?.addEventListener("click", () => {
    logout();
  });
}

async function bootstrap() {
  // Initialize i18n for both selectors
  initI18n(languageSelector);
  if (languageSelectorMobile) {
    languageSelectorMobile.value = languageSelector.value;
    languageSelectorMobile.addEventListener("change", (e) => {
      languageSelector.value = e.target.value;
      languageSelector.dispatchEvent(new Event("change"));
    });
    languageSelector.addEventListener("change", (e) => {
      languageSelectorMobile.value = e.target.value;
      languageSelectorMobile.dispatchEvent(new Event("change"));
    });
  }
  setupTabs();
  initLogout();

  // Check authentication
  if (getAuthToken()) {
    handleAuthenticated();
  } else {
    window.location.href = "login.html";
  }
}

document.addEventListener("DOMContentLoaded", bootstrap);

export { showToast, API_BASE, refreshLessons };


