import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatIDR, formatDate, skeletonRows } from '../components/helpers.js';

export default {
  async render(el) {
    setPageTitle('Reports');
    const today    = new Date().toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30*24*60*60*1000).toISOString().split('T')[0];

    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="breadcrumb"><span>Admin</span><span class="breadcrumb-sep">/</span><span>Reports</span></div>
          <h2>Reports & Analytics</h2>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary btn-sm" id="export-csv-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
            Export CSV
          </button>
          <button class="btn btn-primary btn-sm" id="load-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Load
          </button>
        </div>
      </div>

      <!-- Date range -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;gap:12px;align-items:flex-end;flex-wrap:wrap">
          <div class="form-group" style="margin:0">
            <label class="form-label" for="date-from">From</label>
            <input type="date" class="form-control" id="date-from" value="${monthAgo}" style="width:160px" />
          </div>
          <div class="form-group" style="margin:0">
            <label class="form-label" for="date-to">To</label>
            <input type="date" class="form-control" id="date-to" value="${today}" style="width:160px" />
          </div>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            ${[['7d','Last 7d'],['30d','Last 30d'],['90d','Last 90d']].map(([v,l]) =>
              `<button class="btn btn-ghost btn-sm preset-btn" data-preset="${v}" type="button">${l}</button>`
            ).join('')}
          </div>
        </div>
      </div>

      <!-- Summary stats -->
      <div class="stat-grid" style="margin-bottom:16px" id="summary-stats">
        ${[...Array(3)].map(() => `<div class="stat-card"><div class="skeleton" style="width:42px;height:42px;border-radius:var(--radius);flex-shrink:0"></div><div class="stat-info"><div class="skeleton skeleton-text" style="width:70%"></div><div class="skeleton" style="height:28px;width:55%;border-radius:var(--radius-sm)"></div></div></div>`).join('')}
      </div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab-btn active" data-tab="revenue"     type="button">Revenue</button>
        <button class="tab-btn"        data-tab="visitors"    type="button">Visitors</button>
        <button class="tab-btn"        data-tab="attractions" type="button">Popular Attractions</button>
        <button class="tab-btn"        data-tab="tickets"     type="button">Ticket Sales</button>
      </div>

      <div id="tab-revenue"><div id="revenue-table"></div></div>
      <div id="tab-visitors"    style="display:none"><div id="visitors-table"></div></div>
      <div id="tab-attractions" style="display:none"><div id="attractions-table"></div></div>
      <div id="tab-tickets"     style="display:none"><div id="tickets-table"></div></div>`;

    // Tab switching
    el.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        ['revenue','visitors','attractions','tickets'].forEach(t => {
          const p = document.getElementById(`tab-${t}`);
          if (p) p.style.display = btn.dataset.tab === t ? 'block' : 'none';
        });
      });
    });

    // Preset buttons
    el.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const days = parseInt(btn.dataset.preset);
        const from = new Date(Date.now() - days*24*60*60*1000).toISOString().split('T')[0];
        document.getElementById('date-from').value = from;
        document.getElementById('date-to').value   = new Date().toISOString().split('T')[0];
        this.load();
      });
    });

    document.getElementById('load-btn').addEventListener('click', () => this.load());
    document.getElementById('export-csv-btn').addEventListener('click', () => this.exportCSV());
    await this.load();
  },

  async load() {
    const from = document.getElementById('date-from').value;
    const to   = document.getElementById('date-to').value;
    const q    = `from=${from}&to=${to}`;

    try {
      const [rev, vis, pop, tkt] = await Promise.all([
        api.reports.revenue(q), api.reports.visitors(q),
        api.reports.popularAttractions('limit=10'), api.reports.ticketSales(q),
      ]);
      this._revData = rev.data;

      // Summary stats
      const s = rev.summary;
      document.getElementById('summary-stats').innerHTML = `
        <div class="stat-card">
          <div class="stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg></div>
          <div class="stat-info"><div class="stat-label">Paid Revenue</div><div class="stat-value" style="font-size:1.15rem">${formatIDR(s.paid_revenue)}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/></svg></div>
          <div class="stat-info"><div class="stat-label">Total Bookings</div><div class="stat-value">${s.total_bookings}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
          <div class="stat-info"><div class="stat-label">Total Visitors</div><div class="stat-value">${vis.data.reduce((s,r) => s + parseInt(r.visitors||0), 0)}</div></div>
        </div>`;

      // Tables
      document.getElementById('revenue-table').innerHTML = tableHTML(
        ['Date','Bookings','Revenue (Gross)','Revenue (Paid)'],
        rev.data.map(r => [formatDate(r.period, {day:'2-digit',month:'short',year:'numeric'}), r.bookings, formatIDR(r.revenue), `<strong style="color:var(--success)">${formatIDR(r.paid_revenue)}</strong>`])
      );
      document.getElementById('visitors-table').innerHTML = tableHTML(
        ['Date','Bookings','Visitors'],
        vis.data.map(r => [formatDate(r.date, {day:'2-digit',month:'short',year:'numeric'}), r.bookings, `<strong>${r.visitors}</strong>`])
      );
      document.getElementById('attractions-table').innerHTML = tableHTML(
        ['#','Attraction','Category','City','Bookings','Visitors','Revenue','Rating'],
        pop.data.map((a,i) => [
          `<span style="font-weight:700;color:var(--accent)">${i+1}</span>`,
          `<strong>${a.name}</strong>`, a.category, a.city,
          a.total_bookings, a.total_visitors,
          `<strong style="color:var(--success)">${formatIDR(a.revenue)}</strong>`,
          `<span style="color:var(--warning)">★ ${parseFloat(a.average_rating||0).toFixed(1)}</span>`,
        ])
      );
      document.getElementById('tickets-table').innerHTML = tableHTML(
        ['Ticket Type','Attraction','Transactions','Tickets Sold','Revenue'],
        tkt.data.map(r => [r.ticket_type, r.attraction_name, r.transactions, `<strong>${r.tickets_sold}</strong>`, formatIDR(r.revenue)])
      );
    } catch (err) { window.toast.error('Failed to load report', err.message); }
  },

  exportCSV() {
    if (!this._revData?.length) return window.toast.warning('No data', 'Load a report first.');
    const rows = [['Date','Bookings','Revenue (Gross)','Revenue (Paid)'],
      ...this._revData.map(r => [r.period, r.bookings, r.revenue, r.paid_revenue])];
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob),
      download: `wisatapass-revenue-${new Date().toISOString().split('T')[0]}.csv`,
    });
    a.click(); URL.revokeObjectURL(a.href);
    window.toast.success('Exported!', 'CSV file downloaded.');
  },
};

function tableHTML(headers, rows) {
  if (!rows.length) return `<div class="empty-state" style="padding:40px"><span class="empty-icon">📊</span><div class="empty-title">No data for this period</div></div>`;
  return `<div class="card" style="padding:0;overflow:hidden;margin-top:0">
    <div class="table-wrapper" style="border:none;border-radius:0"><table>
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(c => `<td style="font-size:.8125rem">${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>
  </div>`;
}
