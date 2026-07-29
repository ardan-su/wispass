import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatIDR, statusBadge, timeAgo } from '../components/helpers.js';

export default {
  async render(el) {
    setPageTitle('Dashboard');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <div class="breadcrumb"><span>Admin</span><span class="breadcrumb-sep">/</span><span>Dashboard</span></div>
          <h2>Dashboard</h2>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-secondary btn-sm" id="refresh-btn" aria-label="Refresh dashboard">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
            Refresh
          </button>
        </div>
      </div>

      <div id="stats-grid" class="stat-grid" style="margin-bottom:20px">
        ${[...Array(8)].map(() => `
          <div class="stat-card">
            <div class="skeleton" style="width:42px;height:42px;border-radius:var(--radius);flex-shrink:0"></div>
            <div class="stat-info">
              <div class="skeleton skeleton-text" style="width:70%"></div>
              <div class="skeleton" style="height:28px;width:55%;border-radius:var(--radius-sm)"></div>
            </div>
          </div>`).join('')}
      </div>

      <div style="display:grid;grid-template-columns:2fr 1fr;gap:16px;margin-bottom:16px" id="charts-row">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Revenue — Last 30 Days</span>
            <span class="badge badge-primary" id="chart-total"></span>
          </div>
          <div style="position:relative;overflow:hidden">
            <canvas id="revenue-chart" style="width:100%;display:block"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Booking Status</span></div>
          <canvas id="status-chart" style="width:100%;display:block"></canvas>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div class="card">
          <div class="card-header">
            <span class="card-title">Recent Bookings</span>
            <a href="#/admin/bookings" class="btn btn-ghost btn-sm">View all →</a>
          </div>
          <div id="recent-bookings"><div class="page-spinner"><div class="spinner spinner-sm"></div></div></div>
        </div>
        <div class="card">
          <div class="card-header">
            <span class="card-title">Top Attractions</span>
            <a href="#/admin/reports" class="btn btn-ghost btn-sm">Reports →</a>
          </div>
          <div id="top-attractions"><div class="page-spinner"><div class="spinner spinner-sm"></div></div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <span class="card-title">Recent QR Scan Activity</span>
          <a href="#/admin/gate" class="btn btn-ghost btn-sm">Open Gate Scanner →</a>
        </div>
        <div id="recent-scans"><div class="page-spinner"><div class="spinner spinner-sm"></div></div></div>
      </div>`;

    document.getElementById('refresh-btn').addEventListener('click', () => this.loadData());
    window.addEventListener('dashboard:refresh', () => this.loadData());
    await this.loadData();
  },

  async loadData() {
    try {
      const data = await api.dashboard.admin();
      this.renderStats(data.stats);
      this.renderRecentBookings(data.recentBookings);
      this.renderTopAttractions(data.topAttractions);
      this.renderCharts(data.stats, data.dailyRevenue);
      this.renderRecentScans(data.recentScanActivity || []);
    } catch (err) {
      window.toast?.error('Failed to load dashboard', err.message);
    }
  },

  renderStats(s) {
    const cards = [
      { icon: 'blue',   svg: mapSvg,     label: 'Total Attractions', value: s.totalAttractions, sub: 'Active attractions' },
      { icon: 'purple', svg: usersSvg,   label: 'Total Customers',   value: s.totalCustomers,   sub: 'Registered users' },
      { icon: 'blue',   svg: calSvg,     label: "Today's Bookings",  value: s.todayBookings,    sub: 'New today' },
      { icon: 'green',  svg: trendSvg,   label: 'Revenue Today',     value: formatIDR(s.revenueToday), sub: 'Paid orders' },
      { icon: 'green',  svg: trendSvg,   label: 'Revenue This Month', value: formatIDR(s.revenueMonth), sub: 'Month to date' },
      { icon: 'yellow', svg: clockSvg,   label: 'Pending Payments',  value: s.pending.count,    sub: formatIDR(s.pending.total) },
      { icon: 'blue',   svg: checkSvg,   label: 'Confirmed',          value: s.confirmed.count,  sub: formatIDR(s.confirmed.total) },
      { icon: 'red',    svg: xSvg,       label: 'Cancelled',          value: s.cancelled.count,  sub: 'Orders cancelled' },
      // QR / Gate stats
      { icon: 'blue',   svg: qrSvg,      label: "Today's QR Scans",  value: s.todayScans ?? '–',  sub: 'Gate validations today' },
      { icon: 'green',  svg: qrSvg,      label: 'Active QR Codes',   value: s.activeQR  ?? '–',  sub: 'Ready to scan' },
      { icon: 'red',    svg: qrSvg,      label: 'Expired QR Codes',  value: s.expiredQR ?? '–',  sub: 'Past validity' },
      { icon: 'purple', svg: usersSvg,   label: 'Visitors Today',    value: s.visitorsToday ?? '–', sub: 'Checked in today' },
    ];
    document.getElementById('stats-grid').innerHTML = cards.map(c => `
      <div class="stat-card">
        <div class="stat-icon ${c.icon}">${c.svg}</div>
        <div class="stat-info">
          <div class="stat-label">${c.label}</div>
          <div class="stat-value">${c.value}</div>
          <div class="stat-sub">${c.sub}</div>
        </div>
      </div>`).join('');
  },

  renderRecentBookings(bookings) {
    const el = document.getElementById('recent-bookings');
    if (!bookings.length) {
      el.innerHTML = `<div class="empty-state" style="padding:28px"><span class="empty-icon">📋</span><div class="empty-title">No bookings yet</div></div>`;
      return;
    }
    el.innerHTML = bookings.map(b => `
      <a href="#/admin/bookings/${b.id}" style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--border-subtle);transition:background var(--t-fast);text-decoration:none" class="booking-row">
        <div style="flex:1;min-width:0">
          <div style="font-size:.875rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.customer_name}</div>
          <div style="font-size:.75rem;color:var(--text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.attraction_name}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:.8125rem;font-weight:600;color:var(--text-primary)">${formatIDR(b.total_amount)}</div>
          ${statusBadge(b.status)}
        </div>
      </a>`).join('');
  },

  renderTopAttractions(list) {
    const el = document.getElementById('top-attractions');
    if (!list.length) {
      el.innerHTML = `<div class="empty-state" style="padding:28px"><span class="empty-icon">🏝️</span><div class="empty-title">No data yet</div></div>`;
      return;
    }
    el.innerHTML = list.map((a, i) => `
      <div style="display:flex;align-items:center;gap:12px;padding:9px 0;border-bottom:1px solid var(--border-subtle)">
        <div style="width:22px;height:22px;border-radius:50%;background:var(--accent-subtle);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:var(--accent);flex-shrink:0">${i+1}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:.875rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary)">${a.name}</div>
          <div style="font-size:.72rem;color:var(--text-tertiary)">${a.booking_count} bookings</div>
        </div>
        <div style="font-size:.8125rem;font-weight:600;color:var(--success);flex-shrink:0">${formatIDR(a.revenue)}</div>
      </div>`).join('');
  },

  renderRecentScans(scans) {
    const el = document.getElementById('recent-scans');
    if (!el) return;
    if (!scans.length) {
      el.innerHTML = `<div class="empty-state" style="padding:24px"><span class="empty-icon">📭</span><div class="empty-title">No QR scans yet today</div></div>`;
      return;
    }
    const resultIcon  = { valid: '✅', invalid: '❌', expired: '⏱️', used: '🔁', not_found: '❓' };
    const resultColor = { valid: 'var(--success)', invalid: 'var(--danger)', expired: 'var(--warning)', used: 'var(--text-tertiary)' };
    el.innerHTML = `
      <div style="overflow-x:auto">
        <table class="table" style="width:100%">
          <thead><tr><th>Time</th><th>Result</th><th>Visitor</th><th>Ticket Type</th><th>Site</th><th>Scanner</th></tr></thead>
          <tbody>
            ${scans.map(s => `
              <tr>
                <td style="font-size:.75rem;white-space:nowrap">${new Date(s.scan_time).toLocaleString('id-ID',{dateStyle:'short',timeStyle:'short'})}</td>
                <td><span style="font-weight:600;font-size:.8125rem;color:${resultColor[s.result]||'var(--text-secondary)'}">${resultIcon[s.result]||'?'} ${s.result}</span></td>
                <td style="font-size:.8125rem">${s.visitor_name || '—'}</td>
                <td style="font-size:.8125rem">${s.ticket_type  || '—'}</td>
                <td style="font-size:.8125rem">${s.site_name    || '—'}</td>
                <td style="font-size:.75rem;color:var(--text-tertiary)">${s.scanner_name || 'System'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  },

  renderCharts(stats, daily) {

    this._drawRevenueChart(daily);
    this._drawStatusChart(stats);

    // Redraw charts when container resizes (e.g. sidebar collapse)
    if (!this._resizeObs) {
      this._resizeObs = new ResizeObserver(() => {
        if (this._lastStats && this._lastDaily) {
          this._drawRevenueChart(this._lastDaily);
          this._drawStatusChart(this._lastStats);
        }
      });
      const chartsRow = document.getElementById('charts-row');
      if (chartsRow) this._resizeObs.observe(chartsRow);
    }
    this._lastStats = stats;
    this._lastDaily = daily;
  },

  _drawRevenueChart(daily) {
    const canvas = document.getElementById('revenue-chart');
    if (!canvas || !daily.length) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth || 400;
    const H = 200;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const pad = { top: 16, right: 16, bottom: 36, left: 58 };
    const w = W - pad.left - pad.right;
    const h = H - pad.top  - pad.bottom;
    const vals = daily.map(d => parseFloat(d.revenue));
    const max  = Math.max(...vals, 1);

    // Grid
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const gridColor = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
    const textColor = isDark ? '#475569' : '#94a3b8';

    ctx.strokeStyle = gridColor; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + h * (1 - i / 4);
      ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + w, y); ctx.stroke();
      ctx.fillStyle = textColor; ctx.font = '10px Inter'; ctx.textAlign = 'right';
      ctx.fillText(fmtShort(max * i / 4), pad.left - 6, y + 4);
    }

    if (vals.length < 2) return;
    const stepX = w / (vals.length - 1);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + h);
    grad.addColorStop(0, 'rgba(59,130,246,.25)');
    grad.addColorStop(1, 'rgba(59,130,246,.0)');
    ctx.beginPath();
    vals.forEach((v, i) => {
      const x = pad.left + i * stepX, y = pad.top + h * (1 - v / max);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.left + (vals.length - 1) * stepX, pad.top + h);
    ctx.lineTo(pad.left, pad.top + h);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath(); ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2;
    vals.forEach((v, i) => {
      const x = pad.left + i * stepX, y = pad.top + h * (1 - v / max);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    vals.forEach((v, i) => {
      if (i % Math.ceil(vals.length / 8) !== 0 && i !== vals.length - 1) return;
      const x = pad.left + i * stepX, y = pad.top + h * (1 - v / max);
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#3b82f6'; ctx.fill();
      ctx.strokeStyle = isDark ? '#1e293b' : '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    });

    // X labels
    ctx.fillStyle = textColor; ctx.font = '10px Inter'; ctx.textAlign = 'center';
    const skip = Math.ceil(daily.length / 7);
    daily.forEach((d, i) => {
      if (i % skip !== 0) return;
      const x = pad.left + i * stepX;
      ctx.fillText(new Date(d.date).toLocaleDateString('id-ID', { day:'2-digit', month:'short' }), x, H - 8);
    });

    // Update total badge
    const total = vals.reduce((a, b) => a + b, 0);
    const badge = document.getElementById('chart-total');
    if (badge) badge.textContent = formatIDR(total);
  },

  _drawStatusChart(stats) {
    const canvas = document.getElementById('status-chart');
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.max(canvas.offsetWidth || 240, 200);
    const H = 200;
    canvas.width  = W * dpr; canvas.height = H * dpr;
    canvas.style.height = H + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const labels = ['Pending','Confirmed','Completed','Cancelled'];
    const values = [stats.pending.count, stats.confirmed.count, stats.completed.count, stats.cancelled.count];
    const colors = ['#f59e0b','#3b82f6','#10b981','#ef4444'];
    const total  = values.reduce((a, b) => a + b, 0) || 1;

    // Adapt layout: if narrow, put legend below doughnut
    const isNarrow = W < 260;
    const cx = isNarrow ? W / 2 : W * 0.38;
    const cy = isNarrow ? 80 : H / 2;
    const r  = Math.min(isNarrow ? W / 2 - 20 : W * 0.38 - 20, cy - 20, 75);
    const inner = r * 0.58;
    let angle = -Math.PI / 2;

    values.forEach((v, i) => {
      const slice = (v / total) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = colors[i]; ctx.fill();
      angle += slice;
    });

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2);
    ctx.fillStyle = isDark ? '#1e293b' : '#ffffff'; ctx.fill();

    ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a';
    ctx.font = `bold ${isNarrow ? 16 : 18}px Inter`;
    ctx.textAlign = 'center';
    ctx.fillText(total, cx, cy + 6);
    ctx.font = '10px Inter'; ctx.fillStyle = isDark ? '#475569' : '#94a3b8';
    ctx.fillText('Total', cx, cy + 20);

    // Legend
    if (isNarrow) {
      // Horizontal legend below chart
      const legendY = cy + r + 20;
      const colW = W / 2;
      labels.forEach((l, i) => {
        const lx = (i % 2) * colW + 8;
        const ly = legendY + Math.floor(i / 2) * 28;
        ctx.fillStyle = colors[i]; ctx.fillRect(lx, ly, 10, 10);
        ctx.fillStyle = isDark ? '#94a3b8' : '#475569'; ctx.font = '10px Inter'; ctx.textAlign = 'left';
        ctx.fillText(l, lx + 14, ly + 9);
        ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a'; ctx.font = 'bold 10px Inter';
        ctx.fillText(values[i], lx + 14, ly + 21);
      });
    } else {
      const lx = cx + r + 16;
      const availW = W - lx - 4;
      labels.forEach((l, i) => {
        const ly = 28 + i * Math.floor((H - 28) / labels.length);
        ctx.fillStyle = colors[i]; ctx.fillRect(lx, ly - 8, 10, 10);
        const label = availW < 60 ? `${values[i]}` : l;
        ctx.fillStyle = isDark ? '#94a3b8' : '#475569'; ctx.font = '10px Inter'; ctx.textAlign = 'left';
        ctx.fillText(label, lx + 14, ly + 2);
        if (availW >= 60) {
          ctx.fillStyle = isDark ? '#f1f5f9' : '#0f172a'; ctx.font = 'bold 10px Inter';
          ctx.fillText(values[i], lx + 14, ly + 14);
        }
      });
    }
  },
};

// SVG icon snippets
const mapSvg   = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
const usersSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
const calSvg   = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>`;
const trendSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`;
const clockSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
const checkSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
const xSvg     = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;
const qrSvg    = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/><rect width="3" height="3" x="5" y="5"/><rect width="3" height="3" x="16" y="5"/><rect width="3" height="3" x="5" y="16"/><path d="M14 14h3"/><path d="M14 17h7"/><path d="M17 14v3"/><path d="M21 14v7"/><path d="M21 17h-4"/></svg>`;
function fmtShort(n) { if (n>=1e9) return (n/1e9).toFixed(1)+'B'; if (n>=1e6) return (n/1e6).toFixed(1)+'M'; if (n>=1e3) return (n/1e3).toFixed(0)+'K'; return Math.round(n); }
