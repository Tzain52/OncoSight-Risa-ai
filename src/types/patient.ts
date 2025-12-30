export interface TimelineEvent {
  line?: number | null;
  regimen?: string;
  startDate?: string;
  endDate?: string;
  response?: string;
  reasonForStopping?: string;
  toxicities?: string;
}

export interface PathologyDetails {
  procedure?: string;
  date?: string;
  site?: string;
  diagnosisText?: string;
  histology?: Record<string, unknown>;
  ihcPanel?: Record<string, unknown>;
  raw?: Record<string, unknown>;
}

export interface TumorSizePoint {
  date?: string;
  sumOfDiametersMm?: number | null;
}

export interface BiomarkerPoint {
  date?: string;
  markerName?: string;
  value?: number | null;
}

export interface DocumentLink {
  date?: string;
  summary?: string;
  link?: string;
}

export interface RadiologyDocument extends DocumentLink {
  modality?: string;
}

export interface Patient {
  patientId: string;
  name: string;
  dateOfBirth?: string | null;
  birthDate?: string | null;
  bmi: string | null;
  bsa: string | null;
  age: number | null;
  sex: string;
  smokingStatus: string;
  performanceStatus: string;
  diabetes: string;
  hypertension: string;
  heartDisease: string;
  copdAsthma: string;
  otherRelevantComorbidities: string;
  primaryDiagnosis: string;
  histologicType: string;
  tumorGrade: string;
  diagnosisDate: string;
  initialTnmStage: string;
  currentTnmStage: string;
  metastaticStatus: string;
  metastaticSites: string;
  recurrenceStatus: string;
  pathologyDiagnosisText: string;
  histopathologicFeatures: string;
  marginStatus: string;
  ihcMarkers: string;
  ambiguousDiagnosisFlag: boolean | null;
  egfrMutation: string;
  alkRearrangement: string;
  ros1Rearrangement: string;
  krasMutation: string;
  brafMutation: string;
  metExon14Skipping: string;
  retRearrangement: string;
  her2Mutation: string;
  ntrkFusion: string;
  pdL1Expression: string;
  tumorMutationalBurden: string;
  microsatelliteInstability: string;
  ctdnaFindings: string;
  actionableMutationSummary: string;
  newMutationsOverTime: string;
  treatmentPlanSummary: string;
  surgicalTreatments: string;
  radiationTreatments: string;
  latestCtChest: string;
  latestPetCt: string;
  latestBrainMri: string;
  newLesions: boolean | null;
  radiologyImpressionKeywords: string;
  renalDysfunctionFlag: boolean | null;
  liverDysfunctionFlag: boolean | null;
  cbcValues: string;
  cmpValues: string;
  electrolytes: string;
  abnormalLabFlags: string;
  longitudinalLaboratoryFlagTrends: string;
  overallDiseaseCourseSummary: string;
  stageChangesOverTime: string;
  lastClinicalEncounterDate: string;
  pathologyReportLinks: string;
  genomicReportLinks: string;
  radiologyReportLinks: string;
  providerNoteLinks: string;
  currentLineOfTherapy: string;
  priorTherapies: string;
  regimenDetails: string;
  treatmentStartAndEndDates: string;
  responsePerLine: string;
  treatmentResponseTimeline: string;
  reasonsForTreatmentChange: string;
  treatmentRelatedToxicities: string;
  radiologyTrend: string;
  radiologyTrendsOverTime: string;
  recistMeasurements: string;
  lesionCountSize: string;
  cea: string;
  ca199: string;
  otherTumorMarkers: string;
  longitudinalBiomarkerTrends: string;
  biomarkerTrendsOverTime: string;
  treatmentTimeline: TimelineEvent[];
  tumorSizeTrend: TumorSizePoint[];
  biomarkerTrend: BiomarkerPoint[];
  pathologyReports: DocumentLink[];
  genomicReports: DocumentLink[];
  radiologyReports: RadiologyDocument[];
  providerNotes: DocumentLink[];
  pathologyDetails?: PathologyDetails[] | null;
  unlabeledColumn?: string;
}
