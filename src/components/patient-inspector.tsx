"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";

import type { Patient } from "@/types/patient";
import type { MasterAIResponse } from "@/types/dashboard";

interface PatientInspectorProps {
  patients: Patient[];
  analyzePatient: (patient: Patient) => Promise<MasterAIResponse>;
}

const COMPLEX_FIELDS: (keyof Patient)[] = [
  "treatmentTimeline",
  "tumorSizeTrend",
  "biomarkerTrend",
  "pathologyDetails",
  "pathologyReports",
  "genomicReports",
  "radiologyReports",
  "providerNotes",
];

const FIELD_LABELS: Record<keyof Patient, string> = {
  patientId: "Patient ID",
  name: "Name",
  dateOfBirth: "Date of Birth",
  birthDate: "Birth Date",
  bmi: "BMI",
  bsa: "BSA",
  age: "Age",
  sex: "Sex",
  smokingStatus: "Smoking Status",
  performanceStatus: "Performance Status",
  diabetes: "Diabetes",
  hypertension: "Hypertension",
  heartDisease: "Heart Disease",
  copdAsthma: "COPD / Asthma",
  otherRelevantComorbidities: "Other Relevant Comorbidities",
  primaryDiagnosis: "Primary Diagnosis",
  histologicType: "Histologic Type",
  tumorGrade: "Tumor Grade",
  diagnosisDate: "Diagnosis Date",
  initialTnmStage: "Initial TNM Stage",
  currentTnmStage: "Current TNM Stage",
  metastaticStatus: "Metastatic Status",
  metastaticSites: "Metastatic Sites",
  recurrenceStatus: "Recurrence Status",
  pathologyDiagnosisText: "Pathology Diagnosis Text",
  histopathologicFeatures: "Histopathologic Features",
  marginStatus: "Margin Status",
  ihcMarkers: "IHC Markers",
  ambiguousDiagnosisFlag: "Ambiguous Diagnosis Flag",
  egfrMutation: "EGFR Mutation",
  alkRearrangement: "ALK Rearrangement",
  ros1Rearrangement: "ROS1 Rearrangement",
  krasMutation: "KRAS Mutation",
  brafMutation: "BRAF Mutation",
  metExon14Skipping: "MET Exon 14 Skipping",
  retRearrangement: "RET Rearrangement",
  her2Mutation: "HER2 Mutation",
  ntrkFusion: "NTRK Fusion",
  pdL1Expression: "PD-L1 Expression (%)",
  tumorMutationalBurden: "Tumor Mutational Burden (TMB)",
  microsatelliteInstability: "Microsatellite Instability (MSI)",
  ctdnaFindings: "ctDNA Findings",
  actionableMutationSummary: "Actionable Mutation Summary",
  newMutationsOverTime: "New Mutations Over Time",
  treatmentPlanSummary: "Treatment Plan Summary",
  surgicalTreatments: "Surgical Treatments",
  radiationTreatments: "Radiation Treatments",
  latestCtChest: "Latest CT Chest",
  latestPetCt: "Latest PET/CT",
  latestBrainMri: "Latest Brain MRI",
  newLesions: "New Lesions",
  radiologyImpressionKeywords: "Radiology Impression Keywords",
  renalDysfunctionFlag: "Renal Dysfunction Flag",
  liverDysfunctionFlag: "Liver Dysfunction Flag",
  cbcValues: "CBC Values",
  cmpValues: "CMP Values",
  electrolytes: "Electrolytes",
  abnormalLabFlags: "Abnormal Lab Flags",
  longitudinalLaboratoryFlagTrends: "Longitudinal Laboratory Flag Trends",
  overallDiseaseCourseSummary: "Overall Disease Course Summary",
  stageChangesOverTime: "Stage Changes Over Time",
  lastClinicalEncounterDate: "Last Clinical Encounter Date",
  pathologyReportLinks: "Pathology Report Links (Raw)",
  genomicReportLinks: "Genomic Report Links (Raw)",
  radiologyReportLinks: "Radiology Report Links (Raw)",
  providerNoteLinks: "Provider Note Links (Raw)",
  currentLineOfTherapy: "Current Line of Therapy",
  priorTherapies: "Prior Therapies",
  regimenDetails: "Regimen Details",
  treatmentStartAndEndDates: "Treatment Start and End Dates",
  responsePerLine: "Response per Line",
  treatmentResponseTimeline: "Treatment Response Timeline",
  reasonsForTreatmentChange: "Reasons for Treatment Change",
  treatmentRelatedToxicities: "Treatment-related Toxicities",
  radiologyTrend: "Radiology Trend",
  radiologyTrendsOverTime: "Radiology Trends Over Time",
  recistMeasurements: "RECIST Measurements",
  lesionCountSize: "Lesion Count / Size",
  cea: "CEA",
  ca199: "CA19-9",
  otherTumorMarkers: "Other Tumor Markers",
  longitudinalBiomarkerTrends: "Longitudinal Biomarker Trends",
  biomarkerTrendsOverTime: "Biomarker Trends Over Time",
  treatmentTimeline: "Treatment Timeline",
  tumorSizeTrend: "Tumor Size Trend",
  biomarkerTrend: "Biomarker Trend",
  pathologyDetails: "Pathology Details (Structured)",
  pathologyReports: "Pathology Reports",
  genomicReports: "Genomic Reports",
  radiologyReports: "Radiology Reports",
  providerNotes: "Provider Notes",
  unlabeledColumn: "Unlabeled Column",
};

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return `${value.length} item(s)`;
  return String(value);
};

