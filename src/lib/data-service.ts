import { readFile } from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';

import type {
  BiomarkerPoint,
  DocumentLink,
  PathologyDetails,
  Patient,
  RadiologyDocument,
  TimelineEvent,
  TumorSizePoint,
} from '@/types/patient';

type RawPatientRow = Record<string, string>;

const DATA_FILE = path.join(process.cwd(), 'public', 'data', 'params_onco_2.csv');

const BOOLEAN_COLUMNS = new Set([
  'Ambiguous diagnosis flag',
  'New lesions (yes/no)',
  'Renal dysfunction flag',
  'Liver dysfunction flag',
]);

async function readCsvFile(): Promise<string> {
  return readFile(DATA_FILE, 'utf-8');
}

function toNumber(value?: string): number | null {
  if (!value) return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBoolean(value?: string): boolean | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith('yes') || normalized === 'y' || normalized === 'true') {
    return true;
  }
  if (normalized.startsWith('no') || normalized === 'n' || normalized === 'false') {
    return false;
  }
  return null;
}

function parseJsonArray<T = Record<string, unknown>>(value?: string): T[] {
  if (!value || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function mapTimelineEvents(value?: string): TimelineEvent[] {
  return parseJsonArray<Record<string, unknown>>(value).map((item) => ({
    line: toNumber(String(item.line ?? item.lineNumber ?? '')),
    regimen: typeof item.regimen === 'string' ? item.regimen : undefined,
    startDate: typeof item.start_date === 'string' ? item.start_date : (typeof item.startDate === 'string' ? item.startDate : undefined),
    endDate: typeof item.end_date === 'string' ? item.end_date : (typeof item.endDate === 'string' ? item.endDate : undefined),
    response: typeof item.response === 'string' ? item.response : undefined,
    reasonForStopping: typeof item.reason_for_stopping === 'string' ? item.reason_for_stopping : (typeof item.reasonForStopping === 'string' ? item.reasonForStopping : undefined),
    toxicities: typeof item.toxicities === 'string' ? item.toxicities : undefined,
  }));
}

function mapTumorSizePoints(value?: string): TumorSizePoint[] {
  return parseJsonArray<Record<string, unknown>>(value).map((item) => ({
    date: typeof item.date === 'string' ? item.date : undefined,
    sumOfDiametersMm: toNumber(String(item.sum_of_diameters_mm ?? item.sumOfDiametersMm ?? '')),
  }));
}

function mapBiomarkerPoints(value?: string): BiomarkerPoint[] {
  return parseJsonArray<Record<string, unknown>>(value).map((item) => ({
    date: typeof item.date === 'string' ? item.date : undefined,
    markerName: typeof item.marker_name === 'string' ? item.marker_name : (typeof item.markerName === 'string' ? item.markerName : undefined),
    value: toNumber(String(item.value ?? '')),
  }));
}

function mapDocumentLinks(value?: string): DocumentLink[] {
  return parseJsonArray<Record<string, unknown>>(value).map((item) => ({
    date: typeof item.date === 'string' ? item.date : undefined,
    summary: typeof item.summary === 'string' ? item.summary : undefined,
    link: typeof item.link === 'string' ? item.link : undefined,
  }));
}

function mapRadiologyDocuments(value?: string): RadiologyDocument[] {
  return parseJsonArray<Record<string, unknown>>(value).map((item) => ({
    date: typeof item.date === 'string' ? item.date : undefined,
    modality: typeof item.modality === 'string' ? item.modality : undefined,
    summary: typeof item.summary === 'string' ? item.summary : undefined,
    link: typeof item.link === 'string' ? item.link : undefined,
  }));
}

function parsePathologyDetails(value?: string): PathologyDetails[] {
  if (!value || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    return entries
      .filter((entry): entry is Record<string, unknown> => entry !== null && typeof entry === 'object')
      .map((entry) => {
        const histology =
          entry && typeof (entry as Record<string, unknown>).histology === 'object'
            ? ((entry as Record<string, unknown>).histology as Record<string, unknown>)
            : undefined;
        const ihcPanel =
          entry && typeof (entry as Record<string, unknown>).ihc_panel === 'object'
            ? ((entry as Record<string, unknown>).ihc_panel as Record<string, unknown>)
            : undefined;
        const camelIhc =
          entry && typeof (entry as Record<string, unknown>).ihcPanel === 'object'
            ? ((entry as Record<string, unknown>).ihcPanel as Record<string, unknown>)
            : undefined;

        const record = entry as Record<string, unknown>;
        return {
          procedure: typeof record.procedure === 'string' ? record.procedure : undefined,
          date: typeof record.date === 'string' ? record.date : undefined,
          site: typeof record.site === 'string' ? record.site : undefined,
          diagnosisText:
            typeof record.diagnosisText === 'string'
              ? record.diagnosisText
              : (typeof record.diagnosis_text === 'string' ? record.diagnosis_text : undefined),
          histology,
          ihcPanel: ihcPanel ?? camelIhc,
          raw: record,
        };
      });
  } catch {
    return [];
  }
}

function sanitize(value?: string): string {
  return value ? value.trim() : '';
}

function parseBsa(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'n/a') {
    return null;
  }
  return trimmed;
}

function parseBmi(value?: string): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'n/a') {
    return null;
  }
  return trimmed;
}

