"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { Activity, FileImage } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { BiomarkerPoint, Patient, RadiologyDocument } from "@/types/patient";
import type { MasterAIResponse } from "@/types/patient-insights";
import { PathologyView } from "./investigations/pathology-view";
import { RadiologyView } from "./investigations/radiology-view";
import { LabsView } from "./investigations/labs-view";

type InvestigationsPanel = "pathology" | "radiology" | "laboratory";

interface InvestigationsTabProps {
  patient: Patient;
  aiInsights?: MasterAIResponse | null;
  activePanel?: InvestigationsPanel;
  onPanelChange?: (panel: InvestigationsPanel) => void;
}

const MARKER_PRIORITY = ["ER", "PR", "HER2", "KI-67", "PD-L1"];

const parseMarkerMap = (raw?: string | null) => {
  if (!raw) return new Map<string, string>();

  const tokens = raw.split(/[,;]+/).map((segment) => segment.trim());
  const entries = tokens
    .map((token) => {
      if (!token) return null;
      const match = token.match(/^(.*?)\s*[:=]\s*(.+)$/);
      if (match) {
        return [match[1].trim().toUpperCase(), match[2].trim()];
      }
      const shorthand = token.split(/\s+/)[0]?.trim()?.toUpperCase();
      return shorthand ? [shorthand, token] : null;
    })
    .filter(Boolean) as [string, string][];

  return new Map(entries);
};

const formatDate = (date?: string) => {
  if (!date) return "—";
  try {
    return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(
      new Date(date),
    );
  } catch {
    return date;
  }
};

const parseBiomarkerTrend = (trend?: BiomarkerPoint[] | string | null): BiomarkerPoint[] => {
  if (!trend) return [];
  if (Array.isArray(trend)) {
    return trend.filter((point) => typeof point.value === "number" && !!point.date);
  }

  try {
    const parsed = JSON.parse(trend) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((point): point is BiomarkerPoint => {
        return (
          point &&
          typeof point === "object" &&
          typeof point.date === "string" &&
          typeof point.value === "number"
        );
      });
    }
  } catch {
    return [];
  }

  return [];
};

const normalizeRadiologyReports = (reports?: RadiologyDocument[]) => {
  if (!Array.isArray(reports)) return [];

  return [...reports]
    .filter((report) => report.date || report.modality || report.summary)
    .sort((a, b) => {
      const da = a.date ? Date.parse(a.date) : 0;
      const db = b.date ? Date.parse(b.date) : 0;
      return db - da;
    });
};

const LabsTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  const point = payload[0];
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 shadow-lg">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-900">
        {point.value} {point.payload.unit ?? ""}
      </p>
    </div>
  );
};

const TAB_SHORTCUTS: { combo: string[]; target: string }[] = [
  { combo: ["o", "p"], target: "patient" },
  { combo: ["o", "d"], target: "diagnosis" },
  { combo: ["o", "i"], target: "pathology" },
  { combo: ["o", "r"], target: "radiology" },
  { combo: ["o", "l"], target: "laboratory" },
];

export function InvestigationsTab({ patient, aiInsights, activePanel, onPanelChange }: InvestigationsTabProps) {
  const molecularMap = useMemo(() => parseMarkerMap(patient.ihcMarkers), [patient.ihcMarkers]);
  const biomarkerSeries = useMemo(() => parseBiomarkerTrend(patient.biomarkerTrend), [patient]);
  const radiologyReports = useMemo(
    () => normalizeRadiologyReports(patient.radiologyReports),
    [patient.radiologyReports],
  );
  const [internalPanel, setInternalPanel] = useState<InvestigationsPanel>("pathology");

  useEffect(() => {
    setInternalPanel("pathology");
  }, [patient.patientId]);

  const panelValue = activePanel ?? internalPanel;

  const handleTabChange = (value: string) => {
    const cast = value as InvestigationsPanel;
    if (onPanelChange) {
      onPanelChange(cast);
    } else {
      setInternalPanel(cast);
    }
  };

  const hasBiomarkerTrend = biomarkerSeries.length >= 2;
  const biomarkerName = biomarkerSeries[0]?.markerName ?? "Biomarker";
  const latestRadiologyText =
    patient.radiologyTrend ||
    patient.radiologyImpressionKeywords ||
    patient.latestCtChest ||
    "No radiology summary provided.";
  const currentValue = biomarkerSeries.at(-1)?.value ?? null;
  const peakValue = biomarkerSeries.length
    ? Math.max(...biomarkerSeries.map((point) => point.value ?? Number.NEGATIVE_INFINITY))
    : null;
  const lowestValue = biomarkerSeries.length
    ? Math.min(...biomarkerSeries.map((point) => point.value ?? Number.POSITIVE_INFINITY))
    : null;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="rounded-3xl border border-slate-200/80 bg-white/95 p-4 shadow-sm"
      >
        <Tabs.Root value={panelValue} onValueChange={handleTabChange} className="w-full">
          <Tabs.List className="grid h-12 w-full max-w-lg grid-cols-3 rounded-full bg-slate-100/80 p-1 text-sm font-semibold text-slate-500">
            <Tabs.Trigger
              value="pathology"
              className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md"
            >
              Pathology
            </Tabs.Trigger>
            <Tabs.Trigger
              value="radiology"
              className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md"
            >
              Radiology
            </Tabs.Trigger>
            <Tabs.Trigger
              value="laboratory"
              className="rounded-full px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md"
            >
              Laboratory
            </Tabs.Trigger>
          </Tabs.List>

          <div className="mt-6">
            <Tabs.Content value="pathology" className="focus:outline-none">
              <PathologyView patient={patient} aiInsights={aiInsights} />
            </Tabs.Content>

            <Tabs.Content value="radiology" className="space-y-6 focus:outline-none">
              <RadiologyView patient={patient} />
            </Tabs.Content>

            <Tabs.Content value="laboratory" className="focus:outline-none">
              <LabsView patient={patient} aiInsights={aiInsights} />
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </motion.div>
    </div>
  );
}
