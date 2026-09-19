import { NextResponse } from "next/server";
import { readyRedis } from "@/lib/redis/client";
import { config } from "@/config/env";

export async function GET() {
  try {
    await (await readyRedis()).ping();
    return NextResponse.json({ status: "ok", acmeEnvironment: config().ACME_ENVIRONMENT }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}