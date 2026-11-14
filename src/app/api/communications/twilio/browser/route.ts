import { browserCallTwiml } from "@/lib/communications/browser-call-service";
export const runtime = "nodejs";
export async function POST(request: Request) { return browserCallTwiml(request); }
