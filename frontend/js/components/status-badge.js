import { el, svgIcon } from '../utils/dom.js';
import { formatEnumLabel } from '../utils/format.js';

const STATUS_META = {
  DRAFT: { label: 'Draft — not published', tone: 'draft', icon: 'clock' },
  REVIEWED: { label: 'Reviewed draft', tone: 'draft', icon: 'info' },
  PROPOSED: { label: 'Proposed (draft)', tone: 'draft', icon: 'clock' },
  PUBLISHED: { label: 'Published', tone: 'published', icon: 'check' },
  CURRENT: { label: 'Current published', tone: 'published', icon: 'check' },
  SUPERSEDED: { label: 'Superseded', tone: 'neutral', icon: 'info' },
  CANCELLED: { label: 'Cancelled', tone: 'danger', icon: 'alert' },
  REPLACED: { label: 'Replaced', tone: 'neutral', icon: 'info' },
  OPEN: { label: 'Open', tone: 'info', icon: 'info' },
  IN_REVIEW: { label: 'In review', tone: 'pending', icon: 'clock' },
  CLOSED: { label: 'Closed', tone: 'neutral', icon: 'shield' },
  PRIMARY: { label: 'Primary', tone: 'published', icon: 'shield' },
  STANDBY: { label: 'Standby (backup)', tone: 'standby', icon: 'clock' },
  SUBMITTED: { label: 'Submitted', tone: 'pending', icon: 'clock' },
  AWAITING_MANAGER_DECISION: { label: 'Awaiting Manager decision', tone: 'pending', icon: 'clock' },
  APPROVED: { label: 'Approved', tone: 'approved', icon: 'check' },
  REJECTED: { label: 'Rejected', tone: 'rejected', icon: 'alert' },
  UNRESOLVED_STAFFING_GAP: { label: 'Unresolved staffing gap', tone: 'gap', icon: 'alert' },
  ACTIVATED: { label: 'Activated', tone: 'info', icon: 'info' },
  ACTIVE: { label: 'Active', tone: 'published', icon: 'check' },
  INACTIVE: { label: 'Inactive', tone: 'neutral', icon: 'info' },
  REVOKED: { label: 'Revoked', tone: 'danger', icon: 'alert' },
  EXPIRED: { label: 'Expired', tone: 'neutral', icon: 'clock' },
  AVAILABLE: { label: 'Available', tone: 'published', icon: 'check' },
  UNAVAILABLE: { label: 'Unavailable', tone: 'warning', icon: 'alert' },
  ARCHIVED: { label: 'Archived', tone: 'neutral', icon: 'info' },
  RETIRED: { label: 'Retired', tone: 'neutral', icon: 'info' },
  SUCCEEDED: { label: 'Succeeded', tone: 'published', icon: 'check' },
  PARTIAL: { label: 'Partial (gaps reported)', tone: 'warning', icon: 'alert' },
  FAILED: { label: 'Failed', tone: 'danger', icon: 'alert' },
  RUNNING: { label: 'Running', tone: 'info', icon: 'clock' },
  AUTO: { label: 'Auto-generated', tone: 'info', icon: 'info' },
  MANUAL: { label: 'Manual assignment', tone: 'warning', icon: 'user' },
  REPLACEMENT: { label: 'Approved replacement', tone: 'published', icon: 'check' },
  NOT_STARTED: { label: 'Not started', tone: 'neutral', icon: 'info' },
  IN_PROGRESS: { label: 'In progress', tone: 'pending', icon: 'clock' },
  COMPLETED: { label: 'Completed', tone: 'published', icon: 'check' },
  SKIPPED: { label: 'Skipped', tone: 'neutral', icon: 'info' },
};

export function createStatusBadge(status, labelOverride = '') {
  const key = String(status ?? '').toUpperCase();
  const meta = STATUS_META[key] || {
    label: formatEnumLabel(status),
    tone: 'neutral',
    icon: 'info',
  };
  const label = labelOverride || meta.label;
  return el(
    'span',
    { className: `badge badge--${meta.tone}` },
    svgIcon(meta.icon, { size: 14 }),
    el('span', {}, label)
  );
}
