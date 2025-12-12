import { getTranslation } from "./i18n.js";

// DOM Elements - will be initialized in initStudyRoom
let timerDisplay;
let timerStatus;
let timerLessonSelect;
let timerModeSelect;
let customFields;
let customWorkInput;
let customBreakInput;
let startBtn;
let stopBtn;
let resetBtn;
let skipBtn;
let studySessionInfo;
let currentLessonNameEl;
let currentStudyTimeEl;
let currentTechniqueEl;

let config = {
  apiBase: "",
  tokenProvider: () => null,
  showToast: () => {},
  getCurrentLanguage: () => "en"
};

// Global State
let timerInterval = null;
let timeRemainingSeconds = 25 * 60; // Default: Pomodoro work time
let isTimerRunning = false;
let isBreak = false;
let currentLessonId = null;
let currentLessonName = null;
let currentMode = "pomodoro";
let workDuration = 25 * 60; // Work duration in seconds
let breakDuration = 5 * 60; // Break duration in seconds
let sessionStartTime = null; // When the current session started
let totalElapsedSeconds = 0; // Total elapsed time in current session

let lessonCache = [];
let initialized = false;

function authHeader() {
  const token = config.tokenProvider();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${secs}`;
}

function updateDisplay() {
  if (timerDisplay) {
    timerDisplay.textContent = formatTime(timeRemainingSeconds);
  }
  // Update study session info
  updateStudySessionInfo();
}

function resetTimer(mode = null) {
  // Clear any running interval
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  // Reset state
  isTimerRunning = false;
  isBreak = false;
  sessionStartTime = null;
  totalElapsedSeconds = 0;

  // Use provided mode or current mode
  const selectedMode = mode || timerModeSelect?.value || "pomodoro";
  currentMode = selectedMode;

  // Set durations based on mode
  switch (selectedMode) {
    case "pomodoro":
      workDuration = 25 * 60;
      breakDuration = 5 * 60;
      break;
    case "ultradian":
      workDuration = 90 * 60;
      breakDuration = 20 * 60;
      break;
    case "timebox":
      const work = Math.max(1, Number(customWorkInput?.value || 45));
      const rest = Math.max(1, Number(customBreakInput?.value || 10));
      workDuration = work * 60;
      breakDuration = rest * 60;
      break;
    default:
      workDuration = 25 * 60;
      breakDuration = 5 * 60;
  }

  // Set remaining time to work duration
  timeRemainingSeconds = workDuration;
  updateDisplay();

  // Update status
  if (timerStatus) {
    timerStatus.textContent = "Time to Focus!";
  }

  // Update button visibility
  if (startBtn) startBtn.style.display = "block";
  if (stopBtn) stopBtn.style.display = "none";
  
  // Hide study session info
  if (studySessionInfo) studySessionInfo.hidden = true;
}

function startTimer() {
  // Prevent multiple starts
  if (isTimerRunning) return;

  // Check if lesson is selected (only for work phase)
  if (!isBreak) {
    // Get current lesson ID from select element
    const lessonId = timerLessonSelect?.value;
    
    if (lessonId && lessonId !== "") {
      currentLessonId = parseInt(lessonId);
      // Get lesson name
      const selectedLesson = lessonCache.find(l => l.id === currentLessonId);
      currentLessonName = selectedLesson ? selectedLesson.name : null;
      
      // Start new session
      sessionStartTime = Date.now();
      totalElapsedSeconds = 0;
      
      console.log("Session started:", { currentLessonId, currentLessonName, sessionStartTime });
    } else {
      // Allow starting without lesson, but warn
      currentLessonId = null;
      currentLessonName = null;
      sessionStartTime = null;
    }
  }

  // Start the timer
  isTimerRunning = true;

  // Update button visibility
  if (startBtn) startBtn.style.display = "none";
  if (stopBtn) stopBtn.style.display = "block";

  // Update status
  if (timerStatus) {
    timerStatus.textContent = isBreak ? "Break Time!" : "Focusing...";
  }

  // Update display immediately (this will also update study session info)
  updateDisplay();

  // Clear any existing interval
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  // Start interval
  timerInterval = setInterval(() => {
    if (timeRemainingSeconds > 0) {
      timeRemainingSeconds -= 1;
      // Update elapsed time for work phase
      if (!isBreak && sessionStartTime) {
        const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
        totalElapsedSeconds = elapsed;
      }
      updateDisplay();
    } else {
      handleTimerEnd();
    }
  }, 1000);
}

function stopTimer() {
  if (!isTimerRunning) return;

  // Clear interval
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  isTimerRunning = false;

  // Update button visibility
  if (startBtn) startBtn.style.display = "block";
  if (stopBtn) stopBtn.style.display = "none";

  // Update status
  if (timerStatus) {
    timerStatus.textContent = isBreak ? "Break Paused" : "Paused";
  }
  
  // Update study session info
  updateStudySessionInfo();
}

async function handleTimerEnd() {
  // Clear interval
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  isTimerRunning = false;

  if (!isBreak) {
    // Work phase ended - record the session
    const durationSeconds = workDuration; // Total work duration

    try {
      await recordStudySession({
        lesson_id: currentLessonId,
        duration_seconds: durationSeconds,
        technique: currentMode.charAt(0).toUpperCase() + currentMode.slice(1)
      });

      config.showToast("Study session recorded!", "success");
    } catch (error) {
      console.error("Failed to record study session:", error);
      config.showToast("Failed to record session", "error");
    }

    // Start break
    isBreak = true;
    timeRemainingSeconds = breakDuration;
    updateDisplay();

    if (timerStatus) {
      timerStatus.textContent = "Break Time!";
    }

    // Auto-start break timer
    startTimer();
  } else {
    // Break ended - return to work
    isBreak = false;
    resetTimer();
  }
}

async function recordStudySession(data) {
  const response = await fetch(`${config.apiBase}/study/record`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeader()
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem("studybuddy:token");
      window.location.href = "login.html";
      throw new Error("Unauthorized");
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to record session");
  }

  return response.json();
}

function handleModeChange(event) {
  const mode = timerModeSelect?.value || "pomodoro";
  currentMode = mode;

  // Show/hide custom time inputs
  if (customFields) {
    customFields.hidden = mode !== "timebox";
  }

  // Reset timer with new mode
  if (!isTimerRunning) {
    resetTimer(mode);
  }
}

function populateLessons() {
  if (!timerLessonSelect) return;

  timerLessonSelect.innerHTML = '<option value="">-- Select a lesson --</option>';

  if (lessonCache && Array.isArray(lessonCache) && lessonCache.length > 0) {
    lessonCache.forEach((lesson) => {
      const option = document.createElement("option");
      option.value = lesson.id;
      option.textContent = lesson.name;
      timerLessonSelect.appendChild(option);
    });
  }
}

function handleLessonChange() {
  const lessonId = timerLessonSelect?.value;
  currentLessonId = lessonId ? parseInt(lessonId) : null;
}

function updateStudySessionInfo() {
  if (!studySessionInfo) {
    console.log("studySessionInfo element not found");
    return;
  }
  
  // Only show during work phase when lesson is selected
  if (isBreak || !isTimerRunning || !currentLessonId || !currentLessonName) {
    studySessionInfo.hidden = true;
    return;
  }

  console.log("Updating study session info:", { 
    isBreak, 
    isTimerRunning, 
    currentLessonId, 
    currentLessonName,
    sessionStartTime 
  });

  // Show the panel
  studySessionInfo.hidden = false;

  // Update lesson name
  if (currentLessonNameEl) {
    currentLessonNameEl.textContent = currentLessonName;
  } else {
    console.log("currentLessonNameEl not found");
  }

  // Update elapsed time - calculate from session start time
  if (currentStudyTimeEl && sessionStartTime) {
    const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
    currentStudyTimeEl.textContent = formatTime(elapsed);
  } else if (currentStudyTimeEl) {
    // Fallback to total elapsed if sessionStartTime is not set
    currentStudyTimeEl.textContent = formatTime(totalElapsedSeconds);
  } else {
    console.log("currentStudyTimeEl not found");
  }

  // Update technique
  if (currentTechniqueEl) {
    const techniqueNames = {
      pomodoro: "Pomodoro",
      ultradian: "Ultradian",
      timebox: "Timebox"
    };
    currentTechniqueEl.textContent = techniqueNames[currentMode] || currentMode;
  } else {
    console.log("currentTechniqueEl not found");
  }
}

function handleSkipBreak() {
  if (!isBreak) return;

  // Clear interval
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  isTimerRunning = false;
  isBreak = false;

  // Reset to work phase
  resetTimer();
}

export function syncLessonsForTimer(updatedLessons = []) {
  if (Array.isArray(updatedLessons) && updatedLessons.length) {
    lessonCache = updatedLessons.map((lesson) => ({
      id: lesson.id,
      name: lesson.name,
      color: lesson.color
    }));
    populateLessons();
  }
}

export function initStudyRoom(options) {
  config = { ...config, ...options };

  // Initialize DOM elements
  timerDisplay = document.getElementById("timer-time");
  timerStatus = document.getElementById("timer-status");
  timerLessonSelect = document.getElementById("timer-lesson");
  timerModeSelect = document.getElementById("timer-mode");
  customFields = document.getElementById("custom-time-fields");
  customWorkInput = document.getElementById("custom-work");
  customBreakInput = document.getElementById("custom-break");
  startBtn = document.getElementById("timer-start");
  stopBtn = document.getElementById("timer-stop");
  resetBtn = document.getElementById("timer-reset");
  skipBtn = document.getElementById("timer-skip");
  studySessionInfo = document.getElementById("study-session-info");
  currentLessonNameEl = document.getElementById("current-lesson-name");
  currentStudyTimeEl = document.getElementById("current-study-time");
  currentTechniqueEl = document.getElementById("current-technique");

  if (!initialized) {
    // Event listeners
    document.addEventListener("lessons:updated", (event) => {
      lessonCache = (event.detail || []).map((lesson) => ({
        id: lesson.id,
        name: lesson.name,
        color: lesson.color
      }));
      populateLessons();
    });

    timerModeSelect?.addEventListener("change", handleModeChange);
    timerLessonSelect?.addEventListener("change", handleLessonChange);
    startBtn?.addEventListener("click", startTimer);
    stopBtn?.addEventListener("click", stopTimer);
    resetBtn?.addEventListener("click", () => resetTimer());
    skipBtn?.addEventListener("click", handleSkipBreak);

    // Custom time inputs change
    customWorkInput?.addEventListener("input", () => {
      if (currentMode === "timebox" && !isTimerRunning) {
        resetTimer("timebox");
      }
    });
    
    customBreakInput?.addEventListener("input", () => {
      if (currentMode === "timebox" && !isTimerRunning) {
        resetTimer("timebox");
      }
    });

    initialized = true;
  }

  // Always populate lessons when init is called
  populateLessons();

  // Initialize timer
  resetTimer();
}
