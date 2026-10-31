// Notifications only: this worker never caches pages or files.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "TaskBio", body: "Você tem um compromisso em breve.", url: "/" };
  try { data = { ...data, ...event.data.json() }; } catch (e) { /* payload inválido */ }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icons/taskbio-192-v3.png",
    badge: "/icons/taskbio-192-v3.png",
    tag: data.tag || undefined,
    renotify: !!data.tag,
    vibrate: [120, 60, 120],
    data: { url: data.url },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
    for (const client of list) if ("focus" in client) { client.navigate(url); return client.focus(); }
    return self.clients.openWindow(url);
  }));
});

// Browser rotated the subscription: re-subscribe; the app re-saves it on next open.
self.addEventListener("pushsubscriptionchange", (event) => {
  const key = event.oldSubscription && event.oldSubscription.options && event.oldSubscription.options.applicationServerKey;
  if (!key) return;
  event.waitUntil(self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
});
