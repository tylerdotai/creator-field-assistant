/**
 * API Route Proxy — forwards all /api/* calls to the Cloudflare Worker.
 * Keeps the CF Worker URL server-side (not exposed to client).
 */

const WORKER_URL = "https://creator-field-assistant-api.tyler-delano.workers.dev";

async function proxy(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace("/api/", "");
  const targetUrl = `${WORKER_URL}/${path}${url.search}`;

  const headers = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Read body once — this consumes the stream
  let body;
  try {
    body = await request.text();
  } catch {
    body = undefined;
  }

  const options = {
    method: request.method,
    headers,
    ...(body !== undefined && body !== "" && { body }),
  };

  try {
    const response = await fetch(targetUrl, options);
    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: "Proxy error", details: String(err) }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
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
