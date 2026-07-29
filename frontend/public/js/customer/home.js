import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { formatIDR, formatDate, statusBadge } from '../components/helpers.js';

export default {
  async render(el) {
    setPageTitle('Home');
    const user = (await import('../components/auth.js')).auth.getUser();

    el.innerHTML = `
      <!-- Hero banner -->
      <div style="background:linear-gradient(135deg,var(--accent-subtle) 0%,var(--surface) 100%);border:1px solid var(--accent-border);border-radius:var(--radius-xl);padding:28px 32px;margin-bottom:24px;display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;position:relative;overflow:hidden">
        <div style="position:absolute;right:-20px;top:-20px;width:200px;height:200px;background:radial-gradient(circle,var(--accent-subtle) 0%,transparent 70%);pointer-events:none"></div>
        <div style="position:relative">
          <p style="font-size:.8125rem;color:var(--accent);font-weight:600;margin-bottom:4px;text-transform:uppercase;letter-spacing:.06em">Welcome back 👋</p>
          <h2 style="font-size:1.5rem;font-weight:800;letter-spacing:-.03em;margin-bottom:8px">${user?.fullName || user?.username || 'Traveler'}</h2>
          <p style="font-size:.9rem;color:var(--text-secondary);margin-bottom:20px;max-width:380px">Discover amazing destinations across Indonesia. Book your next adventure today.</p>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <a href="#/browse" class="btn btn-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>
              Browse Attractions
            </a>
            <a href="#/my-tickets" class="btn btn-secondary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/></svg>
              My Tickets
            </a>
          </div>
        </div>
        <div style="font-size:5rem;line-height:1;user-select:none" aria-hidden="true">🗺️</div>
      </div>

      <div id="dashboard-content">
        <div class="stat-grid" style="margin-bottom:20px">
          ${[...Array(3)].map(() => `<div class="stat-card"><div class="skeleton" style="width:42px;height:42px;border-radius:var(--radius);flex-shrink:0"></div><div class="stat-info"><div class="skeleton skeleton-text" style="width:70%"></div><div class="skeleton" style="height:26px;width:50%;border-radius:var(--radius-sm)"></div></div></div>`).join('')}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          ${[...Array(2)].map(() => `<div class="card"><div class="skeleton skeleton-title"></div>${[...Array(3)].map(() => `<div class="skeleton skeleton-text"></div>`).join('')}</div>`).join('')}
        </div>
      </div>`;

    try {
      const data = await api.dashboard.customer();
      document.getElementById('dashboard-content').innerHTML = `
        <div class="stat-grid" style="margin-bottom:20px">
          <div class="stat-card">
            <div class="stat-icon blue"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/></svg></div>
            <div class="stat-info"><div class="stat-label">Active Tickets</div><div class="stat-value">${data.upcomingTickets.length}</div><div class="stat-sub">Upcoming visits</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg></div>
            <div class="stat-info"><div class="stat-label">Total Spent</div><div class="stat-value" style="font-size:1.1rem">${formatIDR(data.totalSpend)}</div></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon yellow"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg></div>
            <div class="stat-info"><div class="stat-label">Unread Alerts</div><div class="stat-value">${data.unreadNotifications}</div></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="card">
            <div class="card-header">
              <span class="card-title">Upcoming Visits</span>
              <a href="#/my-tickets" class="btn btn-ghost btn-sm" style="color:var(--accent)">View all →</a>
            </div>
            ${data.upcomingTickets.length ? data.upcomingTickets.map(t => `
              <a href="#/my-tickets" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle);text-decoration:none">
                <div style="width:40px;height:40px;border-radius:var(--radius);background:var(--accent-subtle);display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0">🎡</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:.875rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.attraction_name}</div>
                  <div style="font-size:.75rem;color:var(--text-tertiary)">${formatDate(t.visit_date, {day:'2-digit',month:'short'})} · ${t.ticket_type_name}</div>
                </div>
                ${statusBadge(t.status)}
              </a>`).join('')
            : `<div class="empty-state" style="padding:28px">
                <span class="empty-icon" style="font-size:2.25rem">🎫</span>
                <div class="empty-title">No upcoming visits</div>
                <a href="#/browse" class="btn btn-primary btn-sm" style="margin-top:8px">Book Now</a>
              </div>`}
          </div>

          <div class="card">
            <div class="card-header">
              <span class="card-title">Recent Bookings</span>
              <a href="#/my-bookings" class="btn btn-ghost btn-sm" style="color:var(--accent)">View all →</a>
            </div>
            ${data.recentBookings.length ? data.recentBookings.map(b => `
              <a href="#/booking/${b.id}" style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border-subtle);text-decoration:none">
                <div style="flex:1;min-width:0">
                  <div style="font-size:.875rem;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${b.attraction_name}</div>
                  <div style="font-size:.75rem;color:var(--text-tertiary);font-family:var(--font-mono)">${b.booking_code}</div>
                </div>
                <div style="text-align:right;flex-shrink:0">
                  <div style="font-size:.8125rem;font-weight:600;color:var(--text-primary)">${formatIDR(b.total_amount)}</div>
                  ${statusBadge(b.status)}
                </div>
              </a>`).join('')
            : `<div class="empty-state" style="padding:28px"><span class="empty-icon" style="font-size:2.25rem">📋</span><div class="empty-title">No bookings yet</div></div>`}
          </div>
        </div>`;
    } catch (err) {
      document.getElementById('dashboard-content').innerHTML =
        `<div style="padding:20px;color:var(--danger);font-size:.875rem">${err.message}</div>`;
    }
  },
};
