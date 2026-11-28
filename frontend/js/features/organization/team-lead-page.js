import { el, clear } from '../../utils/dom.js';
import { createField } from '../../components/form-controls.js';
import { createAlert, createSkeleton, showToast } from '../../components/alert.js';
import { bindFormValidation, applyServerFieldErrors, clearServerFieldErrors } from '../../utils/validation.js';
import { hasPermission, hasRole, hasScope } from '../../state/session-store.js';
import { resolveIfMatch } from '../../api/client.js';
import * as orgApi from '../../api/employees.js';

export function resolveTeamLeadIfMatch(mode, assignment, collection) {
  if (mode === 'assign' || mode === 'replace') {
    const collectionVersion = resolveIfMatch(collection);
    if (!collectionVersion) throw new Error('The team history did not include an authoritative collection ETag. Reload the history before changing the Team Lead.');
    return collectionVersion;
  }
  const assignmentVersion = resolveIfMatch(assignment);
  if (!assignmentVersion) throw new Error('The assignment response did not include an authoritative rowVersion. Reload the history before changing it.');
  return assignmentVersion;
}

export async function renderTeamLeadAssignmentsPage({ container, params, signal }) {
  const host = el('div', { className: 'stack' });
  container.appendChild(host);
  host.appendChild(createSkeleton({ rows: 4, label: 'Loading Team Lead history…' }));
  try {
    const teamsPage = await orgApi.listTeams({ page: 0, pageSize: 100, signal });
    const teams = teamsPage?.items || [];
    const selectedTeam = teams.find((team) => String(team.id) === String(params.teamId));
    if (!selectedTeam) throw new Error('The team is not available in your permitted scope.');
    clear(host);
    const canManage = hasRole('ADMIN') && hasPermission('ORG.TEAM_LEAD.MANAGE') && hasScope('ORG');
    const title = el('h1', { id: 'main-heading', tabindex: '-1' }, `${selectedTeam.name} · Team Lead assignments`);
    const notice = el('div', {});
    const list = el('div', { className: 'stack' });
    host.append(title, notice, list);

    const refresh = async () => {
      clear(list);
      const history = await orgApi.listTeamLeadAssignments(selectedTeam.id, { page: 0, pageSize: 100, signal });
      const items = history?.items || [];
      list.appendChild(el('p', { className: 'muted' }, 'Intervals are inclusive. Team Lead history and actions are scoped by the server.'));
      if (!items.length) list.appendChild(el('p', { className: 'empty-state' }, 'No Team Lead assignments recorded.'));
      for (const assignment of items) {
        const row = el('article', { className: 'panel stack-sm' },
          el('h2', {}, `Employee #${assignment.employeeId}`),
          el('p', {}, `${assignment.effectiveFrom} to ${assignment.effectiveTo || 'open'}`),
          el('p', { className: 'muted' }, `Assignment #${assignment.id} · version ${assignment.rowVersion}`));
        if (canManage) {
          const actions = el('div', { className: 'cluster' });
          for (const [label, mode] of [['Replace', 'replace'], ['Terminate', 'terminate'], ['Correct history', 'correct']]) {
            actions.appendChild(el('button', { type: 'button', className: 'btn btn-secondary', onClick: () => renderAction(mode, assignment, history) }, label));
          }
          row.appendChild(actions);
        }
        list.appendChild(row);
      }
      if (canManage) {
        const form = el('form', { className: 'panel stack', novalidate: true },
          el('h2', {}, items.some((item) => !item.effectiveTo) ? 'Appoint Team Lead' : 'Initial Team Lead appointment'),
          createField({ name: 'employeeId', label: 'Employee ID', type: 'number', required: true, min: 1 }),
          createField({ name: 'effectiveFrom', label: 'Effective from', type: 'date', required: true }),
          el('button', { className: 'btn btn-primary', type: 'submit' }, 'Appoint'));
        bindFormValidation(form, { signal, onSubmitValid: async (fd) => {
          try {
            const result = await orgApi.assignTeamLead(selectedTeam.id, { employeeId: Number(fd.get('employeeId')), effectiveFrom: fd.get('effectiveFrom') }, resolveTeamLeadIfMatch('assign', null, history));
            showToast(`Team Lead assignment #${result.id} created.`, { variant: 'success' }); await refresh();
          } catch (err) { notice.replaceChildren(createAlert({ variant: 'error', title: 'Appointment failed', message: err.message, correlationId: err.correlationId })); }
        }});
        list.prepend(form);
      }
    };

    const renderAction = (mode, assignment, collection) => {
      const form = el('form', { className: 'panel stack', novalidate: true });
      const actionLabel = { replace: 'Replace Team Lead', terminate: 'Terminate assignment', correct: 'Correct historical interval' }[mode];
      form.append(el('h2', {}, `${actionLabel} · #${assignment.id}`));
      if (mode === 'replace') form.append(createField({ name: 'employeeId', label: 'Successor employee ID', type: 'number', required: true, min: 1 }));
      form.append(createField({ name: mode === 'terminate' ? 'effectiveTo' : 'effectiveFrom', label: mode === 'terminate' ? 'Inclusive final date' : 'Effective from', type: 'date', required: true, value: mode === 'correct' ? assignment.effectiveFrom : '' }));
      if (mode === 'correct') form.append(createField({ name: 'effectiveTo', label: 'Effective to (optional)', type: 'date', value: assignment.effectiveTo || '' }));
      form.append(
        el(
          'div',
          { className: 'cluster' },
          el('button', { className: 'btn btn-primary', type: 'submit' }, actionLabel),
          el(
            'button',
            {
              className: 'btn btn-secondary',
              type: 'button',
              onClick: () => notice.replaceChildren(),
            },
            'Cancel'
          )
        )
      );
      notice.replaceChildren(form);
      bindFormValidation(form, { signal, onSubmitValid: async (fd) => {
        clearServerFieldErrors(form);
        const data = mode === 'replace'
          ? { employeeId: Number(fd.get('employeeId')), effectiveFrom: fd.get('effectiveFrom') }
          : mode === 'terminate' ? { effectiveTo: fd.get('effectiveTo') }
            : { effectiveFrom: fd.get('effectiveFrom'), effectiveTo: fd.get('effectiveTo') || null };
        try {
          if (mode === 'replace') {
            await orgApi.replaceTeamLead(selectedTeam.id, assignment.id, data, resolveTeamLeadIfMatch(mode, assignment, collection));
          } else {
            const assignmentVersion = resolveTeamLeadIfMatch(mode, assignment, collection);
            if (mode === 'terminate') await orgApi.terminateTeamLeadAssignment(selectedTeam.id, assignment.id, data, assignmentVersion);
            else await orgApi.correctTeamLeadAssignmentHistory(selectedTeam.id, assignment.id, data, assignmentVersion);
          }
          showToast('Team Lead history updated.', { variant: 'success' }); notice.replaceChildren(); await refresh();
        } catch (err) { notice.appendChild(createAlert({ variant: 'error', title: 'Update failed', message: err.message, correlationId: err.correlationId })); }
      }});
    };
    await refresh();
  } catch (err) {
    clear(host);
    host.append(el('h1', { id: 'main-heading', tabindex: '-1' }, 'Team Lead history unavailable'), createAlert({ variant: 'error', title: 'Load failed', message: err.message, correlationId: err.correlationId }));
  }
}
