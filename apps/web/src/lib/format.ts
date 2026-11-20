import type { MemoryDto } from "@rm/shared";

export function formatEventDate(date: string, precision: MemoryDto["datePrecision"] = "day") {
  const [y, m, d] = date.split("-");
  if (precision === "year") return y ?? date;
  if (precision === "month") return `Tháng ${Number(m)}, ${y}`;
  return `${d}/${m}/${y}`;
}

export function monthKey(date: string) {
  return date.slice(0, 7);
}

export function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return { month: `Tháng ${Number(m)}`, year: y ?? "" };
}
