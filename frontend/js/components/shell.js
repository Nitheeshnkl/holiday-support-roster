import { el, clear, svgIcon, announceStatus } from '../utils/dom.js';
import { formatDateTimeUtc } from '../utils/date.js';
import {
  hasAnyPermission,
  hasPermission,
  setUnreadCount,
  subscribeSession,
} from '../state/session-store.js';
import * as notificationsApi from '../api/notifications.js';
import { buildSidebarNav, getQuickJumpTargets } from './navigation.js';

function resolveNotificationRoute(notification) {
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

function openQuickJumpDialog({ user, onNavigate }) {
  const targets = getQuickJumpTargets(user);
  if (!targets.length) return;

  let activeIdx = 0;
  let filtered = targets;

  const listEl = el('ul', { className: 'quick-jump__list', role: 'listbox', 'aria-label': 'Matching destinations' });
  const inputEl = el('input', {
    type: 'search',
    className: 'field__input',
    placeholder: 'Jump to page or action…',
    'aria-label': 'Jump to page or action',
    autocomplete: 'off',
  });

  const dialog = el(
    'dialog',
    {
      className: 'app-dialog quick-jump-dialog',
      'aria-label': 'Quick navigation',
    },
    el(
      'div',
      { className: 'app-dialog__inner' },
      el(
        'div',
        { className: 'app-dialog__header' },
        el('h2', { className: 'app-dialog__title' }, 'Quick jump'),
        el(
          'button',
          {
            type: 'button',
            className: 'btn btn-ghost btn-sm',
            'aria-label': 'Close quick jump',
            onClick: () => dialog.close(),
          },
          svgIcon('close', { size: 18 })
        )
      ),
      inputEl,
      listEl
    )
  );

  const selectTarget = (target) => {
    dialog.close();
    onNavigate(target.path);
  };

  const renderList = () => {
    clear(listEl);
    if (!filtered.length) {
      listEl.appendChild(el('li', { className: 'muted' }, 'No matching authorized destinations.'));
      return;
    }
    if (activeIdx >= filtered.length) activeIdx = 0;
    filtered.forEach((item, idx) => {
      listEl.appendChild(
        el(
          'li',
          { role: 'option', 'aria-selected': idx === activeIdx ? 'true' : 'false' },
          el(
            'button',
            {
              type: 'button',
              className: 'quick-jump__item',
              'aria-selected': idx === activeIdx ? 'true' : 'false',
              onClick: () => selectTarget(item),
            },
            svgIcon(item.icon || 'info', { size: 16 }),
            el('span', {}, item.label),
            el('span', { className: 'quick-jump__item-meta' }, item.section)
          )
        )
      );
    });
  };

  inputEl.addEventListener('input', () => {
    const q = inputEl.value.trim().toLowerCase();
    filtered = q
      ? targets.filter(
          (t) =>
            t.label.toLowerCase().includes(q) ||
            t.section.toLowerCase().includes(q) ||
            t.path.toLowerCase().includes(q)
        )
      : targets;
    activeIdx = 0;
    renderList();
  });

  inputEl.addEventListener('keydown', (e) => {
    if (!filtered.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIdx = (activeIdx + 1) % filtered.length;
      renderList();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIdx = (activeIdx - 1 + filtered.length) % filtered.length;
      renderList();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const chosen = filtered[activeIdx];
      if (chosen) selectTarget(chosen);
    }
  });

  dialog.addEventListener('close', () => dialog.remove());
  renderList();
  document.body.appendChild(dialog);
  dialog.showModal();
  inputEl.focus();
}

/**
 * Render the authenticated application shell (skip link, sticky single-row header,
 * quick jump, notification preview, account menu, responsive sidebar/drawer, breadcrumbs).
 */
export function renderAppShell({
  session,
  unreadCount,
  currentPath,
  pageTitle,
  breadcrumbs = [],
  sidebarCollapsed = false,
  onToggleSidebar,
  onNavigate,
  onOpenOnboarding,
  onLogout,
  signal,
} = {}) {
  const user = session?.user;
  const desktopQuery = window.matchMedia('(min-width: 64rem)');
  let drawerOpen = false;
  let openPopover = null; // { panel, triggerBtn }

  const closeOpenPopover = ({ restoreFocus = false } = {}) => {
    if (!openPopover) return;
    const { panel, triggerBtn } = openPopover;
    panel.hidden = true;
    triggerBtn.setAttribute('aria-expanded', 'false');
    openPopover = null;
    if (restoreFocus) triggerBtn.focus();
  };

  const menuBtn = el('button', {
    type: 'button',
    className: 'btn btn-ghost btn-sm btn-icon',
    'aria-label': 'Toggle navigation',
    'aria-controls': 'app-sidebar',
    'aria-expanded': desktopQuery.matches ? String(!sidebarCollapsed) : 'false',
  });
  menuBtn.appendChild(svgIcon('menu', { size: 20 }));

  const backdrop = el('div', { className: 'nav-backdrop', hidden: true });
  const headerEl = el('header', { className: 'app-header' });
  const mainEl = el('main', { id: 'main-content', className: 'app-main' });

  const syncDrawerMode = () => {
    const isDesktop = desktopQuery.matches;
    if (isDesktop) {
      drawerOpen = false;
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
      sidebar.removeAttribute('aria-label');
      sidebar.setAttribute('data-drawer-open', 'false');
      backdrop.hidden = true;
      headerEl.inert = false;
      mainEl.inert = false;
      menuBtn.setAttribute('aria-expanded', String(shell.dataset.sidebarCollapsed !== 'true'));
    } else if (drawerOpen) {
      closeOpenPopover();
      sidebar.setAttribute('role', 'dialog');
      sidebar.setAttribute('aria-modal', 'true');
      sidebar.setAttribute('aria-label', 'Navigation menu');
      sidebar.setAttribute('data-drawer-open', 'true');
      backdrop.hidden = false;
      headerEl.inert = true;
      mainEl.inert = true;
      menuBtn.setAttribute('aria-expanded', 'true');
      const closeMobile = sidebar.querySelector('.app-sidebar__close-mobile');
      closeMobile?.focus();
    } else {
      sidebar.removeAttribute('role');
      sidebar.removeAttribute('aria-modal');
      sidebar.removeAttribute('aria-label');
      sidebar.setAttribute('data-drawer-open', 'false');
      backdrop.hidden = true;
      headerEl.inert = false;
      mainEl.inert = false;
      menuBtn.setAttribute('aria-expanded', 'false');
    }
  };

  const closeDrawer = ({ restoreFocus = false } = {}) => {
    if (!drawerOpen) return;
    drawerOpen = false;
    syncDrawerMode();
    if (restoreFocus && !desktopQuery.matches) {
      menuBtn.focus();
    }
  };

  const sidebar = buildSidebarNav({
    user,
    currentPath,
    onNavigate: (path) => {
      closeOpenPopover();
      onNavigate(path);
    },
    onCloseMobile: () => closeDrawer({ restoreFocus: true }),
  });

  menuBtn.addEventListener(
    'click',
    () => {
      closeOpenPopover();
      if (desktopQuery.matches) {
        const nextCollapsed = shell.dataset.sidebarCollapsed !== 'true';
        shell.dataset.sidebarCollapsed = String(nextCollapsed);
        menuBtn.setAttribute('aria-expanded', String(!nextCollapsed));
        onToggleSidebar?.(nextCollapsed);
      } else {
        drawerOpen = !drawerOpen;
        syncDrawerMode();
      }
    },
    { signal }
  );

  backdrop.addEventListener('click', () => closeDrawer({ restoreFocus: true }), { signal });

  document.addEventListener(
    'keydown',
    (e) => {
      if (e.key === 'Escape') {
        if (openPopover) {
          e.preventDefault();
          closeOpenPopover({ restoreFocus: true });
          return;
        }
        if (drawerOpen && !desktopQuery.matches) {
          e.preventDefault();
          closeDrawer({ restoreFocus: true });
          return;
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        if (document.querySelector('dialog[open]')) return;
        e.preventDefault();
        closeOpenPopover();
        openQuickJumpDialog({ user, onNavigate });
      }
    },
    { signal }
  );

  document.addEventListener(
    'click',
    (e) => {
      if (!openPopover) return;
      const target = e.target;
      if (
        target instanceof Node &&
        !openPopover.panel.contains(target) &&
        !openPopover.triggerBtn.contains(target)
      ) {
        closeOpenPopover();
      }
    },
    { signal }
  );

  desktopQuery.addEventListener('change', syncDrawerMode, { signal });

  // Header Left
  const brandLink = el(
    'a',
    {
      href: '/',
      className: 'app-brand',
      onClick: (e) => {
        e.preventDefault();
        closeOpenPopover();
        onNavigate('/');
      },
    },
    svgIcon('calendar', { size: 20 }),
    el('span', { className: 'app-brand__label' }, 'Holiday Support Roster')
  );

  const headerLeft = el(
    'div',
    { className: 'app-header__left' },
    menuBtn,
    brandLink,
    pageTitle ? el('span', { className: 'app-header__context' }, pageTitle) : null
  );

  const utilities = [];

  // Quick Route Jump
  const jumpBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-ghost btn-sm app-header__search-trigger',
      dataset: { tour: 'header-quick-jump' },
      'aria-label': 'Quick jump (Ctrl+K)',
      onClick: () => {
        closeOpenPopover();
        openQuickJumpDialog({ user, onNavigate });
      },
    },
    svgIcon('search', { size: 17 }),
    el('span', { className: 'app-header__btn-label' }, 'Jump'),
    el('kbd', { className: 'app-header__kbd', 'aria-hidden': 'true' }, '⌘K')
  );
  utilities.push(jumpBtn);

  // Notifications Quick Preview Popover
  if (hasPermission('NOTIFICATION.READ')) {
    const unreadBadge = el(
      'span',
      {
        className: 'badge badge--info',
        hidden: !(typeof unreadCount === 'number' && unreadCount > 0),
      },
      typeof unreadCount === 'number' ? String(unreadCount) : '0'
    );
    const notifBtn = el(
      'a',
      {
        href: '/notifications',
        className: 'btn btn-ghost btn-sm',
        dataset: { tour: 'header-notifications' },
        'aria-label':
          typeof unreadCount === 'number' && unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : 'Notifications',
        onClick: (e) => {
          e.preventDefault();
          closeOpenPopover();
          onNavigate('/notifications');
        },
      },
      svgIcon('bell', { size: 18 }),
      el('span', { className: 'app-header__btn-label' }, 'Notifications'),
      unreadBadge
    );

    const notifBody = el('div', { className: 'header-popover__body' });
    const notifPopover = el(
      'section',
      {
        className: 'header-popover',
        role: 'dialog',
        'aria-label': 'Recent notifications',
        hidden: true,
      },
      el(
        'div',
        { className: 'header-popover__header' },
        el('strong', {}, 'Notifications'),
        el(
          'button',
          {
            type: 'button',
            className: 'btn btn-ghost btn-sm btn-icon',
            'aria-label': 'Close notifications preview',
            onClick: () => closeOpenPopover({ restoreFocus: true }),
          },
          svgIcon('close', { size: 16 })
        )
      ),
      notifBody,
      el(
        'div',
        { className: 'header-popover__footer' },
        el(
          'a',
          {
            href: '/notifications',
            className: 'btn btn-secondary btn-sm',
            onClick: (e) => {
              e.preventDefault();
              closeOpenPopover();
              onNavigate('/notifications');
            },
          },
          'View all'
        )
      )
    );

    const loadNotifPreview = async () => {
      clear(notifBody);
      notifBody.appendChild(el('p', { className: 'muted' }, 'Loading notifications…'));
      try {
        const data = await notificationsApi.listNotifications({ page: 0, pageSize: 5, signal });
        if (signal?.aborted) return;
        clear(notifBody);
        const items = data?.items || [];
        if (!items.length) {
          notifBody.appendChild(el('p', { className: 'muted' }, 'No notifications right now.'));
          return;
        }
        const list = el('ul', { className: 'header-popover__list' });
        for (const n of items) {
          const targetRoute = resolveNotificationRoute(n);
          const itemActions = el('div', { className: 'cluster' });
          if (targetRoute) {
            itemActions.appendChild(
              el(
                'a',
                {
                  href: targetRoute,
                  className: 'btn btn-secondary btn-sm',
                  onClick: (e) => {
                    e.preventDefault();
                    closeOpenPopover();
                    onNavigate(targetRoute);
                  },
                },
                'Open'
              )
            );
          }
          if (!n.readAtUtc) {
            itemActions.appendChild(
              el(
                'button',
                {
                  type: 'button',
                  className: 'btn btn-ghost btn-sm',
                  onClick: async (e) => {
                    const btn = e.currentTarget;
                    btn.disabled = true;
                    try {
                      await notificationsApi.markNotificationRead(n.id);
                      const countRes = await notificationsApi
                        .getUnreadNotificationCount({ signal })
                        .catch(() => null);
                      if (countRes && typeof countRes.count === 'number') {
                        setUnreadCount(countRes.count);
                      }
                      announceStatus('Notification marked as read.');
                      await loadNotifPreview();
                    } catch {
                      btn.disabled = false;
                    }
                  },
                },
                'Mark read'
              )
            );
          }

          list.appendChild(
            el(
              'li',
              {
                className: n.readAtUtc
                  ? 'header-popover__item'
                  : 'header-popover__item header-popover__item--unread',
              },
              el('strong', {}, n.title),
              el('span', { className: 'muted' }, n.message),
              el('span', { className: 'muted' }, formatDateTimeUtc(n.createdAtUtc)),
              itemActions.childElementCount ? itemActions : null
            )
          );
        }
        notifBody.appendChild(list);
      } catch {
        if (signal?.aborted) return;
        clear(notifBody);
        notifBody.appendChild(el('p', { className: 'muted' }, 'Unable to load notifications.'));
      }
    };

    notifBtn.addEventListener(
      'click',
      () => {
        const isSame = openPopover?.panel === notifPopover;
        closeOpenPopover();
        if (isSame) return;
        notifPopover.hidden = false;
        notifBtn.setAttribute('aria-expanded', 'true');
        openPopover = { panel: notifPopover, triggerBtn: notifBtn };
        loadNotifPreview();
      },
      { signal }
    );

    const unsub = subscribeSession((snap) => {
      const count = snap.unreadCount;
      const hasUnread = typeof count === 'number' && count > 0;
      unreadBadge.hidden = !hasUnread;
      unreadBadge.textContent = hasUnread ? String(count) : '0';
      notifBtn.setAttribute(
        'aria-label',
        hasUnread ? `Notifications (${count} unread)` : 'Notifications'
      );
    });
    signal?.addEventListener('abort', unsub, { once: true });

    utilities.push(el('div', { className: 'header-popover-anchor' }, notifBtn, notifPopover));
  }

  // Contextual Guide Launcher
  if (session?.onboarding?.walkthroughs?.length) {
    utilities.push(
      el(
        'button',
        {
          type: 'button',
          className: 'btn btn-ghost btn-sm',
          dataset: { tour: 'header-guide' },
          'aria-label': 'Guide',
          onClick: () => {
            closeOpenPopover();
            onOpenOnboarding?.();
          },
        },
        svgIcon('compass', { size: 17 }),
        el('span', { className: 'app-header__btn-label' }, 'Guide')
      )
    );
  }

  // Account Menu Popover (keeps mobile header single-row cleanly)
  const rolesText = Array.isArray(user?.roles) && user.roles.length ? user.roles.join(', ') : 'Member';
  const scopesText = Array.isArray(user?.scopes) && user.scopes.length ? user.scopes.join(', ') : 'OWN';

  const accountBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-secondary btn-sm profile-chip',
      dataset: { tour: 'header-account' },
      'aria-haspopup': 'dialog',
      'aria-expanded': 'false',
      'aria-label': `Account menu for ${user?.displayName || 'current user'}`,
    },
    svgIcon('user', { size: 16 }),
    el('span', { className: 'profile-chip__name' }, user?.displayName || 'Account'),
    svgIcon('chevronDown', { size: 14 })
  );

  const accountActions = el(
    'div',
    { className: 'account-menu__actions' },
    el(
      'a',
      {
        href: '/account',
        className: 'btn btn-ghost btn-sm account-menu__link',
        onClick: (e) => {
          e.preventDefault();
          closeOpenPopover();
          onNavigate('/account');
        },
      },
      svgIcon('lock', { size: 16 }),
      el('span', {}, 'Account & Security')
    ),
    hasAnyPermission(['HELP.READ', 'HELP.MANAGE'])
      ? el(
          'a',
          {
            href: '/help',
            className: 'btn btn-ghost btn-sm account-menu__link',
            onClick: (e) => {
              e.preventDefault();
              closeOpenPopover();
              onNavigate('/help');
            },
          },
          svgIcon('help', { size: 16 }),
          el('span', {}, 'Help Centre')
        )
      : null,
    session?.onboarding?.walkthroughs?.length
      ? el(
          'button',
          {
            type: 'button',
            className: 'btn btn-ghost btn-sm account-menu__link',
            onClick: () => {
              closeOpenPopover();
              onOpenOnboarding?.();
            },
          },
          svgIcon('compass', { size: 16 }),
          el('span', {}, 'Restart walkthrough')
        )
      : null,
    el(
      'button',
      {
        type: 'button',
        className: 'btn btn-ghost btn-sm account-menu__link',
        onClick: () => {
          closeOpenPopover();
          onLogout?.();
        },
      },
      svgIcon('logOut', { size: 16 }),
      el('span', {}, 'Sign out')
    )
  );

  const accountPopover = el(
    'section',
    {
      className: 'header-popover',
      role: 'dialog',
      'aria-label': 'Account menu',
      hidden: true,
    },
    el(
      'div',
      { className: 'header-popover__header' },
      el('strong', {}, user?.displayName || 'Account'),
      el(
        'button',
        {
          type: 'button',
          className: 'btn btn-ghost btn-sm btn-icon',
          'aria-label': 'Close account menu',
          onClick: () => closeOpenPopover({ restoreFocus: true }),
        },
        svgIcon('close', { size: 16 })
      )
    ),
    el(
      'div',
      { className: 'header-popover__body' },
      el(
        'div',
        { className: 'account-menu__meta' },
        user?.username ? el('span', { className: 'muted' }, user.username) : null,
        el('span', { className: 'muted' }, `Roles: ${rolesText}`),
        el('span', { className: 'muted' }, `Scope: ${scopesText}`)
      ),
      accountActions
    )
  );

  accountBtn.addEventListener(
    'click',
    () => {
      const isSame = openPopover?.panel === accountPopover;
      closeOpenPopover();
      if (isSame) return;
      accountPopover.hidden = false;
      accountBtn.setAttribute('aria-expanded', 'true');
      openPopover = { panel: accountPopover, triggerBtn: accountBtn };
    },
    { signal }
  );

  utilities.push(el('div', { className: 'header-popover-anchor' }, accountBtn, accountPopover));

  headerEl.append(headerLeft, el('div', { className: 'app-header__utilities' }, utilities));

  const breadcrumbNav =
    breadcrumbs.length > 0
      ? el(
          'nav',
          { className: 'breadcrumbs', 'aria-label': 'Breadcrumb' },
          el(
            'ol',
            {},
            breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              if (isLast || !crumb.path) {
                return el(
                  'li',
                  { 'aria-current': isLast ? 'page' : undefined },
                  el('span', {}, crumb.label)
                );
              }
              return el(
                'li',
                {},
                el(
                  'a',
                  {
                    href: crumb.path,
                    onClick: (e) => {
                      e.preventDefault();
                      onNavigate(crumb.path);
                    },
                  },
                  crumb.label
                )
              );
            })
          )
        )
      : null;

  const contentContainer = el('div', { className: 'app-container view-transition' }, breadcrumbNav);
  mainEl.appendChild(contentContainer);

  const shell = el(
    'div',
    {
      className: 'app-shell',
      dataset: { sidebarCollapsed: String(Boolean(sidebarCollapsed)) },
    },
    el('a', { href: '#main-heading', className: 'skip-link visually-hidden' }, 'Skip to main content'),
    headerEl,
    backdrop,
    sidebar,
    mainEl
  );

  syncDrawerMode();

  return {
    shell,
    contentContainer,
    mainEl,
  };
}
