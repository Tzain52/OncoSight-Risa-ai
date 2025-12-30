"use client";

import { Activity, AlertCircle, AlertTriangle, ArrowRight, Compass, Dna, Pill, TrendingUp, XCircle } from "lucide-react";

import type { MasterAIResponse } from "@/types/patient-insights";
import type { Patient } from "@/types/patient";
import { BADGE, BODY_TEXT, CARD, CARD_TITLE, LABEL_TEXT, SECTION_HEADER } from "./design-system";

interface DiagnosisTabProps {
  patient: Patient;
  aiInsights?: MasterAIResponse | null;
}

type TreatmentLine = {
  lineLabel: string;
  regimen: string;
  startDate: string;
  endDate: string;
  response: string;
  status?: string;
  reasonStopped?: string;
  toxicities?: string;
  isCurrent?: boolean;
};

const MOCK_DATA = {
  metastaticSites: ["Brain", "Liver", "Bone"],
  aiInsights: {
    diseaseTrajectory: "Rapid progression",
  },
  treatmentHistory: [
    {
      lineLabel: "Line 1",
      regimen: "Osimertinib 80mg PO Daily",
      startDate: "Feb 2023",
      endDate: "Ongoing",
      response: "PR",
      status: "Active",
      isCurrent: true,
    },
    {
      lineLabel: "Line 2",
      regimen: "Carbo/Pem/Pembro",
      startDate: "Jun 2022",
      endDate: "Jan 2023",
      response: "SD",
      status: "Ended",
      reasonStopped: "Progression",
    },
    {
      lineLabel: "Line 3",
      regimen: "Docetaxel + Ramucirumab",
      startDate: "Jan 2021",
      endDate: "May 2022",
      response: "PD",
      status: "Ended",
      reasonStopped: "Toxicity",
    },
  ] satisfies TreatmentLine[],
};

const parsePercent = (input?: string | null): number | null => {
  if (!input) return null;
  const match = input.match(/([-+]?\d*\.?\d+)/);
  if (!match) return null;
  const value = Number.parseFloat(match[1]);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
};

const parseTmb = (input?: string | null): string => input?.trim() || "Not reported";

