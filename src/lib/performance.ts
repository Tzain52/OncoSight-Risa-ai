const PERFORMANCE_BADGE_DEFAULT = {
  label: "Performance —",
  classes: "bg-slate-100 text-slate-600",
};

export const getPerformanceBadge = (performanceStatus?: string | null) => {
  const text = performanceStatus?.trim() ?? "";
  if (!text) {
    return PERFORMANCE_BADGE_DEFAULT;
  }

  const numberMatch = text.match(/(\d+(\.\d+)?)/);
  const numericValue = numberMatch ? Number.parseFloat(numberMatch[1]) : null;
  const normalized = text.toLowerCase();
  const isKarnofsky =
    normalized.includes("karnofsky") || text.includes("%") || (numericValue !== null && numericValue > 5);

  if (isKarnofsky && numericValue !== null) {
    const kps = Math.round(Math.min(100, Math.max(0, numericValue)));
    let classes = "bg-red-100 text-red-700";
    if (kps >= 80) {
      classes = "bg-emerald-100 text-emerald-700";
    } else if (kps >= 60) {
      classes = "bg-amber-100 text-amber-700";
    }
    return {
      label: `KPS ${kps}%`,
      classes,
    };
  }

  if (numericValue !== null && numericValue <= 5) {
    let classes = "bg-red-100 text-red-700";
    if (numericValue <= 1) {
      classes = "bg-emerald-100 text-emerald-700";
    } else if (numericValue === 2) {
      classes = "bg-amber-100 text-amber-700";
    }
    return {
      label: `ECOG ${numericValue}`,
      classes,
    };
  }

  return PERFORMANCE_BADGE_DEFAULT;
};
