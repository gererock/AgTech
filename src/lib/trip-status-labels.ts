export const TRIP_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pendiente" },
  { value: "IN_TRANSIT", label: "En transito" },
  { value: "COMPLETED", label: "Completado" }
] as const;

const tripStatusLabels = Object.fromEntries(
  TRIP_STATUS_OPTIONS.map((option) => [option.value, option.label])
) as Record<string, string>;

export function getTripStatusLabel(status: string | null | undefined) {
  if (!status) {
    return "Sin estado";
  }

  return tripStatusLabels[status] ?? status;
}

export function getTripStatusColorClassName(status: string | null | undefined, isSelected = true) {
  if (status === "COMPLETED") {
    return isSelected
      ? "border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
      : "border-emerald-300 bg-white text-emerald-800 hover:bg-emerald-50";
  }

  if (status === "IN_TRANSIT") {
    return isSelected
      ? "border-sky-600 bg-sky-600 text-white hover:bg-sky-700"
      : "border-sky-300 bg-white text-sky-800 hover:bg-sky-50";
  }

  if (status === "PENDING") {
    return isSelected
      ? "border-amber-500 bg-amber-100 text-amber-950 hover:bg-amber-200"
      : "border-amber-300 bg-white text-amber-900 hover:bg-amber-50";
  }

  return isSelected
    ? "border-slate-500 bg-slate-100 text-slate-900 hover:bg-slate-200"
    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50";
}
