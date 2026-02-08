export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  const raw = await response.text();

  let parsed: unknown = null;
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }
      throw new Error("Resposta invalida do servidor.");
    }
  }

  if (!response.ok) {
    const apiError =
      parsed && typeof parsed === "object" && "error" in parsed
        ? (parsed as { error?: unknown }).error
        : null;
    const message =
      typeof apiError === "string" && apiError.trim()
        ? apiError
        : `Erro HTTP ${response.status}`;
    throw new Error(message);
  }

  return (parsed as T) ?? ({} as T);
}
