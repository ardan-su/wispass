/**
 * Shared layout – sidebar, topbar, dark mode, Lucide icons
 */
import { auth } from './auth.js';
import { api }  from './api.js';

/* ── Lucide icon helper ─────────────────────────────────────── */
function icon(name, size = 18) {
  return `<svg class="lucide" width="${size}" height="${size}" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" data-lucide="${name}">
    <use href="#lucide-${name}" />
  </svg>`;
}

// Inline SVG paths for the icons we need (avoids external sprite dependency)
const ICON_PATHS = {
  'layout-dashboard':    `<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>`,
  'map-pin':             `<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`,
  'ticket':              `<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>`,
  'clipboard-list':      `<rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>`,
  'users':               `<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>`,
  'tag':                 `<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>`,
  'qr-code':             `<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>`,
  'bar-chart-2':         `<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>`,
  'home':                `<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
  'compass':             `<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>`,
  'bell':                `<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>`,
  'user':                `<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`,
  'log-out':             `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>`,
  'settings':            `<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>`,
  'sun':                 `<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>`,
  'moon':                `<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>`,
  'panel-left-close':    `<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m16 15-3-3 3-3"/>`,
  'panel-left-open':     `<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/><path d="m14 9 3 3-3 3"/>`,
  'chevron-right':       `<polyline points="9 18 15 12 9 6"/>`,
  'menu':                `<line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/>`,
  'x':                   `<path d="M18 6 6 18"/><path d="m6 6 12 12"/>`,
  'plus':                `<path d="M5 12h14"/><path d="M12 5v14"/>`,
  'pencil':              `<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>`,
  'trash-2':             `<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>`,
  'eye':                 `<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>`,
  'check-circle':        `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>`,
  'x-circle':            `<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>`,
  'download':            `<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>`,
  'printer':             `<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>`,
  'image':               `<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>`,
  'search':              `<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>`,
  'filter':              `<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>`,
  'calendar':            `<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>`,
  'credit-card':         `<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>`,
  'star':                `<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>`,
  'map':                 `<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/>`,
  'trending-up':         `<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>`,
};

function svgIcon(name, size = 18, cls = '') {
  const paths = ICON_PATHS[name] || `<circle cx="12" cy="12" r="3"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
    class="nav-item-icon${cls ? ' ' + cls : ''}" aria-hidden="true">${paths}</svg>`;
}

export { svgIcon };

/* ── Nav definitions ────────────────────────────────────────── */
const CUSTOMER_NAV = [
  { icon: 'home',          label: 'Home',          href: '#/' },
  { icon: 'compass',       label: 'Browse',        href: '#/browse' },
  { icon: 'ticket',        label: 'My Tickets',    href: '#/my-tickets' },
  { icon: 'clipboard-list',label: 'My Bookings',   href: '#/my-bookings' },
  { icon: 'bell',          label: 'Notifications', href: '#/notifications' },
  { icon: 'user',          label: 'Profile',       href: '#/profile' },
];

const ADMIN_NAV = [
  { section: 'Overview' },
  { icon: 'layout-dashboard', label: 'Dashboard',      href: '#/admin' },
  { section: 'Management' },
  { icon: 'map-pin',           label: 'Attractions',    href: '#/admin/attractions' },
  { icon: 'clipboard-list',    label: 'Bookings',       href: '#/admin/bookings' },
  { icon: 'users',             label: 'Customers',      href: '#/admin/customers' },
  { icon: 'tag',               label: 'Promotions',     href: '#/admin/promotions' },
  { section: 'Tools' },
  { icon: 'qr-code',           label: 'QR Management',  href: '#/admin/qr' },
  { icon: 'scan-line',         label: 'Gate Scanner',   href: '#/admin/gate' },
  { icon: 'shield-check',      label: 'Scan QR (Legacy)', href: '#/admin/tickets/validate' },
  { icon: 'bar-chart-2',       label: 'Reports',        href: '#/admin/reports' },
];

function buildNavItems(items, collapsed = false) {
  return items.map(item => {
    if (item.section) {
      return `<div class="nav-section" aria-hidden="true">
        <span class="nav-section-label">${item.section}</span>
      </div>`;
    }
    return `<a href="${item.href}" class="nav-item" data-href="${item.href}"
        data-tooltip="${item.label}" role="menuitem"
        aria-label="${item.label}">
        ${svgIcon(item.icon)}
        <span class="nav-item-label">${item.label}</span>
      </a>`;
  }).join('');
}

