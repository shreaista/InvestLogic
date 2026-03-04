import {
  requireRBACPermissionWithTenantContext,
  isForbidden,
  RBAC_PERMISSIONS,
} from "@/lib/authz";
import { ForbiddenPage } from "@/components/app/ForbiddenPage";
import MandatesClient from "./MandatesClient";

export default async function MandatesPage() {
  const result = await requireRBACPermissionWithTenantContext(
    RBAC_PERMISSIONS.FUND_MANDATE_READ
  );

  if (isForbidden(result)) {
    return <ForbiddenPage message={result.message} />;
  }

  return <MandatesClient />;
}
