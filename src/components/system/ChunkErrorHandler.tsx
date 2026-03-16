"use client";

import { useEffect } from "react";

const CHUNK_RELOAD_KEY = "mini-insta-chunk-reload";

export default function ChunkErrorHandler() {
  useEffect(() => {
    const shouldHandle = (message: string) =>
      message.includes("ChunkLoadError") ||
      message.includes("Loading chunk") ||
      message.includes("Failed to fetch dynamically imported module");

    const reloadOnce = () => {
      if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") {
        sessionStorage.removeItem(CHUNK_RELOAD_KEY);
        return;
      }
      sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      const message =
        event.message || (event.error instanceof Error ? event.error.message : "");
      if (shouldHandle(message)) reloadOnce();
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === "string"
          ? reason
          : reason instanceof Error
          ? reason.message
          : "";
      if (shouldHandle(message)) reloadOnce();
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

