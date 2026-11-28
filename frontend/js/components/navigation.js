import { el, svgIcon } from '../utils/dom.js';
import { hasAnyPermission, hasPermission, hasScope } from '../state/session-store.js';

export function getNavigationSections(user) {
  if (!user) return [];

  const workspace = [
    { label: 'Overview', path: '/', matchPrefix: '/', icon: 'home', tourKey: 'nav-overview' },
  ];

  if (hasAnyPermission(['ROSTER.READ', 'CALENDAR.READ'])) {
    workspace.push({
      label: 'Schedule Calendar',
      path: '/calendar',
      matchPrefix: '/calendar',
      icon: 'calendar',
      tourKey: 'nav-calendar',
    });
  }

  if (
    hasAnyPermission([
      'AVAILABILITY.MANAGE_OWN',
      'AVAILABILITY.READ',
      'AVAILABILITY.MANAGE_ON_BEHALF',
    ])
  ) {
    workspace.push({
      label: 'My availability',
      path: '/availability',
      matchPrefix: '/availability',
      icon: 'clock',
      tourKey: 'nav-availability',
    });
  }

  const scheduling = [];
  if (hasPermission('ROSTER.READ')) {
    scheduling.push({
      label: 'Schedules',
      path: '/roster',
      matchPrefix: '/roster',
      icon: 'layers',
      tourKey: 'nav-roster',
    });
  }
  if (hasPermission('CALENDAR.READ')) {
    scheduling.push({
      label: 'Holidays',
      path: '/holidays',
      matchPrefix: '/holidays',
      icon: 'calendar',
      tourKey: 'nav-holidays',
    });
  }
  if (hasAnyPermission(['REPLACEMENT.READ', 'REPLACEMENT.REQUEST_OWN', 'REPLACEMENT.APPROVE'])) {
    scheduling.push({
      label: 'Requests',
      path: '/replacements',
      matchPrefix: '/replacements',
      icon: 'repeat',
      tourKey: 'nav-replacements',
    });
  }
  if (hasAnyPermission(['ROSTER.READ', 'STANDBY.ACTIVATE'])) {
    scheduling.push({
      label: 'Backup & Standby',
      path: '/standby',
      matchPrefix: '/standby',
      icon: 'shield',
      tourKey: 'nav-standby',
    });
  }

  const operations = [];
  if (hasPermission('ORG.USER.READ') && (hasScope('ORG') || hasScope('TEAM') || hasScope('OWN'))) {
    operations.push({
      label: 'People & Teams',
      path: '/employees',
      matchPrefix: '/employees',
      icon: 'users',
      tourKey: 'nav-employees',
    });
  }
  if (hasPermission('ORG.AUTHORITY.MANAGE') && hasScope('ORG')) {
    operations.push({
      label: 'Approval Authority',
      path: '/authority/grants',
      matchPrefix: '/authority',
      icon: 'shield',
      tourKey: 'nav-authority',
    });
  }
  if (hasPermission('DUTY.REPORT.READ') && (hasScope('ORG') || hasScope('TEAM') || hasScope('OWN'))) {
    operations.push({
      label: 'Work History',
      path: '/duty-history',
      matchPrefix: '/duty-history',
      icon: 'barChart',
      tourKey: 'nav-duty-history',
    });
  }
  if (hasAnyPermission(['HANDOVER.READ', 'HANDOVER.CREATE'])) {
    operations.push({
      label: 'Shift Notes',
      path: '/handover',
      matchPrefix: '/handover',
      icon: 'fileText',
      tourKey: 'nav-handover',
    });
  }
  if (hasPermission('AUDIT.READ')) {
    operations.push({
      label: 'Audit Log',
      path: '/audit',
      matchPrefix: '/audit',
      icon: 'info',
      tourKey: 'nav-audit',
    });
  }
  if (hasAnyPermission(['HELP.READ', 'HELP.MANAGE'])) {
    operations.push({
      label: 'Help Centre',
      path: '/help',
      matchPrefix: '/help',
      icon: 'help',
      tourKey: 'nav-help',
    });
  }

  const sections = [{ title: 'Workspace', items: workspace }];
  if (scheduling.length) sections.push({ title: 'Scheduling', items: scheduling });
  if (operations.length) sections.push({ title: 'Team & Operations', items: operations });
  return sections;
}

export function getNavigationItems(user) {
  return getNavigationSections(user).flatMap((section) => section.items);
}

/**
 * Permission- and scope-filtered destinations for the quick-jump command dialog.
 * Only lists real, authorized routes (never fabricates items or bypasses checks).
 */
export function getQuickJumpTargets(user) {
  if (!user) return [];
  const targets = getNavigationSections(user).flatMap((section) =>
    section.items.map((item) => ({
      label: item.label,
      path: item.path,
      section: section.title,
      icon: item.icon,
    }))
  );

  if (hasPermission('CALENDAR.MANAGE')) {
    targets.push({
      label: 'Add holiday',
      path: '/holidays/new',
      section: 'Quick action',
      icon: 'plus',
    });
  }
  if (hasPermission('REPLACEMENT.REQUEST_OWN')) {
    targets.push({
      label: 'Report unavailability',
      path: '/replacements/new',
      section: 'Quick action',
      icon: 'repeat',
    });
  }
  if (hasPermission('ORG.USER.MANAGE') && hasScope('ORG')) {
    targets.push({
      label: 'Add employee',
      path: '/employees/new',
      section: 'Quick action',
      icon: 'plus',
    });
  }
  if (hasPermission('ORG.USER.READ') && (hasScope('ORG') || hasScope('TEAM'))) {
    targets.push({
      label: 'Teams & Team Leads',
      path: '/teams',
      section: 'Team & Operations',
      icon: 'users',
    });
  }
  if (hasPermission('NOTIFICATION.READ')) {
    targets.push({
      label: 'Notifications',
      path: '/notifications',
      section: 'Account',
      icon: 'bell',
    });
  }
  targets.push({
    label: 'Account & Security',
    path: '/account',
    section: 'Account',
    icon: 'lock',
  });

  const seen = new Set();
  return targets.filter((t) => {
    if (seen.has(t.path)) return false;
    seen.add(t.path);
    return true;
  });
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
  const sections = getNavigationSections(user);
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

  const sectionNodes = sections.map((section) =>
    el(
      'div',
      { className: 'app-nav__section' },
      el('div', { className: 'app-nav__heading' }, section.title),
      el(
        'ul',
        { className: 'app-nav__list' },
        section.items.map((item) => {
          const active = isNavItemActive(item, currentPath);
          return el(
            'li',
            {},
            el(
              'a',
              {
                href: item.path,
                className: 'app-nav__link',
                dataset: item.tourKey ? { tour: item.tourKey } : undefined,
                'aria-current': active ? 'page' : undefined,
                onClick: (e) => {
                  e.preventDefault();
                  onNavigate(item.path);
                  onCloseMobile?.();
                },
              },
              svgIcon(item.icon || 'info', { size: 16 }),
              el('span', {}, item.label)
            )
          );
        })
      )
    )
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
      el('span', { className: 'app-sidebar__title' }, 'Workspace'),
      closeBtn
    ),
    el('nav', { 'aria-label': 'Primary', className: 'app-nav' }, sectionNodes)
  );
}
