"use client";

import { AlertTriangle, Droplet, FlaskConical, ThermometerSun } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import type { MasterAIResponse } from "@/types/patient-insights";
import { BADGE, BODY_TEXT, CARD, CARD_TITLE, GRID_GAP, LABEL_TEXT, SECTION_HEADER, SOFT_CARD } from "../design-system";

type BiomarkerTrendPoint = {
  date?: string;
  marker?: string;
  value?: number | null;
  unit?: string | null;
};

interface LabsViewProps {
  patient: Patient;
  aiInsights?: MasterAIResponse | null;
}

const safeParseArray = <T,>(raw?: string | null): T[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
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

const parseLabString = (raw?: string | null) => {
  if (!raw) return [];
  return raw
    .split(/[\n;,]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const match = entry.match(/^([^:=]+?)[\s:=]+(.+)$/);
      if (match) {
        return {
          label: match[1].trim(),
          value: match[2].trim(),
        };
      }
      const parts = entry.split(/\s+/);
      if (parts.length >= 2) {
        return {
          label: parts.slice(0, -1).join(" "),
          value: parts.slice(-1)[0],
        };
      }
      return {
        label: entry,
        value: "",
      };
    });
};

const LabsChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-lg">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
        {point.payload.formattedDate}
      </p>
      <p className="text-sm font-semibold text-slate-900">
        {point.value} {point.payload.unit ?? ""}
      </p>
    </div>
  );
};

