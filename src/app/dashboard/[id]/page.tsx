import { notFound } from "next/navigation";

import { DashboardTabsClient } from "@/components/dashboard-tabs-client";
import { getPatientById } from "@/lib/data-service";
import { getPatientInsights } from "@/lib/patient-insights";
import type { MasterAIResponse } from "@/types/patient-insights";

interface DashboardPageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { id } = await params;
  const patient = await getPatientById(id);
  let aiInsights: MasterAIResponse | null = null;

  if (!patient) {
    notFound();
  }

  try {
    aiInsights = await getPatientInsights(patient);
  } catch (error) {
    console.error("Failed to load AI insights for dashboard view:", error);
  }

  return <DashboardTabsClient patient={patient} aiInsights={aiInsights} />;
}
