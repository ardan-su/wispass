/**
 * WisataPass – Hash Router
 * Uses dynamic imports for layouts to avoid circular dependency issues.
 */
import { auth } from './auth.js';

// ── Page registry (all lazy) ──────────────────────────────────
const pages = {
  '/login':                  () => import('../pages/login.js'),
  '/register':               () => import('../pages/register.js'),
  '/':                       () => import('../customer/home.js'),
  '/browse':                 () => import('../customer/browse.js'),
  '/attraction/:id':         () => import('../customer/attractionDetail.js'),
  '/booking/:id':            () => import('../customer/bookingDetail.js'),
  '/book/:id':               () => import('../customer/bookNow.js'),
  '/my-tickets':             () => import('../customer/myTickets.js'),
  '/my-bookings':            () => import('../customer/myBookings.js'),
  '/profile':                () => import('../customer/profile.js'),
  '/notifications':          () => import('../customer/notifications.js'),
  '/admin':                  () => import('../admin/dashboard.js'),
  '/admin/attractions':      () => import('../admin/attractions.js'),
  '/admin/attractions/new':  () => import('../admin/attractionForm.js'),
  '/admin/attractions/:id':  () => import('../admin/attractionForm.js'),
  '/admin/bookings':         () => import('../admin/bookings.js'),
  '/admin/bookings/:id':     () => import('../admin/bookingDetail.js'),
  '/admin/customers':        () => import('../admin/customers.js'),
  '/admin/customers/:id':    () => import('../admin/customerDetail.js'),
  '/admin/promotions':       () => import('../admin/promotions.js'),
  '/admin/reports':          () => import('../admin/reports.js'),
  '/admin/tickets/validate': () => import('../admin/validateTicket.js'),
  '/admin/qr':               () => import('../admin/qrManagement.js'),
  '/admin/qr/:id':           () => import('../admin/qrDetail.js'),
  '/admin/gate':             () => import('../admin/gateScanner.js'),
};

// ── Route matching ────────────────────────────────────────────
function matchRoute(hash) {
  const path = (hash || '').replace(/^#/, '') || '/';
  if (pages[path]) return { module: pages[path], params: {} };
  for (const pattern of Object.keys(pages)) {
    const rx = new RegExp('^' + pattern.replace(/:[\w]+/g, '([^/]+)') + '$');
    const m  = path.match(rx);
    if (m) {
      const keys   = (pattern.match(/:[\w]+/g) || []).map(k => k.slice(1));
      const params = Object.fromEntries(keys.map((k, i) => [k, m[i + 1]]));
      return { module: pages[pattern], params };
    }
  }
  return null;
}

// ── Remove loader (called early so users never get stuck) ─────
function removeLoader() {
  const el = document.getElementById('page-loading');
  if (!el) return;
  el.style.transition    = 'opacity 0.22s ease';
  el.style.opacity       = '0';
  el.style.pointerEvents = 'none';
  setTimeout(() => { try { el.remove(); } catch (_) {} }, 240);
}

// ── Page fade-in ──────────────────────────────────────────────
function fadeIn(el) {
  if (!el) return;
  el.style.opacity    = '0';
  el.style.transform  = 'translateY(8px)';
  el.style.transition = 'none';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.style.transition = 'opacity 220ms ease, transform 220ms cubic-bezier(.4,0,.2,1)';
    el.style.opacity    = '1';
    el.style.transform  = 'none';
  }));
}

// ── Layout role tracking ──────────────────────────────────────
let _layoutRole = null;

async function ensureLayout(role, app) {
  if (_layoutRole === role) return; // already correct layout
  _layoutRole = role;
  const { renderLayout, renderAdminLayout } = await import('./layout.js');
  if (role === 'admin') renderAdminLayout(app);
  else                  renderLayout(app);
}

// ── Main navigate function ────────────────────────────────────
async function navigate(hash) {
  const app  = document.getElementById('app');
  const path = (hash || '').replace(/^#/, '') || '/';

  const match    = matchRoute(hash);
  const isAdmin  = path.startsWith('/admin');
  const isPublic = path === '/login' || path === '/register';

  // Auth guards
  if (!isPublic && !auth.isLoggedIn()) {
    window.location.hash = '#/login';
    return;
  }
  if (isAdmin && !auth.isAdmin()) {
    window.location.hash = '#/';
    return;
  }

  // 404
  if (!match) {
    const target = document.getElementById('page-content') || app;
    target.innerHTML = `
      <div class="empty-state" style="padding:80px 20px">
        <span class="empty-icon">🗺️</span>
        <div class="empty-title">Page Not Found</div>
        <p class="empty-message">The page you're looking for doesn't exist.</p>
        <a href="#/" class="btn btn-primary">Go Home</a>
      </div>`;
    return;
  }

  // Show inline spinner while loading the page module
  const existingContent = document.getElementById('page-content');
  if (existingContent) {
    existingContent.innerHTML =
      `<div class="page-spinner"><div class="spinner"></div></div>`;
  }

  try {
    const mod  = await match.module();
    const page = mod.default || mod;

    if (isPublic) {
      _layoutRole = null;
      app.innerHTML = '';
      await page.render(app, match.params);
      fadeIn(app.firstElementChild || app);
    } else {
      await ensureLayout(isAdmin ? 'admin' : 'customer', app);
      const content = document.getElementById('page-content');
      if (content) {
        await page.render(content, match.params);
        fadeIn(content);
      }
    }

    // Fire-and-forget interactions
    import('./interactions.js')
      .then(({ initInteractions, buildBottomNav }) => {
        const root = document.getElementById('page-content') || app;
        initInteractions(root);
        if (auth.isLoggedIn() && window.innerWidth <= 768) {
          buildBottomNav(auth.getRole());
        }
      })
      .catch(() => {});

    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (err) {
    console.error('[Router] navigation error:', err);
    const target = document.getElementById('page-content') || app;
    target.innerHTML = `
      <div class="empty-state" style="padding:80px 20px">
        <span class="empty-icon">⚠️</span>
        <div class="empty-title">Something went wrong</div>
        <p class="empty-message">${err.message}</p>
        <a href="#/" class="btn btn-secondary">← Go Home</a>
      </div>`;
  }
}

// ── Public API ────────────────────────────────────────────────
export const router = {
  async init() {
    // Remove loader FIRST — before any async work
    removeLoader();

    window.addEventListener('hashchange', () =>
      navigate(window.location.hash || '#/')
    );

    await navigate(window.location.hash || '#/');
  },
  push(hash) { window.location.hash = hash; },
};
