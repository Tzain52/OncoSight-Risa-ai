"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useMemo, useState } from "react";

import { DiagnosisTab } from "@/components/tabs/diagnosis-tab";
import { InvestigationsTab } from "@/components/tabs/investigations-tab";
import { PatientTab } from "@/components/tabs/patient-tab";
import { ReferencesTab } from "@/components/tabs/references-tab";
import { DASHBOARD_SHORTCUT_EVENT } from "@/lib/dashboard-shortcuts";
import type { DashboardShortcut } from "@/lib/dashboard-shortcuts";
import type { MasterAIResponse } from "@/types/patient-insights";
import type { Patient } from "@/types/patient";

type MainTab = "patient" | "diagnosis" | "investigations" | "references";
type InvestigationsPanel = "pathology" | "radiology" | "laboratory";

interface DashboardTabsClientProps {
  patient: Patient;
  aiInsights: MasterAIResponse | null;
}

type ShortcutConfig = {
  keys: string[];
  handler: (setMain: (tab: MainTab) => void, setPanel: (panel: InvestigationsPanel) => void) => void;
};

const dispatchShortcut = (action: DashboardShortcut) => {
  window.dispatchEvent(new CustomEvent(DASHBOARD_SHORTCUT_EVENT, { detail: { action } }));
};

const SHORTCUTS: ShortcutConfig[] = [
  {
    keys: ["o", "p"],
    handler: (setMain) => setMain("patient"),
  },
  {
    keys: ["o", "d"],
    handler: (setMain) => setMain("diagnosis"),
  },
  {
    keys: ["o", "i"],
    handler: (setMain, setPanel) => {
      setMain("investigations");
      setPanel("pathology");
    },
  },
  {
    keys: ["o", "r"],
    handler: (setMain, setPanel) => {
      setMain("investigations");
      setPanel("radiology");
    },
  },
  {
    keys: ["o", "l"],
    handler: (setMain, setPanel) => {
      setMain("investigations");
      setPanel("laboratory");
    },
  },
  {
    keys: ["o", "e"],
    handler: () => dispatchShortcut("export"),
  },
  {
    keys: ["o", "b"],
    handler: () => dispatchShortcut("back"),
  },
];

const hasPrefix = (sequence: string[]) =>
  SHORTCUTS.some((shortcut) => shortcut.keys.slice(0, sequence.length).every((key, index) => key === sequence[index]));

const resolveShortcut = (sequence: string[]) =>
  SHORTCUTS.find((shortcut) => shortcut.keys.length === sequence.length && shortcut.keys.every((key, idx) => key === sequence[idx]));

export function DashboardTabsClient({ patient, aiInsights }: DashboardTabsClientProps) {
  const [mainTab, setMainTab] = useState<MainTab>("patient");
  const [investigationsPanel, setInvestigationsPanel] = useState<InvestigationsPanel>("pathology");

  useEffect(() => {
    setMainTab("patient");
    setInvestigationsPanel("pathology");
  }, [patient.patientId]);

  useEffect(() => {
    let sequence: string[] = [];
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const resetSequence = () => {
      sequence = [];
      if (timeout) {
        clearTimeout(timeout);
        timeout = null;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing || event.repeat) return;
      const key = event.key.toLowerCase();
      if (!key) return;

      if (sequence.length === 0 && key !== "o") {
        return;
      }

      sequence.push(key);

      if (!hasPrefix(sequence)) {
        resetSequence();
        return;
      }

      const match = resolveShortcut(sequence);
      if (match) {
        event.preventDefault();
        match.handler(setMainTab, setInvestigationsPanel);
        resetSequence();
        return;
      }

      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(resetSequence, 750);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      resetSequence();
    };
  }, []);

  const tabs = useMemo(
    () => [
      { value: "patient" as const, label: "Patient" },
      { value: "diagnosis" as const, label: "Diagnosis" },
      { value: "investigations" as const, label: "Investigations" },
      { value: "references" as const, label: "References" },
    ],
    [],
  );

  return (
    <section className="flex h-full flex-col">
      <Tabs.Root value={mainTab} onValueChange={(value) => setMainTab(value as MainTab)} className="flex h-full flex-col">
        <Tabs.List className="sticky top-0 z-10 flex w-full items-center gap-3 border-b border-slate-100 bg-white/95 px-4 py-4 text-sm font-semibold text-slate-500 shadow-[0_2px_12px_rgba(15,23,42,0.05)] backdrop-blur">
          {tabs.map((tab) => (
            <Tabs.Trigger
              key={tab.value}
              value={tab.value}
              className="rounded-full px-5 py-2 transition focus-visible:outline-none data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-[0_8px_20px_rgba(15,23,42,0.18)] data-[state=inactive]:bg-slate-100/60 data-[state=inactive]:text-slate-500"
            >
              {tab.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <div className="flex-1 overflow-y-auto py-6">
          <Tabs.Content value="patient" className="focus:outline-none">
            <PatientTab patient={patient} />
          </Tabs.Content>
          <Tabs.Content value="diagnosis" className="focus:outline-none">
            <DiagnosisTab patient={patient} />
          </Tabs.Content>
          <Tabs.Content value="investigations" className="focus:outline-none">
            <InvestigationsTab
              patient={patient}
              aiInsights={aiInsights ?? null}
              activePanel={investigationsPanel}
              onPanelChange={setInvestigationsPanel}
            />
          </Tabs.Content>
          <Tabs.Content value="references" className="focus:outline-none">
            <ReferencesTab patient={patient} />
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </section>
  );
}
