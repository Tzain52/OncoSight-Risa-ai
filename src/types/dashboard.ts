export interface SidebarInsights {
  dynamic_insights: { label: string; value: string; priority: "High" | "Medium" }[];
  safety_flags: {
    renal: { status: "Safe" | "Caution" | "Danger"; details: string };
    liver: { status: "Safe" | "Caution" | "Danger"; details: string };
    hematology: { status: "Safe" | "Caution" | "Danger"; details: string };
  };
}

export interface MasterAIResponse {
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
}
