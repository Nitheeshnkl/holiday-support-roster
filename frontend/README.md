# Holiday Support Roster — Frontend

HTML5, CSS3, and Vanilla JavaScript ES Modules client implementing Document 08 (`docs/08_FRONTEND_ARCHITECTURE_AND_UI_UX_SPECIFICATION.md`) against OpenAPI v3.0.0 (`docs/openapi.yaml`, `/api/v2`).

## Architecture

`Screen / Feature -> API Service (frontend/js/api/*.js) -> API Client (frontend/js/api/client.js) -> Real fetch() OR Development Mock Adapter (frontend/js/api/mock-adapter.js)`

Screens contain **no** mock-specific branching.

## Production Mode (Default)

By default, `mockMode` is `false`. The application requires a runtime API base URL via either:
- `<meta name="roster-api-base-url" content="https://...">` (or `/` for same-origin), or
- `window.__ROSTER_CONFIG__ = { apiBaseUrl: '...' }`.

If no API base URL is provided and `mockMode` is not explicitly enabled, startup is blocked with `ConfigurationError`.

## Local Preview (Development Mock Mode)

1. Start the local preview server (binds strictly to `127.0.0.1` with SPA fallback):
   ```bash
   node frontend/dev-preview.mjs
   ```
2. Open the explicit mock-mode preview URL in your browser:
   ```
   http://127.0.0.1:4173/?mock=1
   ```
   *(Opening `http://127.0.0.1:4173/` without `?mock=1` keeps `mockMode` disabled by default and shows the configuration-required screen unless an `apiBaseUrl` is supplied.)*

### Other ways to activate mock mode (localhost only)
- Runtime global: `window.__ROSTER_CONFIG__ = { mockMode: true };`
- Meta tag: `<meta name="roster-mock-mode" content="true">`
- Query parameter: `?mock=1` or `?mockMode=true`

### Production Safeguards
- `mockMode` defaults to `false` and never activates silently.
- `loadConfig()` throws `ConfigurationError` if `mockMode` is enabled on any non-local hostname (anything other than `localhost`, `127.0.0.1`, `[::1]`, `::1`, or `*.local`) or combined with a non-local `apiBaseUrl`.
- Mock state lives strictly in memory (`frontend/js/api/mock-adapter.js`) and never persists credentials or session data to `localStorage` or `sessionStorage`.

### Switching to Real Backend
- Remove `?mock=1` / `mockMode: true` and provide `apiBaseUrl` (e.g., `'/'` or `'http://localhost:8080'`). No screen or feature code changes are needed.

## Running Tests

```bash
node --test frontend/tests/frontend.test.mjs
```
