import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatIDR, formatDate, statusBadge, paginationHTML, bindPagination, emptyState, qs, skeletonRows } from '../components/helpers.js';

let state = { page: 1, status: '' };

export default {
  async render(el) {
    setPageTitle('My Bookings');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>My Bookings</h2>
          <p style="font-size:.875rem;color:var(--text-secondary);margin-top:2px">Track and manage all your attraction bookings</p>
        </div>
      </div>

      <div class="tabs" id="status-tabs">
        ${[
          ['', 'All'],
          ['pending',   'Pending'],
          ['confirmed', 'Confirmed'],
          ['completed', 'Completed'],
          ['cancelled', 'Cancelled'],
        ].map(([s, l]) => `
          <button class="tab-btn ${state.status === s ? 'active' : ''}" data-status="${s}" type="button">${l}</button>
        `).join('')}
      </div>

      <div id="list-area"></div>
      <div id="pagination"></div>`;

    document.querySelectorAll('#status-tabs .tab-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        document.querySelectorAll('#status-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.status = btn.dataset.status;
        state.page   = 1;
        this.load();
      })
    );
    await this.load();
  },

  async load() {
    const area = document.getElementById('list-area');
    area.innerHTML = [...Array(4)].map(() => `
      <div class="card" style="margin-bottom:10px;display:flex;gap:14px;align-items:center;padding:14px">
        <div class="skeleton" style="width:56px;height:56px;border-radius:var(--radius);flex-shrink:0"></div>
        <div style="flex:1"><div class="skeleton skeleton-title" style="width:50%"></div><div class="skeleton skeleton-text" style="width:35%"></div></div>
        <div class="skeleton skeleton-btn"></div>
      </div>`).join('');

    try {
      const res = await api.bookings.list(qs({ page: state.page, limit: 10, status: state.status }));
      this.renderList(area, res.data);
      const pag = document.getElementById('pagination');
      pag.innerHTML = paginationHTML(res.pagination, p => { state.page = p; this.load(); });
      bindPagination(pag, p => { state.page = p; this.load(); });
    } catch (err) { area.innerHTML = emptyState('⚠️', err.message, ''); }
  },

  renderList(area, rows) {
    if (!rows.length) {
      area.innerHTML = emptyState(
        '📋', 'No bookings yet',
        state.status ? `You have no ${state.status} bookings.` : "You haven't made any bookings yet.",
        `<a href="#/browse" class="btn btn-primary">Browse Attractions</a>`
      );
      return;
    }
    area.innerHTML = rows.map(b => `
      <a href="#/booking/${b.id}" style="display:flex;align-items:center;gap:14px;padding:14px 16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);margin-bottom:10px;text-decoration:none;transition:all var(--t-base);box-shadow:var(--shadow-sm)" class="booking-row">
        <div style="width:52px;height:52px;border-radius:var(--radius);overflow:hidden;flex-shrink:0;background:var(--accent-subtle)">
          ${b.attraction_image
            ? `<img src="${b.attraction_image}" loading="lazy" style="width:100%;height:100%;object-fit:cover" alt="" />`
            : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:1.4rem">🏝️</div>`}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:.9375rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.attraction_name}</div>
          <div style="display:flex;align-items:center;gap:10px;margin-top:3px;flex-wrap:wrap">
            <span style="font-family:var(--font-mono);font-size:.72rem;color:var(--text-tertiary)">${b.booking_code}</span>
            <span style="font-size:.72rem;color:var(--text-tertiary)">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              ${formatDate(b.visit_date, {day:'2-digit',month:'short',year:'numeric'})}
            </span>
          </div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-weight:700;font-size:.9375rem;color:var(--text-primary);margin-bottom:4px">${formatIDR(b.total_amount)}</div>
          ${statusBadge(b.status)}
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-tertiary);flex-shrink:0" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>
      </a>`).join('');

    // hover effect via CSS wasn't in scope, add inline
    document.querySelectorAll('.booking-row').forEach(row => {
      row.addEventListener('mouseenter', () => { row.style.boxShadow = 'var(--shadow-md)'; row.style.borderColor = 'var(--accent-border)'; row.style.transform = 'translateY(-1px)'; });
      row.addEventListener('mouseleave', () => { row.style.boxShadow = 'var(--shadow-sm)'; row.style.borderColor = 'var(--border)'; row.style.transform = ''; });
    });
  },
};
