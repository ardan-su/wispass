/**
 * Admin – QR Management Page
 * Lists all QR codes, stats, create modal, and scan history.
 */
import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatIDR, timeAgo, statusBadge } from '../components/helpers.js';

const statusIcon = { active: '🟢', expired: '🔴', used: '✅', deactivated: '⚫', deleted: '🗑️' };
const resultIcon = { valid: '✅', invalid: '❌', expired: '⏱️', used: '🔁', not_found: '❓' };

export default {
  _page: 1, _limit: 20, _filters: {},

  async render(el) {
    setPageTitle('QR Management');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="breadcrumb"><span>Admin</span><span class="breadcrumb-sep">/</span><span>QR Management</span></div>
          <h2>QR Management</h2>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary btn-sm" id="view-history-btn">📋 Scan History</button>
          <button class="btn btn-primary" id="create-qr-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
            Generate QR
          </button>
        </div>
      </div>

      <!-- Stats row -->
      <div id="qr-stats" class="stat-grid" style="margin-bottom:20px;grid-template-columns:repeat(4,1fr)">
        ${[...Array(4)].map(() => `
          <div class="stat-card">
            <div class="skeleton" style="width:42px;height:42px;border-radius:var(--radius);flex-shrink:0"></div>
            <div class="stat-info">
              <div class="skeleton skeleton-text" style="width:70%"></div>
              <div class="skeleton" style="height:28px;width:55%;border-radius:var(--radius-sm)"></div>
            </div>
          </div>`).join('')}
      </div>

      <!-- Filters -->
      <div class="card" style="margin-bottom:16px">
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;padding:4px 0">
          <input type="search" id="qr-search" placeholder="Search UUID, ticket code, name…" class="form-control" style="flex:1;min-width:200px">
          <select id="qr-status" class="form-control" style="width:140px">
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="used">Used</option>
            <option value="deactivated">Deactivated</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="filter-btn">Filter</button>
          <button class="btn btn-ghost btn-sm" id="reset-btn">Reset</button>
        </div>
      </div>

      <!-- Table -->
      <div class="card">
        <div id="qr-table-wrap">
          <div class="page-spinner"><div class="spinner"></div></div>
        </div>
        <div id="qr-pagination" style="display:flex;justify-content:space-between;align-items:center;padding:12px 0 0;border-top:1px solid var(--border-subtle);margin-top:8px"></div>
      </div>

      <!-- Scan History Panel (hidden by default) -->
      <div id="history-panel" class="card" style="display:none;margin-top:16px">
        <div class="card-header">
          <span class="card-title">📋 Recent Scan Activity</span>
          <button class="btn btn-ghost btn-sm" id="close-history-btn">✕</button>
        </div>
        <div id="history-table"><div class="page-spinner"><div class="spinner spinner-sm"></div></div></div>
      </div>

      <!-- Create QR Modal -->
      <div id="create-modal" class="modal-overlay" style="display:none;position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center">
        <div class="card" style="width:100%;max-width:480px;padding:28px;position:relative">
          <button id="close-modal-btn" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:1.25rem;cursor:pointer;color:var(--text-secondary)">✕</button>
          <h3 style="margin:0 0 20px">Generate QR Code</h3>
          <form id="create-form">
            <div class="form-group">
              <label class="form-label">Label / Description</label>
              <input type="text" name="label" class="form-control" placeholder="e.g. VIP Gate - Saturday">
            </div>
            <div class="form-group">
              <label class="form-label">Tourist Site ID <small style="color:var(--text-tertiary)">(optional)</small></label>
              <input type="text" name="siteId" class="form-control" placeholder="UUID of the tourist site">
            </div>
            <div class="form-group">
              <label class="form-label">Ticket ID <small style="color:var(--text-tertiary)">(optional – link to ticket)</small></label>
              <input type="text" name="ticketId" class="form-control" placeholder="UUID of the ticket">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <div class="form-group">
                <label class="form-label">Expiry (hours)</label>
                <input type="number" name="expiryHours" class="form-control" value="24" min="1" max="720">
              </div>
              <div class="form-group">
                <label class="form-label">Max Scans</label>
                <input type="number" name="maxScans" class="form-control" value="1" min="1" max="100">
              </div>
            </div>
            <div style="display:flex;gap:10px;margin-top:8px">
              <button type="submit" class="btn btn-primary" style="flex:1" id="create-submit-btn">Generate</button>
              <button type="button" class="btn btn-secondary" id="cancel-modal-btn">Cancel</button>
            </div>
          </form>
          <!-- QR preview after creation -->
          <div id="qr-preview" style="display:none;text-align:center;margin-top:24px;padding-top:20px;border-top:1px solid var(--border-subtle)">
            <img id="qr-preview-img" style="width:220px;height:220px;border-radius:12px;border:3px solid var(--border);object-fit:cover" alt="QR Code">
            <div id="qr-preview-uuid" style="font-family:monospace;font-size:.75rem;color:var(--text-tertiary);margin-top:8px;word-break:break-all"></div>
            <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
              <a id="download-png-btn" class="btn btn-secondary btn-sm" target="_blank">⬇ PNG</a>
              <a id="download-pdf-btn" class="btn btn-secondary btn-sm" target="_blank">🖨 Print</a>
              <button id="regenerate-btn" class="btn btn-ghost btn-sm">🔄 Regenerate</button>
            </div>
          </div>
        </div>
      </div>`;

    this._bindEvents(el);
    await Promise.all([this.loadStats(), this.loadTable()]);
  },

  _bindEvents(el) {
    // Create modal
    const modal = el.querySelector('#create-modal');
    el.querySelector('#create-qr-btn').onclick = () => {
      modal.style.display = 'flex';
      el.querySelector('#qr-preview').style.display = 'none';
    };
    const closeModal = () => {
      modal.style.display = 'none';
      el.querySelector('#create-form').reset();
    };
    el.querySelector('#close-modal-btn').onclick  = closeModal;
    el.querySelector('#cancel-modal-btn').onclick = closeModal;

    // Submit create form
    el.querySelector('#create-form').onsubmit = async (e) => {
      e.preventDefault();
      const btn = el.querySelector('#create-submit-btn');
      btn.disabled = true; btn.textContent = 'Generating…';
      const fd = new FormData(e.target);
      const payload = {};
      for (const [k, v] of fd.entries()) if (v.trim()) payload[k] = v.trim();
      if (payload.expiryHours) payload.expiryHours = parseInt(payload.expiryHours);
      if (payload.maxScans)    payload.maxScans    = parseInt(payload.maxScans);
      try {
        const res = await api.qr.create(payload);
        window.toast?.success('QR code generated!');
        this._showPreview(el, res.qr);
        await Promise.all([this.loadStats(), this.loadTable()]);
      } catch (err) {
        window.toast?.error('Failed to generate QR', err.message);
      } finally {
        btn.disabled = false; btn.textContent = 'Generate';
      }
    };

    // Filters
    el.querySelector('#filter-btn').onclick = () => { this._page = 1; this._applyFilters(el); this.loadTable(); };
    el.querySelector('#reset-btn').onclick  = () => {
      el.querySelector('#qr-search').value = '';
      el.querySelector('#qr-status').value = '';
      this._filters = {}; this._page = 1; this.loadTable();
    };
    el.querySelector('#qr-search').onkeydown = (e) => { if (e.key === 'Enter') { this._page = 1; this._applyFilters(el); this.loadTable(); } };

    // History panel
    el.querySelector('#view-history-btn').onclick = async () => {
      const panel = el.querySelector('#history-panel');
      panel.style.display = 'block';
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      await this.loadHistory(el);
    };
    el.querySelector('#close-history-btn').onclick = () => {
      el.querySelector('#history-panel').style.display = 'none';
    };
  },

  _applyFilters(el) {
    const search = el.querySelector('#qr-search').value.trim();
    const status = el.querySelector('#qr-status').value;
    this._filters = {};
    if (search) this._filters.search = search;
    if (status) this._filters.status = status;
  },

  _showPreview(el, qr) {
    const preview = el.querySelector('#qr-preview');
    preview.style.display = 'block';
    el.querySelector('#qr-preview-img').src   = qr.qr_image || '';
    el.querySelector('#qr-preview-uuid').textContent = `ID: ${qr.uuid}`;
    el.querySelector('#download-png-btn').href = api.qr.downloadPng(qr.id);
    el.querySelector('#download-pdf-btn').href = api.qr.downloadPdf(qr.id);
    el.querySelector('#regenerate-btn').onclick = async () => {
      try {
        const res = await api.qr.regenerate(qr.id);
        this._showPreview(el, res.qr);
        window.toast?.success('QR regenerated');
        await Promise.all([this.loadStats(), this.loadTable()]);
      } catch (err) { window.toast?.error('Regenerate failed', err.message); }
    };
  },

  async loadStats() {
    try {
      const { stats } = await api.qr.stats();
      const el = document.getElementById('qr-stats');
      if (!el) return;
      const cards = [
        { icon: '🟢', label: 'Active QR Codes',  value: stats.active,     bg: 'var(--success-subtle)' },
        { icon: '⏱️',  label: 'Expired QR Codes', value: stats.expired,    bg: 'var(--danger-subtle)' },
        { icon: '📊', label: "Today's Scans",    value: stats.todayScans, bg: 'var(--accent-subtle)' },
        { icon: '📦', label: 'Total QR Codes',   value: stats.total,      bg: 'var(--surface-2)' },
      ];
      el.innerHTML = cards.map(c => `
        <div class="stat-card" style="background:${c.bg}">
          <div class="stat-icon" style="font-size:1.75rem;display:flex;align-items:center">${c.icon}</div>
          <div class="stat-info">
            <div class="stat-label">${c.label}</div>
            <div class="stat-value">${c.value ?? '–'}</div>
          </div>
        </div>`).join('');
    } catch (err) { console.warn('QR stats error:', err.message); }
  },

  async loadTable() {
    const wrap = document.getElementById('qr-table-wrap');
    if (!wrap) return;
    wrap.innerHTML = '<div class="page-spinner"><div class="spinner"></div></div>';
    try {
      const q = new URLSearchParams({ page: this._page, limit: this._limit, ...this._filters }).toString();
      const res = await api.qr.list(q);
      const rows = res.data || [];
      const { total = 0, totalPages = 1 } = res.pagination || {};

      if (!rows.length) {
        wrap.innerHTML = `<div class="empty-state" style="padding:40px"><span class="empty-icon">🔲</span><div class="empty-title">No QR codes found</div><p class="empty-message">Generate a QR code using the button above.</p></div>`;
        document.getElementById('qr-pagination').innerHTML = '';
        return;
      }

      wrap.innerHTML = `
        <div style="overflow-x:auto">
          <table class="table" style="width:100%">
            <thead><tr>
              <th>UUID</th><th>Status</th><th>Site</th><th>Ticket</th>
              <th>Scans</th><th>Expires</th><th>Created</th><th style="text-align:right">Actions</th>
            </tr></thead>
            <tbody>
              ${rows.map(qr => `
                <tr>
                  <td><code style="font-size:.72rem;color:var(--text-secondary)">${qr.uuid.substring(0,8)}…</code></td>
                  <td>${statusBadge(qr.status)}</td>
                  <td style="font-size:.8125rem">${qr.site_name || '—'}<br><span style="color:var(--text-tertiary);font-size:.7rem">${qr.site_city||''}</span></td>
                  <td style="font-size:.8125rem">${qr.ticket_code || '—'}</td>
                  <td style="text-align:center"><span style="font-weight:700;color:var(--text-primary)">${qr.scan_count}</span>/<span style="color:var(--text-tertiary)">${qr.max_scans}</span></td>
                  <td style="font-size:.75rem;color:${new Date(qr.expires_at) < new Date() ? 'var(--danger)' : 'var(--text-secondary)'}">${qr.expires_at ? new Date(qr.expires_at).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'}) : '—'}</td>
                  <td style="font-size:.75rem;color:var(--text-tertiary)">${timeAgo(qr.created_at)}</td>
                  <td style="text-align:right;white-space:nowrap">
                    <a href="#/admin/qr/${qr.id}" class="btn btn-ghost btn-sm">View</a>
                    <a href="${api.qr.downloadPng(qr.id)}" class="btn btn-ghost btn-sm" target="_blank" title="Download PNG">⬇</a>
                    ${qr.status === 'active' ? `<button class="btn btn-ghost btn-sm deact-btn" data-id="${qr.id}">Deactivate</button>` : ''}
                    <button class="btn btn-ghost btn-sm regen-btn" data-id="${qr.id}" title="Regenerate">🔄</button>
                    <button class="btn btn-ghost btn-sm del-btn" data-id="${qr.id}" title="Delete" style="color:var(--danger)">✕</button>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;

      // Action listeners
      wrap.querySelectorAll('.deact-btn').forEach(b => b.onclick = () => this._deactivate(b.dataset.id));
      wrap.querySelectorAll('.regen-btn').forEach(b => b.onclick = () => this._regenerate(b.dataset.id));
      wrap.querySelectorAll('.del-btn').forEach(b => b.onclick = () => this._delete(b.dataset.id));

      // Pagination
      const pag = document.getElementById('qr-pagination');
      pag.innerHTML = `
        <span style="font-size:.8125rem;color:var(--text-tertiary)">${total} QR code${total !== 1 ? 's' : ''}</span>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" id="prev-page" ${this._page <= 1 ? 'disabled' : ''}>← Prev</button>
          <span style="font-size:.8125rem;padding:4px 8px">Page ${this._page} / ${totalPages}</span>
          <button class="btn btn-ghost btn-sm" id="next-page" ${this._page >= totalPages ? 'disabled' : ''}>Next →</button>
        </div>`;
      pag.querySelector('#prev-page')?.addEventListener('click', () => { this._page--; this.loadTable(); });
      pag.querySelector('#next-page')?.addEventListener('click', () => { this._page++; this.loadTable(); });
    } catch (err) {
      wrap.innerHTML = `<div class="empty-state" style="padding:40px"><span class="empty-icon">⚠️</span><div class="empty-title">Failed to load</div><p class="empty-message">${err.message}</p></div>`;
    }
  },

  async loadHistory(el) {
    const wrap = el.querySelector('#history-table');
    if (!wrap) return;
    try {
      const rows = (await api.qr.history('limit=30')).data || [];
      if (!rows.length) { wrap.innerHTML = `<div class="empty-state" style="padding:24px"><div class="empty-title">No scan activity yet</div></div>`; return; }
      wrap.innerHTML = `
        <div style="overflow-x:auto;max-height:320px;overflow-y:auto">
          <table class="table" style="width:100%">
            <thead><tr><th>Time</th><th>QR</th><th>Result</th><th>Visitor</th><th>Site</th><th>Scanner</th></tr></thead>
            <tbody>
              ${rows.map(r => `
                <tr>
                  <td style="font-size:.75rem;white-space:nowrap">${new Date(r.scan_time).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'})}</td>
                  <td><code style="font-size:.7rem">${r.qr_uuid?.substring(0,8) || '—'}…</code></td>
                  <td><span style="font-size:.875rem">${resultIcon[r.result] || '?'}</span> <span style="font-size:.75rem;color:var(--text-secondary)">${r.result}</span></td>
                  <td style="font-size:.8125rem">${r.visitor_name || '—'}</td>
                  <td style="font-size:.8125rem">${r.site_name || '—'}</td>
                  <td style="font-size:.75rem;color:var(--text-tertiary)">${r.scanner_name || 'System'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      wrap.innerHTML = `<div class="empty-state" style="padding:24px"><div class="empty-title">Failed to load history</div><p class="empty-message">${err.message}</p></div>`;
    }
  },

  async _deactivate(id) {
    if (!confirm('Deactivate this QR code? It can be reactivated later.')) return;
    try {
      await api.qr.update(id, { status: 'deactivated' });
      window.toast?.success('QR deactivated');
      await this.loadTable();
    } catch (err) { window.toast?.error('Failed', err.message); }
  },

  async _regenerate(id) {
    if (!confirm('Regenerate? The old QR will be deactivated.')) return;
    try {
      await api.qr.regenerate(id);
      window.toast?.success('QR regenerated');
      await Promise.all([this.loadStats(), this.loadTable()]);
    } catch (err) { window.toast?.error('Failed', err.message); }
  },

  async _delete(id) {
    if (!confirm('Delete this QR code? This is permanent.')) return;
    try {
      await api.qr.delete(id);
      window.toast?.success('QR deleted');
      await Promise.all([this.loadStats(), this.loadTable()]);
    } catch (err) { window.toast?.error('Failed', err.message); }
  },
};
