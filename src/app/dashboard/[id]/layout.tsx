import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { SidebarIntelligence } from "@/components/sidebar-intelligence";
import { PatientHeader } from "@/components/patient-header";
import { AiLoader } from "@/components/ui/ai-loader";
import { getPatientById } from "@/lib/data-service";

interface DashboardLayoutProps {
  children: ReactNode;
  params: Promise<{ id: string }>;
}

export default async function DashboardLayout({ children, params }: DashboardLayoutProps) {
  const { id } = await params;
  const patient = await getPatientById(id);

  if (!patient) {
    notFound();
  }

  return (
    <div className="flex h-screen flex-col bg-slate-100 text-slate-900">
      <PatientHeader patient={patient} />
      <Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center bg-slate-50 p-8">
            <AiLoader fullscreen />
          </div>
        }
      >
        <div className="flex flex-1 overflow-hidden">
          <SidebarIntelligence patient={patient} />
          <main className="flex-1 overflow-y-auto p-8">{children}</main>
        </div>
      </Suspense>
    </div>
  );
}
