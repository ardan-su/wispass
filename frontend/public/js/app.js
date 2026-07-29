/**
 * WisataPass – App Bootstrap
 *
 * IMPORTANT: This file uses a top-level try/catch pattern that works even
 * when the ES module import graph fails to resolve. The loader is always
 * removed — no user ever sees a stuck loading screen.
 */

// ── 1. Apply theme immediately (no imports needed) ────────────
document.documentElement.setAttribute(
  'data-theme',
  localStorage.getItem('wp_theme') || 'light'
);

// ── 2. Hard-kill loader after 8 seconds (absolute fallback) ──
function removeLoader() {
  const el = document.getElementById('page-loading');
  if (!el) return;
  el.style.transition  = 'opacity 0.25s ease';
  el.style.opacity     = '0';
  el.style.pointerEvents = 'none';
  setTimeout(() => { try { el.remove(); } catch(_) {} }, 260);
}
const loaderTimer = setTimeout(removeLoader, 8000);

// ── 3. Show a friendly error if JS crashes ────────────────────
function showCrash(message) {
  removeLoader();
  document.getElementById('app').innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;
      min-height:100vh;flex-direction:column;gap:14px;
      font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;
      padding:20px;text-align:center;background:#f8fafc">
      <div style="font-size:2.5rem">⚠️</div>
      <h2 style="font-size:1.125rem;font-weight:700;color:#0f172a;margin:0">
        WisataPass failed to load</h2>
      <p style="color:#64748b;font-size:.875rem;margin:0;max-width:380px;line-height:1.6">
        ${message}</p>
      <button onclick="location.reload()"
        style="margin-top:6px;padding:10px 22px;background:#3b82f6;color:#fff;
          border:none;border-radius:8px;cursor:pointer;font-weight:500;font-size:.875rem">
        Reload Page
      </button>
    </div>`;
}

// ── 4. Main bootstrap (dynamic import so import errors are catchable) ──
async function run() {
  // Dynamic imports are catchable unlike static top-level imports
  const [
    { auth },
    { router },
    { socket },
    { toast },
    { modal },
  ] = await Promise.all([
    import('./components/auth.js'),
    import('./components/router.js'),
    import('./components/socket.js'),
    import('./components/toast.js'),
    import('./components/modal.js'),
  ]);

  // Expose globals
  window.toast = toast;
  window.modal = modal;

  // Init auth from localStorage
  auth.init();

  // Connect socket if logged in
  if (auth.isLoggedIn()) {
    try { socket.connect(auth.getToken()); } catch (_) {}
  }

  // Start router — this removes the loader and renders the first page
  await router.init();
  clearTimeout(loaderTimer);

  // Lazy-load interactions AFTER page is painted (non-blocking)
  if (auth.isLoggedIn()) {
    import('./components/interactions.js')
      .then(async ({ initInteractions, buildBottomNav }) => {
        initInteractions(document);
        try {
          const { api } = await import('./components/api.js');
          const r = await api.notifications.unreadCount();
          buildBottomNav(auth.getRole(), r.count || 0);
        } catch (_) {
          buildBottomNav(auth.getRole(), 0);
        }
      })
      .catch(() => {}); // non-fatal
  }
}

run().catch(err => {
  clearTimeout(loaderTimer);
  console.error('WisataPass bootstrap error:', err);
  showCrash(err.message || 'Unknown error. Check the browser console for details.');
});
