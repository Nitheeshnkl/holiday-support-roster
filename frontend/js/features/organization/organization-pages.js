import { el, clear } from '../../utils/dom.js';
import { formatIsoDate } from '../../utils/date.js';
import { bindFormValidation, applyServerFieldErrors, clearServerFieldErrors, validateDateRange, attachDirtyGuard } from '../../utils/validation.js';
import { generateIdempotencyKey, formatEnumLabel } from '../../utils/format.js';
import { createField } from '../../components/form-controls.js';
import { createAlert, createEmptyState, createSkeleton, showToast } from '../../components/alert.js';
import { createDataTable } from '../../components/data-table.js';
import { createPagination } from '../../components/pagination.js';
import { createStatusBadge } from '../../components/status-badge.js';
import { confirmDialog } from '../../components/dialog.js';
import { hasAnyPermission, hasPermission, hasScope } from '../../state/session-store.js';
import { resolveIfMatch } from '../../api/client.js';
import * as employeesApi from '../../api/employees.js';
import * as historyApi from '../../api/history.js';
import { isAbortError } from '../../api/errors.js';

const DUTY_DIMENSIONS = [
  { value: 'EFFECTIVE_PUBLISHED_PRIMARY_CREDIT', label: 'Effective published Primary credits' },
  { value: 'FUTURE_PUBLISHED_PRIMARY', label: 'Future published Primary assignments' },
  { value: 'STANDBY_ASSIGNMENT', label: 'Standby assignments' },
  { value: 'STANDBY_ACTIVATION', label: 'Standby activations' },
  { value: 'DRAFT_ASSIGNMENT', label: 'Draft assignments (provisional)' },
  { value: 'REPLACED_ASSIGNMENT', label: 'Replaced assignments' },
  { value: 'CANCELLED_ASSIGNMENT', label: 'Cancelled assignments' },
];

