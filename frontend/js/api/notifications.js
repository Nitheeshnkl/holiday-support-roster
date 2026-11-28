import { apiRequest } from './client.js';

export function listNotifications({ page = 0, pageSize = 25, signal } = {}) {
  return apiRequest('/notifications', {
    method: 'GET',
    query: { page, pageSize },
    signal,
  });
}

export function markNotificationRead(notificationId) {
  return apiRequest(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'POST',
  });
}

export function getUnreadNotificationCount({ signal } = {}) {
  return apiRequest('/notifications/unread-count', {
    method: 'GET',
    signal,
  });
}
