import { apiRequest } from './client.js';

export function getOnboardingProgress({ signal } = {}) {
  return apiRequest('/onboarding/progress', { method: 'GET', signal });
}

export function updateOnboardingProgress(input) {
  return apiRequest('/onboarding/progress', {
    method: 'PATCH',
    body: input,
  });
}
