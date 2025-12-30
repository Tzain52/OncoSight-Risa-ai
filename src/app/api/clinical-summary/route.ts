"use server";

import { NextResponse } from "next/server";

import { generateClinicalSummary } from "@/lib/clinical-summary";
import type { Patient } from "@/types/patient";

export async function POST(request: Request) {
  try {
    const { patient } = (await request.json()) as { patient?: Patient };
    if (!patient) {
      return NextResponse.json({ error: "Patient payload required" }, { status: 400 });
    }
    const summary = await generateClinicalSummary(patient);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Clinical summary API failed", error);
    return NextResponse.json(
      {
        clinical_narrative: "Summary unavailable due to service error.",
        status_one_liner: "Disease status unavailable.",
        key_risks: [],
        recommendations: [],
      },
      { status: 500 },
    );
  }
}
