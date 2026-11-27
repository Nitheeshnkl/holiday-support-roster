import { el, clear, announceStatus } from '../../utils/dom.js';
import { formatDateTimeUtc } from '../../utils/date.js';
import { createAlert, createEmptyState, createSkeleton, showToast } from '../../components/alert.js';
import { createDataTable } from '../../components/data-table.js';
import { createPagination } from '../../components/pagination.js';
import { createStatusBadge } from '../../components/status-badge.js';
import * as notificationsApi from '../../api/notifications.js';
import { setUnreadCount } from '../../state/session-store.js';
import { isAbortError } from '../../api/errors.js';

function resolveTargetRoute(notification) {
  const type = String(notification?.targetType || '').toUpperCase();
  const id = notification?.targetId;
  if (!type) return null;
  if (type.includes('REPLACEMENT') && id != null) return `/replacements/${id}`;
  if (type.includes('ROSTER_PERIOD') && id != null) return `/roster/${id}`;
  if (type.includes('ROSTER') && id != null) return `/roster`;
  if (type.includes('HOLIDAY') && id != null) return `/holidays/${id}`;
  if (type.includes('HANDOVER') && id != null) return `/handover/${id}`;
  if (type.includes('AVAILABILITY')) return `/availability`;
  if (type.includes('EMPLOYEE') && id != null) return `/employees/${id}`;
  return null;
}

export async function renderNotificationsPage({ container, navigate, signal }) {
  let page = 0;
  let pageSize = 25;

  const listHost = el('div', { className: 'stack' });
  container.append(
    el(
      'div',
      { className: 'page-header' },
      el(
        'div',
        { className: 'page-header__title-group' },
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Notifications'),
        el('p', { className: 'muted' }, 'In-app workflow notifications for your account.')
      )
    ),
    listHost
  );

  const load = async () => {
    clear(listHost);
    listHost.appendChild(createSkeleton({ rows: 4, label: 'Loading notifications…' }));
    try {
      const [data, unread] = await Promise.all([
        notificationsApi.listNotifications({ page, pageSize, signal }),
        notificationsApi.getUnreadNotificationCount({ signal }).catch(() => null),
      ]);
      if (signal?.aborted) return;
      if (unread && typeof unread.count === 'number') {
        setUnreadCount(unread.count);
      }

      clear(listHost);
      const items = data?.items || [];
      if (!items.length) {
        listHost.appendChild(
          createEmptyState({
            title: 'No notifications yet',
            description: 'Workflow notifications for roster publication, replacement requests, and account events appear here.',
          })
        );
        return;
      }

      listHost.appendChild(
        createDataTable({
          caption: 'Your notifications',
          rowClassName: (n) => (!n.readAtUtc ? 'notification-row--unread' : ''),
          columns: [
            {
              key: 'title',
              label: 'Notification',
              isRowHeader: true,
              render: (n) =>
                el(
                  'div',
                  { className: 'stack-sm' },
                  el('strong', {}, n.title),
                  el('span', {}, n.message)
                ),
            },
            {
              key: 'eventType',
              label: 'Event',
              render: (n) => createStatusBadge(n.eventType),
            },
            {
              key: 'createdAtUtc',
              label: 'Created',
              render: (n) => formatDateTimeUtc(n.createdAtUtc),
            },
            {
              key: 'readAtUtc',
              label: 'State',
              render: (n) =>
                n.readAtUtc
                  ? el('span', { className: 'badge' }, `Read ${formatDateTimeUtc(n.readAtUtc)}`)
                  : el('span', { className: 'badge badge--info' }, 'Unread'),
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (n) => {
                const targetPath = resolveTargetRoute(n);
                const actions = [];
                if (targetPath) {
                  actions.push(
                    el(
                      'a',
                      {
                        href: targetPath,
                        className: 'btn btn-secondary btn-sm',
                        onClick: (e) => {
                          e.preventDefault();
                          navigate(targetPath);
                        },
                      },
                      'Open item'
                    )
                  );
                }
                if (!n.readAtUtc) {
                  actions.push(
                    el(
                      'button',
                      {
                        type: 'button',
                        className: 'btn btn-primary btn-sm',
                        onClick: async (e) => {
                          const btn = e.currentTarget;
                          btn.disabled = true;
                          try {
                            await notificationsApi.markNotificationRead(n.id);
                            announceStatus('Notification marked as read.');
                            showToast('Marked as read.', { variant: 'success' });
                            await load();
                          } catch (err) {
                            btn.disabled = false;
                            listHost.prepend(
                              createAlert({
                                variant: 'error',
                                title: 'Unable to mark read',
                                message: err.message,
                                correlationId: err.correlationId,
                              })
                            );
                          }
                        },
                      },
                      'Mark read'
                    )
                  );
                }
                return el('div', { className: 'data-table__actions' }, actions.length ? actions : '—');
              },
            },
          ],
          rows: items,
        })
      );

      listHost.appendChild(
        createPagination({
          page: data.page,
          onPageChange: (next) => {
            page = next;
            load();
          },
          onPageSizeChange: (nextSize) => {
            pageSize = nextSize;
            page = 0;
            load();
          },
        })
      );
    } catch (err) {
      if (isAbortError(err)) return;
      clear(listHost);
      listHost.appendChild(
        createAlert({
          variant: 'error',
          title: 'Failed to load notifications',
          message: err.message,
          correlationId: err.correlationId,
          actionLabel: 'Retry',
          onAction: load,
        })
      );
    }
  };

  await load();
}
