/**
 * API Route Proxy — forwards all /api/* calls to the Cloudflare Worker.
 * Keeps the CF Worker URL server-side (not exposed to client).
 */

const WORKER_URL = "https://creator-field-assistant-api.tyler-delano.workers.dev";

function getToken(request) {
  const cookie = request.cookies.get("cfa_token")?.value;
  if (cookie) return cookie;
  return null;
}

function proxy(request) {
  const token = getToken(request);
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/", "");

  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const options = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    options["body"] = request.body;
  }

  const targetUrl = `${WORKER_URL}/${path}${url.search}`;
  return fetch(targetUrl, options);
}

export async function GET(request) {
  return proxy(request);
}

export async function POST(request) {
  return proxy(request);
}

export async function PUT(request) {
  return proxy(request);
}

export async function DELETE(request) {
  return proxy(request);
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
