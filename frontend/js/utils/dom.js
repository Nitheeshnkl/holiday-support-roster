const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Create a DOM element safely using properties/attributes and text nodes only.
 * Never uses innerHTML or raw HTML string parsing.
 */
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  if (attrs && typeof attrs === 'object') {
    for (const [key, value] of Object.entries(attrs)) {
      if (value === null || value === undefined || value === false) continue;
      if (key === 'className') {
        node.className = String(value);
      } else if (key === 'dataset' && typeof value === 'object') {
        for (const [dKey, dVal] of Object.entries(value)) {
          if (dVal !== null && dVal !== undefined) {
            node.dataset[dKey] = String(dVal);
          }
        }
      } else if (key.startsWith('on') && typeof value === 'function') {
        node.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (value === true) {
        node.setAttribute(key, '');
      } else if (key === 'value' && ('value' in node)) {
        node.value = String(value);
      } else if (key === 'checked' && ('checked' in node)) {
        node.checked = Boolean(value);
      } else {
        node.setAttribute(key, String(value));
      }
    }
  }
  appendChildren(node, children);
  return node;
}

export function appendChildren(parent, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    if (child instanceof Node) {
      parent.appendChild(child);
    } else {
      parent.appendChild(document.createTextNode(String(child)));
    }
  }
  return parent;
}

export function clear(node) {
  node.replaceChildren();
  return node;
}

/**
 * Create an accessible inline SVG icon using DOM SVG APIs (zero innerHTML).
 */
export function svgIcon(name, { size = 18, label = '' } = {}) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');

  if (label) {
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', label);
  } else {
    svg.setAttribute('aria-hidden', 'true');
  }

  const paths = ICON_PATHS[name] || ICON_PATHS.info;
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

const ICON_PATHS = {
  menu: ['M3 6h18', 'M3 12h18', 'M3 18h18'],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  bell: ['M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9', 'M13.73 21a2 2 0 0 1-3.46 0'],
  help: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01'],
  check: ['M20 6 9 17l-5-5'],
  alert: ['M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z', 'M12 9v4', 'M12 17h.01'],
  clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 6v6l4 2'],
  info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z', 'M12 16v-4', 'M12 8h.01'],
  shield: ['M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z'],
  calendar: ['M8 2v4', 'M16 2v4', 'M3 10h18', 'M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z'],
  user: ['M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z'],
  eye: ['M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  eyeOff: ['M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94', 'M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19', 'M1 1l22 22'],
};

/**
 * Render untrusted text or lightweight markdown-like lines (headings, bullet lists, paragraphs)
 * purely via DOM nodes and textContent. Never parses HTML or allows executable markup.
 */
export function renderSafeProse(rawText) {
  const container = el('div', { className: 'prose' });
  const text = String(rawText ?? '').replace(/\r\n/g, '\n').trim();
  if (!text) {
    container.appendChild(el('p', { className: 'muted' }, 'No content provided.'));
    return container;
  }

  const lines = text.split('\n');
  let listEl = null;

  const flushList = () => {
    if (listEl) {
      container.appendChild(listEl);
      listEl = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (line.startsWith('### ')) {
      flushList();
      container.appendChild(el('h3', {}, line.slice(4)));
    } else if (line.startsWith('## ')) {
      flushList();
      container.appendChild(el('h2', {}, line.slice(3)));
    } else if (line.startsWith('# ')) {
      flushList();
      container.appendChild(el('h2', {}, line.slice(2)));
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!listEl) listEl = el('ul');
      listEl.appendChild(el('li', {}, line.slice(2)));
    } else {
      flushList();
      container.appendChild(el('p', {}, line));
    }
  }
  flushList();
  return container;
}

/**
 * Announce non-blocking status messages politely via centralized live region.
 */
export function announceStatus(message) {
  const region = document.getElementById('sr-status-polite');
  if (!region) return;
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = String(message ?? '');
  }, 30);
}

/**
 * Announce critical alert messages assertively via centralized live region.
 */
export function announceAssertive(message) {
  const region = document.getElementById('sr-status-assertive');
  if (!region) return;
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = String(message ?? '');
  }, 30);
}
