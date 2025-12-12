import { getTranslation } from "./i18n.js";

const storageKey = "studybuddy:token";

let authToken = localStorage.getItem(storageKey);
let currentUser = null;
const listeners = new Set();

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const showLoginBtn = document.getElementById("show-login");
const showRegisterBtn = document.getElementById("show-register");

function emitAuthChange() {
  listeners.forEach((listener) => listener(Boolean(authToken)));
}

function toggleForms(show = "login") {
  const showLogin = show === "login";
  loginForm.classList.toggle("hidden", !showLogin);
  registerForm.classList.toggle("hidden", showLogin);
  showLoginBtn.classList.toggle("active", showLogin);
  showRegisterBtn.classList.toggle("active", !showLogin);
}

function persistAuth(tokenValue, user) {
  authToken = tokenValue;
  currentUser = user;
  if (tokenValue) {
    localStorage.setItem(storageKey, tokenValue);
  } else {
    localStorage.removeItem(storageKey);
  }
  emitAuthChange();
}

async function request(endpoint, payload, apiBase) {
  const response = await fetch(`${apiBase}${endpoint}`, {
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
    if (errorPayload.details) {
      const details = Object.values(errorPayload.details).join(", ");
      message = details || message;
    }
    
    throw new Error(message);
  }

  return response.json();
}

function wireFormToggles() {
  showLoginBtn.addEventListener("click", () => toggleForms("login"));
  showRegisterBtn.addEventListener("click", () => toggleForms("register"));
}

export async function initAuth({ apiBase, showToast }) {
  wireFormToggles();

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    const payload = {
      email: formData.get("email"),
      password: formData.get("password")
    };
    try {
      const data = await request("/auth/login", payload, apiBase);
      persistAuth(data.token, data.user);
      showToast(getTranslation("notifications.welcome"), "success");
      toggleForms("login");
      loginForm.reset();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    const payload = {
      username: formData.get("username"),
      email: formData.get("email"),
      password: formData.get("password")
    };
    try {
      const data = await request("/auth/register", payload, apiBase);
      persistAuth(data.token, data.user);
      showToast(getTranslation("notifications.accountCreated"), "success");
      registerForm.reset();
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  if (authToken) {
    emitAuthChange();
  } else {
    toggleForms("login");
  }
}

export function onAuthStateChange(listener) {
  listeners.add(listener);
}

export function getAuthToken() {
  return authToken;
}

export function getCurrentUser() {
  return currentUser;
}

export function logout() {
  persistAuth(null, null);
}


