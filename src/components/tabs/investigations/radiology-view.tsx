"use client";

import { AlertTriangle, ExternalLink, LineChart as LineChartIcon } from "lucide-react";
import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Patient } from "@/types/patient";

type TumorTrendPoint = {
  date?: string;
  size_mm?: number;
  label?: string;
};

type RadiologyReport = {
  date?: string;
  modality?: string;
  summary?: string;
  link?: string;
};

const RECIST_BADGE_MAP: Record<string, string> = {
  PD: "text-rose-700 bg-rose-50 border-rose-200",
  "Progressive Disease": "text-rose-700 bg-rose-50 border-rose-200",
  SD: "text-amber-600 bg-amber-50 border-amber-200",
  "Stable Disease": "text-amber-600 bg-amber-50 border-amber-200",
  PR: "text-emerald-700 bg-emerald-50 border-emerald-200",
  "Partial Response": "text-emerald-700 bg-emerald-50 border-emerald-200",
  CR: "text-emerald-700 bg-emerald-50 border-emerald-200",
  "Complete Response": "text-emerald-700 bg-emerald-50 border-emerald-200",
};

const getRawString = (patient: Patient, key: string) => {
  const raw = (patient as unknown as Record<string, unknown>)[key];
  return typeof raw === "string" ? raw : undefined;
};

const safeParseArray = <T,>(value?: string | null): T[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const formatDate = (value?: string) => {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(timestamp),
  );
};

const RadiologyTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
        {point.payload.label || point.payload.formattedDate}
      </p>
      <p className="text-sm font-semibold text-slate-900">{point.value} mm</p>
    </div>
  );
};

interface RadiologyViewProps {
  patient: Patient;
}

export function RadiologyView({ patient }: RadiologyViewProps) {
  const tumorTrendRaw = getRawString(patient, "Tumor_Size_Trend_JSON");
  const reportsRaw = getRawString(patient, "Radiology_Reports_JSON");

  const tumorTrend = useMemo(() => {
    const parsed = safeParseArray<TumorTrendPoint>(tumorTrendRaw);
    if (parsed.length) {
      return parsed
        .map((point) => ({
          date: point.date,
          size: typeof point.size_mm === "number" ? point.size_mm : undefined,
          label: point.label,
        }))
        .filter((point) => point.date && typeof point.size === "number");
    }

    return (patient.tumorSizeTrend ?? [])
      .filter((point) => point.date && typeof point.sumOfDiametersMm === "number")
      .map((point) => ({
        date: point.date,
        size: point.sumOfDiametersMm ?? undefined,
        label: undefined,
      }));
  }, [tumorTrendRaw, patient.tumorSizeTrend]);

  const radiologyReports = useMemo(() => {
    const parsed = safeParseArray<RadiologyReport>(reportsRaw);
    const fromPatient = Array.isArray(patient.radiologyReports) ? patient.radiologyReports : [];
    const combined = parsed.length ? parsed : fromPatient;

    return combined
      .filter((report) => report.date || report.modality || report.summary)
      .map((report) => ({
        date: report.date,
        modality: report.modality,
        summary: report.summary,
        link: report.link,
      }))
      .sort((a, b) => {
        const da = a.date ? Date.parse(a.date) : 0;
        const db = b.date ? Date.parse(b.date) : 0;
        return db - da;
      });
  }, [reportsRaw, patient.radiologyReports]);

  const recistStatus =
    getRawString(patient, "Response per line (CR / PR / SD / PD)") || patient.responsePerLine || "Not reported";
  const trendSummary =
    getRawString(patient, "Radiology trend") || patient.radiologyTrend || "No structured radiology trend.";
  const latestScan = getRawString(patient, "Latest CT chest (date + summary)") || patient.latestCtChest;
  const newLesionsRaw = getRawString(patient, "New lesions (yes/no)");
  const newLesionsFlag =
    typeof newLesionsRaw === "string"
      ? newLesionsRaw.trim().toLowerCase().startsWith("y")
      : typeof patient.newLesions === "boolean"
        ? patient.newLesions
        : false;

  const measurements =
    getRawString(patient, "RECIST measurements") ||
    patient.recistMeasurements ||
    getRawString(patient, "Lesion count / size") ||
    patient.lesionCountSize ||
    null;

  const keywords =
    getRawString(patient, "Radiology impression keywords") ||
    patient.radiologyImpressionKeywords ||
    "";
  const keywordTokens = keywords
    ? keywords
        .split(/[;,]/)
        .map((token) => token.trim())
        .filter(Boolean)
    : [];

  const hasTrend = tumorTrend.length >= 2;

  return (
    <div className="flex min-h-[520px] gap-6">
      <div className="flex-1 space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap justify-between gap-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                Response status
              </p>
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                  RECIST_BADGE_MAP[recistStatus] ?? "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <LineChartIcon className="h-4 w-4" />
                {recistStatus}
              </div>
              <p className="text-sm text-slate-500">{trendSummary}</p>
            </div>

            <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Latest scan</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">
                {latestScan || "No recent scan summary available."}
              </p>
              {newLesionsFlag && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  <AlertTriangle className="h-4 w-4" />
                  New lesions reported
                </div>
              )}
            </div>
          </div>
        </section>

        {hasTrend ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                Recist trajectory
              </p>
              <p className="text-xs text-slate-400">{tumorTrend.length} scans</p>
            </div>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={tumorTrend.map((point) => ({
                    ...point,
                    formattedDate: formatDate(point.date),
                  }))}
                  margin={{ left: 8, right: 8, top: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="formattedDate"
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    stroke="#94a3b8"
                  />
                  <YAxis tick={{ fill: "#64748b", fontSize: 12 }} stroke="#94a3b8" />
                  <Tooltip content={<RadiologyTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="size"
                    stroke="#4338ca"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "#4338ca" }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        ) : (
          <section className="flex h-72 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
            Insufficient structured RECIST data to render trajectory.
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
                Detailed measurements
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900">Target lesion assessment</p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Measurements</p>
              <p className="mt-2 text-sm text-slate-800">
                {measurements || "RECIST measurements not documented."}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Impression keywords</p>
              {keywordTokens.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {keywordTokens.map((token) => (
                    <span
                      key={token}
                      className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      {token}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No structured radiology keywords provided.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <aside className="w-64 shrink-0 border-l border-slate-200 pl-4">
        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">Scan timeline</p>
        {radiologyReports.length ? (
          <ul className="mt-4 space-y-4">
            {radiologyReports.map((report) => (
              <li key={`${report.date}-${report.modality}-${report.summary}`} className="space-y-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{formatDate(report.date)}</p>
                  <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                    {report.modality || "Imaging"}
                  </span>
                </div>
                <p className="text-xs text-slate-500">{report.summary || "Summary unavailable."}</p>
                {report.link && (
                  <a
                    href={report.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                  >
                    View source <ExternalLink className="ml-1 h-3.5 w-3.5" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-slate-500">No imaging history available.</p>
        )}
      </aside>
    </div>
  );
}
