import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// ============================================================================
// SERVICE WORKER
// ----------------------------------------------------------------------------
// Wersja developerska (npm run dev) oraz osobny BUNDEL PWA (npm run build:pwa)
// rejestrują SW (offline, cache app shella). Bundel portalowy
// (npm run build → CrazyGames / Yandex / itch.io / GameMonetize /
// CoolMathGames / ArmorGames / Kongregate / Newgrounds) NIE może zawierać
// rejestracji SW — portale zabraniają service workerów, więc w buildzie
// portalowym poniższy blok jest wycinany przez dead-code-elimination
// (import.meta.env.PROD jest stałą, a VITE_PWA nie jest ustawione).
// ============================================================================
if ((!import.meta.env.PROD || import.meta.env.VITE_PWA) && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // The game still works online if service-worker registration is blocked.
    });
  });
}
