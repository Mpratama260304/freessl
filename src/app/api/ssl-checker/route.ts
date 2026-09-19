import { NextRequest } from "next/server";
import { api, readJson } from "@/lib/api";
import { checkerInput } from "@/lib/validation/requests";
import { clientIdentity, rateLimit } from "@/lib/rate-limit";
import { sslReport } from "@/lib/checkers";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  return api("ssl-checker", async () => {
    const domain = checkerInput(await readJson(request));
    await rateLimit(clientIdentity(request.headers), "ssl-checker", 20, 300);
    return sslReport(domain);
  });
}