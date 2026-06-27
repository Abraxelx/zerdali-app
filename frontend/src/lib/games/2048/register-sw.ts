export function registerGame2048Sw() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("/sw-game2048.js").catch(() => {});
}
