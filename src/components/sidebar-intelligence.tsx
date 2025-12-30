import { getPatientInsights } from "@/lib/patient-insights";
import type { SidebarInsights } from "@/types/dashboard";
import type { Patient } from "@/types/patient";
import { getPerformanceBadge } from "@/lib/performance";

interface SidebarIntelligenceProps {
  patient: Patient;
}

const statusColors: Record<"Safe" | "Caution" | "Danger", string> = {
  Safe: "bg-emerald-500",
  Caution: "bg-amber-400",
  Danger: "bg-rose-500",
};

const SafetyRow = ({
  label,
  status,
  details,
}: {
  label: string;
  status: "Safe" | "Caution" | "Danger";
  details: string;
}) => (
  <details className="group rounded-xl border border-slate-200 bg-white/80 p-3 [&_summary::-webkit-details-marker]:hidden">
    <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${statusColors[status]}`} />
        <p className="text-sm font-semibold text-slate-900">
          {label} · {status}
        </p>
      </div>
      <span
        aria-hidden="true"
        className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-500 transition group-open:rotate-45"
      >
        +
      </span>
    </summary>
    <div className="mt-2 max-h-28 overflow-y-auto pr-1 text-xs text-slate-600">{details}</div>
  </details>
);

export function SidebarIntelligenceSkeleton() {
  return (
    <aside className="flex h-full w-80 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Patient story</p>
          <div className="mt-2 h-6 w-40 animate-pulse rounded bg-slate-200/70" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="h-16 animate-pulse rounded-2xl bg-slate-200/70" />
          ))}
        </div>
      </div>
      <div className="border-t border-slate-200 bg-white px-5 py-4">
        <p className="text-xs uppercase tracking-[0.4em] text-slate-400">Safety monitor</p>
        <div className="mt-3 space-y-2">
          {[...Array(3)].map((_, idx) => (
            <div key={idx} className="h-14 animate-pulse rounded-xl bg-slate-200/70" />
          ))}
        </div>
      </div>
    </aside>
  );
}

export async function SidebarIntelligence({ patient }: SidebarIntelligenceProps) {
  let insights: SidebarInsights | null = null;
  let error: string | null = null;
  const performanceBadge = getPerformanceBadge(patient.performanceStatus);
  const bsaDisplay = patient.bsa ? `${patient.bsa} m²` : "--";

  try {
    const payload = await getPatientInsights(patient);
    insights = payload.sidebar;
  } catch (err) {
    console.error(err);
    error = "Unable to load AI insights. Please retry.";
  }

  return (
    <aside className="flex h-full w-80 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex h-full flex-col gap-4 p-5">
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Patient story
          </p>
          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          ) : insights ? (
            <div className="space-y-3">
              {insights.dynamic_insights.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border p-4 shadow-sm ${
                    item.priority === "High"
                      ? "border-rose-200 bg-rose-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <p className="text-base font-semibold text-slate-900">{item.label}</p>
                  <p className="text-sm text-slate-600">{item.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              AI insights will appear here once generated for this patient.
            </p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Patient status
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">Fitness</p>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${performanceBadge.classes}`}
              >
                {performanceBadge.label}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">BSA</p>
              <p className={`text-base font-semibold ${patient.bsa ? "text-slate-900" : "text-slate-400"}`}>
                {patient.bsa ? `BSA: ${bsaDisplay}` : "BSA: --"}
              </p>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
            Safety monitor
          </p>
          {insights ? (
            <div className="mt-3 space-y-3">
              <SafetyRow
                label="Renal"
                status={insights.safety_flags.renal.status}
                details={insights.safety_flags.renal.details}
              />
              <SafetyRow
                label="Liver"
                status={insights.safety_flags.liver.status}
                details={insights.safety_flags.liver.details}
              />
              <SafetyRow
                label="Hematology"
                status={insights.safety_flags.hematology.status}
                details={insights.safety_flags.hematology.details}
              />
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Safety lab callouts will populate after the AI pass.
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
