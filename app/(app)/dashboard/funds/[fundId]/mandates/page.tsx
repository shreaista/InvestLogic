import { requireRoleWithTenantContext } from "@/lib/authz";
import { getFundByIdPg } from "@/lib/funds/listFundsPg";
import { redirect } from "next/navigation";
import FundMandatesPageClient from "./FundMandatesPageClient";

interface PageProps {
  params: Promise<{ fundId: string }>;
}

export default async function FundMandatesPage({ params }: PageProps) {
  const { tenantId } = await requireRoleWithTenantContext(["tenant_admin", "saas_admin", "fund_manager", "assessor", "viewer"]);
  const { fundId } = await params;

  const fund = await getFundByIdPg(tenantId, fundId);
  if (!fund) {
    redirect("/dashboard/funds");
  }

  return <FundMandatesPageClient fund={fund} />;
}
