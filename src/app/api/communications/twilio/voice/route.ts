import { twilioWebhookResponse } from "@/lib/communications/twilio-webhooks";
export const runtime = "nodejs";
export async function POST(request: Request) { return twilioWebhookResponse(request, "voice"); }
