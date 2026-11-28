import { apiRequest } from './client.js';

export function listHelpArticles({ q, categoryId, page = 0, pageSize = 25, signal } = {}) {
  return apiRequest('/help/articles', {
    method: 'GET',
    query: { q, categoryId, page, pageSize },
    signal,
  });
}

export function createHelpArticle(input) {
  return apiRequest('/help/articles', {
    method: 'POST',
    body: input,
  });
}

export function getHelpArticle(articleId, { signal } = {}) {
  return apiRequest(`/help/articles/${encodeURIComponent(articleId)}`, {
    method: 'GET',
    signal,
  });
}

export function updateHelpArticle(articleId, input) {
  return apiRequest(`/help/articles/${encodeURIComponent(articleId)}`, {
    method: 'PATCH',
    body: input,
  });
}
