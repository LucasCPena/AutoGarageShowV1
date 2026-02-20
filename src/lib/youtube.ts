const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

function tryParseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function extractYouTubeVideoId(input: string | undefined | null) {
  const raw = (input || "").trim();
  if (!raw) return null;
  if (YOUTUBE_ID_REGEX.test(raw)) return raw;

  const parsed = tryParseUrl(raw);
  if (!parsed) return null;

  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();

  if (host === "youtu.be") {
    const id = parsed.pathname.replace(/^\/+/, "").split("/")[0] || "";
    return YOUTUBE_ID_REGEX.test(id) ? id : null;
  }

  if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    const watchId = parsed.searchParams.get("v");
    if (watchId && YOUTUBE_ID_REGEX.test(watchId)) {
      return watchId;
    }

    const segments = parsed.pathname.split("/").filter(Boolean);
    const markerIndex = segments.findIndex((segment) =>
      ["embed", "shorts", "live", "watch"].includes(segment)
    );

    if (markerIndex >= 0 && segments[markerIndex + 1]) {
      const id = segments[markerIndex + 1];
      return YOUTUBE_ID_REGEX.test(id) ? id : null;
    }
  }

  return null;
}

export function normalizeYouTubeUrl(input: string | undefined | null) {
  const videoId = extractYouTubeVideoId(input);
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

export function toYouTubeEmbedUrl(input: string | undefined | null) {
  const videoId = extractYouTubeVideoId(input);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