export function LabsView({ patient, aiInsights }: LabsViewProps) {
  const biomarkerTrendRaw = (patient as unknown as Record<string, string | undefined>)["Biomarker_Trend_JSON"];

  const biomarkerSeries = useMemo(() => {
    const parsed = safeParseArray<BiomarkerTrendPoint>(biomarkerTrendRaw);
    if (parsed.length) {
      return parsed.filter((point) => point.marker && typeof point.value === "number" && point.date);
    }
    return (patient.biomarkerTrend ?? []).map((point) => ({
      date: point.date,
      marker: point.markerName,
      value: point.value,
      unit: undefined,
    }));
  }, [biomarkerTrendRaw, patient.biomarkerTrend]);

  const availableMarkers = useMemo(() => {
    const unique = Array.from(new Set(biomarkerSeries.map((point) => point.marker).filter(Boolean))) as string[];
    return unique.length ? unique : ["No data"];
  }, [biomarkerSeries]);

  const [selectedMarker, setSelectedMarker] = useState<string>(availableMarkers[0] ?? "No data");

  useEffect(() => {
    setSelectedMarker(availableMarkers[0] ?? "No data");
  }, [availableMarkers]);

  const filteredSeries = biomarkerSeries.filter((point) => point.marker === selectedMarker);
  const hasTrend = filteredSeries.length >= 2;

  const renalFlag =
    typeof patient.renalDysfunctionFlag === "boolean"
      ? patient.renalDysfunctionFlag
      : Boolean((patient as unknown as Record<string, string | undefined>)["Renal dysfunction flag"]?.match(/yes/i));
  const liverFlag =
    typeof patient.liverDysfunctionFlag === "boolean"
      ? patient.liverDysfunctionFlag
      : Boolean((patient as unknown as Record<string, string | undefined>)["Liver dysfunction flag"]?.match(/yes/i));

  const cbcEntries = parseLabString((patient as unknown as Record<string, string | undefined>)["CBC values"] ?? patient.cbcValues);
  const cmpEntries = parseLabString((patient as unknown as Record<string, string | undefined>)["CMP values"] ?? patient.cmpValues);
  const electrolyteEntries = parseLabString(
    (patient as unknown as Record<string, string | undefined>)["Electrolytes"] ?? patient.electrolytes,
  );

  const cea = patient.cea || (patient as unknown as Record<string, string | undefined>)["CEA"] || "—";
  const ca199 = patient.ca199 || (patient as unknown as Record<string, string | undefined>)["CA19-9"] || "—";
  const otherMarkers = patient.otherTumorMarkers || (patient as unknown as Record<string, string | undefined>)["Other tumor markers"];

  return (
    <div className="space-y-6">
      <div className={`grid ${GRID_GAP} lg:grid-cols-3`}>
        <section className={CARD}>
          <p className={SECTION_HEADER}>AI Insight</p>
          <p className={BODY_TEXT}>
            {aiInsights?.investigations?.labs_summary ||
              "No AI metabolics summary generated yet. Labs will reflect deterministic values below."}
          </p>
        </section>

        <section className={CARD}>
          <p className={SECTION_HEADER}>Organ Function</p>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div
              className={`rounded-xl border px-3 py-2 ${renalFlag ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
            >
              <p className={LABEL_TEXT}>Renal</p>
              <div className="mt-1 flex items-center gap-2 font-semibold">
                {renalFlag ? <AlertTriangle className="h-4 w-4" /> : <Droplet className="h-4 w-4" />}
                {renalFlag ? "Dysfunction" : "Stable"}
              </div>
            </div>
            <div
              className={`rounded-xl border px-3 py-2 ${liverFlag ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
            >
              <p className={LABEL_TEXT}>Liver</p>
              <div className="mt-1 flex items-center gap-2 font-semibold">
                {liverFlag ? <AlertTriangle className="h-4 w-4" /> : <FlaskConical className="h-4 w-4" />}
                {liverFlag ? "Dysfunction" : "Stable"}
              </div>
            </div>
          </div>
        </section>

        <section className={CARD}>
          <p className={SECTION_HEADER}>Tumor Markers</p>
          <div className="mt-4 flex gap-6 text-slate-900">
            <div>
              <p className={LABEL_TEXT}>CEA</p>
              <p className="mt-1 text-3xl font-semibold">{cea || "—"}</p>
            </div>
            <div>
              <p className={LABEL_TEXT}>CA19-9</p>
              <p className="mt-1 text-3xl font-semibold">{ca199 || "—"}</p>
            </div>
          </div>
          {otherMarkers && (
            <p className={`${LABEL_TEXT} mt-3`}>
              Other markers: <span className="font-semibold text-slate-700">{otherMarkers}</span>
            </p>
          )}
        </section>
      </div>

      <section className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={SECTION_HEADER}>Biomarker trajectory</p>
            <p className={CARD_TITLE}>{selectedMarker}</p>
          </div>
          <div className="flex flex-wrap gap-2 rounded-full bg-slate-100 p-1 text-sm font-semibold text-slate-500">
            {availableMarkers.map((marker) => (
              <button
                key={marker}
                type="button"
                onClick={() => setSelectedMarker(marker)}
                className={`rounded-full px-3 py-1 transition ${
                  marker === selectedMarker ? "bg-white text-slate-900 shadow" : "hover:text-slate-900"
                }`}
                disabled={marker === "No data"}
              >
                {marker}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 h-80">
          {hasTrend ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredSeries.map((point) => ({
                  ...point,
                  formattedDate: formatDate(point.date),
                }))}
                margin={{ left: 8, right: 8, top: 12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" />
                <XAxis dataKey="formattedDate" stroke="#94a3b8" tick={{ fill: "#475569", fontSize: 12 }} />
                <YAxis stroke="#94a3b8" tick={{ fill: "#475569", fontSize: 12 }} />
                <Tooltip content={<LabsChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#4338ca"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#4338ca" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
              No longitudinal data available for {selectedMarker}.
            </div>
          )}
        </div>
      </section>

      <section className={`grid ${GRID_GAP} lg:grid-cols-3`}>
        <LabPanel title="Hematology · CBC" icon={<ThermometerSun className="h-4 w-4" />} entries={cbcEntries} />
        <LabPanel title="Metabolic · CMP" icon={<FlaskConical className="h-4 w-4" />} entries={cmpEntries} />
        <LabPanel title="Electrolytes" icon={<Droplet className="h-4 w-4" />} entries={electrolyteEntries} />
      </section>
    </div>
  );
}

interface LabPanelProps {
  title: string;
  icon: React.ReactNode;
  entries: { label: string; value: string }[];
}

const LabPanel = ({ title, icon, entries }: LabPanelProps) => {
  return (
    <div className={CARD}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
        {icon}
        {title}
      </div>
      {entries.length ? (
        <dl className="mt-4 space-y-2 text-sm">
          {entries.map((entry, index) => (
            <div key={`${entry.label}-${index}`} className="flex items-baseline justify-between rounded-2xl bg-slate-50 px-3 py-2">
              <dt className="text-slate-500">{entry.label}</dt>
              <dd className="font-semibold text-slate-900">{entry.value || "—"}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className={BODY_TEXT}>No structured data provided.</p>
      )}
    </div>
  );
};
