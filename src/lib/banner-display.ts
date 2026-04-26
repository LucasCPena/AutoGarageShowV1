export const DEFAULT_BANNER_SCALE = 100;
export const MIN_BANNER_SCALE = 50;
export const MAX_BANNER_SCALE = 200;
export const DEFAULT_BANNER_POSITION = 50;

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function normalizeBannerScale(value: unknown) {
  return clampNumber(value, MIN_BANNER_SCALE, MAX_BANNER_SCALE, DEFAULT_BANNER_SCALE);
}

export function normalizeBannerPosition(value: unknown) {
  return clampNumber(value, 0, 100, DEFAULT_BANNER_POSITION);
}

export function normalizeBannerDisplay(input: {
  imageScale?: unknown;
  imagePositionX?: unknown;
  imagePositionY?: unknown;
}) {
  return {
    imageScale: normalizeBannerScale(input.imageScale),
    imagePositionX: normalizeBannerPosition(input.imagePositionX),
    imagePositionY: normalizeBannerPosition(input.imagePositionY)
  };
}

export function bannerObjectPosition(input: {
  imagePositionX?: unknown;
  imagePositionY?: unknown;
}) {
  return `${normalizeBannerPosition(input.imagePositionX)}% ${normalizeBannerPosition(
    input.imagePositionY
  )}%`;
}