const formatMetastaticSites = (patient: Patient) => {
  const legacyArray = (patient as Patient & { metastatic_sites?: string[] }).metastatic_sites;
  if (legacyArray && legacyArray.length) return legacyArray;

  const fromString = patient.metastaticSites
    ?.split(/[,;]/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (fromString && fromString.length) return fromString;

  return MOCK_DATA.metastaticSites;
};

const getDriverMutation = (patient: Patient) => {
  const genomics = (patient as Patient & { genomics?: string }).genomics;
  if (genomics?.trim()) {
    return genomics.trim();
  }
  if (patient.actionableMutationSummary?.trim()) {
    return patient.actionableMutationSummary.trim();
  }

  const candidate =
    patient.egfrMutation ||
    patient.alkRearrangement ||
    patient.ros1Rearrangement ||
    patient.krasMutation ||
    patient.brafMutation;

  return candidate?.trim() || null;
};

const normalizeEndStatus = (value?: string | null) => {
  if (!value) return { label: "Ongoing", ended: false };
  const trimmed = value.trim();
  if (!trimmed || /ongoing|current|active/i.test(trimmed)) {
    return { label: "Ongoing", ended: false };
  }
  return { label: trimmed, ended: true };
};

const getTreatmentHistory = (patient: Patient): TreatmentLine[] => {
  const explicitHistory = (
    patient as Patient & {
      treatment_history?: Array<
        TreatmentLine & {
          reason_stopped?: string;
          toxicities?: string;
        }
      >;
    }
  ).treatment_history;
  if (explicitHistory?.length) {
    return explicitHistory.map((line) => ({
      ...line,
      reasonStopped: line.reasonStopped || line.reason_stopped,
      toxicities: line.toxicities,
    }));
  }

  if (patient.treatmentTimeline?.length) {
    return patient.treatmentTimeline.map((event, index) => {
      const extendedEvent = event as {
        reasonForStopping?: string;
        reason_for_stopping?: string;
        toxicities?: string;
        treatmentRelatedToxicities?: string;
      };
      const endMeta = normalizeEndStatus(event.endDate);
      return {
        lineLabel: event.line ? `Line ${event.line}` : `Line ${index + 1}`,
        regimen: event.regimen || event.response || "Regimen not documented",
        startDate: event.startDate || "Start N/A",
        endDate: endMeta.label,
        response: event.response || "ND",
        status: endMeta.ended ? "Ended" : "Active",
        isCurrent: !endMeta.ended,
        reasonStopped: extendedEvent.reasonForStopping || extendedEvent.reason_for_stopping,
        toxicities: extendedEvent.toxicities || extendedEvent.treatmentRelatedToxicities,
      };
    });
  }

  return MOCK_DATA.treatmentHistory;
};

const pillTone = (value: number | null) => {
  if (value === null) return "text-slate-600 bg-slate-100";
  if (value >= 50) return "text-emerald-900 bg-emerald-100";
  if (value >= 1) return "text-amber-900 bg-amber-100";
  return "text-slate-700 bg-slate-100";
};

const responseTone = (response: string) => {
  const normalized = response?.toLowerCase() ?? "";
  if (normalized.includes("cr") || normalized.includes("pr")) {
    return "text-emerald-600";
  }
  if (normalized.includes("pd")) {
    return "text-rose-600";
  }
  if (normalized.includes("sd")) {
    return "text-amber-600";
  }
  return "text-slate-500";
};

const STATUS_TONE_DEFAULT = {
  text: "text-slate-700",
  badge: "border border-slate-200 bg-slate-50 text-slate-700",
  border: "border-slate-200",
  icon: "text-slate-500",
};

const statusTone = (value?: string | null) => {
  const normalized = value?.toLowerCase() ?? "";
  if (/progress|pd/.test(normalized)) {
    return {
      text: "text-rose-700",
      badge: "border border-rose-200 bg-rose-50 text-rose-700",
      border: "border-rose-200 bg-rose-50/40",
      icon: "text-rose-600",
    };
  }
  if (/stable|sd/.test(normalized)) {
    return {
      text: "text-amber-700",
      badge: "border border-amber-200 bg-amber-50 text-amber-800",
      border: "border-amber-200 bg-amber-50/40",
      icon: "text-amber-600",
    };
  }
  if (/response|pr|cr/.test(normalized)) {
    return {
      text: "text-emerald-700",
      badge: "border border-emerald-200 bg-emerald-50 text-emerald-700",
      border: "border-emerald-200 bg-emerald-50/40",
      icon: "text-emerald-600",
    };
  }
  return STATUS_TONE_DEFAULT;
};

const recurrenceBadge = (status?: string | null) => {
  const normalized = status?.toLowerCase() ?? "";
  if (!normalized) {
    return { label: "Status Unknown", classes: "bg-slate-100 text-slate-600" };
  }
  if (normalized.includes("recur") || normalized.includes("relap") || normalized.includes("progression")) {
    return { label: status, classes: "bg-rose-100 text-rose-700" };
  }
  return { label: status, classes: "bg-blue-100 text-blue-700" };
};

const discontinuationMeta = (reason?: string) => {
  const normalized = reason?.toLowerCase() ?? "";
  if (!normalized) {
    return {
      icon: AlertTriangle,
      classes: "text-slate-500",
    };
  }
  if (normalized.includes("progress")) {
    return {
      icon: AlertTriangle,
      classes: "text-rose-600",
    };
  }
  if (normalized.includes("tox") || normalized.includes("ae") || normalized.includes("immune")) {
    return {
      icon: XCircle,
      classes: "text-amber-600",
    };
  }
  return {
    icon: AlertTriangle,
    classes: "text-slate-500",
  };
};

const stageRank = (stage?: string | null): number | null => {
  if (!stage) return null;
  const match = stage.match(/stage\s*([0-9ivx]+)/i);
  if (match) {
    const token = match[1].toUpperCase();
    const romanMap: Record<string, number> = { "0": 0, I: 1, II: 2, III: 3, IV: 4 };
    if (romanMap[token]) return romanMap[token];
    const numeric = Number.parseInt(token, 10);
    if (Number.isFinite(numeric)) return numeric;
  }
  const fallbackMatch = stage.match(/([IVX]+)(?:\w+)?/i);
  if (fallbackMatch) {
    const token = fallbackMatch[1].toUpperCase();
    const romanMap: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };
    if (romanMap[token]) return romanMap[token];
  }
  return null;
};