export function PatientInspector({ patients, analyzePatient }: PatientInspectorProps) {
  const [selectedId, setSelectedId] = useState(patients[0]?.patientId ?? "");
  const [insights, setInsights] = useState<MasterAIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const patient = useMemo(
    () => patients.find((p) => p.patientId === selectedId) ?? patients[0],
    [patients, selectedId],
  );

  const fetchInsights = useCallback(
    async (target: Patient) => {
      try {
        const result = await analyzePatient(target);
        setInsights(result);
        setError(null);
      } catch (err) {
        console.error(err);
        setError(
          err instanceof Error
            ? err.message
            : "Unable to generate insights. Check server logs for details.",
        );
      }
    },
    [analyzePatient],
  );

  useEffect(() => {
    if (!patient) return;
    setInsights(null);
    setError(null);
    startTransition(() => {
      void fetchInsights(patient);
    });
  }, [patient, fetchInsights]);

  const handleGenerateInsights = () => {
    if (!patient) return;
    startTransition(() => {
      void fetchInsights(patient);
    });
  };

  if (!patients.length) {
    return (
      <div className="rounded border border-dashed border-red-300 bg-red-50 p-4 text-sm text-red-700">
        No patient data found. Ensure the CSV exists at <code>public/data/params_onco_final.csv</code>.
      </div>
    );
  }

  const scalarEntries = Object.entries(patient ?? {}).filter(
    ([key]) => !COMPLEX_FIELDS.includes(key as keyof Patient),
  );

  return (
    <section className="space-y-10">
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700" htmlFor="patient-select">
          Select Patient ID
        </label>
        <select
          id="patient-select"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 sm:max-w-xs"
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {patients.map((p) => (
            <option key={p.patientId} value={p.patientId}>
              {p.patientId} — {p.name}
            </option>
          ))}
        </select>
      </div>

      {patient && (
        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {patient.patientId}: {patient.name}
            </h2>
            <p className="text-sm text-slate-500">
              Total fields loaded: {scalarEntries.length + COMPLEX_FIELDS.length}
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {scalarEntries.map(([key, value]) => {
              const typedKey = key as keyof Patient;
              const label = FIELD_LABELS[typedKey] ?? key;
              return (
                <div
                  key={key}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm shadow-sm"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                  <p className="mt-2 text-base font-medium text-slate-900">{formatValue(value)}</p>
                </div>
              );
            })}
          </div>

          <div className="space-y-6">
            {COMPLEX_FIELDS.map((key) => (
              <div key={key} className="space-y-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                  {FIELD_LABELS[key]}
                </p>
                <pre className="bg-slate-950 text-green-400 p-4 rounded-lg overflow-auto text-xs">
                  {JSON.stringify(patient[key], null, 2)}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white/80 p-5 shadow-inner">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-slate-500">Gemini Master Layer</p>
            <h3 className="text-lg font-semibold text-slate-900">AI Insights</h3>
          </div>
          <button
            type="button"
            onClick={handleGenerateInsights}
            disabled={isPending || !patient}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isPending ? "Generating…" : "Generate Insights"}
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {insights ? (
          <pre className="bg-slate-950 text-green-400 p-4 rounded-lg overflow-auto text-xs">
            {JSON.stringify(insights, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-slate-500">
            Run the Gemini action to view the structured intelligence schema.
          </p>
        )}
      </div>
    </section>
  );
}
