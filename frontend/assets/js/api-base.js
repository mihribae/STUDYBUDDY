export function resolveStudyBuddyApiBase() {
  if (typeof window === "undefined") {
    return "http://localhost:4000/api";
  }
  if (window.__STUDYBUDDY_API__) {
    return window.__STUDYBUDDY_API__;
  }
  if (window.location.protocol === "file:") {
    return "http://localhost:4000/api";
  }
  const host = window.location.hostname;
  const port = window.location.port;
  const local = host === "localhost" || host === "127.0.0.1";
  if (local && port === "4000") {
    return `${window.location.origin}/api`;
  }
  return "http://localhost:4000/api";
}
