self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const destination = new URL(event.notification.data?.url || '/', self.location.origin);
  if (destination.origin !== self.location.origin) return;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const client = windows.find((window) => new URL(window.url).origin === self.location.origin);
      if (client) {
        await client.navigate(destination.href);
        await client.focus();
      } else await self.clients.openWindow(destination.href);
    })(),
  );
});
