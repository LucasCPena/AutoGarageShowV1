function getErrorCode(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

export function logServerError(context: string, error: unknown) {
  const code = getErrorCode(error);
  const message = error instanceof Error ? error.message : String(error);

  console.error(`${context}${code ? ` [${code}]` : ""}: ${message}`);
}
