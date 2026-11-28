import { el } from '../utils/dom.js';

/**
 * Create a keyboard-accessible tablist with roving tabindex (ArrowLeft/ArrowRight/Home/End).
 */
export function createTabs({
  label = 'Views',
  tabs = [],
  activeId = '',
  onChange = null,
  className = 'tablist',
  tabClassName = 'tab-btn',
} = {}) {
  const buttons = [];
  const resolvedActive = activeId || tabs[0]?.id || '';

  const activate = (nextId, { focus = false } = {}) => {
    buttons.forEach((btn) => {
      const selected = btn.dataset.tabId === String(nextId);
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
      btn.setAttribute('tabindex', selected ? '0' : '-1');
      if (selected && focus) btn.focus();
    });
    if (typeof onChange === 'function') {
      onChange(nextId);
    }
  };

  tabs.forEach((tab, idx) => {
    const selected = String(tab.id) === String(resolvedActive);
    const btn = el(
      'button',
      {
        type: 'button',
        role: 'tab',
        className: tabClassName,
        dataset: { tabId: String(tab.id) },
        'aria-selected': selected ? 'true' : 'false',
        tabindex: selected ? '0' : '-1',
        onClick: () => activate(tab.id),
        onKeydown: (e) => {
          if (!buttons.length) return;
          let targetIdx = null;
          if (e.key === 'ArrowRight') targetIdx = (idx + 1) % buttons.length;
          else if (e.key === 'ArrowLeft') targetIdx = (idx - 1 + buttons.length) % buttons.length;
          else if (e.key === 'Home') targetIdx = 0;
          else if (e.key === 'End') targetIdx = buttons.length - 1;
          if (targetIdx != null) {
            e.preventDefault();
            activate(tabs[targetIdx].id, { focus: true });
          }
        },
      },
      tab.label
    );
    buttons.push(btn);
  });

  return el('div', { className, role: 'tablist', 'aria-label': label }, buttons);
}
