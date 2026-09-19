import { NextRequest } from "next/server";
import { api, orderToken } from "@/lib/api";
import { getOrder, publicOrder } from "@/lib/acme/store";
import { clientIdentity, rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return api("read-order", async () => {
    await rateLimit(clientIdentity(request.headers), "read-order", 120, 300);
    const { id } = await context.params;
    return publicOrder(await getOrder(id, orderToken(request, id)));
  });
}