import { getTranslation } from "./i18n.js";

const intervalSelect = document.getElementById("stats-interval");
const chartTotalTime = document.getElementById("chart-total-time");
const chartByLesson = document.getElementById("chart-by-lesson");
const chartByHour = document.getElementById("chart-by-hour");
const chartByTechnique = document.getElementById("chart-by-technique");

let config = {
  apiBase: "",
  tokenProvider: () => null,
  showToast: () => {}
};

let charts = {
  total: null,
  lessons: null,
  hours: null,
  techniques: null
};

let wired = false;

function authHeader() {
  const token = config.tokenProvider();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function buildTotalChart(dataset) {
  if (!chartTotalTime) return;
  const ctx = chartTotalTime.getContext("2d");
  const labels = dataset.map((item) => item.label);
  const dataPoints = dataset.map((item) => Math.round(item.minutes));

  if (charts.total) charts.total.destroy();
  charts.total = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Minutes",
          data: dataPoints,
          borderColor: "#4A90E2",
          backgroundColor: "rgba(74, 144, 226, 0.18)",
          tension: 0.4,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function buildLessonChart(dataset) {
  if (!chartByLesson) return;
  const ctx = chartByLesson.getContext("2d");
  const labels = dataset.map((item) => item.lesson);
  const dataPoints = dataset.map((item) => Math.round(item.minutes));
  const colors = dataset.map((item) => item.color ?? "#4A90E2");

  if (charts.lessons) charts.lessons.destroy();
  charts.lessons = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels,
      datasets: [
        {
          data: dataPoints,
          backgroundColor: colors,
          borderWidth: 0
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

function buildHourChart(dataset) {
  if (!chartByHour) return;
  const ctx = chartByHour.getContext("2d");
  const labels = dataset.map((item) => item.hourLabel);
  const dataPoints = dataset.map((item) => Math.round(item.minutes));

  if (charts.hours) charts.hours.destroy();
  charts.hours = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Minutes",
          data: dataPoints,
          backgroundColor: "#7AC7A5"
        }
      ]
    },
    options: {
      indexAxis: "y",
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          beginAtZero: true
        }
      }
    }
  });
}

function buildTechniqueChart(dataset) {
  if (!chartByTechnique) return;
  const ctx = chartByTechnique.getContext("2d");
  const labels = dataset.map((item) => item.technique);
  const dataPoints = dataset.map((item) => item.completedCycles);
  const colors = ["#4A90E2", "#7AC7A5", "#F55C5C", "#5B5F97"];

  if (charts.techniques) charts.techniques.destroy();
  charts.techniques = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Completed cycles",
          data: dataPoints,
          backgroundColor: colors.slice(0, dataPoints.length)
        }
      ]
    },
    options: {
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 }
        }
      }
    }
  });
}

function renderStats(data) {
  buildTotalChart(data.totals);
  buildLessonChart(data.byLesson);
  buildHourChart(data.byHour);
  buildTechniqueChart(data.byTechnique);
}

async function fetchStats(interval) {
  const response = await fetch(`${config.apiBase}/stats?interval=${interval}`, {
    headers: {
      ...authHeader()
    }
  });
  if (!response.ok) {
    // Handle 401 Unauthorized - redirect to login
    if (response.status === 401) {
      localStorage.removeItem("studybuddy:token");
      window.location.href = "login.html";
      throw new Error("Invalid or expired token.");
    }
    
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message ?? "Unable to fetch statistics.");
  }
  return response.json();
}

export function initStats(options) {
  config = { ...config, ...options };

  if (!wired && intervalSelect) {
    intervalSelect.addEventListener("change", async () => {
      await loadStats(intervalSelect.value);
    });
    wired = true;
  }

  return loadStats(intervalSelect?.value ?? "weekly");
}

async function loadStats(interval) {
  try {
    const data = await fetchStats(interval);
    renderStats(data);
    config.showToast(getTranslation("stats.toast.loaded"), "success");
  } catch (error) {
    console.error(error);
    config.showToast(error.message || getTranslation("stats.toast.error"), "error");
  }
}


