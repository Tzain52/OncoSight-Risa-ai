import Link from "next/link";

import { loadPatients } from "@/lib/data-service";

export default async function PatientListPage() {
  const patients = await loadPatients();

  return (
    <main className="min-h-screen bg-slate-100 py-16">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6">
        <header className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">OncoSight</p>
          <h1 className="text-4xl font-semibold text-slate-900">Cohort Browser</h1>
          <p className="text-base text-slate-500">
            Deterministic snapshot from the CSV source. Select a patient to open the Master
            Intelligence layer.
          </p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          {patients.map((patient) => (
            <Link
              key={patient.patientId}
              href={`/dashboard/${patient.patientId}`}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-900/30 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {patient.patientId}
                </p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 group-hover:bg-slate-900 group-hover:text-white">
                  {patient.primaryDiagnosis || "Primary"}
                </span>
              </div>
              <div className="mt-4 space-y-1">
                <p className="text-xl font-semibold text-slate-900">{patient.name}</p>
                <p className="text-sm text-slate-500">{patient.primaryDiagnosis}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  Histology: {patient.histologicType || "N/A"}
                </span>
                <span className="rounded-full bg-slate-100 px-2 py-1">
                  Stage: {patient.currentTnmStage || "Unknown"}
                </span>
              </div>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
