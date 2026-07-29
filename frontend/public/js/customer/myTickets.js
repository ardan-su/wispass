import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatDate, statusBadge, paginationHTML, bindPagination, emptyState, qs } from '../components/helpers.js';

let state = { page: 1, status: '' };

export default {
  async render(el) {
    setPageTitle('My Tickets');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>My Tickets</h2>
          <p style="font-size:.875rem;color:var(--text-secondary);margin-top:2px">Download and present your QR tickets at the entrance</p>
        </div>
      </div>

      <div class="tabs" id="ticket-tabs">
        ${[['','All'],['active','Active'],['used','Used'],['expired','Expired'],['cancelled','Cancelled']]
          .map(([s,l]) => `<button class="tab-btn ${state.status===s?'active':''}" data-status="${s}" type="button">${l}</button>`).join('')}
      </div>

      <div id="grid-area"></div>
      <div id="pagination"></div>`;

    document.querySelectorAll('#ticket-tabs .tab-btn').forEach(btn =>
      btn.addEventListener('click', () => {
        document.querySelectorAll('#ticket-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.status = btn.dataset.status; state.page = 1; this.load();
      })
    );
    await this.load();
  },

  async load() {
    const area = document.getElementById('grid-area');
    area.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px;margin-top:4px">`
      + [...Array(6)].map(() => `
        <div class="card" style="padding:0;overflow:hidden">
          <div class="skeleton" style="height:52px;border-radius:0"></div>
          <div style="padding:14px"><div class="skeleton skeleton-title" style="width:60%"></div><div class="skeleton skeleton-text" style="width:40%"></div><div class="skeleton" style="height:120px;border-radius:var(--radius-sm);margin-top:10px"></div></div>
        </div>`).join('') + `</div>`;

    try {
      const res = await api.tickets.mine(qs({ page: state.page, limit: 12, status: state.status }));
      this.renderGrid(area, res.data);
      const pag = document.getElementById('pagination');
      pag.innerHTML = paginationHTML(res.pagination, p => { state.page = p; this.load(); });
      bindPagination(pag, p => { state.page = p; this.load(); });
    } catch (err) { area.innerHTML = emptyState('⚠️', err.message, ''); }
  },

  renderGrid(area, rows) {
    if (!rows.length) {
      area.innerHTML = emptyState(
        '🎫', 'No tickets found',
        state.status ? `No ${state.status} tickets.` : 'Your tickets will appear here after a successful booking.',
        `<a href="#/browse" class="btn btn-primary">Book Now</a>`
      );
      return;
    }

    const statusColor = { active:'var(--accent-subtle)', used:'var(--bg-secondary)', expired:'var(--bg-secondary)', cancelled:'var(--bg-secondary)' };
    const statusBorder = { active:'var(--accent-border)', used:'var(--border)', expired:'var(--border)', cancelled:'var(--border)' };

    area.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px;margin-top:4px">
      ${rows.map(t => `
        <div class="ticket-card" style="border-color:${statusBorder[t.status]||'var(--border)'}">
          <!-- Header -->
          <div class="ticket-header" style="background:${statusColor[t.status]||'var(--bg-secondary)'}">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
              <div style="min-width:0">
                <div style="font-size:.65rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:var(--accent);margin-bottom:3px">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle" aria-hidden="true"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
                  Entrance Ticket
                </div>
                <div style="font-weight:700;font-size:.9375rem;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.attraction_name}</div>
                <div style="font-size:.75rem;color:var(--text-tertiary);margin-top:1px">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:2px" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  ${t.city || '—'}
                </div>
              </div>
              ${statusBadge(t.status)}
            </div>
          </div>

          <!-- Body: info + QR -->
          <div class="ticket-body">
            <div style="flex:1;min-width:0">
              <div style="font-size:.72rem;color:var(--text-tertiary);margin-bottom:2px">Ticket Type</div>
              <div style="font-weight:600;font-size:.875rem;margin-bottom:10px">${t.ticket_type_name}</div>
              <div style="font-size:.72rem;color:var(--text-tertiary);margin-bottom:2px">Visit Date</div>
              <div style="font-weight:700;font-size:.9375rem;color:${t.status==='active'?'var(--accent)':'var(--text-primary)'}">${formatDate(t.visit_date, {day:'2-digit',month:'short',year:'numeric'})}</div>
              ${t.status === 'active' ? `
                <div style="margin-top:10px;padding:6px 9px;background:var(--success-bg);border:1px solid var(--success-border);border-radius:var(--radius-sm);font-size:.72rem;font-weight:600;color:var(--success)">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:middle;margin-right:3px" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  Ready to use
                </div>` : ''}
            </div>
            ${t.qr_code
              ? `<img src="${t.qr_code}" class="qr-preview" loading="lazy"
                  alt="QR code for ${t.ticket_code}"
                  onclick="window.open('${t.qr_code}')"
                  title="Click to enlarge" />`
              : `<div style="width:110px;height:110px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-tertiary)" aria-hidden="true"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/></svg>
                </div>`}
          </div>

          <!-- Footer -->
          <div class="ticket-footer">
            <span class="ticket-code" aria-label="Ticket code">${t.ticket_code}</span>
            <div style="display:flex;gap:6px">
              ${t.qr_code ? `
                <a href="${t.qr_code}" download="ticket-${t.ticket_code}.png"
                  class="btn btn-secondary btn-sm" aria-label="Download ticket ${t.ticket_code}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                  Save
                </a>
                <button class="btn btn-ghost btn-sm print-btn" data-code="${t.ticket_code}" data-qr="${t.qr_code}" data-name="${t.attraction_name}" data-date="${t.visit_date}" aria-label="Print ticket">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>
                </button>` : ''}
            </div>
          </div>
        </div>`).join('')}
    </div>`;

    // Print handlers
    area.querySelectorAll('.print-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const w = window.open('', '_blank', 'width=480,height=700');
        const visitDate = new Date(btn.dataset.date).toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
        w.document.write(`<!DOCTYPE html><html><head><title>Ticket</title>
          <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Inter',sans-serif;padding:32px 28px;background:#fff;color:#0f172a;text-align:center}
          .logo{font-size:1.1rem;font-weight:800;margin-bottom:4px}.sub{font-size:.75rem;color:#64748b;margin-bottom:24px}
          h2{font-size:1.125rem;font-weight:700;margin-bottom:6px}
          .meta{font-size:.8125rem;color:#64748b;margin-bottom:4px}
          .code{font-family:monospace;font-size:.875rem;font-weight:700;background:#f1f5f9;padding:5px 12px;border-radius:6px;margin:14px auto;display:inline-block}
          img{width:210px;height:210px;border-radius:8px;margin:0 auto 16px;display:block;border:1px solid #e2e8f0}
          .notice{font-size:.72rem;color:#94a3b8;margin-top:14px;line-height:1.6}
          .divider{border:none;border-top:1px dashed #e2e8f0;margin:16px 0}</style>
          </head><body>
          <div class="logo">🎫 WisataPass</div>
          <div class="sub">Official Entrance Ticket</div>
          <hr class="divider">
          <h2>${btn.dataset.name}</h2>
          <div class="meta">Visit Date: <strong>${visitDate}</strong></div>
          <div class="code">${btn.dataset.code}</div>
          <img src="${btn.dataset.qr}" alt="QR Code" />
          <hr class="divider">
          <div class="notice">Present this QR code at the entrance gate.<br>Valid for one-time use only. Do not share.</div>
          <script>window.onload=()=>{window.print()}<\/script></body></html>`);
        w.document.close();
      });
    });
  },
};
