function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function isSecurityConfigurationError(error: unknown) {
  const message = getErrorMessage(error);
  return (
    message.includes("AUTH_TOKEN_SECRET nao configurado") ||
    message.includes("Chave de criptografia de campos nao configurada.")
  );
}

export function getPublicSecurityConfigurationMessage() {
  return "A autenticação do ambiente ainda não está configurada corretamente.";
}
