"use client";

import { useEffect } from "react";

const SESSION_FLAG = "ags_chunk_recovery_once";

function shouldRecover(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes("chunkloaderror") ||
    text.includes("loading chunk") ||
    text.includes("failed to fetch dynamically imported module")
  );
}

function recoverOnce() {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(SESSION_FLAG) === "1") return;

  sessionStorage.setItem(SESSION_FLAG, "1");
  const url = new URL(window.location.href);
  url.searchParams.set("_v", Date.now().toString());
  window.location.replace(url.toString());
}

export default function ChunkRecovery() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      const message = String(event.message || "");
      if (shouldRecover(message)) {
        recoverOnce();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === "string"
          ? reason
          : reason instanceof Error
            ? reason.message
            : "";

      if (shouldRecover(message)) {
        recoverOnce();
      }
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
