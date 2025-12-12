import { getTranslation } from "./i18n.js";

const profileForm = document.getElementById("profile-form");
const passwordForm = document.getElementById("password-form");
const profileUsername = document.getElementById("profile-username");
const profileEmail = document.getElementById("profile-email");

let config = {
  apiBase: "",
  tokenProvider: () => null,
  showToast: () => {}
};

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

async function fetchProfile() {
  try {
    const data = await request("GET", "/profile");
    if (data.user) {
      profileUsername.value = data.user.username || "";
      profileEmail.value = data.user.email || "";
    }
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    config.showToast(error.message, "error");
  }
}

async function handleUpdateProfile(event) {
  event.preventDefault();
  const formData = new FormData(profileForm);
  const payload = {
    username: formData.get("username").trim(),
    email: formData.get("email").trim()
  };

  if (!payload.username || !payload.email) {
    config.showToast(getTranslation("notifications.error"), "error");
    return;
  }

  try {
    await request("PATCH", "/profile", payload);
    config.showToast(getTranslation("profile.updateSuccess"), "success");
    await fetchProfile();
  } catch (error) {
    config.showToast(error.message, "error");
  }
}

async function handleChangePassword(event) {
  event.preventDefault();
  const formData = new FormData(passwordForm);
  const currentPassword = formData.get("currentPassword");
  const newPassword = formData.get("newPassword");
  const confirmPassword = formData.get("confirmPassword");

  if (newPassword !== confirmPassword) {
    config.showToast(getTranslation("profile.passwordMismatch"), "error");
    return;
  }

  if (newPassword.length < 8) {
    config.showToast(getTranslation("auth.passwordHint"), "error");
    return;
  }

  try {
    await request("PATCH", "/profile/password", {
      currentPassword,
      newPassword
    });
    config.showToast(getTranslation("profile.passwordUpdateSuccess"), "success");
    passwordForm.reset();
  } catch (error) {
    config.showToast(error.message, "error");
  }
}

export function initProfile(options) {
  config = { ...config, ...options };

  profileForm?.addEventListener("submit", handleUpdateProfile);
  passwordForm?.addEventListener("submit", handleChangePassword);

  return fetchProfile();
}

