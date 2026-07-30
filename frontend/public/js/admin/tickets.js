import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatDate, statusBadge, paginationHTML, bindPagination, emptyState, qs } from '../components/helpers.js';
import { renderTableSkeleton } from '../components/skeleton.js';

let state = { page: 1, status: '', search: '', siteId: '', dateFrom: '', dateTo: '' };
let statsData = {};

export default {
  async render(el) {
    setPageTitle('Ticket Management');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="breadcrumb"><span>Admin</span><span class="breadcrumb-sep">/</span><span>Tickets</span></div>
          <h2>Ticket Management</h2>
          <p style="font-size:.875rem;color:var(--text-secondary);margin-top:2px">All customer tickets — read directly from the tickets table</p>
        </div>
      </div>

      <!-- Stats row -->
      <div id="stats-row" class="stat-grid" style="margin-bottom:20px">
        ${[0,1,2,3,4].map(()=>`<div class="stat-card"><div class="skeleton" style="height:72px;width:100%;border-radius:var(--radius)"></div></div>`).join('')}
      </div>

      <!-- Filters -->
      <div class="card" style="margin-bottom:16px;padding:14px 16px">
        <div class="filter-bar" style="gap:8px;flex-wrap:wrap">
          <div class="search-wrapper" style="flex:1;min-width:200px;max-width:300px">
            <svg class="search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <input id="search-input" class="form-control" placeholder="Search ticket, customer, booking…" style="padding-left:34px" />
          </div>
          <select id="status-filter" class="form-control" style="width:140px">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="used">Used</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input id="date-from" class="form-control" type="date" style="width:150px" placeholder="From" />
          <input id="date-to"   class="form-control" type="date" style="width:150px" placeholder="To" />
          <button id="reset-btn" class="btn btn-ghost btn-sm">Reset</button>
        </div>
      </div>
      <!-- Table -->
      <div class="card" style="padding:0;overflow:hidden">
        <div id="table-area"></div>
      </div>
      <div id="pagination" style="margin-top:16px"></div>

      <!-- Ticket detail modal -->
      <div id="ticket-modal" class="modal-overlay hidden" role="dialog" aria-modal="true">
        <div class="modal-box modal-lg">
          <div class="modal-header">
            <h3>Ticket Detail</h3>
            <button class="btn btn-ghost btn-icon" id="modal-close" aria-label="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
          <div class="modal-body" id="modal-body"></div>
        </div>
      </div>`;

    // Wire filters
    let searchTimer;
    document.getElementById('search-input').addEventListener('input', e => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => { state.search = e.target.value.trim(); state.page = 1; this.load(); }, 350);
    });
    document.getElementById('status-filter').addEventListener('change', e => {
      state.status = e.target.value; state.page = 1; this.load();
    });
    document.getElementById('date-from').addEventListener('change', e => {
      state.dateFrom = e.target.value; state.page = 1; this.load();
    });
    document.getElementById('date-to').addEventListener('change', e => {
      state.dateTo = e.target.value; state.page = 1; this.load();
    });
    document.getElementById('reset-btn').addEventListener('click', () => {
      state = { page: 1, status: '', search: '', siteId: '', dateFrom: '', dateTo: '' };
      document.getElementById('search-input').value = '';
      document.getElementById('status-filter').value = '';
      document.getElementById('date-from').value = '';
      document.getElementById('date-to').value = '';
      this.load();
    });
    document.getElementById('modal-close').addEventListener('click', () => {
      document.getElementById('ticket-modal').classList.add('hidden');
    });
    document.getElementById('ticket-modal').addEventListener('click', e => {
      if (e.target === document.getElementById('ticket-modal'))
        document.getElementById('ticket-modal').classList.add('hidden');
    });

    await Promise.all([this.loadStats(), this.load()]);

    // Real-time: refresh stats + table row when a ticket status changes
    if (window._socket) {
      window._socket.off('ticket:used.admin_tickets');
      window._socket.on('ticket:used', (ticket) => {
        // Update the stat cards
        this.loadStats();
        // Update the matching row in-place without full reload
        const row = document.querySelector(`tr[data-ticket-id="${ticket.id}"]`);
        if (row) {
          const statusCell = row.querySelector('.ticket-status-cell');
          if (statusCell) statusCell.innerHTML = statusBadge(ticket.status);
        } else {
          // Ticket not visible on current page — just refresh stats
          this.load();
        }
      });
    }
  },
  async loadStats() {
    try {
      const { stats } = await api.tickets.adminStats();
      statsData = stats;
      const statDefs = [
        { label: 'Total Tickets', value: stats.total,      icon: '🎫', color: 'blue'   },
        { label: 'Active',        value: stats.active,     icon: '✅', color: 'green'  },
        { label: 'Used Today',    value: stats.used_today, icon: '🚪', color: 'purple' },
        { label: 'Expired',       value: stats.expired,    icon: '⏰', color: 'yellow' },
        { label: 'Cancelled',     value: stats.cancelled,  icon: '❌', color: 'red'    },
      ];
      document.getElementById('stats-row').innerHTML = statDefs.map(s => `
        <div class="stat-card">
          <div class="stat-icon ${s.color}" style="font-size:1.25rem">${s.icon}</div>
          <div class="stat-info">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value">${s.value.toLocaleString()}</div>
          </div>
        </div>`).join('');
    } catch (_) {}
  },

  async load() {
    const tableArea = document.getElementById('table-area');
    tableArea.innerHTML = renderTableSkeleton(8, 6);

    try {
      const q = qs({
        page: state.page, limit: 20,
        search: state.search, status: state.status,
        siteId: state.siteId, dateFrom: state.dateFrom, dateTo: state.dateTo,
      });
      const res = await api.tickets.adminList(q);
      this.renderTable(tableArea, res.data);

      const pag = document.getElementById('pagination');
      pag.innerHTML = paginationHTML(res.pagination, p => { state.page = p; this.load(); });
      bindPagination(pag, p => { state.page = p; this.load(); });
    } catch (err) {
      tableArea.innerHTML = `<div class="empty-state" style="padding:40px">${emptyState('⚠️', 'Failed to load tickets', err.message)}</div>`;
    }
  },
  renderTable(el, rows) {
    if (!rows || !rows.length) {
      el.innerHTML = `<div style="padding:40px">${emptyState('🎫', 'No tickets found', 'Tickets will appear here once customers make purchases.', '')}</div>`;
      return;
    }

    el.innerHTML = `
      <div class="table-wrapper" style="border:none;border-radius:0">
        <table style="width:100%;min-width:700px">
          <thead>
            <tr>
              <th>Ticket Code</th>
              <th>Customer</th>
              <th>Attraction</th>
              <th>Visit Date</th>
              <th>Status</th>
              <th style="text-align:center">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(t => `
              <tr data-ticket-id="${t.id}">
                <td>
                  <span style="font-family:var(--font-mono);font-size:.8rem;font-weight:600">${t.ticket_code}</span>
                  <div style="font-size:.72rem;color:var(--text-tertiary);margin-top:1px">${t.ticket_type_name}</div>
                </td>
                <td>
                  <div style="font-weight:500;font-size:.875rem">${t.customer_name}</div>
                  <div style="font-size:.72rem;color:var(--text-tertiary)">${t.customer_email}</div>
                </td>
                <td>
                  <div style="font-size:.875rem">${t.attraction_name}</div>
                  <div style="font-size:.72rem;color:var(--text-tertiary)">${t.city || ''}</div>
                </td>
                <td style="white-space:nowrap;font-size:.875rem">${formatDate(t.visit_date)}</td>
                <td class="ticket-status-cell">${statusBadge(t.status)}${t.status==='used'&&t.used_at?`<div style="font-size:.7rem;color:var(--text-tertiary);margin-top:2px">${new Date(t.used_at).toLocaleString('id-ID',{hour:'2-digit',minute:'2-digit'})}</div>`:''}</td>
                <td>
                  <div class="table-actions" style="justify-content:center">
                    <button class="btn btn-secondary btn-sm view-btn" data-id="${t.id}" title="View ticket & QR">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                      View
                    </button>
                    ${t.status==='active'?`
                    <button class="btn btn-ghost btn-sm cancel-btn" data-id="${t.id}" data-code="${t.ticket_code}" title="Cancel ticket"
                      style="color:var(--danger)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>`:``}
                  </div>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;

    el.querySelectorAll('.view-btn').forEach(btn =>
      btn.addEventListener('click', () => this.showModal(btn.dataset.id))
    );
    el.querySelectorAll('.cancel-btn').forEach(btn =>
      btn.addEventListener('click', () => this.cancelTicket(btn.dataset.id, btn.dataset.code))
    );
  },
  async showModal(ticketId) {
    const modal    = document.getElementById('ticket-modal');
    const body     = document.getElementById('modal-body');
    modal.classList.remove('hidden');
    body.innerHTML = `<div class="page-spinner"><div class="spinner"></div></div>`;

    try {
      const { ticket, history } = await api.tickets.detail(ticketId);
      const t = ticket;

      body.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 200px;gap:20px;align-items:start">
          <!-- Left: details -->
          <div>
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
              <span style="font-family:var(--font-mono);font-size:.9rem;font-weight:700">${t.ticket_code}</span>
              ${statusBadge(t.status)}
            </div>
            ${row('Customer',    `${t.customer_name}<br><span style="font-size:.75rem;color:var(--text-tertiary)">${t.customer_email}</span>`)}
            ${row('Attraction',  t.attraction_name)}
            ${row('Ticket Type', t.ticket_type_name)}
            ${row('Visit Date',  `<strong>${formatDate(t.visit_date)}</strong>`)}
            ${row('Booking',     `<span style="font-family:var(--font-mono);font-size:.8rem">${t.booking_code}</span>`)}
            ${t.used_at ? row('Used At', new Date(t.used_at).toLocaleString('id-ID')) : ''}
            ${row('Created',     new Date(t.created_at).toLocaleString('id-ID'))}
            ${row('Expires',     formatDate(t.expires_at))}

            <!-- Validation history -->
            ${history && history.length ? `
              <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:14px">
                <div style="font-size:.8rem;font-weight:600;color:var(--text-secondary);margin-bottom:8px">Validation History</div>
                ${history.map(h => `
                  <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--border-subtle);font-size:.78rem">
                    <span class="badge ${h.result==='valid'?'badge-success':h.result==='used'?'badge-gray':'badge-danger'} badge-dot">${h.result}</span>
                    <span style="flex:1;color:var(--text-secondary)">${h.validator_name || '—'}</span>
                    <span style="color:var(--text-tertiary)">${new Date(h.scan_time || h.created_at).toLocaleString('id-ID',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'short'})}</span>
                  </div>`).join('')}
              </div>` : ''}
          </div>

          <!-- Right: QR + actions -->
          <div style="text-align:center">
            ${t.qr_code
              ? `<img src="${t.qr_code}" alt="QR Code" style="width:180px;height:180px;border:1px solid var(--border);border-radius:var(--radius);margin-bottom:12px;display:block;margin-left:auto;margin-right:auto" />`
              : `<div style="width:180px;height:180px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:.75rem;color:var(--text-tertiary)">No QR</div>`}
            ${t.qr_code ? `
              <a href="${t.qr_code}" download="ticket-${t.ticket_code}.png" class="btn btn-secondary btn-sm w-full" style="justify-content:center;margin-bottom:6px">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                Download PNG
              </a>
              <button class="btn btn-ghost btn-sm w-full print-modal-btn" data-code="${t.ticket_code}" data-qr="${t.qr_code}" data-name="${t.attraction_name}" data-date="${t.visit_date}" style="justify-content:center">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                Print
              </button>` : ''}
          </div>
        </div>`;

      // Print handler (reuse exact same print template from myTickets.js)
      body.querySelectorAll('.print-modal-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const w = window.open('', '_blank', 'width=480,height=700');
          const visitDate = new Date(btn.dataset.date).toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
          w.document.write(`<!DOCTYPE html><html><head><title>Ticket</title>
            <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif;padding:32px 28px;background:#fff;color:#0f172a;text-align:center}
            .logo{font-size:1.1rem;font-weight:800;margin-bottom:4px}.sub{font-size:.75rem;color:#64748b;margin-bottom:24px}
            h2{font-size:1.125rem;font-weight:700;margin-bottom:6px}.meta{font-size:.8125rem;color:#64748b;margin-bottom:4px}
            .code{font-family:monospace;font-size:.875rem;font-weight:700;background:#f1f5f9;padding:5px 12px;border-radius:6px;margin:14px auto;display:inline-block}
            img{width:210px;height:210px;border-radius:8px;margin:0 auto 16px;display:block;border:1px solid #e2e8f0}
            .notice{font-size:.72rem;color:#94a3b8;margin-top:14px;line-height:1.6}.divider{border:none;border-top:1px dashed #e2e8f0;margin:16px 0}
            </style></head><body>
            <div class="logo">🎫 WisataPass</div><div class="sub">Official Entrance Ticket</div>
            <hr class="divider"><h2>${btn.dataset.name}</h2>
            <div class="meta">Visit Date: <strong>${visitDate}</strong></div>
            <div class="code">${btn.dataset.code}</div>
            <img src="${btn.dataset.qr}" alt="QR Code" />
            <hr class="divider">
            <div class="notice">Present this QR code at the entrance gate.<br>Valid for one-time use only.</div>
            <script>window.onload=()=>{window.print()}<\/script></body></html>`);
          w.document.close();
        });
      });
    } catch (err) {
      body.innerHTML = `<div class="empty-state"><span class="empty-icon">⚠️</span><div class="empty-title">${err.message}</div></div>`;
    }
  },

  async cancelTicket(ticketId, code) {
    if (!confirm(`Cancel ticket ${code}? This cannot be undone.`)) return;
    try {
      await api.tickets.adminUpdateStatus(ticketId, { status: 'cancelled' });
      window.toast?.success('Cancelled', `Ticket ${code} has been cancelled.`);
      this.loadStats();
      this.load();
    } catch (err) { window.toast?.error('Error', err.message); }
  },
};

function row(label, val) {
  return `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${val}</span></div>`;
}
