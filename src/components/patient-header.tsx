"use client";

import Link from "next/link";
import { FileDown } from "lucide-react";

import type { Patient } from "@/types/patient";
import { usePDFGenerator } from "@/hooks/use-pdf-generator";

interface PatientHeaderProps {
  patient: Patient;
}

const Field = ({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) => (
  <div className="flex min-w-[150px] flex-col gap-1">
    <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{label}</span>
    <span
      className={`text-base ${
        emphasize ? "font-semibold text-slate-900" : "text-slate-800"
      }`}
    >
      {value || "—"}
    </span>
  </div>
);

export function PatientHeader({ patient }: PatientHeaderProps) {
  const { isGenerating, generatePDF } = usePDFGenerator(patient);

  return (
    <header className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-8 border-b border-slate-200 bg-white/95 px-8 py-5 shadow-sm backdrop-blur">
      <div className="flex flex-1 flex-wrap items-center gap-8">
        <div className="flex min-w-[220px] flex-col gap-2">
          <p className="text-2xl font-semibold tracking-tight text-slate-900">
            {patient.name || "Unnamed Patient"}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-xs text-slate-700">
              {patient.patientId}
            </span>
            {patient.currentLineOfTherapy && (
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {patient.currentLineOfTherapy}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-8">
          <Field label="Age / Sex" value={`${patient.age ?? "—"} · ${patient.sex || "—"}`} />
          <Field label="Diagnosis Date" value={patient.diagnosisDate || "—"} />
          <Field
            label="Primary Diagnosis"
            value={patient.primaryDiagnosis || patient.histologicType || "—"}
          />
          <Field
            label="Current TNM Stage"
            value={patient.currentTnmStage || patient.initialTnmStage || "—"}
            emphasize
          />
          <Field label="Last Encounter" value={patient.lastClinicalEncounterDate || "—"} />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={generatePDF}
          disabled={isGenerating}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
              Generating Clinical Report...
            </span>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              Export Summary
            </>
          )}
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow hover:border-slate-300 hover:bg-slate-50"
        >
          <span className="text-base">←</span>
          Back to patients
        </Link>
      </div>
    </header>
  );
}
