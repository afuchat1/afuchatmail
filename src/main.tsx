import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

/**
 * Recover automatically when a stale PWA/service-worker cache references
 * a JavaScript chunk that no longer exists in the current deployment.
 *
 * This runs before React mounts so chunk-load failures can be handled globally.
 * A sessionStorage guard prevents an infinite reload loop.
 */
const CHUNK_RECOVERY_KEY = "afumail-chunk-recovery";

const recoverFromChunkLoadError = async () => {
  if (sessionStorage.getItem(CHUNK_RECOVERY_KEY) === "1") {
    sessionStorage.removeItem(CHUNK_RECOVERY_KEY);
    return;
  }

  sessionStorage.setItem(CHUNK_RECOVERY_KEY, "1");

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }
  } finally {
    window.location.reload();
  }
};

window.addEventListener("error", (event) => {
  const target = event.target as HTMLScriptElement | null;
  const message = event.message || "";
  const isChunkFailure =
    target?.tagName === "SCRIPT" &&
    (target.src.includes("/assets/") || target.src.includes(".js"));

  if (isChunkFailure || /Failed to fetch dynamically imported module|Importing a module script failed/i.test(message)) {
    void recoverFromChunkLoadError();
  }
}, true);

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason;
  const message = reason instanceof Error ? reason.message : String(reason ?? "");

  if (/Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\w-]+ failed/i.test(message)) {
    event.preventDefault();
    void recoverFromChunkLoadError();
  }
});

createRoot(document.getElementById("root")!).render(<App />);
