import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatDate, statusBadge } from '../components/helpers.js';

export default {
  async render(el) {
    setPageTitle('Validate Ticket');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="breadcrumb"><span>Admin</span><span class="breadcrumb-sep">/</span><span>Scan QR</span></div>
          <h2>QR Ticket Validation</h2>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;align-items:start">
        <!-- Input panel -->
        <div>
          <div class="card">
            <div class="card-header"><span class="card-title">Validate Ticket</span></div>
            <div class="tabs" style="margin-bottom:16px">
              <button class="tab-btn active" data-tab="manual" type="button">Manual Code</button>
              <button class="tab-btn" data-tab="qr" type="button">QR JSON Data</button>
            </div>

            <div id="tab-manual">
              <div class="form-group">
                <label class="form-label" for="ticket-code">Ticket Code</label>
                <div style="display:flex;gap:8px">
                  <input class="form-control" id="ticket-code" placeholder="TKT-XXXXXXXX"
                    style="font-family:var(--font-mono);font-size:.9375rem;text-transform:uppercase;letter-spacing:.05em;font-weight:600"
                    aria-label="Enter ticket code" autocomplete="off" />
                  <button class="btn btn-primary" id="validate-code-btn" type="button" style="flex-shrink:0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    Check
                  </button>
                </div>
                <span class="form-hint">Press Enter or click Check to validate.</span>
              </div>
            </div>

            <div id="tab-qr" style="display:none">
              <div class="form-group">
                <label class="form-label" for="qr-data">Paste QR JSON Payload</label>
                <textarea class="form-control" id="qr-data" rows="6"
                  placeholder='{"ticketId":"…","validationToken":"…","sig":"…"}'
                  aria-label="QR code JSON data" style="font-family:var(--font-mono);font-size:.75rem"></textarea>
              </div>
              <button class="btn btn-primary w-full" id="validate-qr-btn" type="button" style="justify-content:center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/></svg>
                Validate QR
              </button>
            </div>
          </div>

          <!-- History -->
          <div class="card" style="margin-top:16px">
            <div class="card-header"><span class="card-title">Validation History</span></div>
            <div id="history-area">
              <div class="empty-state" style="padding:24px">
                <span class="empty-icon" style="font-size:2rem">📋</span>
                <div class="empty-title" style="font-size:.875rem">No history yet</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Result panel -->
        <div id="result-area">
          <div class="card" style="text-align:center;padding:48px 24px">
            <div style="width:80px;height:80px;border-radius:var(--radius-xl);background:var(--bg-secondary);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;margin:0 auto 16px">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="color:var(--text-tertiary)"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/></svg>
            </div>
            <div class="empty-title">Waiting for ticket</div>
            <p class="empty-message">Enter a ticket code or QR data to validate</p>
          </div>
        </div>
      </div>`;

    // Tabs
    el.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        el.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-manual').style.display = btn.dataset.tab === 'manual' ? 'block' : 'none';
        document.getElementById('tab-qr').style.display     = btn.dataset.tab === 'qr'     ? 'block' : 'none';
      });
    });

    document.getElementById('validate-code-btn').addEventListener('click', () => {
      const code = document.getElementById('ticket-code').value.trim().toUpperCase();
      if (!code) return window.toast.warning('Enter ticket code', '');
      this.validate({ ticketCode: code });
    });
    document.getElementById('ticket-code').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('validate-code-btn').click();
    });
    document.getElementById('validate-qr-btn').addEventListener('click', () => {
      const raw = document.getElementById('qr-data').value.trim();
      if (!raw) return window.toast.warning('Paste QR data', '');
      this.validate({ qrData: raw });
    });
  },

  async validate(payload) {
    const resultArea = document.getElementById('result-area');
    resultArea.innerHTML = `<div class="card page-spinner"><div class="spinner"></div></div>`;

    try {
      const res = await api.tickets.validate(payload);
      const t   = res.ticket;
      resultArea.innerHTML = `
        <div class="card" style="border:2px solid var(--success);overflow:hidden">
          <div style="background:var(--success-bg);border-bottom:1px solid var(--success-border);padding:24px;text-align:center">
            <div style="width:64px;height:64px;border-radius:50%;background:var(--success);display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <div style="font-size:1.25rem;font-weight:700;color:var(--success)">TICKET VALID</div>
            <div style="font-size:.8125rem;color:var(--text-secondary);margin-top:4px">Entry granted</div>
          </div>
          <div style="padding:16px">
            ${row('Customer',    t.customer_name)}
            ${row('Email',       t.customer_email || '—')}
            ${row('Attraction',  t.attraction_name)}
            ${row('Ticket Type', t.ticket_type_name)}
            ${row('Visit Date',  `<strong>${formatDate(t.visit_date)}</strong>`)}
            ${row('Ticket Code', `<span style="font-family:var(--font-mono);font-size:.8rem">${t.ticket_code}</span>`)}
            ${row('Status',      statusBadge(t.status))}
          </div>
        </div>`;
      window.toast.success('Valid Ticket ✓', t.customer_name);
      this.loadHistory(t.id);
    } catch (err) {
      resultArea.innerHTML = `
        <div class="card" style="border:2px solid var(--danger);overflow:hidden">
          <div style="background:var(--danger-bg);border-bottom:1px solid var(--danger-border);padding:24px;text-align:center">
            <div style="width:64px;height:64px;border-radius:50%;background:var(--danger);display:flex;align-items:center;justify-content:center;margin:0 auto 12px">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </div>
            <div style="font-size:1.25rem;font-weight:700;color:var(--danger)">INVALID TICKET</div>
            <div style="font-size:.875rem;color:var(--text-secondary);margin-top:8px;line-height:1.5">${err.message}</div>
          </div>
        </div>`;
      window.toast.error('Invalid Ticket', err.message);
    }
  },

  async loadHistory(ticketId) {
    const area = document.getElementById('history-area');
    try {
      const { history } = await api.tickets.detail(ticketId);
      if (!history.length) { area.innerHTML = `<div style="padding:12px;font-size:.8rem;color:var(--text-tertiary);text-align:center">No validation history.</div>`; return; }
      area.innerHTML = history.map(h => `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border-subtle);font-size:.8rem">
          <span class="badge ${h.result==='valid'?'badge-success':h.result==='used'?'badge-gray':'badge-danger'} badge-dot" style="flex-shrink:0">${h.result}</span>
          <span style="flex:1;color:var(--text-secondary)">${h.validator_name}</span>
          <span style="color:var(--text-tertiary);white-space:nowrap">${new Date(h.created_at).toLocaleTimeString('id-ID')}</span>
        </div>`).join('');
    } catch (_) {}
  },
};

function row(label, val) {
  return `<div class="info-row"><span class="info-label">${label}</span><span class="info-value">${val}</span></div>`;
}
