import type { ReactNode } from "react";

import Link from "next/link";

import { loadPatients } from "@/lib/data-service";
import type { Patient } from "@/types/patient";

type Column = {
  label: string;
  width: string;
  cellClass?: string;
  render: (patient: Patient) => ReactNode;
};

const formatEncounterDate = (value?: string | null) => {
  if (!value) return "Pending";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return "Pending";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(timestamp));
};

const columns: Column[] = [
  {
    label: "MRN",
    width: "w-[100px]",
    render: (patient) => <p className="font-semibold text-slate-100">{patient.patientId}</p>,
  },
  {
    label: "Patient",
    width: "w-[200px]",
    render: (patient) => (
      <div className="space-y-0.5">
        <p className="text-base font-semibold text-white">{patient.name || "Name withheld"}</p>
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
          {patient.sex || "—"} · {patient.age ? `${patient.age}y` : "Age N/A"} · {patient.performanceStatus || "PS N/A"}
        </p>
      </div>
    ),
  },
  {
    label: "Primary Diagnosis",
    width: "w-[240px]",
    render: (patient) => (
      <div>
        <p className="font-semibold text-slate-100">{patient.primaryDiagnosis || "Diagnosis pending"}</p>
        <p className="text-xs text-slate-400">{patient.histologicType || "Histology not reported"}</p>
      </div>
    ),
  },
  {
    label: "Stage / Metastasis",
    width: "w-[200px]",
    render: (patient) => (
      <div>
        <p className="font-semibold text-emerald-300">
          {patient.currentTnmStage || patient.initialTnmStage || "Stage TBD"}
        </p>
        <p className="text-xs text-slate-400">
          {patient.metastaticStatus || patient.metastaticSites || "Metastasis not documented"}
        </p>
      </div>
    ),
  },
  {
    label: "Current Line / Strategy",
    width: "w-[240px]",
    render: (patient) => (
      <div>
        <p className="font-semibold text-slate-100">{patient.currentLineOfTherapy || "Strategy not logged"}</p>
        <p className="text-xs text-slate-400">
          {patient.treatmentPlanSummary || patient.regimenDetails || "Awaiting plan summary"}
        </p>
      </div>
    ),
  },
  {
    label: "Last Encounter",
    width: "w-[160px]",
    render: (patient) => (
      <div className="text-slate-200">
        <p className="font-semibold">{formatEncounterDate(patient.lastClinicalEncounterDate)}</p>
        <p className="text-xs text-slate-400">
          {patient.radiologyTrend || patient.radiologyImpressionKeywords || "No recent imaging note"}
        </p>
      </div>
    ),
  },
  {
    label: "Open",
    width: "w-[110px]",
    cellClass: "text-right",
    render: (patient) => (
      <Link
        href={`/dashboard/${patient.patientId}`}
        className="inline-flex items-center rounded-full border border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white hover:bg-white hover:text-slate-900"
      >
        Review
      </Link>
    ),
  },
];

export default async function PatientListPage() {
  const patients = await loadPatients();

  return (
    <main className="min-h-screen bg-slate-950 pb-20 pt-16 text-slate-50">
      <div className="mx-auto w-full max-w-6xl px-6">
        <header className="space-y-4">
          <p className="text-xs uppercase tracking-[0.5em] text-slate-400">OncoSight / Registry</p>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h1 className="text-4xl font-semibold text-white">Consulting Cohort</h1>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-right">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Total records</p>
              <p className="text-3xl font-semibold text-white">{patients.length}</p>
            </div>
          </div>
        </header>

        <section className="relative mt-10 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_20px_45px_rgba(15,23,42,0.35)]">
          <div className="overflow-x-auto">
            <table className="w-full table-auto border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5 text-left text-xs uppercase tracking-[0.25em] text-slate-400">
                  {columns.map((column) => (
                    <th key={column.label} className={`${column.width} px-6 py-4`}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {patients.map((patient) => (
                  <tr
                    key={patient.patientId}
                    className="bg-gradient-to-r from-white/[0.02] to-transparent transition hover:from-white/[0.08]"
                  >
                    {columns.map((column) => (
                      <td key={column.label} className={`${column.width} px-6 py-4 align-top ${column.cellClass ?? ""}`}>
                        {column.render(patient)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
