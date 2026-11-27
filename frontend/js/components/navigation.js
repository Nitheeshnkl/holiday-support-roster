import { el, svgIcon } from '../utils/dom.js';
import { hasAnyPermission, hasPermission, hasScope } from '../state/session-store.js';

export function getNavigationItems(user) {
  if (!user) return [];

  const items = [
    { label: 'Overview', path: '/', matchPrefix: '/' },
  ];

  if (
    hasAnyPermission([
      'AVAILABILITY.MANAGE_OWN',
      'AVAILABILITY.READ',
      'AVAILABILITY.MANAGE_ON_BEHALF',
    ])
  ) {
    items.push({ label: 'My availability', path: '/availability', matchPrefix: '/availability' });
  }

  if (hasPermission('ROSTER.READ')) {
    items.push({ label: 'Roster', path: '/roster', matchPrefix: '/roster' });
  }

  if (hasPermission('CALENDAR.READ')) {
    items.push({ label: 'Holidays', path: '/holidays', matchPrefix: '/holidays' });
  }

  if (hasPermission('ORG.USER.READ') && (hasScope('ORG') || hasScope('TEAM') || hasScope('OWN'))) {
    items.push({ label: 'Employees & teams', path: '/employees', matchPrefix: '/employees' });
  }

  if (hasPermission('ORG.AUTHORITY.MANAGE') && hasScope('ORG')) {
    items.push({ label: 'Approval grants', path: '/authority/grants', matchPrefix: '/authority' });
  }

  if (
    hasAnyPermission([
      'REPLACEMENT.READ',
      'REPLACEMENT.REQUEST_OWN',
      'REPLACEMENT.APPROVE',
    ])
  ) {
    items.push({
      label: 'Replacement requests',
      path: '/replacements',
      matchPrefix: '/replacements',
    });
  }

  if (hasAnyPermission(['ROSTER.READ', 'STANDBY.ACTIVATE'])) {
    items.push({ label: 'Standby & activations', path: '/standby', matchPrefix: '/standby' });
  }

  if (hasPermission('DUTY.REPORT.READ') && (hasScope('ORG') || hasScope('TEAM') || hasScope('OWN'))) {
    items.push({
      label: 'Workload & history',
      path: '/duty-history',
      matchPrefix: '/duty-history',
    });
  }

  if (hasAnyPermission(['HANDOVER.READ', 'HANDOVER.CREATE'])) {
    items.push({ label: 'Handovers', path: '/handover', matchPrefix: '/handover' });
  }

  if (hasPermission('AUDIT.READ')) {
    items.push({ label: 'Audit events', path: '/audit', matchPrefix: '/audit' });
  }

  if (hasAnyPermission(['HELP.READ', 'HELP.MANAGE'])) {
    items.push({ label: 'Help Centre', path: '/help', matchPrefix: '/help' });
  }

  return items;
}

export function isNavItemActive(item, currentPath) {
  if (item.path === '/') {
    return currentPath === '/';
  }
  if (item.path === '/employees' && currentPath.startsWith('/teams')) {
    return true;
  }
  return (
    currentPath === item.matchPrefix ||
    currentPath.startsWith(`${item.matchPrefix}/`)
  );
}

export function buildSidebarNav({ user, currentPath, onNavigate, onCloseMobile }) {
  const navItems = getNavigationItems(user);
  const closeBtn = el(
    'button',
    {
      type: 'button',
      className: 'btn btn-ghost btn-sm app-sidebar__close-mobile',
      'aria-label': 'Close navigation menu',
      onClick: onCloseMobile,
    },
    svgIcon('close', { size: 18 })
  );

  const list = el(
    'ul',
    { className: 'app-nav__list' },
    navItems.map((item) => {
      const active = isNavItemActive(item, currentPath);
      return el(
        'li',
        {},
        el(
          'a',
          {
            href: item.path,
            className: 'app-nav__link',
            'aria-current': active ? 'page' : undefined,
            onClick: (e) => {
              e.preventDefault();
              onNavigate(item.path);
              onCloseMobile?.();
            },
          },
          item.label
        )
      );
    })
  );

  return el(
    'aside',
    {
      id: 'app-sidebar',
      className: 'app-sidebar',
      'data-drawer-open': 'false',
    },
    el(
      'div',
      { className: 'app-sidebar__header' },
      el('span', { className: 'app-sidebar__title' }, 'Navigation'),
      closeBtn
    ),
    el('nav', { 'aria-label': 'Primary' }, list)
  );
}
