// Notifications only: this worker never caches pages or files.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = { title: "TaskBio", body: "Você tem um compromisso em breve.", url: "/" };
  try { data = { ...data, ...event.data.json() }; } catch (e) { /* payload inválido */ }
  event.waitUntil(self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icons/taskbio-192-v2.png",
    badge: "/icons/taskbio-192-v2.png",
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
