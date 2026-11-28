import { createIcon } from '../components/icons.js';

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

/**
 * Append children to a parent node while safely skipping null, undefined, and false
 * (prevents raw Element.append() from converting null into literal "null" text).
 */
export function safeAppend(parent, ...children) {
  return appendChildren(parent, children);
}

export function clear(node) {
  node.replaceChildren();
  return node;
}

/**
 * Backward-compatible SVG icon helper delegating to components/icons.js.
 */
export function svgIcon(name, options = {}) {
  return createIcon(name, options);
}

/**
 * Render untrusted text or lightweight markdown-like lines (headings, bullet lists, paragraphs)
 * purely via DOM nodes and textContent. Never parses HTML or allows executable markup.
 */
export function renderSafeProse(rawText, { className = 'prose' } = {}) {
  const container = el('div', { className });
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
