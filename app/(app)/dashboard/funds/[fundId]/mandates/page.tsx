import { requireRoleWithTenantContext } from "@/lib/authz";
import { getFundById, getLinkedMandates } from "@/lib/mock/fundsStore";
import { listFundMandates, getFundMandateById } from "@/lib/mock/fundMandates";
import { redirect } from "next/navigation";
import FundMandatesClient from "./FundMandatesClient";

interface PageProps {
  params: Promise<{ fundId: string }>;
}

export default async function FundMandatesPage({ params }: PageProps) {
  const { tenantId } = await requireRoleWithTenantContext(["tenant_admin", "saas_admin"]);
  const { fundId } = await params;

  const fund = getFundById(tenantId, fundId);
  if (!fund) {
    redirect("/dashboard/funds");
  }

  const linkedMandateIds = getLinkedMandates(tenantId, fundId);
  const allMandates = listFundMandates(tenantId);

  const linkedMandates = linkedMandateIds
    .map((id) => getFundMandateById(tenantId, id))
    .filter(Boolean);

  const availableMandates = allMandates.filter(
    (m) => !linkedMandateIds.includes(m.id)
  );

  return (
    <FundMandatesClient
      fund={fund}
      linkedMandates={linkedMandates}
      availableMandates={availableMandates}
    />
  );
}