function mapRowToPatient(row: RawPatientRow): Patient {
  const get = (key: string) => sanitize(row[key]);
  const bool = (key: string) => (BOOLEAN_COLUMNS.has(key) ? toBoolean(row[key]) : null);
  const rawBsa =
    row['bsa'] ??
    row['BSA'] ??
    row['Body Surface Area (BSA)'] ??
    row[' Body Surface Area (BSA)'] ??
    row['Body surface area (BSA)'];
  const rawBmi = row['bmi'] ?? row['BMI'] ?? row['Body Mass Index (BMI)'];

  return {
    patientId: get('Patient ID'),
    name: get('Name'),
    bmi: parseBmi(rawBmi),
    bsa: parseBsa(rawBsa),
    age: toNumber(row['Age']),
    sex: get('Sex'),
    smokingStatus: get('Smoking status (Never / Former / Current)'),
    performanceStatus: get('Performance status (ECOG or Karnofsky)'),
    diabetes: get('Diabetes'),
    hypertension: get('Hypertension'),
    heartDisease: get('Heart disease'),
    copdAsthma: get('COPD / asthma'),
    otherRelevantComorbidities: get('Other relevant comorbidities'),
    primaryDiagnosis: get('Primary diagnosis'),
    histologicType: get('Histologic type'),
    tumorGrade: get('Tumor grade'),
    diagnosisDate: get('Diagnosis date'),
    initialTnmStage: get('Initial TNM stage'),
    currentTnmStage: get('Current TNM stage'),
    metastaticStatus: get('Metastatic status'),
    metastaticSites: get('Metastatic sites'),
    recurrenceStatus: get('Recurrence status'),
    pathologyDiagnosisText: get('Pathology diagnosis text'),
    histopathologicFeatures: get('Histopathologic features'),
    marginStatus: get('Margin status'),
    ihcMarkers: get('IHC markers'),
    ambiguousDiagnosisFlag: bool('Ambiguous diagnosis flag'),
    egfrMutation: get('EGFR mutation'),
    alkRearrangement: get('ALK rearrangement'),
    ros1Rearrangement: get('ROS1 rearrangement'),
    krasMutation: get('KRAS mutation'),
    brafMutation: get('BRAF mutation'),
    metExon14Skipping: get('MET exon 14 skipping'),
    retRearrangement: get('RET rearrangement'),
    her2Mutation: get('HER2 mutation'),
    ntrkFusion: get('NTRK fusion'),
    pdL1Expression: get('PD-L1 expression (%)'),
    tumorMutationalBurden: get('Tumor mutational burden (TMB)'),
    microsatelliteInstability: get('Microsatellite instability (MSI)'),
    ctdnaFindings: get('ctDNA findings'),
    actionableMutationSummary: get('Actionable mutation summary'),
    newMutationsOverTime: get('New mutations over time'),
    treatmentPlanSummary: get('Treatment plan summary'),
    surgicalTreatments: get('Surgical treatments (type + date)'),
    radiationTreatments: get('Radiation treatments (site + date)'),
    latestCtChest: get('Latest CT chest (date + summary)'),
    latestPetCt: get('Latest PET/CT (date + summary)'),
    latestBrainMri: get('Latest Brain MRI'),
    newLesions: bool('New lesions (yes/no)'),
    radiologyImpressionKeywords: get('Radiology impression keywords'),
    renalDysfunctionFlag: bool('Renal dysfunction flag'),
    liverDysfunctionFlag: bool('Liver dysfunction flag'),
    cbcValues: get('CBC values'),
    cmpValues: get('CMP values'),
    electrolytes: get('Electrolytes'),
    abnormalLabFlags: get('Abnormal lab flags'),
    longitudinalLaboratoryFlagTrends: get('Longitudinal laboratory flag trends'),
    overallDiseaseCourseSummary: get('Overall disease course summary'),
    stageChangesOverTime: get('Stage changes over time'),
    lastClinicalEncounterDate: get('Last clinical encounter date'),
    pathologyReportLinks: get('Pathology report links'),
    genomicReportLinks: get('Genomic report links'),
    radiologyReportLinks: get('Radiology report links'),
    providerNoteLinks: get('Provider note links'),
    currentLineOfTherapy: get('Current line of therapy'),
    priorTherapies: get('Prior therapies'),
    regimenDetails: get('Regimen details (drug(s), dose, frequency)'),
    treatmentStartAndEndDates: get('Treatment start and end dates'),
    responsePerLine: get('Response per line (CR / PR / SD / PD)'),
    treatmentResponseTimeline: get('Treatment response timeline'),
    reasonsForTreatmentChange: get('Reasons for treatment change'),
    treatmentRelatedToxicities: get('Treatment-related toxicities'),
    radiologyTrend: get('Radiology trend'),
    radiologyTrendsOverTime: get('Radiology trends over time'),
    recistMeasurements: get('RECIST measurements'),
    lesionCountSize: get('Lesion count / size'),
    cea: get('CEA'),
    ca199: get('CA19-9'),
    otherTumorMarkers: get('Other tumor markers'),
    longitudinalBiomarkerTrends: get('Longitudinal biomarker trends'),
    biomarkerTrendsOverTime: get('Biomarker trends over time'),
    treatmentTimeline: mapTimelineEvents(row['Treatment_Timeline_JSON']),
    tumorSizeTrend: mapTumorSizePoints(row['Tumor_Size_Trend_JSON']),
    biomarkerTrend: mapBiomarkerPoints(row['Biomarker_Trend_JSON']),
    pathologyReports: mapDocumentLinks(row['Pathology_Reports_JSON']),
    genomicReports: mapDocumentLinks(row['Genomic_Reports_JSON']),
    radiologyReports: mapRadiologyDocuments(row['Radiology_Reports_JSON']),
    providerNotes: mapDocumentLinks(row['Provider_Notes_JSON']),
    pathologyDetails: parsePathologyDetails(row['pathology_details_json']),
    unlabeledColumn: get(''),
  };
}

export async function loadPatients(): Promise<Patient[]> {
  const csv = await readCsvFile();
  const { data } = Papa.parse<RawPatientRow>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
  });

  return data
    .filter((row) => row && Object.values(row).some((value) => (value ?? '').trim().length > 0))
    .map(mapRowToPatient);
}

export async function getPatientById(patientId: string): Promise<Patient | null> {
  const patients = await loadPatients();
  return patients.find((patient) => patient.patientId === patientId) ?? null;
}
