import * as Tabs from "@radix-ui/react-tabs";
import { notFound } from "next/navigation";

import { DiagnosisTab } from "@/components/tabs/diagnosis-tab";
import { PatientTab } from "@/components/tabs/patient-tab";
import { getPatientById } from "@/lib/data-service";

interface PatientDashboardPageProps {
  params: Promise<{ id: string }>;
}

export default async function PatientDashboardPage({ params }: PatientDashboardPageProps) {
  const { id } = await params;
  const patient = await getPatientById(id);

  if (!patient) {
    notFound();
  }

  const renderComingSoon = () => (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-6 text-sm text-slate-500">
      Coming soon
    </div>
  );

  return (
    <section className="flex h-full flex-col">
      <Tabs.Root defaultValue="patient" className="flex h-full flex-col">
        <Tabs.List className="sticky top-0 z-10 flex w-full gap-2 border-b border-slate-200 bg-white/80 px-1 py-3 text-sm font-semibold text-slate-500 backdrop-blur">
          <Tabs.Trigger
            value="patient"
            className="rounded-full px-4 py-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            Patient
          </Tabs.Trigger>
          <Tabs.Trigger
            value="diagnosis"
            className="rounded-full px-4 py-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            Diagnosis
          </Tabs.Trigger>
          <Tabs.Trigger
            value="evidence"
            className="rounded-full px-4 py-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            Evidence
          </Tabs.Trigger>
          <Tabs.Trigger
            value="journey"
            className="rounded-full px-4 py-2 data-[state=active]:bg-slate-900 data-[state=active]:text-white"
          >
            Journey
          </Tabs.Trigger>
        </Tabs.List>

        <div className="flex-1 overflow-y-auto py-6">
          <Tabs.Content value="patient" className="focus:outline-none">
            <PatientTab patient={patient} />
          </Tabs.Content>
          <Tabs.Content value="diagnosis" className="focus:outline-none">
            <DiagnosisTab patient={patient} />
          </Tabs.Content>
          <Tabs.Content value="evidence" className="focus:outline-none">
            {renderComingSoon()}
          </Tabs.Content>
          <Tabs.Content value="journey" className="focus:outline-none">
            {renderComingSoon()}
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </section>
  );
}
