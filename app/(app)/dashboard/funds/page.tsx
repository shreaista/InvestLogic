import { requireRoleWithTenantContext, getAuthzContext } from "@/lib/authz";
import { listFundMandates, type FundMandateTemplate } from "@/lib/mock/fundMandates";
import { listFundsPg } from "@/lib/funds/listFundsPg";
import FundsClient from "./FundsClient";

const TENANT_ID = "tenant_ipa_001";

export default async function FundsPage() {
  await requireRoleWithTenantContext(["tenant_admin", "saas_admin"]);
  const ctx = await getAuthzContext();

  const fundMandatesEnabled = ctx.entitlements?.fundMandatesEnabled ?? false;
  const canManageFundMandates = ctx.entitlements?.canManageFundMandates ?? false;

  const funds = await listFundsPg(TENANT_ID);
  let mandates: FundMandateTemplate[] = [];

  if (fundMandatesEnabled) {
    mandates = listFundMandates(TENANT_ID);
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
