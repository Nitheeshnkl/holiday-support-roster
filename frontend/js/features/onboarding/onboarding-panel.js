import { el, clear, announceStatus } from '../../utils/dom.js';
import { createAlert, showToast } from '../../components/alert.js';
import { openModal } from '../../components/dialog.js';
import * as onboardingApi from '../../api/onboarding.js';
import { updateOnboardingState } from '../../state/session-store.js';

export function getActiveWalkthrough(onboarding) {
  const list = onboarding?.walkthroughs;
  if (!Array.isArray(list) || !list.length) return null;
  return (
    list.find((w) => w.status === 'IN_PROGRESS' || w.status === 'NOT_STARTED') ||
    list[0]
  );
}

export function createOnboardingBanner({ onboarding, onOpenGuide }) {
  const active = getActiveWalkthrough(onboarding);
  if (!active || active.status === 'COMPLETED' || active.status === 'SKIPPED') {
    return null;
  }

  const totalSteps = Array.isArray(active.steps) ? active.steps.length : 0;
  const stepText =
    totalSteps > 0
      ? `Step ${Math.min((active.currentStep ?? 0) + 1, totalSteps)} of ${totalSteps}`
      : 'Getting started';

  return el(
    'section',
    { className: 'onboarding-banner', 'aria-label': 'First-use walkthrough' },
    el(
      'div',
      { className: 'stack-sm' },
      el('strong', {}, `${active.title || 'Role onboarding guide'} (${active.roleCode || 'User'})`),
      el(
        'p',
        { className: 'muted' },
        `${stepText} — Informational guidance only; you can resume, skip, or continue your work at any time.`
      )
    ),
    el(
      'div',
      { className: 'cluster' },
      el(
        'button',
        {
          type: 'button',
          className: 'btn btn-primary btn-sm',
          onClick: () => onOpenGuide(active),
        },
        active.status === 'IN_PROGRESS' ? 'Resume guide' : 'Start guide'
      )
    )
  );
}

