import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionSafe } from "@/lib/session";
import ProposalDetailClient from "./ProposalDetailClient";
import type { Proposal } from "@/lib/mock/proposals";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchProposal(id: string): Promise<{ proposal: Proposal | null; error?: string; status?: number }> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("ipa_session");

  if (!sessionCookie) {
    return { proposal: null, error: "unauthenticated", status: 401 };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/proposals/${id}`, {
    headers: {
      Cookie: `ipa_session=${sessionCookie.value}`,
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    return { proposal: null, error: "unauthenticated", status: 401 };
  }

  if (res.status === 403) {
    return { proposal: null, error: "You do not have access to this proposal", status: 403 };
  }

  if (res.status === 404) {
    return { proposal: null, error: "Proposal not found", status: 404 };
  }

  const data = await res.json();

  if (!data.ok) {
    return { proposal: null, error: data.error || "Unknown error" };
  }

  return { proposal: data.data.proposal };
}

export default async function ProposalDetailPage({ params }: PageProps) {
  const { user } = await getSessionSafe();
  const { id } = await params;

  if (!user) {
    redirect("/login");
  }

  const { proposal, error, status } = await fetchProposal(id);

  if (status === 401) {
    redirect("/login");
  }

  return <ProposalDetailClient proposal={proposal} error={error} />;
}
