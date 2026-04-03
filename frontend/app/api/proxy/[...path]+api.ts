const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";

export async function GET(request: Request, params: Record<string, string>) {
  return proxy(request, params.path);
}

export async function POST(request: Request, params: Record<string, string>) {
  return proxy(request, params.path);
}

export async function PUT(request: Request, params: Record<string, string>) {
  return proxy(request, params.path);
}

export async function DELETE(request: Request, params: Record<string, string>) {
  return proxy(request, params.path);
}

export async function PATCH(request: Request, params: Record<string, string>) {
  return proxy(request, params.path);
}

async function proxy(request: Request, path: string): Promise<Response> {
  const url = new URL(request.url);
  const targetUrl = `${BACKEND_URL}/${path}${url.search}`;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const init: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const response = await fetch(targetUrl, init);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}