function initials(name) {
  return (name || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

function sidebarHTML(navItems) {
  const user = auth.getUser();
  return `
  <aside class="sidebar" id="sidebar" role="navigation" aria-label="Main navigation">
    <div class="sidebar-logo">
      <svg class="sidebar-logo-icon" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="9" fill="url(#slg)"/>
        <path d="M8 16h4l2-5 4 10 2-5h4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <defs><linearGradient id="slg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stop-color="#60a5fa"/><stop offset="1" stop-color="#2563eb"/>
        </linearGradient></defs>
      </svg>
      <div class="sidebar-logo-text">
        <div class="sidebar-logo-name">WisataPass</div>
        <div class="sidebar-logo-badge">${auth.isAdmin() ? 'Admin' : 'Customer'}</div>
      </div>
    </div>
    <nav class="sidebar-nav" role="menu">${navItems}</nav>
    <div class="sidebar-bottom">
      <div class="sidebar-user" id="sidebar-user-btn" role="button" tabindex="0" aria-haspopup="true" aria-label="User menu">
        <div class="sidebar-user-avatar" aria-hidden="true">
          ${user?.avatar
            ? `<img src="${user.avatar}" alt="${user.fullName || user.username}" />`
            : initials(user?.fullName || user?.username)}
        </div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${user?.fullName || user?.username || 'User'}</div>
          <div class="sidebar-user-role">${user?.role || 'user'}</div>
        </div>
      </div>
      <div class="dropdown-menu hidden" id="sidebar-dropdown" role="menu">
        <a class="dropdown-item" href="#/profile" role="menuitem">
          ${svgIcon('user', 15)} Profile
        </a>
        <div class="dropdown-divider" role="separator"></div>
        <div class="dropdown-item danger" id="sidebar-logout-btn" role="menuitem" tabindex="0">
          ${svgIcon('log-out', 15)} Sign out
        </div>
      </div>
    </div>
  </aside>`;
}

function topbarHTML(title = '') {
  const user = auth.getUser();
  const theme = document.documentElement.getAttribute('data-theme') || 'light';
  return `
  <header class="topbar" role="banner">
    <div class="topbar-left">
      <button class="hamburger btn" id="hamburger-btn" aria-label="Open menu" aria-expanded="false">
        ${svgIcon('menu', 20)}
      </button>
      <button class="sidebar-toggle btn" id="sidebar-toggle-btn"
        aria-label="Toggle sidebar" title="Toggle sidebar">
        ${svgIcon('panel-left-close', 18)}
      </button>
      <span class="topbar-title" id="topbar-title">${title}</span>
    </div>
    <div class="topbar-right">
      <button class="theme-toggle topbar-btn" id="theme-toggle-btn"
        aria-label="Toggle dark mode" title="Toggle theme">
        ${theme === 'dark' ? svgIcon('sun', 18) : svgIcon('moon', 18)}
      </button>
      <a href="${auth.isAdmin() ? '#/notifications' : '#/notifications'}"
        class="topbar-btn" id="notif-btn" aria-label="Notifications">
        ${svgIcon('bell', 18)}
        <span class="notif-badge-dot hidden" id="notif-badge" aria-label="Unread notifications"></span>
      </a>
      <div class="dropdown" id="topbar-dropdown-wrap">
        <button class="btn btn-ghost btn-icon" id="topbar-avatar-btn"
          aria-label="User menu" aria-haspopup="true" aria-expanded="false"
          style="width:34px;height:34px;border-radius:50%;padding:0;overflow:hidden;background:var(--accent-subtle);color:var(--accent);font-size:.75rem;font-weight:700;">
          ${user?.avatar ? `<img src="${user.avatar}" alt="" style="width:100%;height:100%;object-fit:cover;" />` : initials(user?.fullName)}
        </button>
        <div class="dropdown-menu hidden" id="topbar-dropdown" role="menu">
          <div style="padding:10px 14px;border-bottom:1px solid var(--border)">
            <div style="font-size:.8125rem;font-weight:600;color:var(--text-primary)">${user?.fullName || user?.username}</div>
            <div style="font-size:.72rem;color:var(--text-tertiary)">${user?.email || ''}</div>
          </div>
          <a class="dropdown-item" href="#/profile" role="menuitem">${svgIcon('user', 15)} Profile</a>
          <div class="dropdown-divider" role="separator"></div>
          <div class="dropdown-item danger" id="topbar-logout-btn" role="menuitem" tabindex="0">
            ${svgIcon('log-out', 15)} Sign out
          </div>
        </div>
      </div>
    </div>
  </header>`;
}

function bindLayoutEvents() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const COLLAPSED_KEY = 'wp_sidebar_collapsed';

  // Restore collapsed state (desktop only)
  if (window.innerWidth > 768 && localStorage.getItem(COLLAPSED_KEY) === 'true') {
    sidebar.classList.add('collapsed');
    document.querySelector('.main-content')?.classList.add('sidebar-collapsed');
    const toggleBtn = document.getElementById('sidebar-toggle-btn');
    if (toggleBtn) toggleBtn.innerHTML = svgIcon('panel-left-open', 18);
  }

  // Desktop sidebar toggle (collapse/expand)
  document.getElementById('sidebar-toggle-btn')?.addEventListener('click', () => {
    if (window.innerWidth <= 768) return;
    const collapsed = sidebar.classList.toggle('collapsed');
    document.querySelector('.main-content')?.classList.toggle('sidebar-collapsed', collapsed);
    const btn = document.getElementById('sidebar-toggle-btn');
    if (btn) btn.innerHTML = collapsed ? svgIcon('panel-left-open', 18) : svgIcon('panel-left-close', 18);
    localStorage.setItem(COLLAPSED_KEY, collapsed);
  });

  // Mobile hamburger
  const openMobile = () => {
    sidebar.classList.add('mobile-open');
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    document.getElementById('hamburger-btn')?.setAttribute('aria-expanded', 'true');
  };
  const closeMobile = () => {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    document.getElementById('hamburger-btn')?.setAttribute('aria-expanded', 'false');
  };
  document.getElementById('hamburger-btn')?.addEventListener('click', openMobile);
  overlay?.addEventListener('click', closeMobile);

  // Close mobile sidebar on nav click
  sidebar.querySelectorAll('.nav-item').forEach(a => {
    a.addEventListener('click', () => { if (window.innerWidth <= 768) closeMobile(); });
  });

  // Dark mode toggle
  document.getElementById('theme-toggle-btn')?.addEventListener('click', () => {
    const html  = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const next  = isDark ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('wp_theme', next);
    const btn = document.getElementById('theme-toggle-btn');
    if (btn) btn.innerHTML = next === 'dark' ? svgIcon('sun', 18) : svgIcon('moon', 18);
  });

  // Logout
  const doLogout = () => {
    import('./auth.js').then(({ auth }) => {
      auth.logout();
      window.location.hash = '#/login';
    });
  };
  document.getElementById('sidebar-logout-btn')?.addEventListener('click', doLogout);
  document.getElementById('topbar-logout-btn')?.addEventListener('click', doLogout);

  // Sidebar user dropdown
  const sidebarUserBtn = document.getElementById('sidebar-user-btn');
  const sidebarDropdown = document.getElementById('sidebar-dropdown');
  sidebarUserBtn?.addEventListener('click', () => sidebarDropdown?.classList.toggle('hidden'));
  sidebarUserBtn?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sidebarDropdown?.classList.toggle('hidden'); } });

  // Topbar avatar dropdown
  const topbarAvatarBtn = document.getElementById('topbar-avatar-btn');
  const topbarDropdown  = document.getElementById('topbar-dropdown');
  topbarAvatarBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = topbarDropdown?.classList.toggle('hidden') === false;
    topbarAvatarBtn.setAttribute('aria-expanded', !topbarDropdown?.classList.contains('hidden'));
  });

  // Close dropdowns on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('#topbar-dropdown-wrap')) topbarDropdown?.classList.add('hidden');
    if (!e.target.closest('.sidebar-bottom')) sidebarDropdown?.classList.add('hidden');
  });

  // Active nav highlight
  const setActive = () => {
    const hash = window.location.hash || '#/';
    document.querySelectorAll('.nav-item').forEach(a => {
      const href = a.getAttribute('data-href');
      const active = hash === href || (href !== '#/' && hash.startsWith(href));
      a.classList.toggle('active', active);
      a.setAttribute('aria-current', active ? 'page' : 'false');
    });
  };
  setActive();
  window.addEventListener('hashchange', setActive);

  // Notification badge
  api.notifications.unreadCount().then(r => {
    const badge = document.getElementById('notif-badge');
    if (badge && r.count > 0) {
      badge.textContent = r.count > 99 ? '99+' : r.count;
      badge.classList.remove('hidden');
      badge.classList.add('has-count');
    }
  }).catch(() => {});
}

