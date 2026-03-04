import "server-only";

import { cookies } from "next/headers";
import type { SessionUser, SessionSafeResult } from "./types";

export type { SessionUser, SessionSafeResult };

export async function getSessionSafe(): Promise<SessionSafeResult> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("ipa_session")?.value;

    if (!token) {
      return { user: null };
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return { user: null };
    }

    const payloadBase64 = parts[1];
    const payloadJson = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    const payload = JSON.parse(payloadJson);

    if (!payload.email && !payload.userId) {
      return { user: null };
    }

    const role = payload.role || "assessor";

    // Check for active tenant cookie (applies to all roles)
    const tenantCookie = cookieStore.get("ipa_tenant")?.value;
    
    // For saas_admin: use cookie if set, otherwise null (global view)
    // For tenant_admin/assessor: use cookie (required for dashboard access)
    let activeTenantId: string | undefined;
    if (tenantCookie) {
      activeTenantId = tenantCookie;
    } else if (role !== "saas_admin") {
      // For non-saas_admin, fall back to payload tenantId if no cookie
      activeTenantId = payload.tenantId;
    }

    return {
      user: {
        userId: payload.userId || payload.sub || "",
        email: payload.email || "",
        role,
        name: payload.name || "",
        tenantId: activeTenantId,
      },
    };
  } catch {
    return { user: null };
  }
}
