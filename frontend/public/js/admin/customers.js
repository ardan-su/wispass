import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatDate, paginationHTML, bindPagination, debounce, emptyState, qs, skeletonRows } from '../components/helpers.js';

let state = { page: 1, search: '' };

export default {
  async render(el) {
    setPageTitle('Customers');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="breadcrumb"><span>Admin</span><span class="breadcrumb-sep">/</span><span>Customers</span></div>
          <h2>Customers</h2>
        </div>
      </div>
      <div class="filter-bar">
        <div class="search-wrapper" style="flex:1;max-width:320px">
          <span class="search-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
          <input class="form-control" id="search" placeholder="Search by name, email…" value="${state.search}" aria-label="Search customers" />
        </div>
      </div>
      <div class="card" style="padding:0;overflow:hidden"><div id="table-area"></div></div>
      <div id="pagination"></div>`;

    document.getElementById('search').addEventListener('input',
      debounce(e => { state.search = e.target.value; state.page = 1; this.load(); }, 380));
    await this.load();
  },

  async load() {
    const area = document.getElementById('table-area');
    area.innerHTML = `<div class="table-wrapper" style="border:none;border-radius:0"><table><thead><tr>
      <th>Customer</th><th>Username</th><th>Phone</th><th>Joined</th><th>Status</th><th>Actions</th>
    </tr></thead><tbody>${skeletonRows(6, 5)}</tbody></table></div>`;
    try {
      const res = await api.customers.list(qs({ page: state.page, limit: 15, search: state.search }));
      this.renderTable(area, res.data);
      const pag = document.getElementById('pagination');
      pag.innerHTML = paginationHTML(res.pagination, p => { state.page = p; this.load(); });
      bindPagination(pag, p => { state.page = p; this.load(); });
    } catch (err) { area.innerHTML = emptyState('⚠️', err.message, ''); }
  },

  renderTable(area, rows) {
    if (!rows.length) { area.innerHTML = emptyState('👥', 'No customers', 'Customers will appear after they register.'); return; }
    area.innerHTML = `
      <div class="table-wrapper" style="border:none;border-radius:0">
        <table aria-label="Customers list"><thead><tr>
          <th>Customer</th><th>Username</th><th>Phone</th><th>Joined</th><th>Status</th><th>Actions</th>
        </tr></thead>
        <tbody>${rows.map(u => `
          <tr>
            <td>
              <div style="display:flex;align-items:center;gap:10px">
                <div style="width:34px;height:34px;border-radius:50%;background:var(--accent-subtle);display:flex;align-items:center;justify-content:center;font-size:.8rem;font-weight:700;color:var(--accent);flex-shrink:0;text-transform:uppercase">${(u.full_name||u.username||'?')[0]}</div>
                <div>
                  <div style="font-weight:500;font-size:.875rem">${u.full_name || '—'}</div>
                  <div style="font-size:.72rem;color:var(--text-tertiary)">${u.email}</div>
                </div>
              </div>
            </td>
            <td style="font-size:.8125rem;color:var(--text-secondary)">@${u.username}</td>
            <td style="font-size:.8125rem">${u.phone || '—'}</td>
            <td style="font-size:.8rem;color:var(--text-tertiary);white-space:nowrap">${formatDate(u.created_at, {day:'2-digit',month:'short',year:'numeric'})}</td>
            <td>${u.is_active ? '<span class="badge badge-success badge-dot">Active</span>' : '<span class="badge badge-danger badge-dot">Inactive</span>'}</td>
            <td>
              <div class="table-actions">
                <a href="#/admin/customers/${u.id}" class="btn btn-ghost btn-sm" style="color:var(--accent)">View</a>
                <button class="btn btn-ghost btn-sm toggle-btn" data-id="${u.id}" data-active="${u.is_active}"
                  style="color:${u.is_active?'var(--danger)':'var(--success)'}">
                  ${u.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </td>
          </tr>`).join('')}
        </tbody></table>
      </div>`;

    area.querySelectorAll('.toggle-btn').forEach(btn => btn.addEventListener('click', async () => {
      const deact = btn.dataset.active === 'true';
      if (!await window.modal.confirm({ title: deact ? 'Deactivate customer?' : 'Activate customer?', okText: deact ? 'Deactivate' : 'Activate', okClass: deact ? 'btn-danger' : 'btn-success' })) return;
      try {
        if (deact) await api.customers.deactivate(btn.dataset.id);
        else       await api.customers.activate(btn.dataset.id);
        window.toast.success('Updated'); this.load();
      } catch (e) { window.toast.error('Error', e.message); }
    }));
  },
};
