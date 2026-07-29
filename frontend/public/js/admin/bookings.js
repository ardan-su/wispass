import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatIDR, formatDate, statusBadge, paginationHTML, bindPagination, debounce, emptyState, qs, skeletonRows } from '../components/helpers.js';

let state = { page: 1, search: '', status: '' };

export default {
  async render(el) {
    setPageTitle('Bookings');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="breadcrumb"><span>Admin</span><span class="breadcrumb-sep">/</span><span>Bookings</span></div>
          <h2>Bookings</h2>
        </div>
      </div>

      <div class="filter-bar">
        <div class="search-wrapper" style="flex:1;max-width:320px">
          <span class="search-icon"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg></span>
          <input class="form-control" id="search" placeholder="Search by code, customer…" value="${state.search}" aria-label="Search bookings" />
        </div>
        <select class="form-control" id="status-filter" style="max-width:160px" aria-label="Filter by status">
          <option value="">All Status</option>
          ${['pending','confirmed','completed','cancelled','refunded'].map(s => `<option value="${s}" ${state.status===s?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`).join('')}
        </select>
      </div>

      <div class="card" style="padding:0;overflow:hidden">
        <div id="table-area"></div>
      </div>
      <div id="pagination"></div>`;

    document.getElementById('search').addEventListener('input',
      debounce(e => { state.search = e.target.value; state.page = 1; this.load(); }, 380));
    document.getElementById('status-filter').addEventListener('change', e => { state.status = e.target.value; state.page = 1; this.load(); });
    await this.load();
  },

  async load() {
    const area = document.getElementById('table-area');
    area.innerHTML = `<div class="table-wrapper" style="border:none;border-radius:0"><table><thead><tr>
      <th>Code</th><th>Customer</th><th>Attraction</th><th>Visit Date</th><th>Amount</th><th>Status</th><th>Payment</th><th>Actions</th>
    </tr></thead><tbody>${skeletonRows(8, 6)}</tbody></table></div>`;
    try {
      const q = qs({ page: state.page, limit: 10, search: state.search, status: state.status });
      const res = await api.bookings.list(q);
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
      area.innerHTML = emptyState('📋', 'No bookings', 'Bookings will appear here once customers make reservations.');
      return;
    }
    area.innerHTML = `
      <div class="table-wrapper" style="border:none;border-radius:0">
        <table aria-label="Bookings list">
          <thead><tr>
            <th>Code</th><th>Customer</th><th>Attraction</th>
            <th>Visit Date</th><th>Amount</th><th>Status</th><th>Payment</th><th>Actions</th>
          </tr></thead>
          <tbody>${rows.map(b => `
            <tr>
              <td><span style="font-family:var(--font-mono);font-size:.78rem;font-weight:600;background:var(--bg-secondary);padding:3px 7px;border-radius:4px;color:var(--text-primary)">${b.booking_code}</span></td>
              <td>
                <div style="font-weight:500;font-size:.875rem">${b.customer_name}</div>
                <div style="font-size:.72rem;color:var(--text-tertiary)">${b.customer_email}</div>
              </td>
              <td style="font-size:.8125rem;max-width:160px"><div class="truncate">${b.attraction_name}</div></td>
              <td style="font-size:.8125rem;white-space:nowrap">${formatDate(b.visit_date, {day:'2-digit',month:'short',year:'numeric'})}</td>
              <td style="font-weight:600;font-size:.875rem;white-space:nowrap">${formatIDR(b.total_amount)}</td>
              <td>${statusBadge(b.status)}</td>
              <td>${statusBadge(b.payment_status || b.payment_status_val || 'unpaid')}</td>
              <td>
                <div class="table-actions">
                  <a href="#/admin/bookings/${b.id}" class="btn btn-ghost btn-sm" style="color:var(--accent)" aria-label="View booking ${b.booking_code}">View →</a>
                  ${b.status==='pending' ? `<button class="btn btn-success btn-sm confirm-btn" data-id="${b.id}" aria-label="Confirm booking">✓</button>` : ''}
                  ${['pending','confirmed'].includes(b.status) ? `<button class="btn btn-ghost btn-sm cancel-btn" data-id="${b.id}" style="color:var(--danger)" aria-label="Cancel booking">✕</button>` : ''}
                </div>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    area.querySelectorAll('.confirm-btn').forEach(btn => btn.addEventListener('click', async () => {
      if (!await window.modal.confirm({ title: 'Confirm booking?', okText: 'Confirm', okClass: 'btn-success', icon: '✅' })) return;
      try { await api.bookings.confirm(btn.dataset.id); window.toast.success('Confirmed'); this.load(); }
      catch (e) { window.toast.error('Error', e.message); }
    }));
    area.querySelectorAll('.cancel-btn').forEach(btn => btn.addEventListener('click', async () => {
      if (!await window.modal.confirm({ title: 'Cancel booking?', message: 'This will cancel all tickets for this booking.', okText: 'Cancel Booking', okClass: 'btn-danger' })) return;
      try { await api.bookings.cancel(btn.dataset.id); window.toast.success('Cancelled'); this.load(); }
      catch (e) { window.toast.error('Error', e.message); }
    }));
  },
};
