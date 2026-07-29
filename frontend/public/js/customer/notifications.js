import { api }    from '../components/api.js';
import { setPageTitle } from '../components/layout.js';
import { timeAgo, paginationHTML, bindPagination, emptyState, qs } from '../components/helpers.js';

const TYPE_META = {
  booking_confirmed: { icon: '✅', color: 'var(--success)',  bg: 'var(--success-bg)',  border: 'var(--success-border)'  },
  booking_cancelled: { icon: '❌', color: 'var(--danger)',   bg: 'var(--danger-bg)',   border: 'var(--danger-border)'   },
  ticket_ready:      { icon: '🎫', color: 'var(--accent)',   bg: 'var(--accent-subtle)',border: 'var(--accent-border)'  },
  ticket_used:       { icon: '📍', color: 'var(--text-secondary)', bg: 'var(--bg-secondary)', border: 'var(--border)' },
  payment_received:  { icon: '💳', color: 'var(--success)',  bg: 'var(--success-bg)',  border: 'var(--success-border)'  },
  review_reminder:   { icon: '⭐', color: 'var(--warning)',  bg: 'var(--warning-bg)',  border: 'var(--warning-border)'  },
};
const DEFAULT_META = { icon: '🔔', color: 'var(--text-secondary)', bg: 'var(--bg-secondary)', border: 'var(--border)' };

let state = { page: 1, unreadOnly: false };

export default {
  async render(el) {
    setPageTitle('Notifications');
    el.innerHTML = `
      <div class="page-header">
        <div class="page-header-left">
          <h2>Notifications</h2>
          <p style="font-size:.875rem;color:var(--text-secondary);margin-top:2px">Stay updated on your bookings and tickets</p>
        </div>
        <div class="page-header-actions">
          <label style="display:flex;align-items:center;gap:7px;font-size:.8125rem;cursor:pointer;padding:6px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface);user-select:none">
            <input type="checkbox" id="unread-toggle" ${state.unreadOnly?'checked':''} style="accent-color:var(--accent);width:14px;height:14px" />
            Unread only
          </label>
          <button class="btn btn-secondary btn-sm" id="mark-all-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            Mark all read
          </button>
        </div>
      </div>

      <div id="list-area"></div>
      <div id="pagination"></div>`;

    document.getElementById('unread-toggle').addEventListener('change', e => {
      state.unreadOnly = e.target.checked; state.page = 1; this.load();
    });
    document.getElementById('mark-all-btn').addEventListener('click', async () => {
      await api.notifications.markAllRead();
      // Reset badge
      const badge = document.getElementById('notif-badge');
      if (badge) { badge.textContent = '0'; badge.classList.add('hidden'); badge.classList.remove('has-count'); }
      window.toast.success('All caught up!', 'All notifications marked as read.');
      this.load();
    });

    await this.load();
  },

  async load() {
    const area = document.getElementById('list-area');
    area.innerHTML = [...Array(4)].map(() => `
      <div style="display:flex;gap:12px;padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);margin-bottom:8px">
        <div class="skeleton" style="width:38px;height:38px;border-radius:50%;flex-shrink:0"></div>
        <div style="flex:1"><div class="skeleton skeleton-title" style="width:55%"></div><div class="skeleton skeleton-text" style="width:80%"></div><div class="skeleton skeleton-text" style="width:30%"></div></div>
      </div>`).join('');

    try {
      const q   = qs({ page: state.page, limit: 20, unread: state.unreadOnly ? 'true' : undefined });
      const res = await api.notifications.list(q);
      this.renderList(area, res.data);
      const pag = document.getElementById('pagination');
      pag.innerHTML = paginationHTML(res.pagination, p => { state.page = p; this.load(); });
      bindPagination(pag, p => { state.page = p; this.load(); });
    } catch (err) { area.innerHTML = emptyState('⚠️', err.message, ''); }
  },

  renderList(area, rows) {
    if (!rows.length) {
      area.innerHTML = emptyState(
        '🔔', 'No notifications',
        state.unreadOnly ? 'You\'re all caught up! No unread notifications.' : 'You have no notifications yet.'
      );
      return;
    }

    area.innerHTML = rows.map(n => {
      const meta = TYPE_META[n.type] || DEFAULT_META;
      return `
        <div class="notif-item" data-id="${n.id}" data-read="${n.is_read}"
          style="display:flex;gap:12px;padding:14px 16px;background:var(--surface);border:1px solid ${n.is_read?'var(--border)':meta.border};border-radius:var(--radius-lg);margin-bottom:8px;transition:all var(--t-base);${!n.is_read?`border-left:3px solid ${meta.color};background:${meta.bg}`:''}">
          <div style="width:38px;height:38px;border-radius:50%;background:${meta.bg};border:1px solid ${meta.border};display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0" aria-hidden="true">${meta.icon}</div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:3px">
              <div style="font-weight:${n.is_read?'500':'700'};font-size:.875rem;color:var(--text-primary)">${n.title}</div>
              <span style="font-size:.72rem;color:var(--text-tertiary);white-space:nowrap;flex-shrink:0">${timeAgo(n.created_at)}</span>
            </div>
            <p style="font-size:.8125rem;color:var(--text-secondary);line-height:1.5;margin:0">${n.message}</p>
          </div>
          ${!n.is_read ? `
            <button class="btn btn-ghost btn-sm read-btn" data-id="${n.id}" aria-label="Mark as read" title="Mark as read" style="flex-shrink:0;align-self:flex-start;color:var(--text-tertiary)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
            </button>` : ''}
        </div>`;
    }).join('');

    area.querySelectorAll('.read-btn').forEach(btn => {
      btn.addEventListener('click', async e => {
        e.stopPropagation();
        await api.notifications.markRead(btn.dataset.id);
        const item = area.querySelector(`.notif-item[data-id="${btn.dataset.id}"]`);
        if (item) {
          item.style.borderLeft  = '';
          item.style.background  = 'var(--surface)';
          item.style.borderColor = 'var(--border)';
          btn.remove();
          // Update font weight
          const title = item.querySelector('[style*="font-weight"]');
          if (title) title.style.fontWeight = '500';
        }
        // Decrement badge
        const badge = document.getElementById('notif-badge');
        if (badge && badge.classList.contains('has-count')) {
          const cur = parseInt(badge.textContent) - 1;
          if (cur <= 0) { badge.classList.add('hidden'); badge.classList.remove('has-count'); }
          else badge.textContent = cur;
        }
      });
    });
  },
};
