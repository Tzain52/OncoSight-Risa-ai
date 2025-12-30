"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Cigarette,
  HeartPulse,
  Microscope,
  ShieldCheck,
  UserRound,
  Wine,
} from "lucide-react";

import { getPerformanceBadge } from "@/lib/performance";
import type { Patient } from "@/types/patient";

interface ContextTabProps {
  patient: Patient;
  stageSummary?: string | null;
}

const buildComorbidities = (patient: Patient) => {
  const rawBuckets = [
    patient.diabetes,
    patient.hypertension,
    patient.heartDisease,
    patient.copdAsthma,
    patient.otherRelevantComorbidities,
  ];

  const disallowed = ["no", "none", "n/a", "na", "not documented", "unremarkable"];

  const tokens = rawBuckets
    .flatMap((entry) => {
      if (!entry) return [];
      return entry.split(/[,;]| and /i).map((token) => token.trim());
    })
    .filter((token) => {
      if (!token) return false;
      const normalized = token.toLowerCase();
      if (disallowed.includes(normalized)) return false;
      if (/^no(\s|$)/i.test(token) && token.trim().split(/\s+/).length <= 3) {
        return false;
      }
      return true;
    });

  if (!tokens.length) {
    tokens.push("No documented comorbidities");
  }

  return Array.from(new Set(tokens));
};

const highlightAmber = (value: string) => /diab|htn|hyperten|card|heart/i.test(value);

const formatValue = (value?: string | null) => value?.trim() || "—";

const bsaDisplay = (value?: string | null) => (value ? `${value} m²` : "—");

const getRecurrenceBadge = (status?: string | null) => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) {
    return { label: "Status Unknown", classes: "bg-slate-100 text-slate-600" };
  }

  if (normalized.includes("recur") || normalized.includes("relaps")) {
    return { label: status, classes: "bg-rose-100 text-rose-700" };
  }

  return { label: status, classes: "bg-blue-100 text-blue-700" };
};

const getOrganFlag = (flag: boolean | null | undefined, label: string) => {
  if (flag) {
    return {
      icon: AlertTriangle,
      classes: "bg-amber-50 text-amber-700 border-amber-200",
      text: `${label} Dysfunction`,
    };
  }
  return {
    icon: CheckCircle2,
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text: `${label} Safe`,
  };
};

const getHematologyFlag = (cbc?: string | null, abnormal?: string | null) => {
  const combined = `${cbc ?? ""} ${abnormal ?? ""}`.toLowerCase();
  if (!combined.trim()) {
    return {
      icon: CheckCircle2,
      classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
      text: "Hematology Stable",
    };
  }

  const dangerPatterns = /(grade 3|grade 4|severe|transfusion|critical|hemorrhage|platelet\s*<|wbc\s*<|anc\s*<)/;
  const cautionPatterns = /(grade 1|grade 2|mild|anemia|leukopenia|neutropenia|thrombocytopenia|cytopenia|pancytopenia)/;

  if (dangerPatterns.test(combined)) {
    return {
      icon: AlertTriangle,
      classes: "bg-rose-50 text-rose-700 border-rose-200",
      text: "Hematology Danger",
    };
  }

  if (cautionPatterns.test(combined)) {
    return {
      icon: AlertTriangle,
      classes: "bg-amber-50 text-amber-700 border-amber-200",
      text: "Hematology Watch",
    };
  }

  return {
    icon: CheckCircle2,
    classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
    text: "Hematology Stable",
  };
};

