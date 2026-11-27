import { el, svgIcon } from '../utils/dom.js';
import { hasAnyPermission, hasPermission, subscribeSession } from '../state/session-store.js';
import { buildSidebarNav } from './navigation.js';

/**
 * Render the authenticated application shell (skip link, sticky header,
 * responsive sidebar/drawer navigation, main landmark with breadcrumbs).
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

  const menuBtn = el('button', {
    type: 'button',
    className: 'btn btn-ghost btn-sm',
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
    onNavigate,
    onCloseMobile: () => closeDrawer({ restoreFocus: true }),
  });

  menuBtn.addEventListener(
    'click',
    () => {
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
      if (e.key === 'Escape' && drawerOpen && !desktopQuery.matches) {
        e.preventDefault();
        closeDrawer({ restoreFocus: true });
      }
    },
    { signal }
  );

  desktopQuery.addEventListener('change', syncDrawerMode, { signal });

  // Build header contents
  const brandLink = el(
    'a',
    {
      href: '/',
      className: 'app-brand',
      onClick: (e) => {
        e.preventDefault();
        onNavigate('/');
      },
    },
    svgIcon('calendar', { size: 20 }),
    el('span', {}, 'Holiday Support Roster')
  );

  const headerLeft = el(
    'div',
    { className: 'app-header__left' },
    menuBtn,
    brandLink,
    pageTitle ? el('span', { className: 'app-header__context' }, pageTitle) : null
  );

  const utilities = [];

  if (hasPermission('NOTIFICATION.READ')) {
    const unreadBadge = el(
      'span',
      {
        className: 'badge badge--info',
        hidden: !(typeof unreadCount === 'number' && unreadCount > 0),
      },
      typeof unreadCount === 'number' ? String(unreadCount) : '0'
    );
    const notifLink = el(
      'a',
      {
        href: '/notifications',
        className: 'btn btn-ghost btn-sm',
        'aria-label':
          typeof unreadCount === 'number' && unreadCount > 0
            ? `Notifications (${unreadCount} unread)`
            : 'Notifications',
        onClick: (e) => {
          e.preventDefault();
          onNavigate('/notifications');
        },
      },
      svgIcon('bell', { size: 18 }),
      el('span', {}, 'Notifications'),
      unreadBadge
    );
    const unsub = subscribeSession((snap) => {
      const count = snap.unreadCount;
      const hasUnread = typeof count === 'number' && count > 0;
      unreadBadge.hidden = !hasUnread;
      unreadBadge.textContent = hasUnread ? String(count) : '0';
      notifLink.setAttribute(
        'aria-label',
        hasUnread ? `Notifications (${count} unread)` : 'Notifications'
      );
    });
    signal?.addEventListener('abort', unsub, { once: true });
    utilities.push(notifLink);
  }

  if (hasAnyPermission(['HELP.READ', 'HELP.MANAGE'])) {
    utilities.push(
      el(
        'a',
        {
          href: '/help',
          className: 'btn btn-ghost btn-sm',
          onClick: (e) => {
            e.preventDefault();
            onNavigate('/help');
          },
        },
        svgIcon('help', { size: 18 }),
        el('span', {}, 'Help')
      )
    );
  }

  if (session?.onboarding?.walkthroughs?.length) {
    utilities.push(
      el(
        'button',
        {
          type: 'button',
          className: 'btn btn-ghost btn-sm',
          onClick: () => onOpenOnboarding?.(),
        },
        'Guide'
      )
    );
  }

  const rolesText = Array.isArray(user?.roles) && user.roles.length ? user.roles.join(', ') : 'Member';
  utilities.push(
    el(
      'a',
      {
        href: '/account',
        className: 'btn btn-secondary btn-sm profile-chip',
        'aria-label': `Account and security for ${user?.displayName || 'current user'}`,
        onClick: (e) => {
          e.preventDefault();
          onNavigate('/account');
        },
      },
      svgIcon('user', { size: 16 }),
      el('span', {}, `${user?.displayName || 'Account'} (${rolesText})`)
    )
  );

  utilities.push(
    el(
      'button',
      {
        type: 'button',
        className: 'btn btn-ghost btn-sm',
        onClick: () => onLogout?.(),
      },
      'Sign out'
    )
  );

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

  const contentContainer = el('div', { className: 'app-container' }, breadcrumbNav);
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
