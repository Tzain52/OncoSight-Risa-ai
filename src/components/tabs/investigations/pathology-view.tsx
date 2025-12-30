"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, FileText, GitCompare, Microscope } from "lucide-react";

import type { MasterAIResponse, PathologyDelta } from "@/types/patient-insights";
import type { PathologyDetails, Patient } from "@/types/patient";

interface PathologyViewProps {
  patient: Patient;
  aiInsights?: MasterAIResponse | null;
}

interface NormalizedReport {
  id: string;
  rawDate?: string;
  dateLabel: string;
  procedure?: string;
  site?: string;
  diagnosis?: string;
  histotype?: string;
  grade?: string;
  tumorSize?: string;
  margins?: string;
  lvi?: string;
  pni?: string;
  lymphNodes?: string;
  ihcPanel: Record<string, string>;
}

const formatDateLabel = (value?: string) => {
  if (!value) return "Undated report";
  try {
    return new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const coerceString = (value: unknown) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
};

const pickValue = (bag: Record<string, unknown> | undefined, keys: string[]) => {
  if (!bag) return undefined;
  for (const key of keys) {
    const candidate = coerceString(bag[key]);
    if (candidate) return candidate;
  }
  return undefined;
};

const normalizeIhcPanel = (panel?: Record<string, unknown> | null, fallback?: string) => {
  const normalized: Record<string, string> = {};
  if (panel) {
    Object.entries(panel).forEach(([key, value]) => {
      const safeValue = coerceString(value);
      if (safeValue) {
        normalized[key] = safeValue;
      }
    });
  }

  if (!Object.keys(normalized).length && fallback) {
    fallback
      .split(/[,;]+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .forEach((token) => {
        const [marker, reading] = token.split(/[:=]/).map((segment) => segment.trim());
        if (marker && reading) {
          normalized[marker] = reading;
        }
      });
  }

  return normalized;
};

const sortReports = (reports: NormalizedReport[]) =>
  [...reports].sort((a, b) => {
    const da = a.rawDate ? Date.parse(a.rawDate) : 0;
    const db = b.rawDate ? Date.parse(b.rawDate) : 0;
    return db - da;
  });

const normalizeReports = (patient: Patient): NormalizedReport[] => {
  const details = Array.isArray(patient.pathologyDetails) ? patient.pathologyDetails : [];
  const normalized = details
    .filter((entry): entry is PathologyDetails => !!entry && typeof entry === "object")
    .map((entry, index) => {
      const histology = (entry.histology as Record<string, unknown>) ?? {};
      return {
        id: `${entry.date ?? entry.procedure ?? `report-${index}`}`,
        rawDate: entry.date,
        dateLabel: formatDateLabel(entry.date),
        procedure: entry.procedure,
        site: entry.site,
        diagnosis: entry.diagnosisText || coerceString(histology.diagnosis),
        histotype:
          pickValue(histology, ["type", "histologic_type", "histotype"]) ||
          entry.diagnosisText ||
          patient.histologicType,
        grade: pickValue(histology, ["grade", "tumor_grade"]) || patient.tumorGrade || undefined,
        tumorSize: pickValue(histology, ["tumor_size", "size", "dimension"]),
        margins: pickValue(histology, ["margins", "margin_status"]) || patient.marginStatus,
        lvi: pickValue(histology, ["lvi", "lymphovascular_invasion"]),
        pni: pickValue(histology, ["pni", "perineural_invasion"]),
        lymphNodes: pickValue(histology, ["lymph_nodes", "nodal_status"]),
        ihcPanel: normalizeIhcPanel(entry.ihcPanel, patient.ihcMarkers),
      };
    });

  if (normalized.length) {
    return sortReports(normalized);
  }

  const fallbackDiagnosis = patient.pathologyDiagnosisText || patient.histologicType;
  if (!fallbackDiagnosis) {
    return [
      {
        id: "no-data",
        dateLabel: "Undated report",
        diagnosis: "No structured pathology data available.",
        histotype: patient.primaryDiagnosis || "Pathology not documented",
        ihcPanel: normalizeIhcPanel(undefined, patient.ihcMarkers),
      },
    ];
  }

  return [
    {
      id: "fallback",
      dateLabel: "Undated report",
      diagnosis: fallbackDiagnosis,
      histotype: patient.histologicType || fallbackDiagnosis,
      grade: patient.tumorGrade || undefined,
      margins: patient.marginStatus || undefined,
      ihcPanel: normalizeIhcPanel(undefined, patient.ihcMarkers),
    },
  ];
};

const gradeTone = (grade?: string) => {
  const value = grade?.toLowerCase() ?? "";
  if (!value) return "bg-slate-100 text-slate-700";
  if (value.includes("g1") || value.includes("well")) return "bg-emerald-100 text-emerald-800";
  if (value.includes("g2") || value.includes("moderate")) return "bg-amber-100 text-amber-900";
  if (value.includes("g3") || value.includes("poor") || value.includes("high")) return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-700";
};

const trendTone = (trend?: PathologyDelta["trend"]) => {
  switch (trend) {
    case "worsening":
      return "text-rose-600";
    case "improving":
      return "text-emerald-600";
    case "new":
      return "text-indigo-600";
    default:
      return "text-slate-600";
  }
};

const invasionTone = (value?: string) => {
  if (!value) return "text-slate-600";
  return /present|positive|involved/i.test(value) ? "text-amber-700" : "text-slate-600";
};

const numberFromString = (value?: string) => {
  if (!value) return null;
  const match = value.replace(/,/g, "").match(/([-+]?\d*\.?\d+)/);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const gradeSeverity = (grade?: string) => {
  if (!grade) return null;
  const match = grade.match(/g\s*([1-4])/i);
  if (match) return Number.parseInt(match[1], 10);
  if (/poor|high/i.test(grade)) return 3;
  if (/mod/i.test(grade)) return 2;
  if (/well|low/i.test(grade)) return 1;
  return null;
};

const buildSingleReportInsight = (report: NormalizedReport | undefined, patient: Patient) => {
  if (!report) {
    return (
      patient.pathologyDiagnosisText ||
      patient.histologicType ||
      "No structured pathology report is available yet. Upload a report to unlock richer insights."
    );
  }

  const highlights = [
    report.histotype || patient.histologicType,
    report.grade ? `graded ${report.grade}` : null,
    report.tumorSize ? `measuring ${report.tumorSize}` : null,
    report.margins ? `margins ${report.margins.toLowerCase()}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const invasionNotes = [report.lvi && `LVI ${report.lvi}`, report.pni && `PNI ${report.pni}`]
    .filter(Boolean)
    .join("; ");

  return [
    highlights ? `Latest pathology documents ${highlights}.` : null,
    invasionNotes ? `Invasion status: ${invasionNotes}.` : null,
    Object.keys(report.ihcPanel).length
      ? `IHC profile features ${Object.entries(report.ihcPanel)
          .slice(0, 4)
          .map(([marker, value]) => `${marker} (${value})`)
          .join(", ")}.`
      : null,
  ]
    .filter(Boolean)
    .join(" ");
};

const describeShift = (label: string, previous?: string, latest?: string) => {
  if (!previous && !latest) return null;
  if (!previous && latest) return `${label} newly reported as ${latest}`;
  if (previous && !latest) return `${label} no longer documented (was ${previous})`;
  if (previous === latest) return null;
  return `${label} changed from ${previous} to ${latest}`;
};

const buildComparisonInsight = (latest?: NormalizedReport, previous?: NormalizedReport) => {
  if (!latest || !previous) return null;
  const updates = [
    describeShift("Grade", previous.grade, latest.grade),
    describeShift("Histology", previous.histotype, latest.histotype),
    describeShift("Margins", previous.margins, latest.margins),
    describeShift("Tumor size", previous.tumorSize, latest.tumorSize),
    describeShift("LVI", previous.lvi, latest.lvi),
    describeShift("PNI", previous.pni, latest.pni),
  ].filter(Boolean);

  const ihcChanges: string[] = [];
  const previousIhc = previous.ihcPanel;
  const latestIhc = latest.ihcPanel;
  Object.keys({ ...previousIhc, ...latestIhc }).forEach((marker) => {
    const before = previousIhc[marker];
    const after = latestIhc[marker];
    if (before && after && before === after) return;
    if (!before && after) {
      ihcChanges.push(`${marker} newly positive (${after})`);
    } else if (before && !after) {
      ihcChanges.push(`${marker} no longer reported (was ${before})`);
    } else if (before && after) {
      ihcChanges.push(`${marker} shifted from ${before} to ${after}`);
    }
  });

  if (ihcChanges.length) {
    updates.push(
      `IHC panel updates: ${ihcChanges
        .slice(0, 3)
        .join("; ")}${ihcChanges.length > 3 ? "…" : ""}`,
    );
  }

  if (!updates.length) {
    return `No material changes detected between ${previous.dateLabel} and ${latest.dateLabel}. Continue routine surveillance unless new data emerges.`;
  }

  return `Between ${previous.dateLabel} and ${latest.dateLabel}, ${updates.join(
    "; ",
  )}. These findings should be reviewed in the context of the patient's clinical trajectory.`;
};

const generateStructuralDeltas = (
  latest?: NormalizedReport,
  previous?: NormalizedReport,
): PathologyDelta[] => {
  if (!latest || !previous) return [];
  const deltas: PathologyDelta[] = [];

  const latestGradeSeverity = gradeSeverity(latest.grade);
  const previousGradeSeverity = gradeSeverity(previous.grade);
  if (latest.grade || previous.grade) {
    let trend: PathologyDelta["trend"] = "stable";
    if (latestGradeSeverity !== null && previousGradeSeverity !== null) {
      if (latestGradeSeverity > previousGradeSeverity) trend = "worsening";
      if (latestGradeSeverity < previousGradeSeverity) trend = "improving";
    }
    if (latest.grade !== previous.grade) {
      deltas.push({
        marker: "Grade",
        old_value: previous.grade || "Not graded",
        new_value: latest.grade || "Not graded",
        trend,
      });
    }
  }

  const latestSize = numberFromString(latest.tumorSize);
  const previousSize = numberFromString(previous.tumorSize);
  if (latest.tumorSize || previous.tumorSize) {
    let trend: PathologyDelta["trend"] = "stable";
    if (latestSize !== null && previousSize !== null) {
      if (latestSize > previousSize) trend = "worsening";
      if (latestSize < previousSize) trend = "improving";
    }
    if (latest.tumorSize !== previous.tumorSize) {
      deltas.push({
        marker: "Tumor size",
        old_value: previous.tumorSize || "Not measured",
        new_value: latest.tumorSize || "Not measured",
        trend,
      });
    }
  }

  if (latest.margins || previous.margins) {
    let trend: PathologyDelta["trend"] = "stable";
    const positive = (value?: string) => !!value && /pos|involved|positive/i.test(value);
    const wasPositive = positive(previous.margins);
    const isPositive = positive(latest.margins);
    if (isPositive && !wasPositive) trend = "worsening";
    if (!isPositive && wasPositive) trend = "improving";
    if (latest.margins !== previous.margins) {
      deltas.push({
        marker: "Margins",
        old_value: previous.margins || "Not assessed",
        new_value: latest.margins || "Not assessed",
        trend,
      });
    }
  }

  ([
    { label: "Lymphovascular invasion", latest: latest.lvi, previous: previous.lvi },
    { label: "Perineural invasion", latest: latest.pni, previous: previous.pni },
    { label: "Nodal status", latest: latest.lymphNodes, previous: previous.lymphNodes },
  ] as const).forEach((field) => {
    if (field.latest === field.previous) return;
    if (!field.latest && !field.previous) return;
    deltas.push({
      marker: field.label,
      old_value: field.previous || "Not documented",
      new_value: field.latest || "Not documented",
      trend:
        field.latest && /present|positive|involved/i.test(field.latest)
          ? "worsening"
          : field.previous && /present|positive|involved/i.test(field.previous)
            ? "improving"
            : "stable",
    });
  });

  Object.keys({ ...previous.ihcPanel, ...latest.ihcPanel })
    .slice(0, 6)
    .forEach((marker) => {
      const oldValue = previous.ihcPanel[marker];
      const newValue = latest.ihcPanel[marker];
      if (oldValue === newValue) return;
      if (!oldValue && !newValue) return;
      deltas.push({
        marker: `IHC · ${marker}`,
        old_value: oldValue || "Not reported",
        new_value: newValue || "Not reported",
        trend: !oldValue ? "new" : !newValue ? "improving" : "stable",
      });
    });

  return deltas;
};

export function PathologyView({ patient, aiInsights }: PathologyViewProps) {
  const reports = useMemo(() => normalizeReports(patient), [patient]);
  const [selectedReportIndex, setSelectedReportIndex] = useState(0);

  useEffect(() => {
    setSelectedReportIndex(0);
  }, [reports.length]);

  const selectedReport = reports[selectedReportIndex] ?? reports[0];
  const hasMultipleReports = reports.length > 1;
  const aiInvestigation = aiInsights?.investigations;
  const latestReport = reports[0];
  const previousReport = hasMultipleReports ? reports[1] : undefined;
  const fallbackSingleInsight = useMemo(
    () => buildSingleReportInsight(latestReport ?? selectedReport, patient),
    [latestReport, selectedReport, patient],
  );
  const fallbackComparisonInsight = useMemo(
    () => buildComparisonInsight(latestReport, previousReport),
    [latestReport, previousReport],
  );

  const aiNarrative = hasMultipleReports
    ? aiInvestigation?.pathology_comparison_text?.trim() ||
      fallbackComparisonInsight ||
      "Comparison insight unavailable. Review manual synopsis below."
    : aiInvestigation?.pathology_summary?.trim() ||
      aiInvestigation?.pathology_comparison_text?.trim() ||
      fallbackSingleInsight;
  const aiDeltas = hasMultipleReports ? aiInvestigation?.pathology_deltas ?? [] : [];
  const structuralDeltas = useMemo(() => {
    if (!hasMultipleReports) return [];
    if (aiDeltas.length) return aiDeltas;
    return generateStructuralDeltas(latestReport, previousReport);
  }, [aiDeltas, hasMultipleReports, latestReport, previousReport]);
  const invasionFields = [
    { label: "Lymphovascular Invasion", value: selectedReport?.lvi },
    { label: "Perineural Invasion", value: selectedReport?.pni },
    { label: "Lymph Nodes", value: selectedReport?.lymphNodes },
  ];

  const ihcEntries = Object.entries(selectedReport?.ihcPanel ?? {});

  return (
    <div className="flex h-full gap-6">
      <div className="flex-1 space-y-6">
        <section className="rounded-3xl border border-indigo-100 bg-indigo-50/50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow">
              <GitCompare className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-indigo-600">Insight</p>
              <p className="text-base font-semibold text-slate-900">
                {hasMultipleReports
                  ? `Comparison · ${previousReport?.dateLabel ?? "Prior"} → ${latestReport?.dateLabel ?? "Latest"}`
                  : `Single report · ${latestReport?.dateLabel ?? "Undated"}`}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-800">
            {aiNarrative}
          </p>

          {hasMultipleReports && (
            <div className="mt-4 overflow-hidden rounded-2xl border border-indigo-100 bg-white">
              <div className="grid grid-cols-[2fr_3fr_1fr] bg-indigo-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
                <span>Marker</span>
                <span>Previous → Current</span>
                <span className="text-right">Trend</span>
              </div>
              {structuralDeltas.length ? (
                structuralDeltas.slice(0, 5).map((delta) => (
                  <div
                    key={`${delta.marker}-${delta.trend}-${delta.new_value}-${delta.old_value}`}
                    className="grid grid-cols-[2fr_3fr_1fr] border-t border-slate-100 px-4 py-2 text-sm"
                  >
                    <span className="font-semibold text-slate-900">{delta.marker}</span>
                    <span className="text-slate-700">
                      {delta.old_value ?? "—"} <span className="text-slate-400">→</span> {delta.new_value ?? "—"}
                    </span>
                    <span className={`flex items-center justify-end gap-1 text-xs font-semibold ${trendTone(delta.trend)}`}>
                      <AlertCircle className="h-3.5 w-3.5" />
                      {delta.trend ?? "stable"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="px-4 py-3 text-sm text-slate-500">
                  Structured deltas could not be derived between these reports. Review the synopsis above for qualitative
                  context.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                <Microscope className="h-4 w-4 text-slate-500" />
                Synoptic Report Detail
              </div>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                {selectedReport?.diagnosis || selectedReport?.histotype || "Pathology diagnosis not provided"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {[selectedReport?.procedure, selectedReport?.dateLabel, selectedReport?.site].filter(Boolean).join(" • ") ||
                  "Procedure metadata not documented"}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
              <FileText className="h-4 w-4 text-slate-500" />
              Report {selectedReportIndex + 1} of {reports.length}
            </div>
          </div>

          <div className="space-y-6 px-6 py-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Histotype</p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {selectedReport?.histotype || "Not documented"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Grade</p>
                <span className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${gradeTone(selectedReport?.grade)}`}>
                  {selectedReport?.grade || "Not graded"}
                </span>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tumor Size</p>
                <p className="mt-2 text-base font-semibold text-slate-900">
                  {selectedReport?.tumorSize || "Not measured"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Margins</p>
                <div className="mt-2 inline-flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      /negative|clear|not involved/i.test(selectedReport?.margins ?? "")
                        ? "bg-emerald-500"
                        : "bg-rose-500"
                    }`}
                  />
                  <p className="text-base font-semibold text-slate-900">
                    {selectedReport?.margins || "Not assessed"}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Invasion & Risk Flags</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {invasionFields.map((field) => (
                  <div key={field.label} className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{field.label}</p>
                    <p className={`mt-2 text-base font-semibold ${invasionTone(field.value)}`}>
                      {field.value || "Not assessed"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">IHC Profile</p>
              {ihcEntries.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ihcEntries.map(([marker, result]) => {
                    const positive = /pos|positive|\+/i.test(result);
                    return (
                      <span
                        key={marker}
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          positive ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {marker}: {result}
                      </span>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">IHC panel not provided.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <aside className="h-full w-64 overflow-y-auto border-l border-slate-200 pl-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Timeline</p>
        <ul className="mt-4 space-y-2">
          {reports.map((report, index) => {
            const isActive = index === selectedReportIndex;
            return (
              <li key={report.id}>
                <button
                  type="button"
                  onClick={() => setSelectedReportIndex(index)}
                  disabled={!hasMultipleReports}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    isActive
                      ? "border-slate-900 bg-slate-100"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  } ${hasMultipleReports ? "cursor-pointer" : "cursor-default"}`}
                >
                  <p className="text-sm font-semibold text-slate-900">{report.dateLabel}</p>
                  {report.procedure ? (
                    <p className="text-xs text-slate-500">{report.procedure}</p>
                  ) : (
                    <p className="text-xs text-slate-400">Procedure not documented</p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </aside>
    </div>
  );
}
