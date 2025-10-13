import { NextRequest } from "next/server";

// const CSRF_COOKIE_NAME = "csrfToken";
// const CSRF_HEADER_NAME = "x-csrf-token";
// const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

export const _GD = async (
  request: NextRequest,
  _context?: { params?: Record<string, unknown> }
): Promise<Response> => {
  //   if (!SAFE_METHODS.has(request.method.toUpperCase())) {
  //     const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value ?? "";
  //     const csrfHeader = request.headers.get(CSRF_HEADER_NAME) ?? "";

  //     if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
  //       return new Response("Invalid CSRF token", { status: 403 });
  //     }
  //   }

  // const host: string = `${request.nextUrl.protocol}//${request.headers.get("host")}`;
  // const origin: string = request.headers.get("origin")?.toString() || "";

  // if (host !== origin) {
  //     return new NextResponse("Not Valid", { status: 419 });
  // }

  const arrBuffer = await request.arrayBuffer().catch((error) => {
    console.error("Failed to read request body", error);
    return undefined;
  });
  const data = arrBuffer ?? null;

  const headers = new Headers();
  // const headers = request.headers;
  // headers.delete("content-length");
  // headers.delete("host");
  headers.set("content-type", request.headers.get("content-type") || "");
  headers.set("accept", "application/json");
  headers.set(
    "x-forwarded-for",
    request.ip || request.headers.get("x-forwarded-for") || ""
  );
  // headers.set("serversecret", process.env.SERVER_SECRET || "");
  // headers.set("tt", Date.now().toString());

  // set Authorization header if there is any
  headers.set(
    "Admin-Authorization",
    `Bearer ${request.cookies.get("AdminAuthToken")?.value ?? ""}`
  );

  const apiBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_BASE_URL is not configured");
  }

  const normalizedPath = request.nextUrl.pathname.replace(/^\/(api|gd)/, "");
  const targetPath = normalizedPath.startsWith("/")
    ? normalizedPath
    : `/${normalizedPath}`;
  const url = `${apiBaseUrl.replace(/\/$/, "")}${targetPath}${
    request.nextUrl.search
  }`;
  const response = await fetch(url, {
    method: request.method,
    body: request.method === "GET" ? null : data,
    headers,
  }).catch((error) => {
    console.error({ error });
    return new Response(String(error), {
      status: 500,
      statusText: "Internal Error",
    });
  });

  if (response.status >= 500) {
    console.error({
      status: response.status,
      statusText: response.statusText,
      err: await response.text(),
    });
    return new Response(null, {
      status: 500,
      statusText: "Internal Server Error",
    });
  }

  return response;
};

export const addServerHeaders = async (
  requestInit: RequestInit
): Promise<RequestInit> => {
  const { cookies: Cookies } = await import("next/headers");
  const authToken = Cookies().get("AdminAuthToken")?.value ?? "";

  const headers: Record<string, string> = { Accept: "application/json" };
  headers["Admin-Authorization"] = `Bearer ${authToken}`;
  // headers["serversecret"] = process.env.SERVER_SECRET || "";
  // headers["tt"] = Date.now().toString();

  requestInit.headers = headers;
  return requestInit;
};
