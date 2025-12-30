"use client";

import { useCallback, useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import type { Patient, TimelineEvent } from "@/types/patient";

interface ClinicalSummaryResponse {
  clinical_narrative: string;
  status_one_liner?: string;
  key_risks: string[];
  recommendations: string[];
}

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(
    new Date(timestamp),
  );
};

const latestValue = (source?: string | null, key?: string) => {
  if (!source) return "—";
  const match = source.match(new RegExp(`${key ?? ""}[:=]?\\s*([\\d.]+)`, "i"));
  if (match) return match[1];
  return source.split(/[,;]+/)[0]?.trim() || "—";
};

const pickTreatment = (timeline?: TimelineEvent[]) => {
  if (!timeline?.length) return null;
  return timeline.find((event) => !event.endDate) ?? timeline[0];
};

export const usePDFGenerator = (patient: Patient) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePDF = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    let summary: ClinicalSummaryResponse = {
      clinical_narrative: "Summary unavailable.",
      status_one_liner: "Disease status not documented.",
      key_risks: [],
      recommendations: [],
    };

    try {
      const response = await fetch("/api/clinical-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient }),
      });
      if (response.ok) {
        summary = (await response.json()) as ClinicalSummaryResponse;
      }
    } catch (error) {
      console.error("Failed to fetch clinical summary", error);
    }

    const doc = new jsPDF({ unit: "pt" });
    const marginX = 48;
    let cursorY = 60;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Oncology Clinical Dashboard", marginX, cursorY);

    cursorY += 30;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${patient.name || "—"}`, marginX, cursorY);
    doc.text(`Patient ID: ${patient.patientId}`, marginX + 240, cursorY);
    cursorY += 18;
    const dateOfBirth = patient.dateOfBirth ?? patient.birthDate ?? "—";
    doc.text(`Age: ${patient.age ?? "—"}`, marginX, cursorY);
    doc.text(`Sex: ${patient.sex || "—"}`, marginX + 120, cursorY);
    doc.text(`DOB: ${dateOfBirth}`, marginX + 240, cursorY);
    cursorY += 18;
    doc.text(
      `Diagnosis: ${patient.primaryDiagnosis || patient.histologicType || "—"} | ${
        patient.currentTnmStage || patient.initialTnmStage || "Stage N/A"
      } | ${patient.actionableMutationSummary || "Driver not reported"}`,
      marginX,
      cursorY,
    );

    cursorY += 32;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Current Status", marginX, cursorY);
    cursorY += 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(summary.status_one_liner || patient.overallDiseaseCourseSummary || "Status not documented.", marginX, cursorY);
    cursorY += 18;
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(14);
    doc.text("Clinical Assessment", marginX, cursorY);
    cursorY += 18;
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    const narrativeLines = doc.splitTextToSize(summary.clinical_narrative || "Summary unavailable.", 520);
    doc.text(narrativeLines, marginX, cursorY);
    cursorY += narrativeLines.length * 14 + 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Key Risks", marginX, cursorY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const risks = summary.key_risks?.length ? summary.key_risks : ["Not documented"];
    risks.forEach((risk, index) => {
      doc.text(`• ${risk}`, marginX, cursorY + 16 + index * 14);
    });
    cursorY += 16 + risks.length * 14;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Recommendations", marginX, cursorY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const recs = summary.recommendations?.length ? summary.recommendations : ["Continue surveillance."];
    recs.forEach((rec, index) => {
      doc.text(`• ${rec}`, marginX, cursorY + 16 + index * 14);
    });
    cursorY += 24 + recs.length * 14;

    const currentTreatment = pickTreatment(patient.treatmentTimeline);
    const treatmentRows = [
      [
        currentTreatment?.regimen || patient.currentLineOfTherapy || "Not documented",
        formatDate(currentTreatment?.startDate),
        patient.responsePerLine || "Not recorded",
      ],
    ];

    autoTable(doc, {
      startY: cursorY,
      head: [["Current Drug", "Start Date", "Last Response"]],
      body: treatmentRows,
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 10 },
    });

    const labsStartY = (doc as any).lastAutoTable.finalY + 24;
    const labRows = [
      ["WBC", latestValue(patient.cbcValues, "WBC")],
      ["Hb", latestValue(patient.cbcValues, "Hb")],
      ["Plt", latestValue(patient.cbcValues, "Plt")],
      ["Cr", latestValue(patient.cmpValues, "Cr")],
      ["AST", latestValue(patient.cmpValues, "AST")],
    ];

    autoTable(doc, {
      startY: labsStartY,
      head: [["Latest Labs", "Value"]],
      body: labRows,
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 10 },
      columnStyles: { 0: { fontStyle: "bold" } },
    });

    const alertsStartY = (doc as any).lastAutoTable.finalY + 24;
    const alertRows = [
      ["Abnormal lab flags", patient.abnormalLabFlags || "None documented"],
      ["Renal Dysfunction", patient.renalDysfunctionFlag ? "Active" : "None"],
      ["Liver Dysfunction", patient.liverDysfunctionFlag ? "Active" : "None"],
    ];

    autoTable(doc, {
      startY: alertsStartY,
      head: [["Key Alerts", "Status"]],
      body: alertRows,
      margin: { left: marginX, right: marginX },
      styles: { fontSize: 10 },
    });

    const fileName = `${patient.patientId}_Summary_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
    setIsGenerating(false);
  }, [isGenerating, patient]);

  return { isGenerating, generatePDF };
};
