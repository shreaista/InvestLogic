import { requireRoleWithTenantContext, getAuthzContext } from "@/lib/authz";
import { listFundMandates, type FundMandateTemplate } from "@/lib/mock/fundMandates";
import { listFunds, type Fund } from "@/lib/mock/fundsStore";
import FundsClient from "./FundsClient";

export default async function FundsPage() {
  const { tenantId } = await requireRoleWithTenantContext(["tenant_admin", "saas_admin"]);
  const ctx = await getAuthzContext();

  const fundMandatesEnabled = ctx.entitlements?.fundMandatesEnabled ?? false;
  const canManageFundMandates = ctx.entitlements?.canManageFundMandates ?? false;

  const funds: Fund[] = listFunds(tenantId);
  let mandates: FundMandateTemplate[] = [];

  if (fundMandatesEnabled) {
    mandates = listFundMandates(tenantId);
  }

  return (
    <FundsClient
      funds={funds}
      fundMandatesEnabled={fundMandatesEnabled}
      canManageFundMandates={canManageFundMandates}
      mandates={mandates}
    />
  );
}
