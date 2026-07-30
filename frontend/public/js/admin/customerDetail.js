import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatDate, formatIDR, statusBadge } from '../components/helpers.js';

export default {
  async render(el, params) {
    setPageTitle('Customer Detail');
    el.innerHTML = `<div class="page-spinner"><div class="spinner"></div></div>`;
    try {
      const { customer, summary } = await api.customers.detail(params.id);
      const user = customer;
      setPageTitle(user.full_name || user.username);
      const totalSpend    = parseFloat(summary?.total_spent   || 0);
      const totalBookings = parseInt(summary?.total_bookings  || 0);
      const bookingSummary = []; // kept for template compat — summary is a single object not array

      el.innerHTML = `
        <div class="page-header">
          <div class="page-header-left">
            <div class="breadcrumb"><a href="#/admin/customers">Customers</a><span class="breadcrumb-sep">/</span><span>${user.full_name||user.username}</span></div>
            <h2>${user.full_name || user.username}</h2>
          </div>
          <div class="page-header-actions">
            <button class="btn ${user.is_active?'btn-danger':'btn-success'} btn-sm" id="toggle-btn">
              ${user.is_active ? 'Deactivate' : 'Activate'} Account
            </button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:300px 1fr;gap:16px;align-items:start">
          <div>
            <div class="card" style="text-align:center;margin-bottom:16px">
              <div style="width:72px;height:72px;border-radius:50%;background:var(--accent-subtle);display:flex;align-items:center;justify-content:center;font-size:1.75rem;font-weight:700;color:var(--accent);margin:0 auto 12px">${(user.full_name||user.username||'?')[0].toUpperCase()}</div>
              <div style="font-weight:700;font-size:1.0625rem">${user.full_name||'—'}</div>
              <div style="color:var(--text-tertiary);font-size:.8125rem;margin-bottom:8px">@${user.username}</div>
              ${user.is_active ? '<span class="badge badge-success badge-dot">Active</span>' : '<span class="badge badge-danger badge-dot">Inactive</span>'}
            </div>
            <div class="card">
              <div class="card-header"><span class="card-title">Profile</span></div>
              ${[
                ['Email',    `<a href="mailto:${user.email}" style="color:var(--accent)">${user.email}</a>`],
                ['Phone',    user.phone || '—'],
                ['City',     user.city || '—'],
                ['Province', user.province || '—'],
                ['Joined',   formatDate(user.created_at, {day:'2-digit',month:'short',year:'numeric'})],
                ['Last Login', user.last_login_at ? formatDate(user.last_login_at, {dateStyle:'medium'}) : 'Never'],
              ].map(([l,v]) => `
                <div class="info-row">
                  <span class="info-label">${l}</span>
                  <span class="info-value">${v}</span>
                </div>`).join('')}
            </div>
          </div>

          <div>
            <div class="stat-grid" style="margin-bottom:16px">
              <div class="stat-card">
                <div class="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg></div>
                <div class="stat-info"><div class="stat-label">Total Bookings</div><div class="stat-value">${totalBookings}</div></div>
              </div>
              <div class="stat-card">
                <div class="stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg></div>
                <div class="stat-info"><div class="stat-label">Total Spend</div><div class="stat-value" style="font-size:1.1rem">${formatIDR(totalSpend)}</div></div>
              </div>
              ${bookingSummary.map(r => `
                <div class="stat-card">
                  <div class="stat-icon ${r.status==='completed'?'green':r.status==='cancelled'?'red':'yellow'}">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>
                  </div>
                  <div class="stat-info">
                    <div class="stat-label">${r.status}</div>
                    <div class="stat-value">${r.count}</div>
                    <div class="stat-sub">${formatIDR(r.total)}</div>
                  </div>
                </div>`).join('')}
            </div>
          </div>
        </div>`;

      document.getElementById('toggle-btn')?.addEventListener('click', async () => {
        if (!await window.modal.confirm({ title: user.is_active ? 'Deactivate account?' : 'Activate account?', okClass: user.is_active ? 'btn-danger' : 'btn-success' })) return;
        if (user.is_active) await api.customers.deactivate(user.id);
        else await api.customers.activate(user.id);
        window.toast.success('Updated'); window.location.reload();
      });
    } catch (err) {
      el.innerHTML = `<div class="empty-state" style="padding:80px"><span class="empty-icon">⚠️</span><div class="empty-title">${err.message}</div></div>`;
    }
  },
};
