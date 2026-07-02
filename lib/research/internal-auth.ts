import type { NextRequest } from "next/server";

// Sub-agent routes are exempted from the Supabase session check in middleware.ts
// (they're called server-to-server by the orchestrator, not from the browser),
// so they authenticate the orchestrator instead via this shared secret.
export function isInternalRequest(request: NextRequest): boolean {
  const secret = request.headers.get("x-internal-secret");
  return !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET;
}
