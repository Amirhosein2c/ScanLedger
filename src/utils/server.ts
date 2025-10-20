import { NextRequest, NextResponse } from "next/server";

export const _GD = async (request: NextRequest): Promise<Response> => {
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    if (!apiBaseUrl) {
      console.error("[GD] env NEXT_PUBLIC_BASE_URL is missing at runtime");
      return new NextResponse("Gateway misconfigured: BASE_URL missing", {
        status: 500,
      });
    }

    // read body only for non-GET/HEAD
    let body: ArrayBuffer | null = null;
    if (!["GET", "HEAD"].includes(request.method.toUpperCase())) {
      try {
        body = await request.arrayBuffer();
      } catch (e) {
        console.error("[GD] Failed to read request body", e);
      }
    }

    // build upstream url
    const normalizedPath = request.nextUrl.pathname.replace(/^\/(api|gd)/, "");
    console.log("normalizedPath", normalizedPath);
    console.log("request", request);
    console.log("request.nextUrl", request.nextUrl);
    console.log("request.nextUrl.pathname", request.nextUrl.pathname);

    const targetPath = normalizedPath.startsWith("/")
      ? normalizedPath
      : `/${normalizedPath}`;
    const upstreamUrl = `${apiBaseUrl.replace(/\/$/, "")}${targetPath}${
      request.nextUrl.search
    }`;

    console.log("targetPath", targetPath);
    console.log("upstreamUrl", upstreamUrl);
    // build headers safely
    const headers = new Headers();
    const ct = request.headers.get("content-type");
    if (ct) headers.set("content-type", ct);
    headers.set("accept", "application/json");

    const xff = request.ip || request.headers.get("x-forwarded-for");
    if (xff) headers.set("x-forwarded-for", String(xff));

    // only set admin header if cookie exists
    const adminToken = request.cookies.get("AdminAuthToken")?.value;
    if (adminToken) {
      headers.set("Admin-Authorization", `Bearer ${adminToken}`);
    }

    console.log("[GD] →", request.method, upstreamUrl);

    const upstreamRes = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method.toUpperCase())
        ? null
        : body,
    });

    // log status for debugging
    console.log("[GD] ←", upstreamRes.status, upstreamRes.statusText);

    // اگر upstream خطای 4xx/5xx داد، پاس‌ترو ولی لاگ کن
    // (در صورت نیاز می‌تونی فقط 5xx رو ماسک کنی)
    return upstreamRes;
  } catch (err: unknown) {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === "string"
        ? err
        : (() => {
            try {
              return JSON.stringify(err);
            } catch {
              return String(err);
            }
          })();

    console.error("[GD] Fatal proxy error:", msg);
    return new Response("Internal Gateway Error", { status: 500 });
  }
};
