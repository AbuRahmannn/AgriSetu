// Dynamic configuration to determine base API URL
// Prevents relative path failures if user runs the frontend on separate servers (like Live Server) or via file explorer
export const API_BASE = window.location.origin.startsWith("file") || window.location.port !== "8000"
  ? "http://127.0.0.1:8000"
  : "";
