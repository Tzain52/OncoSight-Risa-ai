"use client";

import { getPerformanceBadge } from "@/lib/performance";
import type { Patient } from "@/types/patient";
import {
  BADGE,
  BODY_TEXT,
  CARD,
  CARD_TITLE,
  GRID_GAP,
  LABEL_TEXT,
  SECTION_HEADER,
  SOFT_CARD,
} from "./design-system";

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
      <section className={`grid ${GRID_GAP} lg:grid-cols-3`}>
        <div className={CARD}>
          <p className={SECTION_HEADER}>Patient Identity & Biometrics</p>
          <div className="space-y-5">
            <div>
              <p className={LABEL_TEXT}>Identity</p>
              <div className="mt-2 space-y-1">
                <p className={CARD_TITLE}>{formatValue(patient.name, "Name not recorded")}</p>
                <p className={LABEL_TEXT}>MRN • {mrn}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`${BADGE} bg-slate-100 text-slate-700`}>
                  Age: {formatValue(patient.age ?? null, "N/A")}
                </span>
                <span className={`${BADGE} bg-slate-100 text-slate-700`}>
                  Sex: {formatValue(patient.sex, "N/A")}
                </span>
              </div>
            </div>

            <div>
              <p className={LABEL_TEXT}>Biometrics</p>
              <div className={`mt-3 grid ${GRID_GAP} sm:grid-cols-2`}>
                <div className={SOFT_CARD}>
                  <p className={LABEL_TEXT}>BSA</p>
                  <p className={`mt-2 text-xl font-semibold ${bsaDisplay === "Not Recorded" ? "text-slate-400" : "text-slate-900"}`}>
                    {bsaDisplay}
                  </p>
                </div>
                <div className={SOFT_CARD}>
                  <p className={LABEL_TEXT}>BMI</p>
                  <p className={`mt-2 text-xl font-semibold ${bmiDisplay === "Not Recorded" ? "text-slate-400" : "text-slate-900"}`}>
                    {bmiDisplay}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={CARD}>
          <p className={SECTION_HEADER}>Performance & Social</p>
          <div className="space-y-5">
            <div>
              <p className={LABEL_TEXT}>Performance Status</p>
              <div className="mt-3 inline-flex items-center gap-2">
                <span className={`${BADGE} ${performanceBadge.classes}`}>
                  {formatValue(patient.performanceStatus, "Not recorded")}
                </span>
              </div>
            </div>

            <div>
              <p className={LABEL_TEXT}>Social History</p>
              <div className="mt-3 space-y-3">
                <div className={`${SOFT_CARD} flex items-center gap-3`}>
                  <span className="text-lg" aria-hidden>
                    🚬
                  </span>
                  <div>
                    <p className={LABEL_TEXT}>Smoking</p>
                    <p className={CARD_TITLE}>{formatValue(smokingHistory, "Not recorded")}</p>
                  </div>
                </div>
                <div className={`${SOFT_CARD} flex items-center gap-3`}>
                  <span className="text-lg" aria-hidden>
                    🍷
                  </span>
                  <div>
                    <p className={LABEL_TEXT}>Alcohol</p>
                    <p className={CARD_TITLE}>{formatValue(alcoholHistory, "Not recorded")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={CARD}>
          <p className={SECTION_HEADER}>Safety Profile & History</p>
          <div className="space-y-5">
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
                  className={`${SOFT_CARD} border ${
                    item.flag ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  <p className={LABEL_TEXT}>{item.label}</p>
                  <p className="mt-1 text-sm font-semibold">{item.flag ? item.riskText : item.safeText}</p>
                </div>
              ))}
            </div>

            <div>
              <p className={LABEL_TEXT}>Comorbidities</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {comorbidities.map((item, index) => (
                  <span
                    key={`${item}-${index}`}
                    className={`${BADGE} ${isHighRiskComorbidity(item) ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={CARD}>
        <p className={SECTION_HEADER}>Narrative Baseline</p>
        <p className={BODY_TEXT}>{patient.overallDiseaseCourseSummary || "No narrative baseline documented."}</p>
      </section>
    </div>
  );
}
