"use client";

import { Dna, FileImage, FileText, Microscope } from "lucide-react";

import type { Patient } from "@/types/patient";
import { BADGE, BODY_TEXT, CARD, CARD_TITLE, LABEL_TEXT, SECTION_HEADER } from "./design-system";

type DocumentEntry = {
  date?: string;
  title: string;
  type: "radiology" | "pathology" | "genomics" | "notes";
  url?: string | null;
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(timestamp));
};

const normalizePathologyLinks = (raw?: string | null): DocumentEntry[] => {
  if (!raw) return [];
  return raw
    .split(/[,;\n]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((link, index) => ({
      date: undefined,
      title: `Pathology Report ${index + 1}`,
      type: "pathology",
      url: link,
    }));
};

interface DocumentLibrary {
  radiology: DocumentEntry[];
  pathology: DocumentEntry[];
  genomics: DocumentEntry[];
  notes: DocumentEntry[];
}

const buildDocumentLibrary = (patient: Patient): DocumentLibrary => {
  const radiology: DocumentEntry[] = (patient.radiologyReports ?? []).map((report) => ({
    date: report.date,
    title: report.modality || report.summary || "Radiology Report",
    type: "radiology",
    url: report.link,
  }));

  const genomics: DocumentEntry[] = (patient.genomicReports ?? []).map((report) => ({
    date: report.date,
    title: report.summary ? `${report.summary.slice(0, 70)}${report.summary.length > 70 ? "…" : ""}` : "Genomic Panel",
    type: "genomics",
    url: report.link,
  }));

  const providerNotes: DocumentEntry[] = (patient.providerNotes ?? []).map((note) => ({
    date: note.date,
    title: note.summary || "Clinical Encounter",
    type: "notes",
    url: note.link,
  }));

  const noteEntriesFromJson: DocumentEntry[] = (() => {
    if (!patient.providerNoteLinks) return [];
    try {
      const parsed = JSON.parse(patient.providerNoteLinks) as unknown;
      if (!Array.isArray(parsed)) return [];
      return (parsed as unknown[]).reduce<DocumentEntry[]>((acc, entry) => {
        if (!entry || typeof entry !== "object") {
          return acc;
        }
        const record = entry as Record<string, unknown>;
        acc.push({
          date: typeof record.date === "string" ? record.date : undefined,
          title:
            (typeof record.note_type === "string" && record.note_type) ||
            (typeof record.summary === "string" && record.summary) ||
            "Clinical Encounter",
          type: "notes",
          url: typeof record.link === "string" ? record.link : undefined,
        });
        return acc;
      }, []);
    } catch {
      return [];
    }
  })();

  const notes = [...noteEntriesFromJson, ...providerNotes];

  const pathologyFromDetails = (patient.pathologyDetails ?? []).reduce<DocumentEntry[]>((acc, detail) => {
    const raw = detail.raw as Record<string, unknown> | undefined;
    const link = typeof raw?.link === "string" ? raw?.link : undefined;
    if (link) {
      acc.push({
        date: detail.date,
        title: detail.procedure || detail.site || "Pathology Report",
        type: "pathology",
        url: link,
      });
    }
    return acc;
  }, []);

  const pathologyLinks = normalizePathologyLinks(patient.pathologyReportLinks);
  const pathology = [...pathologyFromDetails, ...pathologyLinks];

  return {
    radiology,
    pathology,
    genomics,
    notes,
  };
};

const SectionIcon = {
  radiology: FileImage,
  pathology: Microscope,
  genomics: Dna,
  notes: FileText,
};

interface ReferencesTabProps {
  patient: Patient;
}

export function ReferencesTab({ patient }: ReferencesTabProps) {
  const library = buildDocumentLibrary(patient);

  const sections: {
    key: keyof DocumentLibrary;
    title: string;
    description: string;
  }[] = [
    { key: "radiology", title: "Radiology Images & Reports", description: "CT, MRI, X-ray, and other imaging studies." },
    { key: "pathology", title: "Pathology & Lab Reports", description: "Histology, surgical pathology, and lab reports." },
    { key: "genomics", title: "Genomic Profiles", description: "Molecular testing, NGS panels, and targeted sequencing." },
    { key: "notes", title: "Clinical Notes & Summaries", description: "Consult notes, encounter summaries, and discharge reports." },
  ];

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className={SECTION_HEADER}>References</p>
        <h2 className="text-lg font-semibold text-slate-900">Clinical Documents & References</h2>
        <p className={BODY_TEXT}>Centralized access to imaging, pathology, genomic, and clinical documents.</p>
      </header>

      <div className="space-y-6">
        {sections.map((section) => {
          const items = library[section.key];
          const Icon = SectionIcon[section.key];
          return (
            <section key={section.key} className={CARD}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={SECTION_HEADER}>{section.title}</p>
                  <p className={LABEL_TEXT}>{section.description}</p>
                </div>
              </div>

              {items.length ? (
                <ul className="mt-4 space-y-3">
                  {items.map((doc, index) => (
                    <li
                      key={`${section.key}-${index}-${doc.title}`}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <div className="flex flex-1 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-slate-600 shadow">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{doc.title}</p>
                          <p className={LABEL_TEXT}>{formatDate(doc.date)}</p>
                        </div>
                      </div>
                      {doc.url ? (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`${BADGE} border border-slate-200 text-slate-600 hover:border-slate-900 hover:text-slate-900`}
                        >
                          View
                        </a>
                      ) : (
                        <span className={LABEL_TEXT}>No link</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  No documents available.
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
