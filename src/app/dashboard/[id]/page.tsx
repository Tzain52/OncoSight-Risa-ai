import * as Tabs from "@radix-ui/react-tabs";
import { notFound } from "next/navigation";

import { DiagnosisTab } from "@/components/tabs/diagnosis-tab";
import { InvestigationsTab } from "@/components/tabs/investigations-tab";
import { PatientTab } from "@/components/tabs/patient-tab";
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

  return (
    <section className="flex h-full flex-col">
      <Tabs.Root defaultValue="patient" className="flex h-full flex-col">
        <Tabs.List className="sticky top-0 z-10 flex w-full items-center gap-3 border-b border-slate-100 bg-white/95 px-4 py-4 text-sm font-semibold text-slate-500 shadow-[0_2px_12px_rgba(15,23,42,0.05)] backdrop-blur">
          {[
            { value: "patient", label: "Patient" },
            { value: "diagnosis", label: "Diagnosis" },
            { value: "investigations", label: "Investigations" },
          ].map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="rounded-full px-5 py-2 transition focus-visible:outline-none data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_20px_rgba(15,23,42,0.18)] data-[state=inactive]:bg-slate-100/60 data-[state=inactive]:text-slate-500"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="flex-1 overflow-y-auto py-6">
          <Tabs.Content value="patient" className="focus:outline-none">
            <PatientTab patient={patient} />
          </Tabs.Content>
          <Tabs.Content value="diagnosis" className="focus:outline-none">
            <DiagnosisTab patient={patient} />
          </Tabs.Content>
          <Tabs.Content value="investigations" className="focus:outline-none">
            <InvestigationsTab patient={patient} aiInsights={aiInsights} />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </section>
  );
}
