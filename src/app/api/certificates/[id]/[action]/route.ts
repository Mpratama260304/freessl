import { NextRequest } from "next/server";
import { z } from "zod";
import { api, orderToken, readJson } from "@/lib/api";
import { getOrder, publicOrder } from "@/lib/acme/store";
import { precheckOrder, progressOrder, verifyOrder } from "@/lib/acme/service";
import { withLock } from "@/lib/redis/locks";
import { clientIdentity, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string; action: string }> }) {
  return api("update-order", async () => {
    z.object({}).strict().parse(await readJson(request));
    const { id, action: rawAction } = await context.params;
    const action = z.enum(["check", "verify", "progress"]).parse(rawAction);
    await rateLimit(clientIdentity(request.headers), `order-${action}`, action === "verify" ? 10 : action === "check" ? 30 : 120, 300);
    return withLock(id, async () => {
      const order = await getOrder(id, orderToken(request, id));
      const updated = action === "check" ? await precheckOrder(order) : action === "verify" ? await verifyOrder(order) : await progressOrder(order);
      return publicOrder(updated);
    });
  });
}