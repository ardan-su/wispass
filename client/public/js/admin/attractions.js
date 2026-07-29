import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatIDR, statusBadge, paginationHTML, bindPagination, debounce, emptyState, qs, CAT_ICONS, catLabel, skeletonRows } from '../components/helpers.js';

let state = { page: 1, search: '', category: '', isActive: '' };

export default {
  async render(el) {
    setPageTitle('Attractions');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="breadcrumb"><span>Admin</span><span class="breadcrumb-sep">/</span><span>Attractions</span></div>
          <h2>Attractions</h2>
        </div>
        <div class="page-header-actions">
          <a href="#/admin/attractions/new" class="btn btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Add Attraction
          </a>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-wrapper" style="flex:1;max-width:320px">
          <span class="search-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input class="form-control" id="search" placeholder="Search attractions…" value="${state.search}" aria-label="Search attractions" />
        </div>
        <select class="form-control" id="cat-filter" style="max-width:180px" aria-label="Filter by category">
          <option value="">All Categories</option>
          ${Object.entries(CAT_ICONS).map(([k,v]) => `<option value="${k}" ${state.category===k?'selected':''}>${v} ${catLabel(k)}</option>`).join('')}
        </select>
        <select class="form-control" id="active-filter" style="max-width:140px" aria-label="Filter by status">
          <option value="">All Status</option>
          <option value="true"  ${state.isActive==='true' ?'selected':''}>Active</option>
          <option value="false" ${state.isActive==='false'?'selected':''}>Inactive</option>
        </select>
      </div>

      <div class="card" style="padding:0;overflow:hidden">
        <div id="table-area"></div>
      </div>
      <div id="pagination"></div>`;

    document.getElementById('search').addEventListener('input',
      debounce(e => { state.search = e.target.value; state.page = 1; this.load(); }, 380));
    document.getElementById('cat-filter').addEventListener('change',  e => { state.category = e.target.value; state.page = 1; this.load(); });
    document.getElementById('active-filter').addEventListener('change', e => { state.isActive = e.target.value; state.page = 1; this.load(); });
    await this.load();
  },

  async load() {
    const area = document.getElementById('table-area');
    area.innerHTML = `<div class="table-wrapper" style="border:none;border-radius:0"><table><thead><tr>
      <th>Attraction</th><th>Category</th><th>Location</th><th>Price from</th><th>Rating</th><th>Status</th><th>Actions</th>
    </tr></thead><tbody>${skeletonRows(7, 6)}</tbody></table></div>`;

    try {
      const q = qs({ page: state.page, limit: 10, search: state.search, category: state.category, isActive: state.isActive });
      const res = await api.attractions.adminList(q);
      this.renderTable(area, res.data);
      const pag = document.getElementById('pagination');
      pag.innerHTML = paginationHTML(res.pagination, p => { state.page = p; this.load(); });
      bindPagination(pag, p => { state.page = p; this.load(); });
    } catch (err) {
      area.innerHTML = emptyState('⚠️', 'Failed to load', err.message);
    }
  },

  renderTable(area, rows) {
    if (!rows.length) {
      area.innerHTML = emptyState('🏝️', 'No attractions found', 'Create your first attraction to get started.',
        `<a href="#/admin/attractions/new" class="btn btn-primary">Add Attraction</a>`);
      return;
    }
    area.innerHTML = `
      <div class="table-wrapper" style="border:none;border-radius:0">
        <table role="table" aria-label="Attractions list">
          <thead><tr>
            <th>Attraction</th><th>Category</th><th>Location</th>
            <th>Price from</th><th>Rating</th><th>Status</th><th>Actions</th>
          </tr></thead>
          <tbody>
            ${rows.map(a => `
            <tr>
              <td>
                <div style="display:flex;align-items:center;gap:11px">
                  <div style="width:38px;height:38px;border-radius:var(--radius-sm);background:var(--accent-subtle);display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0">${CAT_ICONS[a.category]||'🏝️'}</div>
                  <div>
                    <div style="font-weight:600;font-size:.875rem">${a.name}</div>
                    ${a.is_featured ? `<span class="badge badge-primary" style="font-size:.62rem">Featured</span>` : ''}
                  </div>
                </div>
              </td>
              <td><span class="badge badge-info">${catLabel(a.category)}</span></td>
              <td style="font-size:.8rem;color:var(--text-tertiary)">${a.city}, ${a.province}</td>
              <td style="font-weight:600;font-size:.875rem">${a.min_price ? formatIDR(a.min_price) : '—'}</td>
              <td>
                <div style="display:flex;align-items:center;gap:4px;font-size:.8rem">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" stroke-width="1" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  <span style="font-weight:500">${parseFloat(a.average_rating||0).toFixed(1)}</span>
                  <span style="color:var(--text-tertiary)">(${a.total_reviews})</span>
                </div>
              </td>
              <td>${a.is_active ? '<span class="badge badge-success badge-dot">Active</span>' : '<span class="badge badge-danger badge-dot">Inactive</span>'}</td>
              <td>
                <div class="table-actions">
                  <a href="#/admin/attractions/${a.id}" class="btn btn-secondary btn-sm" aria-label="Edit ${a.name}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                    Edit
                  </a>
                  <button class="btn btn-ghost btn-sm del-btn" data-id="${a.id}" data-name="${a.name}" aria-label="Delete ${a.name}" style="color:var(--danger)">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    area.querySelectorAll('.del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ok = await window.modal.confirm({
          title: 'Delete attraction?',
          message: `"${btn.dataset.name}" will be permanently deleted along with all its ticket types.`,
          okText: 'Delete', okClass: 'btn-danger', icon: '🗑️',
        });
        if (!ok) return;
        try {
          await api.attractions.delete(btn.dataset.id);
          window.toast.success('Deleted', 'Attraction removed.');
          this.load();
        } catch (e) { window.toast.error('Failed', e.message); }
      });
    });
  },
};
