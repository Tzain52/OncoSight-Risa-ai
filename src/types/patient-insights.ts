export interface SidebarInsights {
  dynamic_insights: { label: string; value: string; priority: "High" | "Medium" }[];
  safety_flags: {
    renal: { status: "Safe" | "Caution" | "Danger"; details: string };
    liver: { status: "Safe" | "Caution" | "Danger"; details: string };
    hematology: { status: "Safe" | "Caution" | "Danger"; details: string };
  };
}

export interface PathologyDelta {
  marker: string;
  old_value: string | null;
  new_value: string | null;
  trend: "worsening" | "improving" | "stable" | "new";
}

export interface MasterAIResponse {
  current_status_summary?: string | null;
  sidebar: SidebarInsights;
  charts: {
    tumor_size: {
      should_render: boolean;
      reason: string;
    };
    biomarkers: {
      should_render: boolean;
      selected_marker: string;
      reason: string;
    };
  };
  tabs: {
    diagnosis: {
      mutation_highlight: string;
      summary: string;
    };
    investigation: {
      trend_analysis: string;
    };
    treatment: {
      current_strategy: string;
    };
  };
  stage_summary: string;
  investigations?: {
    pathology_summary?: string | null;
    pathology_comparison_text: string | null;
    pathology_deltas: PathologyDelta[] | null;
    labs_summary?: string | null;
  };
}
