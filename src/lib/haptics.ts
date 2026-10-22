import { Capacitor } from "@capacitor/core";

/**
 * Heavy tap feedback:
 * Uses Capacitor Haptics on Android native app, with heavy impact & vibration.
 * Falls back to Web Vibration API on mobile browsers.
 */
export async function strongTap() {
  let nativeHapticsWorked = false;
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
        nativeHapticsWorked = true;
      } catch {}
      try {
        await Haptics.vibrate({ duration: 90 });
        nativeHapticsWorked = true;
      } catch {}
    }
  } catch {
    /* Fall back to browser vibration */
  }

  if (!nativeHapticsWorked && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate([80, 30, 80]);
    } catch {
      // Ignore vibration errors if blocked by browser policy
    }
  }
}

/** Lighter feedback for secondary actions (tab switches, mode toggles). */
export async function lightTap() {
  let nativeHapticsWorked = false;
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      try {
        await Haptics.impact({ style: ImpactStyle.Light });
        nativeHapticsWorked = true;
      } catch {}
    }
  } catch {}

  if (!nativeHapticsWorked && typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(30);
    } catch {}
  }
}
