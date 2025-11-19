// Service Worker for Push Notifications
self.addEventListener('push', function(event) {
  if (!event.data) {
    console.log('Push event but no data');
    return;
  }

  const data = event.data.json();
  const title = data.title || 'New Email';
  const options = {
    body: data.body || 'You have a new email',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || 'email-notification',
    data: {
      url: data.url || '/',
      emailId: data.emailId
    },
    requireInteraction: false,
    vibrate: [200, 100, 200]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});
