function normalizeTitle(title: string | undefined, fallback: string) {
  const cleaned = title?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : fallback;
}

function withPhotoSuffix(base: string, photoIndex?: number) {
  if (typeof photoIndex !== "number" || !Number.isFinite(photoIndex) || photoIndex <= 0) {
    return base;
  }
  return `${base} (foto ${photoIndex})`;
}

export function listingImageAlt(title: string | undefined, photoIndex?: number) {
  const base = `Anuncio: ${normalizeTitle(title, "veiculo classico")}`;
  return withPhotoSuffix(base, photoIndex);
}

export function newsImageAlt(title: string | undefined, photoIndex?: number) {
  const base = `Noticia: ${normalizeTitle(title, "conteudo automotivo")}`;
  return withPhotoSuffix(base, photoIndex);
}

export function eventImageAlt(title: string | undefined, photoIndex?: number) {
  const base = `Evento: ${normalizeTitle(title, "encontro de carros antigos")}`;
  return withPhotoSuffix(base, photoIndex);
}
