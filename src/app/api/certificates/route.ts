import { NextRequest, NextResponse } from "next/server";
import { api, readJson } from "@/lib/api";
import { config } from "@/config/env";
import { validateOrderInput } from "@/lib/validation/requests";
import { clientIdentity, rateLimit } from "@/lib/rate-limit";
import { createCertificateOrder } from "@/lib/acme/service";
import { publicOrder } from "@/lib/acme/store";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  return api("create-order", async () => {
    const settings = config();
    const input = validateOrderInput(await readJson(request), settings.MAX_DOMAINS_PER_CERT);
    await rateLimit(clientIdentity(request.headers), "create-order", settings.MAX_ORDER_PER_IP_PER_HOUR, 3600);
    await rateLimit("all", "create-order", settings.MAX_ORDERS_GLOBAL_PER_HOUR, 3600);
    const { order, token } = await createCertificateOrder(input);
    const response = NextResponse.json(publicOrder(order), { status: 201 });
    response.cookies.set(`cap_${order.id}`, token, { httpOnly: true, secure: new URL(settings.SITE_URL).protocol === "https:", sameSite: "strict", path: `/api/certificates/${order.id}`, maxAge: settings.ORDER_TTL_SECONDS });
    return response;
  });
}