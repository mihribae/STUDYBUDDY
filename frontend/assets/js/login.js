import { initI18n } from "./i18n.js";
import { getTranslation } from "./i18n.js";

const API_BASE = window.__STUDYBUDDY_API__ ?? "http://localhost:4000/api";
const storageKey = "studybuddy:token";

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showLoginBtn = document.getElementById("show-login");
const showRegisterBtn = document.getElementById("show-register");
const languageSelector = document.createElement("select");
languageSelector.id = "language-selector";
languageSelector.setAttribute("aria-label", "Select language");
languageSelector.innerHTML = `
  <option value="en">EN</option>
  <option value="tr">TR</option>
  <option value="cs">CS</option>
`;

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

function toggleForms(show = "login") {
  const showLogin = show === "login";
  loginForm.classList.toggle("hidden", !showLogin);
  registerForm.classList.toggle("hidden", showLogin);
  showLoginBtn.classList.toggle("active", showLogin);
  showRegisterBtn.classList.toggle("active", !showLogin);
}

async function request(endpoint, payload) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    let message = errorPayload?.message ?? getTranslation("notifications.error");
    
    // Celebrate validation errors
    if (errorPayload?.details) {
      const details = errorPayload.details;
      const firstError = Array.isArray(details) ? details[0] : Object.values(details)[0];
      if (firstError?.message) {
        message = firstError.message;
      }
    }
    
    throw new Error(message);
  }

  return response.json();
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const payload = {
    email: formData.get("email").trim(),
    password: formData.get("password")
  };

  try {
    const data = await request("/auth/login", payload);
    localStorage.setItem(storageKey, data.token);
    showToast(getTranslation("notifications.welcome"), "success");
    
    // Redirect to index.html
    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);
  } catch (error) {
    showToast(error.message, "error");
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const formData = new FormData(registerForm);
  const payload = {
    username: formData.get("username").trim(),
    email: formData.get("email").trim(),
    password: formData.get("password")
  };

  if (payload.password.length < 8) {
    showToast(getTranslation("auth.passwordHint"), "error");
    return;
  }

  try {
    const data = await request("/auth/register", payload);
    localStorage.setItem(storageKey, data.token);
    showToast(getTranslation("notifications.accountCreated"), "success");
    
    // Redirect to index.html
    setTimeout(() => {
      window.location.href = "index.html";
    }, 500);
  } catch (error) {
    showToast(error.message, "error");
  }
}

function bootstrap() {
  initI18n(languageSelector);
  
  // Add language selector to header if needed
  const logo = document.querySelector(".logo");
  if (logo && !document.getElementById("language-selector")) {
    logo.appendChild(languageSelector);
  }

  showLoginBtn?.addEventListener("click", () => toggleForms("login"));
  showRegisterBtn?.addEventListener("click", () => toggleForms("register"));
  loginForm?.addEventListener("submit", handleLogin);
  registerForm?.addEventListener("submit", handleRegister);

  // Check if already logged in
  const token = localStorage.getItem(storageKey);
  if (token) {
    window.location.href = "index.html";
  }
}

document.addEventListener("DOMContentLoaded", bootstrap);

