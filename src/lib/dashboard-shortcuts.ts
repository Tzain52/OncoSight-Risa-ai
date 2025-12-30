export const DASHBOARD_SHORTCUT_EVENT = "onco:dashboard-shortcut" as const;

export type DashboardShortcut = "export" | "back";

export interface DashboardShortcutDetail {
  action: DashboardShortcut;
}
