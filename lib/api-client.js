/**
 * API Client — talks to Cloudflare Worker via Next.js API routes.
 * Falls back to IndexedDB when offline or not logged in.
 */

const API_BASE = "/api";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("cfa_token");
}

function setToken(token) {
  if (typeof window === "undefined") return;
  localStorage.setItem("cfa_token", token);
}

function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("cfa_token");
}

async function request(method, path, body) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Request failed: ${res.status}`);
  }
  return json.data;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: async (email, password) => {
      const data = await request("POST", "auth/register", { email, password });
      setToken(data.token);
      return data;
    },
    login: async (email, password) => {
      const data = await request("POST", "auth/login", { email, password });
      setToken(data.token);
      return data;
    },
    logout: () => clearToken(),
    isLoggedIn: () => !!getToken(),
  },

  projects: {
    list: () => request("GET", "projects"),
    create: (name) => request("POST", "projects", { name }),
    update: (id, name) => request("PUT", `projects?id=${id}`, { name }),
    delete: (id) => request("DELETE", `projects?id=${id}`),
  },

  days: {
    list: (projectId) => request("GET", `days?project_id=${projectId}`),
    create: (projectId, { location_name, date }) =>
      request("POST", `days?project_id=${projectId}`, { location_name, date }),
    update: (id, data) => request("PUT", `days?id=${id}`, data),
    delete: (id) => request("DELETE", `days?id=${id}`),
  },

  shots: {
    list: (dayId) => request("GET", `shots?day_id=${dayId}`),
    create: (dayId, data) => request("POST", `shots?day_id=${dayId}`, data),
    update: (id, data) => request("PUT", `shots?id=${id}`, data),
    delete: (id) => request("DELETE", `shots?id=${id}`),
  },

  gear: {
    list: () => request("GET", "gear"),
    create: (data) => request("POST", "gear", data),
    update: (id, data) => request("PUT", `gear?id=${id}`, data),
    delete: (id) => request("DELETE", `gear?id=${id}`),
  },

  checklists: {
    list: () => request("GET", "checklists"),
    create: (name, project_id) => request("POST", "checklists", { name, project_id }),
    update: (id, name) => request("PUT", `checklists?id=${id}`, { name }),
    delete: (id) => request("DELETE", `checklists?id=${id}`),
  },

  checklistItems: {
    list: (checklistId) => request("GET", `checklist-items?checklist_id=${checklistId}`),
    create: (checklistId, text) => request("POST", `checklist-items?checklist_id=${checklistId}`, { text }),
    update: (id, data) => request("PUT", `checklist-items?id=${id}`, data),
    delete: (id) => request("DELETE", `checklist-items?id=${id}`),
  },

  locations: {
    list: () => request("GET", "locations"),
    create: (data) => request("POST", "locations", data),
    update: (id, data) => request("PUT", `locations?id=${id}`, data),
    delete: (id) => request("DELETE", `locations?id=${id}`),
  },
};