const hasMetastasis = (stage?: string | null) => {
  if (!stage) return false;
  return /M1|Stage\s*IV|metastatic/i.test(stage);
};

const buildTrajectorySummary = (initialStage?: string | null, currentStage?: string | null) => {
  const initialRank = stageRank(initialStage);
  const currentRank = stageRank(currentStage);
  if (initialRank !== null && currentRank !== null) {
    if (currentRank > initialRank) {
      return "Disease Progression";
    }
    if (currentRank < initialRank) {
      return "Partial Response";
    }
  }

  const initialMet = hasMetastasis(initialStage);
  const currentMet = hasMetastasis(currentStage);
  if (!initialMet && currentMet) {
    return "Metastatic Recurrence";
  }

  if (initialRank !== null && currentRank !== null && currentRank === initialRank) {
    return "Stable Disease";
  }

  return null;
};

export function DiagnosisTab({ patient, aiInsights }: DiagnosisTabProps) {
  const driverMutation = getDriverMutation(patient);
  const pdL1Percent = parsePercent(patient.pdL1Expression);
  const tmbDisplay = parseTmb(patient.tumorMutationalBurden);
  const msiDisplay = patient.microsatelliteInstability?.trim() || "Not reported";
  const metastaticSites = formatMetastaticSites(patient);
  const treatmentHistory = getTreatmentHistory(patient);
  const rawInsights = (
    patient as Patient & {
      aiInsights?: {
        diseaseTrajectory?: string;
        disease_trajectory?: string;
        diagnosis?: {
          staging_summary?: string;
        };
      };
    }
  ).aiInsights;
  const stages = {
    initial: patient.initialTnmStage || "Unknown",
    current: patient.currentTnmStage || patient.initialTnmStage || "Unknown",
  };
  const aiStagingSummary = rawInsights?.diagnosis?.staging_summary?.trim();
  const computedSummary =
    aiStagingSummary ||
    rawInsights?.diseaseTrajectory ||
    rawInsights?.disease_trajectory ||
    buildTrajectorySummary(stages.initial, stages.current) ||
    null;
  const recurrence = recurrenceBadge(patient.recurrenceStatus);

  const aiStatus = aiInsights?.current_status_summary?.trim();
  const fallbackStatus =
    patient.responsePerLine ||
    (patient as Patient & { response_per_line?: string }).response_per_line ||
    "";
  const tone = statusTone(aiStatus || fallbackStatus || "");

  return (
    <div className="space-y-6">
      <section className={CARD}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className={SECTION_HEADER}>Clinical Identity</p>
            <h2 className="text-lg font-semibold text-slate-900">
              {patient.primaryDiagnosis || "Primary diagnosis not documented"}
            </h2>
            <p className={BODY_TEXT}>
              {patient.histologicType || "Histology not documented"}{" "}
              {patient.tumorGrade ? `• Grade ${patient.tumorGrade}` : null}
            </p>
            <div
              className={`mt-3 flex items-start gap-3 rounded-xl border bg-white px-4 py-3 ${tone.border}`}
            >
              <TrendingUp className={`h-5 w-5 ${tone.icon}`} />
              <div>
                <p className={`${LABEL_TEXT} mb-1 text-xs`}>Current disease status</p>
                {aiStatus ? (
                  <p className={`text-sm font-medium ${tone.text}`}>{aiStatus}</p>
                ) : fallbackStatus ? (
                  <span className={`${BADGE} ${tone.badge}`}>{fallbackStatus}</span>
                ) : (
                  <p className={LABEL_TEXT}>Status not documented.</p>
                )}
              </div>
            </div>
          </div>

          <div className="w-full max-w-xl space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <Dna className="h-4 w-4" />
                Driver Mutation
              </div>
              {!driverMutation && <span className={LABEL_TEXT}>Awaiting sequencing</span>}
            </div>
            <div
              className={`${BADGE} ${
                driverMutation ? "bg-emerald-50 text-emerald-700" : "border border-dashed border-slate-300 text-slate-600"
              }`}
            >
              {driverMutation || "No actionable driver detected"}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className={`${BADGE} ${pillTone(pdL1Percent)}`}>
                PD-L1 TPS: {pdL1Percent !== null ? `${pdL1Percent}%` : "Not reported"}
              </span>
              <span className={`${BADGE} bg-slate-100 text-slate-700`}>TMB: {tmbDisplay}</span>
              <span className={`${BADGE} bg-slate-100 text-slate-700`}>MSI: {msiDisplay}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className={CARD}>
          <div className="flex items-center gap-3">
            <Activity className="h-5 w-5 text-slate-500" />
            <p className={SECTION_HEADER}>Metastatic Spread & Status</p>
          </div>
          <div className="mt-5 space-y-4">
            <span className={`${BADGE} ${recurrence.classes}`}>{recurrence.label}</span>

            <div className="space-y-2">
              <p className={LABEL_TEXT}>Metastatic Sites</p>
              <div className="flex flex-wrap gap-2">
                {metastaticSites.length ? (
                  metastaticSites.map((site, idx) => (
                    <span key={`${site}-${idx}`} className={`${BADGE} border border-slate-200 text-slate-700`}>
                      {site}
                    </span>
                  ))
                ) : (
                  <span className={BODY_TEXT}>No distant metastasis documented.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`${CARD} overflow-hidden border border-slate-200 bg-white shadow-lg`}>
          <div className="flex items-center gap-3 text-slate-500">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <Compass className="h-5 w-5" />
            </span>
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Staging Trajectory</p>
          </div>

          <div className="mt-8 space-y-8 text-slate-900">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Initial</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{stages.initial}</p>
              </div>

              <div className="flex flex-col items-center gap-3 text-center sm:min-w-[180px]">
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <ArrowRight className="h-4 w-4" />
                  Trajectory
                </div>
                <span
                  className={`${BADGE} text-sm ${
                    computedSummary
                      ? "bg-slate-900 text-white shadow-lg"
                      : "border border-dashed border-slate-300 bg-transparent text-slate-400 animate-pulse"
                  }`}
                >
                  {computedSummary || "Analyzing trajectory..."}
                </span>
              </div>

              <div className="text-right sm:text-left">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Current</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{stages.current}</p>
              </div>
            </div>

            <div className="relative mx-auto h-px w-full max-w-2xl bg-gradient-to-r from-transparent via-slate-200 to-transparent">
              <div className="absolute left-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-slate-200 shadow-[0_0_10px_rgba(148,163,184,0.5)]" />
              <div className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.6)]" />
              <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-slate-200 bg-white">
                <div className="absolute inset-1 rounded-full bg-slate-900" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={CARD}>
        <p className={SECTION_HEADER}>Therapeutic Timeline</p>
        <div className="space-y-4">
          {treatmentHistory.map((line, idx) => (
            <div
              key={`${line.lineLabel}-${idx}`}
              className={`rounded-xl border border-slate-200 px-4 py-4 ${
                line.isCurrent ? "bg-slate-50" : "bg-white"
              }`}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className={`${BADGE} bg-slate-900 text-white`}>
                  {line.lineLabel}
                </span>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Pill className="h-4 w-4 text-slate-500" />
                  {line.regimen}
                  {line.isCurrent && (
                    <span className={`${BADGE} flex items-center gap-1 bg-emerald-50 text-emerald-700`}>
                      <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                      Active
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <span>
                  Dates:{" "}
                  <span className="text-slate-900 normal-case tracking-normal text-sm font-medium">
                    {line.startDate} — {line.endDate}
                  </span>
                </span>
                <span>
                  Response:{" "}
                  <span className={`text-sm font-semibold normal-case tracking-normal ${responseTone(line.response)}`}>
                    {line.response || "Not documented"}
                  </span>
                </span>
              </div>
              {line.toxicities && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <Activity className="mt-0.5 h-4 w-4 text-slate-500" />
                  <span>Toxicities: {line.toxicities}</span>
                </div>
              )}
              {line.status?.toLowerCase() === "ended" && line.reasonStopped && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  {(() => {
                    const meta = discontinuationMeta(line.reasonStopped);
                    const Icon = meta.icon;
                    return <Icon className={`h-4 w-4 ${meta.classes}`} />;
                  })()}
                  <span className={discontinuationMeta(line.reasonStopped).classes}>
                    Discontinued due to: {line.reasonStopped}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
