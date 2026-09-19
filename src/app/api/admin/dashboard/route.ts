import type { NextRequest } from "next/server";
import { getAdminDashboard } from "@/lib/admin/admin-service";
import { requireAuthenticatedUser } from "@/lib/auth/request-context";
import { success, withApiErrorHandling } from "@/lib/http/api-response";

export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) { return withApiErrorHandling(request, async (requestId) => success(await getAdminDashboard(await requireAuthenticatedUser(request)), requestId)); }
