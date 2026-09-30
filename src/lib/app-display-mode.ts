import { useEffect, useState } from "react";

type NavigatorWithStandalone = Navigator & { standalone?: boolean };
type AppWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
  ReactNativeWebView?: unknown;
};

export function isRunningAsInstalledApp() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return true;

  const appWindow = window as AppWindow;
  const navigatorWithStandalone = navigator as NavigatorWithStandalone;
  const standaloneDisplay = window.matchMedia("(display-mode: standalone)").matches;
  const fullscreenDisplay = window.matchMedia("(display-mode: fullscreen)").matches;
  const minimalUiDisplay = window.matchMedia("(display-mode: minimal-ui)").matches;
  const iosHomeScreen = navigatorWithStandalone.standalone === true;
  const nativeContainer = appWindow.Capacitor?.isNativePlatform?.() === true || Boolean(appWindow.ReactNativeWebView);

  return standaloneDisplay || fullscreenDisplay || minimalUiDisplay || iosHomeScreen || nativeContainer;
}

export function useBrowserAdsAllowed() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const displayQueries = [
      window.matchMedia("(display-mode: standalone)"),
      window.matchMedia("(display-mode: fullscreen)"),
      window.matchMedia("(display-mode: minimal-ui)"),
    ];
    const update = () => setAllowed(!isRunningAsInstalledApp());

    update();
    displayQueries.forEach((query) => query.addEventListener("change", update));
    window.addEventListener("appinstalled", update);

    return () => {
      displayQueries.forEach((query) => query.removeEventListener("change", update));
      window.removeEventListener("appinstalled", update);
    };
  }, []);

  return allowed;
}