import type { MasterAIResponse } from "@/types/patient-insights";
import type { Patient } from "@/types/patient";
import { generatePatientInsights } from "@/actions/analyze-patient";

const insightPromises = new Map<string, Promise<MasterAIResponse>>();

export function getPatientInsights(patient: Patient): Promise<MasterAIResponse> {
  const existing = insightPromises.get(patient.patientId);
  if (existing) {
    return existing;
  }

  const promise = generatePatientInsights(patient)
    .catch((error) => {
      insightPromises.delete(patient.patientId);
      throw error;
    }) as Promise<MasterAIResponse>;

  insightPromises.set(patient.patientId, promise);
  return promise;
}
