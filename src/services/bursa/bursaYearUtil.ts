/** KLSE 決算年度ラベル → 暦年（例: "31 Dec, 2025" → 2025） */
export function calendarYearFromFinancialLabel(label: string | null | undefined): number | null {
  if (!label) return null;
  const m = label.match(/(\d{4})/);
  if (!m) return null;
  const y = Number.parseInt(m[1], 10);
  return Number.isFinite(y) ? y : null;
}

export function calendarYearFromDividendLabel(label: string | null | undefined): number | null {
  return calendarYearFromFinancialLabel(label);
}
