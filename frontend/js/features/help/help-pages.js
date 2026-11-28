import { el, clear, renderSafeProse } from '../../utils/dom.js';
import { formatDateTimeUtc } from '../../utils/date.js';
import { bindFormValidation, applyServerFieldErrors, clearServerFieldErrors } from '../../utils/validation.js';
import { createAlert, createEmptyState, createSkeleton, showToast } from '../../components/alert.js';
import { createField } from '../../components/form-controls.js';
import { createDataTable } from '../../components/data-table.js';
import { createPagination } from '../../components/pagination.js';
import { createStatusBadge } from '../../components/status-badge.js';
import { hasPermission } from '../../state/session-store.js';
import * as helpApi from '../../api/help.js';
import { isAbortError } from '../../api/errors.js';

export async function renderHelpCentrePage({ container, query, navigate, signal }) {
  let q = query?.get('q') || '';
  let categoryId = query?.get('categoryId') || '';
  let page = 0;
  let pageSize = 25;

  const canManage = hasPermission('HELP.MANAGE');
  const resultsHost = el('div', { className: 'stack' });
  const filterHost = el('div', { className: 'stack-sm' });

  container.append(
    el(
      'div',
      { className: 'page-header' },
      el(
        'div',
        { className: 'page-header__title-group' },
        el('h1', { id: 'main-heading', tabindex: '-1' }, 'Help Centre'),
        el('p', { className: 'muted' }, 'Search role-visible published guides, workflow rules, and FAQs.')
      ),
      canManage
        ? el(
            'div',
            { className: 'page-header__actions' },
            el(
              'a',
              {
                href: '/help/manage/new',
                className: 'btn btn-primary',
                onClick: (e) => {
                  e.preventDefault();
                  navigate('/help/manage/new');
                },
              },
              'Create help article'
            )
          )
        : null
    ),
    filterHost,
    resultsHost
  );

  let categories = [];

  const renderSearchBar = () => {
    clear(filterHost);
    const searchInput = createField({
      name: 'q',
      label: 'Search articles',
      type: 'search',
      value: q,
      maxlength: 200,
      autocorrect: 'off',
      spellcheck: 'false',
    });
    const catSelect = createField({
      name: 'categoryId',
      label: 'Category',
      type: 'select',
      value: categoryId,
      options: [
        { value: '', label: 'All categories' },
        ...categories.map((c) => ({ value: String(c.id), label: c.name })),
      ],
    });
    const form = el(
      'form',
      { className: 'filter-bar', method: 'GET' },
      searchInput,
      catSelect,
      el('button', { type: 'submit', className: 'btn btn-primary' }, 'Search')
    );
    form.addEventListener(
      'submit',
      (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        q = String(fd.get('q') || '').trim();
        categoryId = String(fd.get('categoryId') || '');
        page = 0;
        load();
      },
      { signal }
    );
    filterHost.appendChild(el('search', {}, form));
  };

  const load = async () => {
    clear(resultsHost);
    resultsHost.appendChild(createSkeleton({ rows: 4, label: 'Loading help articles…' }));
    try {
      const data = await helpApi.listHelpArticles({
        q: q || undefined,
        categoryId: categoryId || undefined,
        page,
        pageSize,
        signal,
      });
      if (signal?.aborted) return;
      categories = Array.isArray(data?.categories) ? data.categories : categories;
      renderSearchBar();

      clear(resultsHost);
      const items = data?.items || [];
      if (!items.length) {
        resultsHost.appendChild(
          createEmptyState({
            title: 'No matching help articles',
            description: q || categoryId
              ? 'Try clearing your search query or selecting a different category.'
              : 'No published help articles are currently available for your role.',
            actionLabel: q || categoryId ? 'Clear filters' : '',
            onAction: () => {
              q = '';
              categoryId = '';
              page = 0;
              load();
            },
          })
        );
        return;
      }

      resultsHost.appendChild(
        createDataTable({
          caption: 'Help articles',
          columns: [
            {
              key: 'title',
              label: 'Title',
              isRowHeader: true,
              render: (a) =>
                el(
                  'a',
                  {
                    href: `/help/${a.id}`,
                    onClick: (e) => {
                      e.preventDefault();
                      navigate(`/help/${a.id}`);
                    },
                  },
                  a.title
                ),
            },
            { key: 'categoryName', label: 'Category', render: (a) => a.categoryName || '—' },
            { key: 'summary', label: 'Summary', render: (a) => a.summary || '—' },
            {
              key: 'publicationStatus',
              label: 'Status',
              render: (a) => createStatusBadge(a.publicationStatus || 'PUBLISHED'),
            },
            {
              key: 'actions',
              label: 'Actions',
              render: (a) =>
                canManage
                  ? el(
                      'a',
                      {
                        href: `/help/manage/${a.id}/edit`,
                        className: 'btn btn-secondary btn-sm',
                        onClick: (e) => {
                          e.preventDefault();
                          navigate(`/help/manage/${a.id}/edit`);
                        },
                      },
                      'Edit'
                    )
                  : '—',
            },
          ],
          rows: items,
        })
      );

      resultsHost.appendChild(
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
      clear(resultsHost);
      resultsHost.appendChild(
        createAlert({
          variant: 'error',
          title: 'Failed to load Help Centre',
          message: err.message,
          correlationId: err.correlationId,
          actionLabel: 'Retry',
          onAction: load,
        })
      );
    }
  };

  renderSearchBar();
  await load();
}

export async function renderHelpArticleDetailPage({ container, params, navigate, signal }) {
  const canManage = hasPermission('HELP.MANAGE');
  const host = el('div', { className: 'stack' });
  host.appendChild(createSkeleton({ rows: 5, label: 'Loading help article…' }));
  container.appendChild(host);

  try {
    const article = await helpApi.getHelpArticle(params.articleId, { signal });
    if (signal?.aborted) return;
    clear(host);

    host.append(
      el(
        'div',
        { className: 'page-header' },
        el(
          'div',
          { className: 'page-header__title-group' },
          el('h1', { id: 'main-heading', tabindex: '-1' }, article.title),
          el(
            'div',
            { className: 'cluster' },
            createStatusBadge(article.publicationStatus || 'PUBLISHED'),
            el('span', { className: 'muted' }, `${article.categoryName || 'General'} · Version ${article.versionNumber ?? 1}`),
            article.publishedAtUtc
              ? el('span', { className: 'muted' }, `Published ${formatDateTimeUtc(article.publishedAtUtc)}`)
              : null
          )
        ),
        canManage
          ? el(
              'div',
              { className: 'page-header__actions' },
              el(
                'a',
                {
                  href: `/help/manage/${article.id}/edit`,
                  className: 'btn btn-secondary',
                  onClick: (e) => {
                    e.preventDefault();
                    navigate(`/help/manage/${article.id}/edit`);
                  },
                },
                'Edit article'
              )
            )
          : null
      ),
      article.summary ? el('p', { className: 'muted' }, article.summary) : null,
      el(
        'article',
        { className: 'panel' },
        renderSafeProse(article.content)
      )
    );
  } catch (err) {
    if (isAbortError(err)) return;
    clear(host);
    host.append(
      el('h1', { id: 'main-heading', tabindex: '-1' }, 'Help article unavailable'),
      createAlert({
        variant: 'error',
        title: 'Unable to load article',
        message: err.message,
        correlationId: err.correlationId,
      })
    );
  }
}

export async function renderHelpManagePage({ container, params, navigate, signal }) {
  const isEdit = Boolean(params?.articleId);
  const host = el('div', { className: 'stack' });
  host.appendChild(createSkeleton({ rows: 6, label: 'Loading help editor…' }));
  container.appendChild(host);

  try {
    const [listData, existing] = await Promise.all([
      helpApi.listHelpArticles({ page: 0, pageSize: 1, signal }),
      isEdit ? helpApi.getHelpArticle(params.articleId, { signal }) : Promise.resolve(null),
    ]);
    if (signal?.aborted) return;
    clear(host);

    const categories = Array.isArray(listData?.categories) ? listData.categories : [];
    const errorBox = el('div', { className: 'stack-sm' });
    const previewBox = el(
      'div',
      { className: 'panel', 'aria-labelledby': 'help-preview-heading' },
      el('h2', { id: 'help-preview-heading' }, 'Safe content preview (text rendering only)'),
      renderSafeProse(existing?.content || '')
    );

    const roleCheckboxes = ['ADMIN', 'TEAM_LEAD', 'MEMBER'].map((roleCode) => {
      const checked = Array.isArray(existing?.visibleRoleCodes)
        ? existing.visibleRoleCodes.includes(roleCode)
        : true;
      return createField({
        name: 'visibleRoleCodes',
        type: 'checkbox',
        label: roleCode,
        checked,
      });
    });
    roleCheckboxes.forEach((wrapper, idx) => {
      const input = wrapper.querySelector('input');
      if (input) input.value = ['ADMIN', 'TEAM_LEAD', 'MEMBER'][idx];
    });

    const contentField = createField({
      name: 'content',
      label: 'Article content',
      type: 'textarea',
      value: existing?.content || '',
      required: true,
      maxlength: 20000,
      rows: 10,
      fullWidth: true,
      hint: 'Plain text or simple headings (# / ##) and bullet lists (- ). Raw HTML is never executed.',
    });

    const contentTextarea = contentField.querySelector('textarea');
    contentTextarea?.addEventListener(
      'input',
      () => {
        const heading = previewBox.querySelector('h2');
        previewBox.replaceChildren(heading, renderSafeProse(contentTextarea.value));
      },
      { signal }
    );

    const submitBtn = el(
      'button',
      { type: 'submit', className: 'btn btn-primary' },
      isEdit ? 'Save new version' : 'Create article'
    );

    const form = el(
      'form',
      { className: 'panel stack', novalidate: true },
      errorBox,
      el(
        'div',
        { className: 'form-grid' },
        createField({
          name: 'title',
          label: 'Title',
          value: existing?.title || '',
          required: true,
          maxlength: 200,
          fullWidth: true,
        }),
        createField({
          name: 'categoryId',
          label: 'Category',
          type: categories.length ? 'select' : 'number',
          value: existing?.categoryId != null ? String(existing.categoryId) : (categories[0]?.id != null ? String(categories[0].id) : ''),
          required: true,
          options: categories.map((c) => ({ value: String(c.id), label: c.name })),
        }),
        createField({
          name: 'publicationStatus',
          label: 'Publication status',
          type: 'select',
          value: existing?.publicationStatus || 'DRAFT',
          required: true,
          options: [
            { value: 'DRAFT', label: 'Draft (admin-only)' },
            { value: 'PUBLISHED', label: 'Published (role-visible)' },
            { value: 'RETIRED', label: 'Retired' },
          ],
        }),
        createField({
          name: 'summary',
          label: 'Summary',
          type: 'textarea',
          value: existing?.summary || '',
          maxlength: 1000,
          rows: 2,
          fullWidth: true,
        }),
        el(
          'fieldset',
          { className: 'field-group field--full' },
          el('legend', {}, 'Visible roles'),
          el('div', { className: 'cluster' }, roleCheckboxes)
        ),
        contentField
      ),
      el(
        'div',
        { className: 'cluster' },
        submitBtn,
        el(
          'a',
          {
            href: '/help',
            className: 'btn btn-secondary',
            onClick: (e) => {
              e.preventDefault();
              navigate('/help');
            },
          },
          'Cancel'
        )
      )
    );

    host.append(
      el(
        'div',
        { className: 'page-header' },
        el(
          'h1',
          { id: 'main-heading', tabindex: '-1' },
          isEdit ? `Edit help article #${existing.id}` : 'Create help article'
        )
      ),
      form,
      previewBox
    );

    bindFormValidation(form, {
      signal,
      onSubmitValid: async (formData) => {
        clearServerFieldErrors(form);
        clear(errorBox);
        const selectedRoles = Array.from(
          form.querySelectorAll('input[name="visibleRoleCodes"]:checked')
        ).map((cb) => cb.value);

        if (!selectedRoles.length) {
          errorBox.appendChild(
            createAlert({
              variant: 'error',
              title: 'Select at least one visible role',
              message: 'Choose which application roles may read this article.',
            })
          );
          return;
        }

        const payload = {
          title: String(formData.get('title') || '').trim(),
          summary: String(formData.get('summary') || '').trim(),
          categoryId: Number(formData.get('categoryId')),
          visibleRoleCodes: selectedRoles,
          content: String(formData.get('content') || ''),
          publicationStatus: String(formData.get('publicationStatus') || 'DRAFT'),
        };

        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving…';
        try {
          const saved = isEdit
            ? await helpApi.updateHelpArticle(existing.id, payload)
            : await helpApi.createHelpArticle(payload);
          showToast(isEdit ? 'Help article updated.' : 'Help article created.', {
            variant: 'success',
          });
          navigate(`/help/${saved.id}`);
        } catch (err) {
          applyServerFieldErrors(form, err.fieldErrors);
          errorBox.appendChild(
            createAlert({
              variant: 'error',
              title: 'Save failed',
              message: err.message,
              correlationId: err.correlationId,
            })
          );
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = isEdit ? 'Save new version' : 'Create article';
        }
      },
    });
  } catch (err) {
    if (isAbortError(err)) return;
    clear(host);
    host.append(
      el('h1', { id: 'main-heading', tabindex: '-1' }, 'Help editor unavailable'),
      createAlert({
        variant: 'error',
        title: 'Unable to load help article',
        message: err.message,
        correlationId: err.correlationId,
      })
    );
  }
}