export async function renderEmployeeListPage({ container, navigate, signal }) {
  let active = '';
  let page = 0;
  let pageSize = 25;

  const canManage = hasPermission('ORG.USER.MANAGE') && hasScope('ORG');
  const canGrant = hasPermission('ORG.AUTHORITY.MANAGE') && hasScope('ORG');

  const listHost = el('div', { className: 'stack' });
  const filterForm = el(
    'form',
    { className: 'filter-bar', method: 'GET' },
    createField({
      name: 'active',
      label: 'Employment status filter',
      type: 'select',
      value: active,
      options: [
        { value: '', label: 'All employees' },
        { value: 'true', label: 'Active only' },
        { value: 'false', label: 'Inactive only' },
      ],
    }),
    el('button', { type: 'submit', className: 'btn btn-primary' }, 'Apply filter')
  );

  filterForm.addEventListener(
    'submit',
    (e) => {
      e.preventDefault();
      active = String(new FormData(filterForm).get('active') || '');
      page = 0;
      load();
    },
    { signal }
  );

  container.append(
    el(
      'div',
      { className: 'page-header' },
      el(
        'div',
        { className: 'page-header__title-group' },
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Employees and teams'),
        el('p', { className: 'muted' }, 'Scoped employee directory, team memberships, and role administration.')
      ),
      el(
        'div',
        { className: 'page-header__actions' },
        (hasScope('ORG') || hasScope('TEAM')) ? el(
          'a',
          {
            href: '/teams',
            className: 'btn btn-secondary',
            onClick: (e) => {
              e.preventDefault();
              navigate('/teams');
            },
          },
          'Teams'
        ) : null,
        canGrant
          ? el(
              'a',
              {
                href: '/authority/grants',
                className: 'btn btn-secondary',
                onClick: (e) => {
                  e.preventDefault();
                  navigate('/authority/grants');
                },
              },
              'Approval grants'
            )
          : null,
        canManage
          ? el(
              'a',
              {
                href: '/employees/new',
                className: 'btn btn-primary',
                onClick: (e) => {
                  e.preventDefault();
                  navigate('/employees/new');
                },
              },
              'Add employee'
            )
          : null
      )
    ),
    el('search', {}, filterForm),
    listHost
  );

  const load = async () => {
    clear(listHost);
    listHost.appendChild(createSkeleton({ rows: 5, label: 'Loading employee directory…' }));
    try {
      const data = await employeesApi.listEmployees({
        page,
        pageSize,
        active: active === '' ? undefined : active === 'true',
        signal,
      });
      if (signal?.aborted) return;

      clear(listHost);
      const items = data?.items || [];
      if (!items.length) {
        listHost.appendChild(
          createEmptyState({
            title: 'No employees in this view',
            description: 'Adjust the status filter or add an employee if authorized.',
            actionLabel: canManage ? 'Add employee' : '',
            actionHref: canManage ? '/employees/new' : '',
            onAction: canManage ? () => navigate('/employees/new') : null,
          })
        );
        return;
      }

      listHost.appendChild(
        createDataTable({
          caption: 'Employees',
          columns: [
            {
              key: 'displayName',
              label: 'Employee',
              isRowHeader: true,
              render: (emp) =>
                el(
                  'a',
                  {
                    href: `/employees/${emp.id}`,
                    onClick: (e) => {
                      e.preventDefault();
                      navigate(`/employees/${emp.id}`);
                    },
                  },
                  emp.displayName
                ),
            },
            { key: 'employeeCode', label: 'Code', render: (emp) => el('span', { className: 'mono' }, emp.employeeCode) },
            { key: 'workEmail', label: 'Work email' },
            {
              key: 'rotationEligibleFrom',
              label: 'Rotation eligible',
              render: (emp) => emp.rotationEligibleFrom ? `${emp.rotationEligibleFrom} – ${emp.rotationEligibleTo || 'open'}` : 'No',
            },
            {
              key: 'active',
              label: 'Status',
              render: (emp) => createStatusBadge(emp.active ? 'ACTIVE' : 'INACTIVE'),
            },
            {
              key: 'employmentStartDate',
              label: 'Start date',
              render: (emp) => formatIsoDate(emp.employmentStartDate),
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (emp) =>
                el(
                  'div',
                  { className: 'data-table__actions' },
                  el(
                    'a',
                    {
                      href: `/employees/${emp.id}`,
                      className: 'btn btn-secondary btn-sm',
                      onClick: (e) => {
                        e.preventDefault();
                        navigate(`/employees/${emp.id}`);
                      },
                    },
                    'Details'
                  ),
                  canManage
                    ? el(
                        'a',
                        {
                          href: `/employees/${emp.id}/edit`,
                          className: 'btn btn-ghost btn-sm',
                          onClick: (e) => {
                            e.preventDefault();
                            navigate(`/employees/${emp.id}/edit`);
                          },
                        },
                        'Edit'
                      )
                    : null
                ),
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
          title: 'Unable to load employees',
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

export async function renderEmployeeDetailPage({ container, params, navigate, signal }) {
  const employeeId = params.employeeId;
  const host = el('div', { className: 'stack' });
  host.appendChild(createSkeleton({ rows: 6, label: 'Loading employee details…' }));
  container.appendChild(host);

  const canManageUser = hasPermission('ORG.USER.MANAGE') && hasScope('ORG');
  const canInvite = hasPermission('ACCOUNT.INVITE') && hasScope('ORG');
  const canAccountStatus = hasPermission('ACCOUNT.STATUS.MANAGE') && hasScope('ORG');
  const canManageMembership = hasPermission('ORG.MEMBERSHIP.MANAGE') && hasScope('ORG');
  const canManageRoles = hasPermission('ORG.ROLE.MANAGE') && hasScope('ORG');

  let selectedDimension = 'EFFECTIVE_PUBLISHED_PRIMARY_CREDIT';

  const loadAll = async () => {
    try {
      const [emp, membershipsRes, roleAssignmentsRes, teamsRes, rolesRes, dutyRes] =
        await Promise.all([
          employeesApi.getEmployee(employeeId, { signal }),
          employeesApi.listEmployeeTeamMemberships(employeeId, { page: 0, pageSize: 25, signal }).catch(() => null),
          employeesApi.listEmployeeRoleAssignments(employeeId, { page: 0, pageSize: 25, signal }).catch(() => null),
          (hasScope('ORG') || hasScope('TEAM')) ? employeesApi.listTeams({ page: 0, pageSize: 100, signal }).catch(() => null) : Promise.resolve(null),
          employeesApi.listVisibleRoles({ page: 0, pageSize: 100, signal }).catch(() => null),
          historyApi.getDutyHistory({ employeeId, dimension: selectedDimension, page: 0, pageSize: 10, signal }).catch((err) => ({ err })),
        ]);
      if (signal?.aborted) return;

      clear(host);
      const feedbackBox = el('div', { className: 'stack-sm' });

      const headerActions = el('div', { className: 'page-header__actions' });
      if (canManageUser) {
        headerActions.appendChild(
          el(
            'a',
            {
              href: `/employees/${emp.id}/edit`,
              className: 'btn btn-secondary',
              onClick: (e) => {
                e.preventDefault();
                navigate(`/employees/${emp.id}/edit`);
              },
            },
            'Edit employee'
          )
        );
      }
      if (canInvite) {
        headerActions.appendChild(
          el(
            'button',
            {
              type: 'button',
              className: 'btn btn-primary',
              onClick: async () => {
                const confirmed = await confirmDialog({
                  title: 'Send account activation invitation?',
                  message:
                    'Creates or resends a single-use 24-hour invitation token to this employee’s work email.',
                  confirmLabel: 'Send invitation',
                });
                if (!confirmed) return;
                clear(feedbackBox);
                try {
                  await employeesApi.inviteEmployeeAccount(
                    emp.id,
                    generateIdempotencyKey('invite')
                  );
                  showToast('Account invitation queued.', { variant: 'success' });
                  feedbackBox.appendChild(
                    createAlert({
                      variant: 'success',
                      title: 'Invitation queued',
                      message: `A single-use 24-hour activation link has been queued for ${emp.workEmail}.`,
                      role: 'status',
                    })
                  );
                } catch (err) {
                  feedbackBox.appendChild(
                    createAlert({
                      variant: 'error',
                      title: 'Invitation failed',
                      message: err.message,
                      correlationId: err.correlationId,
                    })
                  );
                }
              },
            },
            'Invite account'
          )
        );
      }
      if (canAccountStatus) {
        const nextActive = !emp.active;
        headerActions.appendChild(
          el(
            'button',
            {
              type: 'button',
              className: nextActive ? 'btn btn-secondary' : 'btn btn-danger',
              onClick: async () => {
                const confirmed = await confirmDialog({
                  title: nextActive ? 'Reactivate employee account?' : 'Deactivate employee account?',
                  message: nextActive
                    ? 'Reactivating permits sign-in once credentials are active.'
                    : 'Deactivation immediately revokes all active sessions for this employee while retaining historical roster and audit records.',
                  confirmLabel: nextActive ? 'Reactivate' : 'Deactivate',
                  confirmVariant: nextActive ? 'primary' : 'danger',
                });
                if (!confirmed) return;
                clear(feedbackBox);
                try {
                  await employeesApi.setEmployeeAccountStatus(
                    emp.id,
                    { active: nextActive },
                    resolveIfMatch(emp)
                  );
                  showToast(`Account ${nextActive ? 'activated' : 'deactivated'}.`, {
                    variant: 'success',
                  });
                  await loadAll();
                } catch (err) {
                  feedbackBox.appendChild(
                    createAlert({
                      variant: 'error',
                      title: err.status === 409 ? 'Stale employee version' : 'Status update failed',
                      message: err.message,
                      correlationId: err.correlationId,
                      actionLabel: err.status === 409 ? 'Reload record' : '',
                      onAction: err.status === 409 ? loadAll : null,
                    })
                  );
                }
              },
            },
            nextActive ? 'Activate account' : 'Deactivate account'
          )
        );
      }

      const profilePanel = el(
        'section',
        { className: 'panel', 'aria-labelledby': 'emp-profile-h' },
        el('h2', { id: 'emp-profile-h' }, 'Employee profile'),
        el(
          'dl',
          { className: 'kv-grid' },
          el('div', { className: 'kv-item' }, el('dt', {}, 'Employee code'), el('dd', { className: 'mono' }, emp.employeeCode)),
          el('div', { className: 'kv-item' }, el('dt', {}, 'Work email'), el('dd', {}, emp.workEmail)),
          el('div', { className: 'kv-item' }, el('dt', {}, 'Status'), el('dd', {}, createStatusBadge(emp.active ? 'ACTIVE' : 'INACTIVE'))),
          el('div', { className: 'kv-item' }, el('dt', {}, 'Rotation eligible'), el('dd', {}, emp.rotationEligibleFrom ? `${emp.rotationEligibleFrom} – ${emp.rotationEligibleTo || 'open'}` : 'No')),
          el('div', { className: 'kv-item' }, el('dt', {}, 'Start date'), el('dd', {}, formatIsoDate(emp.employmentStartDate))),
          el('div', { className: 'kv-item' }, el('dt', {}, 'End date'), el('dd', {}, formatIsoDate(emp.employmentEndDate)))
        )
      );

      // Team memberships (ORG-04)
      const teams = teamsRes?.items || [];
      const teamNameMap = new Map(teams.map((t) => [t.id, `${t.name} (${t.code})`]));
      const memberships = membershipsRes?.items || [];
      const membershipPanel = el(
        'section',
        { className: 'panel', 'aria-labelledby': 'emp-team-h' },
        el('h2', { id: 'emp-team-h' }, 'Team memberships (effective-dated)'),
        el(
          'p',
          { className: 'muted' },
          'Team membership provides scheduling pairing context only (at most one active team per date); it never grants permissions.'
        ),
        createDataTable({
          caption: 'Team memberships',
          columns: [
            {
              key: 'teamId',
              label: 'Team',
              isRowHeader: true,
              render: (m) => teamNameMap.get(m.teamId) || `Team #${m.teamId}`,
            },
            { key: 'effectiveFrom', label: 'Effective from', render: (m) => formatIsoDate(m.effectiveFrom) },
            { key: 'effectiveTo', label: 'Effective to', render: (m) => formatIsoDate(m.effectiveTo) },
            { key: 'status', label: 'Status', render: (m) => createStatusBadge(m.status || 'ACTIVE') },
          ],
          rows: memberships,
          emptyNode: el('p', { className: 'muted' }, 'No team memberships recorded.'),
        })
      );

      if (canManageMembership) {
        const memFormError = el('div', { className: 'stack-sm' });
        const memSubmit = el('button', { type: 'submit', className: 'btn btn-secondary' }, 'Add team membership');
        const memForm = el(
          'form',
          { className: 'stack', novalidate: true },
          memFormError,
          el(
            'div',
            { className: 'form-grid' },
            createField({
              name: 'teamId',
              label: 'Team',
              type: teams.length ? 'select' : 'number',
              required: true,
              options: teams.map((t) => ({ value: String(t.id), label: `${t.name} (${t.code})` })),
            }),
            createField({ name: 'effectiveFrom', label: 'Effective from', type: 'date', required: true }),
            createField({ name: 'effectiveTo', label: 'Effective to (optional)', type: 'date' })
          ),
          el('div', { className: 'cluster' }, memSubmit)
        );
        membershipPanel.appendChild(memForm);

        bindFormValidation(memForm, {
          signal,
          customValidators: {
            effectiveTo: (val, f) => {
              const rangeErr = validateDateRange(
                f.elements.namedItem('effectiveFrom').value,
                val,
                { allowOpenEnd: true }
              );
              return rangeErr ? rangeErr.message : '';
            },
          },
          onSubmitValid: async (fd) => {
            clearServerFieldErrors(memForm);
            clear(memFormError);
            memSubmit.disabled = true;
            try {
              await employeesApi.createEmployeeTeamMembership(emp.id, {
                teamId: Number(fd.get('teamId')),
                effectiveFrom: String(fd.get('effectiveFrom')),
                effectiveTo: String(fd.get('effectiveTo') || '') || null,
              });
              showToast('Team membership saved.', { variant: 'success' });
              await loadAll();
            } catch (err) {
              applyServerFieldErrors(memForm, err.fieldErrors);
              memFormError.appendChild(
                createAlert({
                  variant: 'error',
                  title: 'Membership update failed',
                  message: err.message,
                  correlationId: err.correlationId,
                })
              );
            } finally {
              memSubmit.disabled = false;
            }
          },
        });
      }

      // Role assignments (ORG-05)
      const roles = rolesRes?.items || [];
      const roleMap = new Map(roles.map((r) => [r.id, `${r.name} (${r.code})`]));
      const roleAssignments = roleAssignmentsRes?.items || [];
      const rolePanel = el(
        'section',
        { className: 'panel', 'aria-labelledby': 'emp-role-h' },
        el('h2', { id: 'emp-role-h' }, 'Application role assignments'),
        createAlert({
          variant: 'warning',
          title: 'Role vs Manager approval authority',
          message:
            'Assigning Admin, Team Lead, or Member roles does NOT grant Manager replacement-approval authority. Approval capability requires an explicit scoped grant under Approval Grants, and role changes immediately revoke active sessions for this employee.',
        }),
        createDataTable({
          caption: 'Effective-dated role assignments',
          columns: [
            {
              key: 'roleId',
              label: 'Role',
              isRowHeader: true,
              render: (ra) => roleMap.get(ra.roleId) || `Role #${ra.roleId}`,
            },
            { key: 'effectiveFrom', label: 'Effective from', render: (ra) => formatIsoDate(ra.effectiveFrom) },
            { key: 'effectiveTo', label: 'Effective to', render: (ra) => formatIsoDate(ra.effectiveTo) },
          ],
          rows: roleAssignments,
          emptyNode: el('p', { className: 'muted' }, 'No role assignments visible.'),
        })
      );

      if (canManageRoles) {
        const roleFormError = el('div', { className: 'stack-sm' });
        const roleSubmit = el('button', { type: 'submit', className: 'btn btn-secondary' }, 'Assign role');
        const roleForm = el(
          'form',
          { className: 'stack', novalidate: true },
          roleFormError,
          el(
            'div',
            { className: 'form-grid' },
            createField({
              name: 'roleId',
              label: 'Application role',
              type: roles.length ? 'select' : 'number',
              required: true,
              options: roles.map((r) => ({ value: String(r.id), label: `${r.name} (${r.code})` })),
            }),
            createField({ name: 'effectiveFrom', label: 'Effective from', type: 'date', required: true }),
            createField({ name: 'effectiveTo', label: 'Effective to (optional)', type: 'date' })
          ),
          el('div', { className: 'cluster' }, roleSubmit)
        );
        rolePanel.appendChild(roleForm);

        bindFormValidation(roleForm, {
          signal,
          customValidators: {
            effectiveTo: (val, f) => {
              const rangeErr = validateDateRange(
                f.elements.namedItem('effectiveFrom').value,
                val,
                { allowOpenEnd: true }
              );
              return rangeErr ? rangeErr.message : '';
            },
          },
          onSubmitValid: async (fd) => {
            clearServerFieldErrors(roleForm);
            clear(roleFormError);
            const confirmed = await confirmDialog({
              title: 'Assign application role?',
              message:
                'Role changes are audited and immediately revoke all active sessions for this employee.',
              confirmLabel: 'Assign role',
            });
            if (!confirmed) return;

            roleSubmit.disabled = true;
            try {
              await employeesApi.createEmployeeRoleAssignment(emp.id, {
                roleId: Number(fd.get('roleId')),
                effectiveFrom: String(fd.get('effectiveFrom')),
                effectiveTo: String(fd.get('effectiveTo') || '') || null,
              });
              showToast('Role assigned.', { variant: 'success' });
              await loadAll();
            } catch (err) {
              applyServerFieldErrors(roleForm, err.fieldErrors);
              roleFormError.appendChild(
                createAlert({
                  variant: 'error',
                  title: 'Role assignment failed',
                  message: err.message,
                  correlationId: err.correlationId,
                })
              );
            } finally {
              roleSubmit.disabled = false;
            }
          },
        });
      }

      // Separate duty-history dimensions (ORG-02)
      const dutyBody = el(
        'div',
        { className: 'stack-sm' },
        dutyRes?.err
          ? createAlert({ variant: 'info', message: dutyRes.err.message })
          : renderDutyDimensionList(dutyRes?.items || [], selectedDimension)
      );
      const reloadDuty = async () => {
        clear(dutyBody);
        dutyBody.appendChild(createSkeleton({ rows: 3, label: 'Loading duty dimension…' }));
        try {
          const nextRes = await historyApi.getDutyHistory({
            employeeId,
            dimension: selectedDimension,
            page: 0,
            pageSize: 10,
            signal,
          });
          if (signal?.aborted) return;
          clear(dutyBody);
          dutyBody.appendChild(renderDutyDimensionList(nextRes?.items || [], selectedDimension));
        } catch (err) {
          if (isAbortError(err)) return;
          clear(dutyBody);
          dutyBody.appendChild(createAlert({ variant: 'info', message: err.message }));
        }
      };

      const dutyPanel = el(
        'section',
        { className: 'panel', 'aria-labelledby': 'emp-duty-h' },
        el(
          'div',
          { className: 'panel__header' },
          el('h2', { id: 'emp-duty-h' }, 'Duty history (separate dimension)'),
          createField({
            name: 'dimension',
            label: 'Dimension',
            type: 'select',
            value: selectedDimension,
            options: DUTY_DIMENSIONS,
            onChange: (e) => {
              selectedDimension = e.target.value;
              reloadDuty();
            },
          })
        ),
        dutyBody
      );

      host.append(
        el(
          'div',
          { className: 'page-header' },
          el(
            'div',
            { className: 'page-header__title-group' },
            el('h1', { id: 'main-heading', tabindex: '-1' }, emp.displayName),
            el('p', { className: 'muted' }, `Employee #${emp.id} · ${emp.employeeCode}`)
          ),
          headerActions
        ),
        feedbackBox,
        profilePanel,
        membershipPanel,
        rolePanel,
        dutyPanel
      );
    } catch (err) {
      if (isAbortError(err)) return;
      clear(host);
      host.append(
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Employee unavailable'),
        createAlert({
          variant: 'error',
          title: 'Unable to load employee',
          message: err.message,
          correlationId: err.correlationId,
        })
      );
    }
  };

  await loadAll();
}

function renderDutyDimensionList(items, dimension) {
  if (!items.length) {
    return el(
      'p',
      { className: 'muted' },
      `No records found in ${formatEnumLabel(dimension)}. Dimensions are never summed together.`
    );
  }
  const keys = Array.from(
    items.reduce((set, row) => {
      Object.keys(row || {}).forEach((k) => set.add(k));
      return set;
    }, new Set())
  ).slice(0, 6);

  return createDataTable({
    caption: `${formatEnumLabel(dimension)} records`,
    columns: keys.map((key, idx) => ({
      key,
      label: formatEnumLabel(key),
      isRowHeader: idx === 0,
      render: (row) => (row[key] == null ? '—' : String(row[key])),
    })),
    rows: items,
  });
}

export async function renderEmployeeFormPage({ container, params, navigate, signal }) {
  const isEdit = Boolean(params?.employeeId);
  const host = el('div', { className: 'stack' });
  container.appendChild(host);

  let existing = null;
  if (isEdit) {
    host.appendChild(createSkeleton({ rows: 5, label: 'Loading employee…' }));
    try {
      existing = await employeesApi.getEmployee(params.employeeId, { signal });
      if (signal?.aborted) return;
      clear(host);
    } catch (err) {
      if (isAbortError(err)) return;
      clear(host);
      host.append(
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Employee unavailable'),
        createAlert({ variant: 'error', title: 'Load failed', message: err.message, correlationId: err.correlationId })
      );
      return;
    }
  }

  const errorBox = el('div', { className: 'stack-sm' });
  const submitBtn = el(
    'button',
    { type: 'submit', className: 'btn btn-primary' },
    isEdit ? 'Save changes' : 'Create employee'
  );
  let dirtyGuard = null;

  const form = el(
    'form',
    { className: 'panel stack', novalidate: true },
    errorBox,
    el(
      'div',
      { className: 'form-grid' },
      createField({
        name: 'employeeCode',
        label: 'Employee code',
        value: existing?.employeeCode || '',
        required: true,
        maxlength: 40,
        autocorrect: 'off',
        autocapitalize: 'none',
        spellcheck: 'false',
      }),
      createField({
        name: 'firstName',
        label: 'First name',
        value: existing?.firstName || '',
        required: true,
        maxlength: 100,
        autocomplete: 'given-name',
      }),
      createField({ name: 'lastName', label: 'Last name', value: existing?.lastName || '', required: true, maxlength: 100, autocomplete: 'family-name' }),
      createField({
        name: 'workEmail',
        label: 'Work email',
        type: 'email',
        value: existing?.workEmail || '',
        required: true,
        maxlength: 254,
        autocomplete: 'email',
        autocorrect: 'off',
        autocapitalize: 'none',
      }),
      createField({
        name: 'employmentStartDate',
        label: 'Employment start date',
        type: 'date',
        value: existing?.employmentStartDate || '',
        required: true,
      }),
      createField({
        name: 'employmentEndDate',
        label: 'Employment end date (optional)',
        type: 'date',
        value: existing?.employmentEndDate || '',
      }),
      createField({ name: 'rotationEligibleFrom', label: 'Rotation eligibility starts (optional; blank means ineligible)', type: 'date', value: existing?.rotationEligibleFrom || '' }),
      createField({ name: 'rotationEligibleTo', label: 'Rotation eligibility ends (optional)', type: 'date', value: existing?.rotationEligibleTo || '' })
    ),
    el(
      'div',
      { className: 'cluster' },
      submitBtn,
      el(
        'a',
        {
          href: isEdit ? `/employees/${existing.id}` : '/employees',
          className: 'btn btn-secondary',
          onClick: async (e) => {
            e.preventDefault();
            if (dirtyGuard?.isDirty()) {
              const discard = await confirmDialog({
                title: 'Discard unsaved employee changes?',
                message: 'Your unsaved edits will be lost if you leave this form.',
                confirmLabel: 'Discard changes',
                confirmVariant: 'danger',
              });
              if (!discard) return;
              dirtyGuard.resetDirty();
            }
            navigate(isEdit ? `/employees/${existing.id}` : '/employees');
          },
        },
        'Cancel'
      )
    )
  );

  dirtyGuard = attachDirtyGuard(form, { signal });

  host.append(
    el(
      'div',
      { className: 'page-header' },
      el('h1', { id: 'main-heading', tabindex: '-1' }, isEdit ? `Edit ${existing.displayName}` : 'Create employee')
    ),
    form
  );

  bindFormValidation(form, {
    signal,
    customValidators: {
      employmentEndDate: (val, f) => {
        const err = validateDateRange(f.elements.namedItem('employmentStartDate').value, val, { allowOpenEnd: true });
        return err ? err.message : '';
      },
      rotationEligibleFrom: (val, f) => {
        const to = f.elements.namedItem('rotationEligibleTo').value;
        if (to && !val) return 'An eligibility end date requires a start date.';
        const err = val ? validateDateRange(val, to, { allowOpenEnd: true }) : null;
        return err ? err.message : '';
      },
    },
    onSubmitValid: async (fd) => {
      clearServerFieldErrors(form);
      clear(errorBox);
      const payload = {
        employeeCode: String(fd.get('employeeCode') || '').trim(),
        firstName: String(fd.get('firstName') || '').trim(),
        lastName: String(fd.get('lastName') || '').trim(),
        workEmail: String(fd.get('workEmail') || '').trim(),
        employmentStartDate: String(fd.get('employmentStartDate') || ''),
        employmentEndDate: String(fd.get('employmentEndDate') || '') || null,
        rotationEligibleFrom: String(fd.get('rotationEligibleFrom') || '') || null,
        rotationEligibleTo: String(fd.get('rotationEligibleTo') || '') || null,
      };

      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving…';
      try {
        const saved = isEdit
          ? await employeesApi.updateEmployee(existing.id, payload, resolveIfMatch(existing))
          : await employeesApi.createEmployee(payload);
        dirtyGuard.resetDirty();
        showToast(isEdit ? 'Employee updated.' : 'Employee created.', { variant: 'success' });
        navigate(`/employees/${saved.id}`);
      } catch (err) {
        applyServerFieldErrors(form, err.fieldErrors);
        errorBox.appendChild(
          createAlert({
            variant: 'error',
            title: err.status === 409 ? 'Concurrent modification detected' : 'Save failed',
            message: err.message,
            correlationId: err.correlationId,
            actionLabel: err.status === 409 ? 'Reload latest record' : '',
            onAction: err.status === 409 ? () => navigate(`/employees/${existing.id}/edit`) : null,
          })
        );
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = isEdit ? 'Save changes' : 'Create employee';
      }
    },
  });
}

export async function renderTeamsPage({ container, navigate, signal }) {
  let page = 0;
  let pageSize = 25;
  const canManageTeams = hasPermission('ORG.TEAM.MANAGE') && hasScope('ORG');
  const listHost = el('div', { className: 'stack' });
  const formHost = el('div', { className: 'stack' });

  container.append(
    el(
      'div',
      { className: 'page-header' },
      el(
        'div',
        { className: 'page-header__title-group' },
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Teams'),
        el('p', { className: 'muted' }, 'Teams guide soft same-team pairing preferences and never define fairness quotas or permissions.')
      )
    ),
    formHost,
    listHost
  );

  if (canManageTeams) {
    const errBox = el('div', { className: 'stack-sm' });
    const btn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Create team');
    const form = el(
      'form',
      { className: 'panel stack', novalidate: true },
      el('h2', {}, 'Create team'),
      errBox,
      el(
        'div',
        { className: 'form-grid' },
        createField({ name: 'code', label: 'Team code', required: true, maxlength: 40 }),
        createField({ name: 'name', label: 'Team name', required: true, maxlength: 120 })
      ),
      el('div', { className: 'cluster' }, btn)
    );
    formHost.appendChild(form);

    bindFormValidation(form, {
      signal,
      onSubmitValid: async (fd) => {
        clearServerFieldErrors(form);
        clear(errBox);
        btn.disabled = true;
        try {
          await employeesApi.createTeam({
            code: String(fd.get('code') || '').trim(),
            name: String(fd.get('name') || '').trim(),
          });
          form.reset();
          showToast('Team created.', { variant: 'success' });
          await load();
        } catch (err) {
          applyServerFieldErrors(form, err.fieldErrors);
          errBox.appendChild(
            createAlert({ variant: 'error', title: 'Create team failed', message: err.message, correlationId: err.correlationId })
          );
        } finally {
          btn.disabled = false;
        }
      },
    });
  }

  const load = async () => {
    clear(listHost);
    listHost.appendChild(createSkeleton({ rows: 4, label: 'Loading teams…' }));
    try {
      const data = await employeesApi.listTeams({ page, pageSize, signal });
      if (signal?.aborted) return;
      clear(listHost);
      const items = data?.items || [];
      if (!items.length) {
        listHost.appendChild(createEmptyState({ title: 'No teams configured', description: 'Create a team if you have ORG.TEAM.MANAGE.' }));
        return;
      }
      listHost.appendChild(
        createDataTable({
          caption: 'Teams',
          columns: [
            { key: 'name', label: 'Name', isRowHeader: true },
            { key: 'code', label: 'Code', render: (t) => el('span', { className: 'mono' }, t.code) },
            { key: 'active', label: 'Status', render: (t) => createStatusBadge(t.active ? 'ACTIVE' : 'INACTIVE') },
            { key: 'teamLead', label: 'Team Lead history', render: (t) => (hasScope('ORG') || hasScope('TEAM', t.id)) ? el('a', { href: `/teams/${t.id}/team-leads`, className: 'btn btn-secondary btn-sm', onClick: (event) => { event.preventDefault(); navigate(`/teams/${t.id}/team-leads`); } }, 'View assignments') : '—' },
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
      listHost.appendChild(createAlert({ variant: 'error', title: 'Unable to load teams', message: err.message, correlationId: err.correlationId }));
    }
  };

  await load();
}

export async function renderApprovalGrantsPage({ container, session, signal }) {
  let page = 0;
  let pageSize = 25;
  const canManageGrants = hasPermission('ORG.AUTHORITY.MANAGE') && hasScope('ORG');

  const formHost = el('div', { className: 'stack' });
  const listHost = el('div', { className: 'stack' });

  container.append(
    el(
      'div',
      { className: 'page-header' },
      el(
        'div',
        { className: 'page-header__title-group' },
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Replacement approval grants'),
        el('p', { className: 'muted' }, 'Explicit scoped, time-bounded REPLACEMENT.APPROVE authority (FDR-03).')
      )
    ),
    createAlert({
      variant: 'info',
      title: 'Separation of duties',
      message:
        'Grantors cannot grant themselves replacement approval authority. Approval capability is never inferred from Admin or Team Lead roles.',
    }),
    formHost,
    listHost
  );

  const load = async () => {
    clear(listHost);
    listHost.appendChild(createSkeleton({ rows: 4, label: 'Loading approval grants…' }));
    try {
      const [grantsData, teamsData] = await Promise.all([
        employeesApi.listApprovalGrants({ page, pageSize, signal }),
        canManageGrants ? employeesApi.listTeams({ page: 0, pageSize: 100, signal }).catch(() => null) : Promise.resolve(null),
      ]);
      if (signal?.aborted) return;

      if (canManageGrants && !formHost.children.length) {
        const teams = teamsData?.items || [];
        const errBox = el('div', { className: 'stack-sm' });
        const submitBtn = el('button', { type: 'submit', className: 'btn btn-primary' }, 'Grant approval authority');
        const scopeIdWrapper = createField({
          name: 'scopeId',
          label: 'Team scope (required when Scope Type = TEAM)',
          type: teams.length ? 'select' : 'number',
          options: [{ value: '', label: 'Select team…' }, ...teams.map((t) => ({ value: String(t.id), label: `${t.name} (${t.code})` }))],
        });
        const scopeTypeField = createField({
          name: 'scopeType',
          label: 'Scope type',
          type: 'select',
          required: true,
          value: 'ORGANISATION',
          options: [
            { value: 'ORGANISATION', label: 'Organisation-wide' },
            { value: 'TEAM', label: 'Specific team' },
          ],
          onChange: (e) => {
            const isTeam = e.target.value === 'TEAM';
            const ctrl = scopeIdWrapper.querySelector('select, input');
            if (ctrl) ctrl.required = isTeam;
            scopeIdWrapper.hidden = !isTeam;
          },
        });
        scopeIdWrapper.hidden = true;

        const form = el(
          'form',
          { className: 'panel stack', novalidate: true },
          el('h2', {}, 'Create scoped approval grant'),
          errBox,
          el(
            'div',
            { className: 'form-grid' },
            createField({
              name: 'userAccountId',
              label: 'Grantee user account ID',
              type: 'number',
              min: 1,
              required: true,
              hint: `Must differ from your own account ID (${session.user.id}).`,
            }),
            scopeTypeField,
            scopeIdWrapper,
            createField({ name: 'validFrom', label: 'Valid from', type: 'date', required: true }),
            createField({ name: 'validUntil', label: 'Valid until', type: 'date', required: true }),
            createField({
              name: 'reason',
              label: 'Reason',
              type: 'textarea',
              required: true,
              maxlength: 1000,
              rows: 2,
              fullWidth: true,
            })
          ),
          el('div', { className: 'cluster' }, submitBtn)
        );
        formHost.appendChild(form);

        bindFormValidation(form, {
          signal,
          customValidators: {
            userAccountId: (val) =>
              Number(val) === session.user.id ? 'Self-granting replacement approval authority is prohibited.' : '',
            validUntil: (val, f) => {
              const err = validateDateRange(f.elements.namedItem('validFrom').value, val);
              return err ? err.message : '';
            },
          },
          onSubmitValid: async (fd) => {
            clearServerFieldErrors(form);
            clear(errBox);
            const scopeType = String(fd.get('scopeType'));
            const scopeIdRaw = String(fd.get('scopeId') || '').trim();
            if (scopeType === 'TEAM' && !scopeIdRaw) {
              errBox.appendChild(createAlert({ variant: 'error', title: 'Team required', message: 'Select a team for TEAM-scoped grants.' }));
              return;
            }
            submitBtn.disabled = true;
            try {
              await employeesApi.createApprovalGrant({
                userAccountId: Number(fd.get('userAccountId')),
                scopeType,
                scopeId: scopeType === 'TEAM' ? Number(scopeIdRaw) : null,
                validFrom: String(fd.get('validFrom')),
                validUntil: String(fd.get('validUntil')),
                reason: String(fd.get('reason') || '').trim(),
              });
              form.reset();
              scopeIdWrapper.hidden = true;
              showToast('Approval grant created.', { variant: 'success' });
              await load();
            } catch (err) {
              applyServerFieldErrors(form, err.fieldErrors);
              errBox.appendChild(
                createAlert({ variant: 'error', title: 'Create grant failed', message: err.message, correlationId: err.correlationId })
              );
            } finally {
              submitBtn.disabled = false;
            }
          },
        });
      }

      clear(listHost);
      const items = grantsData?.items || [];
      if (!items.length) {
        listHost.appendChild(
          createEmptyState({
            title: 'No approval authority grants',
            description: 'No active or historical REPLACEMENT.APPROVE grants were returned.',
          })
        );
        return;
      }

      listHost.appendChild(
        createDataTable({
          caption: 'Approval authority grants',
          columns: [
            { key: 'id', label: 'Grant ID', isRowHeader: true, render: (g) => `#${g.id}` },
            { key: 'userAccountId', label: 'Grantee Account ID', render: (g) => `#${g.userAccountId}` },
            {
              key: 'scopeType',
              label: 'Scope',
              render: (g) => (g.scopeId != null ? `${g.scopeType} (#${g.scopeId})` : g.scopeType),
            },
            {
              key: 'validFrom',
              label: 'Validity',
              render: (g) => `${formatIsoDate(g.validFrom)} – ${formatIsoDate(g.validUntil)}`,
            },
            { key: 'reason', label: 'Reason' },
            { key: 'status', label: 'Status', render: (g) => createStatusBadge(g.status) },
            {
              key: 'actions',
              label: 'Actions',
              render: (g) =>
                canManageGrants && g.status === 'ACTIVE'
                  ? el(
                      'button',
                      {
                        type: 'button',
                        className: 'btn btn-danger btn-sm',
                        onClick: async () => {
                          const confirmed = await confirmDialog({
                            title: `Revoke grant #${g.id}?`,
                            message:
                              'Revocation is audited, takes effect immediately, and revokes all active sessions for the affected account.',
                            confirmLabel: 'Revoke grant',
                            confirmVariant: 'danger',
                          });
                          if (!confirmed) return;
                          try {
                            await employeesApi.revokeApprovalGrant(g.id, resolveIfMatch(g));
                            showToast('Approval grant revoked.', { variant: 'success' });
                            await load();
                          } catch (err) {
                            listHost.prepend(
                              createAlert({
                                variant: 'error',
                                title: 'Revocation failed',
                                message: err.message,
                                correlationId: err.correlationId,
                                actionLabel: err.status === 409 ? 'Reload' : '',
                                onAction: err.status === 409 ? load : null,
                              })
                            );
                          }
                        },
                      },
                      'Revoke'
                    )
                  : '—',
            },
          ],
          rows: items,
        })
      );

      listHost.appendChild(
        createPagination({
          page: grantsData.page,
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
        createAlert({ variant: 'error', title: 'Failed to load approval grants', message: err.message, correlationId: err.correlationId })
      );
    }
  };

  await load();
}
