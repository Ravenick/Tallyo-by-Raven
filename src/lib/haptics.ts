import { Capacitor } from "@capacitor/core";

/** Strong tap feedback: native haptics inside the Android app, Web Vibration API elsewhere. */
export async function strongTap() {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Heavy });
      await Haptics.vibrate({ duration: 60 });
      return;
    }
  } catch {
    /* fall through to web vibration */
  }
  if (typeof navigator !== "undefined") navigator.vibrate?.([60, 30, 60]);
}
