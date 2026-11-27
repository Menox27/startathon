"use client";

import { useEffect, useSyncExternalStore } from "react";

/** `true` while the media query matches. Server render and first paint assume `false`. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", cb);
      return () => mql.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export const useIsMobile = () => useMediaQuery("(max-width: 1023px)");

/**
 * Mirrors the visual viewport into CSS variables so a full-screen layout can sit exactly above the
 * on-screen keyboard (iOS Safari only shrinks the *visual* viewport, never `100dvh`):
 * - `--app-height` / `--app-top`: size and offset of the visible area
 * - `--kb-inset`: how far the keyboard reaches into the layout viewport (bottom offset for sheets)
 * - `--safe-bottom`: `env(safe-area-inset-bottom)`, or 0 while the keyboard covers the home indicator
 */
export function useVisualViewportVars(enabled: boolean) {
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement.style;
    if (!enabled || !vv) return;
    const update = () => {
      if (vv.scale > 1.01) return; // pinch-zoomed: the visible area is not the keyboard's doing
      const keyboardOpen = window.innerHeight - vv.height > 120;
      root.setProperty("--app-height", `${vv.height}px`);
      root.setProperty("--app-top", `${vv.offsetTop}px`);
      root.setProperty("--kb-inset", `${Math.max(0, window.innerHeight - vv.height - vv.offsetTop)}px`);
      root.setProperty("--safe-bottom", keyboardOpen ? "0px" : "env(safe-area-inset-bottom)");
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      for (const v of ["--app-height", "--app-top", "--kb-inset", "--safe-bottom"]) root.removeProperty(v);
    };
  }, [enabled]);
}