export function renderLayout(app) {
  // Only rebuild if we're not already in customer layout
  if (document.getElementById('page-content') && !document.getElementById('sidebar')?.dataset.role?.includes('admin')) return;
  const navItems = buildNavItems(CUSTOMER_NAV);
  app.innerHTML = `
    <div class="app-layout">
      ${sidebarHTML(navItems)}
      <div class="main-content" id="main-content">
        ${topbarHTML()}
        <main class="page-content" id="page-content" role="main"></main>
      </div>
    </div>`;
  document.getElementById('sidebar').dataset.role = 'customer';
  bindLayoutEvents();
}

export function renderAdminLayout(app) {
  // Only rebuild if we're not already in admin layout
  if (document.getElementById('page-content') && document.getElementById('sidebar')?.dataset.role === 'admin') return;
  const navItems = buildNavItems(ADMIN_NAV);
  app.innerHTML = `
    <div class="app-layout">
      ${sidebarHTML(navItems)}
      <div class="main-content" id="main-content">
        ${topbarHTML('Dashboard')}
        <main class="page-content" id="page-content" role="main"></main>
      </div>
    </div>`;
  document.getElementById('sidebar').dataset.role = 'admin';
  bindLayoutEvents();
}

export function setPageTitle(title) {
  const el = document.getElementById('topbar-title');
  if (el) el.textContent = title;
  document.title = `${title} – WisataPass`;
}
