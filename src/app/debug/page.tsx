import { loadPatients } from "@/lib/data-service";
import { PatientInspector } from "@/components/patient-inspector";
import { generatePatientInsights } from "@/actions/analyze-patient";

export default async function DebugPage() {
  const patients = await loadPatients();

  return (
    <main className="min-h-screen bg-slate-100 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-6xl space-y-8 rounded-2xl bg-white p-8 shadow-lg">
        <header>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">QA surface</p>
          <h1 className="text-3xl font-semibold text-slate-900">Patient Data Inspector</h1>
          <p className="mt-2 text-base text-slate-600">
            Spot check every ingested parameter before we wire it into the clinical dashboard.
          </p>
        </header>
        <PatientInspector patients={patients} analyzePatient={generatePatientInsights} />
      </div>
    </main>
  );
}
