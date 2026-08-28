const API_URL = process.env.REACT_APP_BACKEND_URL;

export const api = async (path, options = {}) => {
  const token = localStorage.getItem("vexor_access_token");
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_URL}/api${path}`, { ...options, headers });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = body.detail;
    let message = "Não foi possível completar a operação";
    if (typeof detail === "string") message = detail;
    else if (Array.isArray(detail)) message = detail.map((d) => d.msg || d.message || JSON.stringify(d)).join(" · ");
    else if (detail && typeof detail === "object") message = detail.msg || JSON.stringify(detail);
    throw new Error(message);
  }
  return body;
};

export const saveSession = (data) => {
  localStorage.setItem("vexor_access_token", data.access_token);
  localStorage.setItem("vexor_refresh_token", data.refresh_token);
};

export const clearSession = () => {
  localStorage.removeItem("vexor_access_token");
  localStorage.removeItem("vexor_refresh_token");
};

export const websocketUrl = (room) => {
  const token = encodeURIComponent(localStorage.getItem("vexor_access_token") || "");
  return `${API_URL.replace(/^http/, "ws")}/api/ws/${room}?token=${token}`;
};