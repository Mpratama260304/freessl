import { NextRequest } from "next/server";
import { api, readJson } from "@/lib/api";
import { checkerInput } from "@/lib/validation/requests";
import { clientIdentity, rateLimit } from "@/lib/rate-limit";
import { securityReport } from "@/lib/checkers";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  return api("security-check", async () => {
    const domain = checkerInput(await readJson(request));
    await rateLimit(clientIdentity(request.headers), "security-check", 15, 300);
    return securityReport(domain);
  });
}