export function openOnboardingModal({ onboarding, initialWalkthrough = null }) {
  const list = Array.isArray(onboarding?.walkthroughs) ? onboarding.walkthroughs : [];
  let selected = initialWalkthrough || getActiveWalkthrough(onboarding) || list[0];

  const body = el('div', { className: 'stack' });
  const errorHost = el('div', { className: 'stack-sm' });
  const contentHost = el('div', { className: 'stack' });
  body.append(errorHost, contentHost);

  const modal = openModal({
    title: 'Role onboarding walkthrough',
    bodyNode: body,
    mobileSheet: true,
  });
  modal.classList.add('onboarding-tour', 'tour-popover');
  modal.setAttribute('data-tour-popover', 'true');

  const clearSpotlights = () => {
    document.querySelectorAll('[data-tour-highlight]').forEach((node) => {
      node.removeAttribute('data-tour-highlight');
      node.classList.remove('tour-spotlight');
    });
  };

  const highlightTarget = (contextKey) => {
    clearSpotlights();
    if (!contextKey) return;
    const target = document.querySelector(`[data-tour="${contextKey}"]`);
    if (target) {
      target.setAttribute('data-tour-highlight', 'true');
      target.classList.add('tour-spotlight');
    }
  };

  modal.addEventListener('close', clearSpotlights);

  if (!selected) {
    contentHost.appendChild(
      createAlert({
        variant: 'info',
        title: 'No walkthrough content published',
        message:
          'No onboarding walkthrough is currently published for your role. All authorized workflows remain available directly in navigation.',
      })
    );
    return;
  }

  const saveStep = async (nextStep, nextStatus, { closeOnSuccess = false } = {}) => {
    clear(errorHost);
    try {
      const updated = await onboardingApi.updateOnboardingProgress({
        walkthroughId: selected.walkthroughId,
        currentStep: nextStep,
        status: nextStatus,
      });
      updateOnboardingState(updated);
      const refreshed = updated?.walkthroughs?.find(
        (w) => w.walkthroughId === selected.walkthroughId
      );
      if (refreshed) selected = refreshed;
      announceStatus(`Onboarding ${nextStatus.toLowerCase().replace('_', ' ')}.`);
      if (closeOnSuccess) {
        document.querySelectorAll('.onboarding-banner').forEach((b) => b.remove());
        showToast(
          nextStatus === 'COMPLETED' ? 'Walkthrough completed.' : 'Walkthrough skipped.',
          { variant: 'success' }
        );
        modal.close('done');
      } else {
        renderStep();
      }
    } catch (err) {
      errorHost.appendChild(
        createAlert({
          variant: 'error',
          title: 'Could not save progress',
          message: err.message,
          correlationId: err.correlationId,
          actionLabel: 'Retry',
          onAction: () => saveStep(nextStep, nextStatus, { closeOnSuccess }),
        })
      );
    }
  };

  const renderStep = () => {
    clear(contentHost);
    const steps = Array.isArray(selected.steps) ? [...selected.steps].sort((a, b) => a.stepNumber - b.stepNumber) : [];
    const total = steps.length;
    const index = Math.max(0, Math.min(selected.currentStep ?? 0, Math.max(0, total - 1)));
    const step = steps[index];

    if (list.length > 1) {
      const selector = el(
        'label',
        { className: 'field' },
        el('span', { className: 'field__label' }, 'Role walkthrough'),
        el(
          'select',
          {
            className: 'field__select',
            onChange: (e) => {
              const found = list.find((w) => String(w.walkthroughId) === e.target.value);
              if (found) {
                selected = found;
                renderStep();
              }
            },
          },
          list.map((w) => {
            const opt = el('option', { value: w.walkthroughId }, `${w.title} (${w.roleCode})`);
            if (w.walkthroughId === selected.walkthroughId) opt.selected = true;
            return opt;
          })
        )
      );
      contentHost.appendChild(selector);
    }

    contentHost.appendChild(
      el(
        'p',
        { className: 'muted' },
        `${selected.title} — Version ${selected.versionNumber ?? 1} · Status: ${selected.status}`
      )
    );

    if (!step) {
      clearSpotlights();
      contentHost.appendChild(
        createAlert({
          variant: 'info',
          title: 'No steps authored',
          message: 'This walkthrough has no steps configured yet.',
        })
      );
      return;
    }

    highlightTarget(step.contextKey);

    contentHost.appendChild(
      el(
        'div',
        { className: 'onboarding-step-box' },
        el('span', { className: 'muted' }, `Step ${index + 1} of ${total}`),
        el('h2', {}, step.title),
        el('p', {}, step.instructionText),
        step.contextKey ? el('p', { className: 'muted mono' }, `Context: ${step.contextKey}`) : null
      )
    );

    const actions = el('div', { className: 'cluster' });
    if (index > 0) {
      actions.appendChild(
        el(
          'button',
          {
            type: 'button',
            className: 'btn btn-secondary',
            onClick: () => saveStep(index - 1, 'IN_PROGRESS'),
          },
          'Previous'
        )
      );
    }
    if (index + 1 < total) {
      actions.appendChild(
        el(
          'button',
          {
            type: 'button',
            className: 'btn btn-primary',
            onClick: () => saveStep(index + 1, 'IN_PROGRESS'),
          },
          'Next step'
        )
      );
    } else {
      actions.appendChild(
        el(
          'button',
          {
            type: 'button',
            className: 'btn btn-primary',
            onClick: () => saveStep(index, 'COMPLETED', { closeOnSuccess: true }),
          },
          'Complete walkthrough'
        )
      );
    }
    actions.appendChild(
      el(
        'button',
        {
          type: 'button',
          className: 'btn btn-ghost',
          onClick: () => saveStep(index, 'SKIPPED', { closeOnSuccess: true }),
        },
        'Skip for now'
      )
    );
    if (selected.status === 'COMPLETED' || selected.status === 'SKIPPED') {
      actions.appendChild(
        el(
          'button',
          {
            type: 'button',
            className: 'btn btn-secondary',
            onClick: () => saveStep(0, 'IN_PROGRESS'),
          },
          'Restart'
        )
      );
    }

    contentHost.appendChild(actions);
  };

  renderStep();
}
