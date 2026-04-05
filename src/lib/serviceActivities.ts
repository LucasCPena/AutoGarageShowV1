export const DEFAULT_SERVICE_ACTIVITIES = [
  "Funilaria",
  "Restaurador",
  "Tapeceiro",
  "Eletricista",
  "Pecas em geral",
  "Despachante",
  "Importador"
];

export function normalizeServiceActivity(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

export function getServiceActivityOptions(values: Array<string | undefined>) {
  const merged = [...DEFAULT_SERVICE_ACTIVITIES, ...(values.filter(Boolean) as string[])];
  return Array.from(new Set(merged.map((item) => item.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "pt-BR")
  );
}