export function ContextTab({ patient, stageSummary }: ContextTabProps) {
  const comorbidities = buildComorbidities(patient);
  const performanceBadge = getPerformanceBadge(patient.performanceStatus);
  const recurrenceBadge = getRecurrenceBadge(patient.recurrenceStatus);
  const renalFlag = getOrganFlag(patient.renalDysfunctionFlag, "Renal");
  const liverFlag = getOrganFlag(patient.liverDysfunctionFlag, "Liver");
  const hematologyFlag = getHematologyFlag(patient.cbcValues, patient.abnormalLabFlags);
  const initialStage = patient.initialTnmStage || "N/A";
  const currentStage = patient.currentTnmStage || initialStage;
  const stageChanged =
    initialStage && currentStage && initialStage.toLowerCase() !== currentStage.toLowerCase();
  const race = (patient as Patient & { race?: string }).race ?? "Not documented";
  const bmi = patient.bmi ?? "Not documented";
  const metastaticSites = patient.metastaticSites || patient.metastaticStatus || "Not documented";
  const stageSummaryText = stageSummary?.trim() || (stageChanged ? "Stage evolution pending" : "Stage stable");

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-slate-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
              Patient Status & Vitals
            </p>
          </div>

          <div className="mt-5 space-y-4 text-sm text-slate-600">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Demographics
              </p>
              <div className="mt-2 grid gap-2 text-base font-semibold text-slate-900">
                <span>{formatValue(patient.name)}</span>
                <div className="flex flex-wrap gap-3 text-sm font-medium text-slate-600">
                  <span>{patient.age ? `${patient.age} yrs` : "Age —"}</span>
                  <span>Sex: {formatValue(patient.sex)}</span>
                  <span>Race: {race}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Biometrics
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">BSA</p>
                  <p className="mt-2 text-xl font-bold text-slate-900">{bsaDisplay(patient.bsa)}</p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">BMI</p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">{bmi}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Performance Status
              </p>
              <div className="mt-2 inline-flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-500" />
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${performanceBadge.classes}`}
                >
                  {performanceBadge.label}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Social History
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2">
                  <Cigarette className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Smoking</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatValue(patient.smokingStatus)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-2">
                  <Wine className="h-4 w-4 text-slate-500" />
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Alcohol</p>
                    <p className="text-sm font-semibold text-slate-900">Not documented</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Microscope className="h-5 w-5 text-slate-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
              Disease Architecture
            </p>
          </div>

          <div className="mt-5 space-y-5 text-sm text-slate-600">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Primary Diagnosis
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {formatValue(patient.primaryDiagnosis)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Histology
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {formatValue(patient.histologicType)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Metastatic Sites
              </p>
              <p className="mt-2 text-base font-semibold text-slate-900">{metastaticSites}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Recurrence Status
              </p>
              <span
                className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${recurrenceBadge.classes}`}
              >
                {recurrenceBadge.label}
              </span>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                TNM Evolution
              </p>
              <div className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                <div className="flex flex-col gap-3 text-sm font-semibold text-slate-800 sm:flex-row sm:items-center sm:gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Initial</p>
                    <p>{initialStage}</p>
                  </div>
                  <ArrowRight
                    className={`h-5 w-5 ${
                      stageChanged ? "text-rose-500" : "text-slate-400"
                    } sm:translate-y-0`}
                  />
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Current</p>
                    <p className={stageChanged ? "font-bold text-rose-600" : ""}>{currentStage}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  {stageSummaryText}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-slate-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
              Safety Profile & Comorbidities
            </p>
          </div>

          <div className="mt-5 space-y-5">
            <div className="space-y-3">
              {[renalFlag, liverFlag, hematologyFlag].map((flag, idx) => {
                const Icon = flag.icon;
                const label =
                  idx === 0 ? "Renal Function" : idx === 1 ? "Liver Function" : "Hematology";
                return (
                  <div
                    key={label}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${flag.classes}`}
                  >
                    <Icon className="h-4 w-4" />
                    <div className="flex flex-col">
                      <span className="text-xs uppercase tracking-[0.25em]">{label}</span>
                      <span>{flag.text}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                Comorbidities
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {comorbidities.map((item, idx) => (
                  <span
                    key={`${item}-${idx}`}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      highlightAmber(item)
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-slate-50/70 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <HeartPulse className="h-5 w-5 text-slate-500" />
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Narrative Baseline
          </p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          {patient.overallDiseaseCourseSummary || "No narrative summary provided."}
        </p>
      </section>
    </div>
  );
}
