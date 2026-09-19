import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { config } from "../config/env";
import { AppError } from "./errors";
import { logger } from "./logger";

export function assertOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(config().SITE_URL).origin || request.headers.get("sec-fetch-site") === "cross-site") throw new AppError("ORIGIN_DENIED", "Please submit this request from the website.", 403);
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new AppError("CONTENT_TYPE", "Send a JSON request.", 415);
}

export async function readJson(request: Request): Promise<unknown> {
  assertOrigin(request);
  if (Number(request.headers.get("content-length")) > 16384) throw new AppError("REQUEST_TOO_LARGE", "The request exceeds the allowed size.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("INVALID_REQUEST", "The request body is missing.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > 16384) {
      await reader.cancel();
      throw new AppError("REQUEST_TOO_LARGE", "The request exceeds the allowed size.", 413);
    }
    chunks.push(value);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { throw new AppError("INVALID_JSON", "The request body is not valid JSON."); }
}

export async function api(operation: string, handler: () => Promise<NextResponse | unknown>) {
  const requestId = randomUUID();
  const started = Date.now();
  try {
    const result = await handler();
    const response = result instanceof NextResponse ? result : NextResponse.json(result);
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Request-ID", requestId);
    logger.info({ requestId, operation, status: response.status, duration: Date.now() - started });
    return response;
  } catch (error) {
    let failure = error instanceof AppError ? error : error instanceof ZodError ? new AppError("INVALID_REQUEST", "Check your input and try again.") : new AppError("SERVICE_UNAVAILABLE", "The service could not complete this request. Please try again shortly.", 503);
    if (!(error instanceof AppError) && error instanceof Error && /urn:ietf:params:acme:error:rateLimited/.test(error.message)) failure = new AppError("CA_RATE_LIMIT", "Let's Encrypt has temporarily limited requests for this account or domain. Please try again later.", 429, 3600);
    logger.warn({ requestId, operation, status: failure.status, duration: Date.now() - started, errorCode: failure.code });
    return NextResponse.json({ error: { code: failure.code, message: failure.message, requestId } }, { status: failure.status, headers: { "Cache-Control": "no-store", "X-Request-ID": requestId, ...(failure.retryAfter ? { "Retry-After": String(failure.retryAfter) } : {}) } });
  }
}

export function orderToken(request: NextRequest, id: string) {
  return request.cookies.get(`cap_${id}`)?.value;
}