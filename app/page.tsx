"use client";

import { useEffect } from "react";

export default function HomePage() {
  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration may fail in dev, that's fine
      });
    }
    // Redirect to projects
    window.location.href = "/projects";
  }, []);

  return null;
}
