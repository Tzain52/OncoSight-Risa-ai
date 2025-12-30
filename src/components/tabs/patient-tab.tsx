"use client";

import { getPerformanceBadge } from "@/lib/performance";
import type { Patient } from "@/types/patient";

interface PatientTabProps {
  patient: Patient;
}

const formatValue = (value?: string | number | null, fallback = "Not Recorded") => {
  if (value === null || value === undefined) return fallback;
  const trimmed = typeof value === "string" ? value.trim() : value.toString();
  return trimmed.length ? trimmed : fallback;
};

const buildComorbidities = (patient: Patient) => {
  const legacyField = (patient as Patient & { comorbidities?: string }).comorbidities;
  const combinedSource = legacyField || patient.otherRelevantComorbidities || "";

  const tokens = combinedSource
    .split(/[,;]+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) {
    return ["No documented comorbidities"];
  }

  return tokens;
};

const isHighRiskComorbidity = (value: string) => {
  const normalized = value.toLowerCase();
  return normalized.includes("diab") || normalized.includes("cad") || normalized.includes("htn");
};

const formatFlag = (raw?: string | null, fallbackBoolean?: boolean | null) => {
  const normalized = (raw ?? "").trim().toLowerCase();
  if (normalized === "yes" || normalized === "true") {
    return true;
  }
  if (normalized === "no" || normalized === "false") {
    return false;
  }
  return Boolean(fallbackBoolean);
};

export function PatientTab({ patient }: PatientTabProps) {
  const performanceBadge = getPerformanceBadge(patient.performanceStatus);
  const race = (patient as Patient & { race?: string }).race ?? "Not recorded";
  const mrn = formatValue(patient.patientId, "N/A");

  const smokingHistory =
    (patient as Patient & { smoking_status?: string }).smoking_status || patient.smokingStatus;
  const alcoholHistory = (patient as Patient & { alcohol_history?: string }).alcohol_history;

  const renalFlag = formatFlag(
    (patient as Patient & { renal_flag?: string }).renal_flag,
    patient.renalDysfunctionFlag,
  );
  const liverFlag = formatFlag(
    (patient as Patient & { liver_flag?: string }).liver_flag,
    patient.liverDysfunctionFlag,
  );

  const comorbidities = buildComorbidities(patient);

  const bsaDisplay = patient.bsa ? `${patient.bsa} m²` : "Not Recorded";
  const bmiDisplay = patient.bmi ?? "Not Recorded";

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-3">
        {/* Column 1: Identity & Biometrics */}
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Patient Identity & Biometrics
          </p>

          <div className="mt-5 space-y-4 text-sm text-slate-600">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Identity</p>
              <div className="mt-2 space-y-1 text-base font-semibold text-slate-900">
                <p>{formatValue(patient.name, "Name not recorded")}</p>
                <p className="text-sm font-medium text-slate-500">MRN • {mrn}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.25em] text-slate-500">
                <span>Age: {formatValue(patient.age ?? null, "N/A")}</span>
                <span>Sex: {formatValue(patient.sex, "N/A")}</span>
                <span>Race: {race}</span>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Biometrics</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">BSA</p>
                  <p
                    className={`mt-2 text-xl font-bold ${
                      bsaDisplay === "Not Recorded" ? "text-slate-400" : "text-slate-900"
                    }`}
                  >
                    {bsaDisplay}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">BMI</p>
                  <p
                    className={`mt-2 text-xl font-bold ${
                      bmiDisplay === "Not Recorded" ? "text-slate-400" : "text-slate-900"
                    }`}
                  >
                    {bmiDisplay}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 2: Performance & Social */}
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Performance & Social
          </p>

          <div className="mt-5 space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Performance Status</p>
              <div className="mt-3 inline-flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${performanceBadge.classes}`}
                >
                  {formatValue(patient.performanceStatus, "Not recorded")}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Social History</p>
              <div className="mt-3 space-y-3 text-sm font-semibold text-slate-800">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3 py-2">
                  <span className="text-lg" aria-hidden>
                    🚬
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Smoking</p>
                    <p>{formatValue(smokingHistory, "Not recorded")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/60 px-3 py-2">
                  <span className="text-lg" aria-hidden>
                    🍷
                  </span>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Alcohol</p>
                    <p>{formatValue(alcoholHistory, "Not recorded")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Column 3: Safety & History */}
        <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Safety Profile & History
          </p>

          <div className="mt-5 space-y-5">
            <div className="space-y-3">
              {[
                {
                  label: "Renal",
                  flag: renalFlag,
                  safeText: "✅ Renal Function Preserved",
                  riskText: "⚠️ Renal Dysfunction",
                },
                {
                  label: "Liver",
                  flag: liverFlag,
                  safeText: "✅ Liver Function Preserved",
                  riskText: "⚠️ Liver Dysfunction",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                    item.flag
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">{item.label}</p>
                  <p className="mt-1">{item.flag ? item.riskText : item.safeText}</p>
                </div>
              ))}
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Comorbidities</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {comorbidities.map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      isHighRiskComorbidity(item)
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

      <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Narrative Baseline
          </p>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          {patient.overallDiseaseCourseSummary || "No narrative baseline documented."}
        </p>
      </section>
    </div>
  );
}
