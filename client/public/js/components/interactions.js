/**
 * WisataPass – Micro-interactions Engine
 * Ripple, table→card, bottom nav, lazy-load, scroll-reveal, transitions.
 */

/* ══════════════════════════════════════════════════════════════
   SVG ICON HELPERS  (declared first – used by buildBottomNav)
   ══════════════════════════════════════════════════════════════ */
function s(d, w = 22) {
  return `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="1.8" stroke-linecap="round"
    stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}

const homeSvg    = s(`<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`);
const compassSvg = s(`<circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>`);
const ticketSvg  = s(`<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>`);
const listSvg    = s(`<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>`);
const bellSvg    = s(`<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>`);
const userSvg    = s(`<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>`);
const dashSvg    = s(`<rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/>`);
const mapPinSvg  = s(`<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>`);
const qrSvg      = s(`<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/>`);
const barSvg     = s(`<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>`);

/* ══════════════════════════════════════════════════════════════
   1. RIPPLE EFFECT
   ══════════════════════════════════════════════════════════════ */
function attachRipple(btn) {
  if (btn.dataset.ripple) return;
  btn.dataset.ripple = '1';
  btn.addEventListener('pointerdown', e => {
    if (btn.disabled) return;
    const rect   = btn.getBoundingClientRect();
    const size   = Math.max(rect.width, rect.height) * 2;
    const x      = e.clientX - rect.left - size / 2;
    const y      = e.clientY - rect.top  - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    Object.assign(ripple.style, {
      width: size + 'px', height: size + 'px',
      left:  x    + 'px', top:    y    + 'px',
    });
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  });
}

function initRipples(root = document) {
  root.querySelectorAll('.btn').forEach(attachRipple);
}

/* ══════════════════════════════════════════════════════════════
   2. TABLE → MOBILE CARD  (injects data-label attrs)
   ══════════════════════════════════════════════════════════════ */
function mobiliseTables(root = document) {
  if (window.innerWidth > 768) return;
  root.querySelectorAll('.table-wrapper table').forEach(table => {
    const headers = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
    table.querySelectorAll('tbody tr').forEach(row => {
      [...row.querySelectorAll('td')].forEach((td, i) => {
        if (headers[i]) td.setAttribute('data-label', headers[i]);
      });
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   3. LAZY IMAGE FADE-IN
   ══════════════════════════════════════════════════════════════ */
function initLazyImages(root = document) {
  root.querySelectorAll('img').forEach(img => {
    if (img.complete && img.naturalWidth > 0) {
      img.classList.add('loaded');
    } else {
      img.addEventListener('load',  () => img.classList.add('loaded'), { once: true });
      img.addEventListener('error', () => img.classList.add('loaded'), { once: true });
    }
  });
}

/* ══════════════════════════════════════════════════════════════
   4. INTERSECTION OBSERVER SCROLL-REVEAL
   ══════════════════════════════════════════════════════════════ */
let _observer = null;

function initScrollReveal(root = document) {
  if (!('IntersectionObserver' in window)) {
    // Fallback: just mark everything as revealed
    root.querySelectorAll('.card, .stat-card, .attraction-card, .ticket-card, .notif-item')
      .forEach(el => el.classList.add('wp-revealed'));
    return;
  }

  if (!_observer) {
    _observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('wp-revealed');
        _observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
  }

  root.querySelectorAll(
    '.card:not(.wp-revealed), .stat-card:not(.wp-revealed), ' +
    '.attraction-card:not(.wp-revealed), .ticket-card:not(.wp-revealed), ' +
    '.notif-item:not(.wp-revealed)'
  ).forEach(el => _observer.observe(el));
}

/* ══════════════════════════════════════════════════════════════
   5. BOTTOM NAVIGATION BAR (mobile)
   ══════════════════════════════════════════════════════════════ */
const CUSTOMER_BOTTOM_NAV = [
  { icon: homeSvg,    label: 'Home',     href: '#/' },
  { icon: compassSvg, label: 'Browse',   href: '#/browse' },
  { icon: ticketSvg,  label: 'Tickets',  href: '#/my-tickets' },
  { icon: listSvg,    label: 'Bookings', href: '#/my-bookings' },
  { icon: bellSvg,    label: 'Alerts',   href: '#/notifications', badge: true },
  { icon: userSvg,    label: 'Profile',  href: '#/profile' },
];

const ADMIN_BOTTOM_NAV = [
  { icon: dashSvg,   label: 'Dashboard', href: '#/admin' },
  { icon: mapPinSvg, label: 'Places',    href: '#/admin/attractions' },
  { icon: listSvg,   label: 'Bookings',  href: '#/admin/bookings' },
  { icon: qrSvg,     label: 'Scan QR',   href: '#/admin/tickets/validate' },
  { icon: barSvg,    label: 'Reports',   href: '#/admin/reports' },
];

export function buildBottomNav(role, unreadCount = 0) {
  const container = document.getElementById('bottom-nav-inner');
  if (!container) return;

  const items = role === 'admin' ? ADMIN_BOTTOM_NAV : CUSTOMER_BOTTOM_NAV;
  const hash  = window.location.hash || '#/';

  container.innerHTML = items.map(item => {
    const active = hash === item.href || (item.href !== '#/' && hash.startsWith(item.href));
    const dot    = item.badge && unreadCount > 0
      ? `<span class="bottom-nav-dot" aria-label="${unreadCount} unread"></span>` : '';
    return `<a class="bottom-nav-item${active ? ' active' : ''}"
      href="${item.href}" data-href="${item.href}"
      aria-label="${item.label}" aria-current="${active ? 'page' : 'false'}">
      ${dot}${item.icon}
      <span class="bottom-nav-label">${item.label}</span>
    </a>`;
  }).join('');

  // Sync active state on every hash change
  window.removeEventListener('hashchange', window._bnHashHandler || null);
  window._bnHashHandler = () => {
    const h = window.location.hash || '#/';
    container.querySelectorAll('.bottom-nav-item').forEach(a => {
      const href = a.getAttribute('data-href');
      const on   = h === href || (href !== '#/' && h.startsWith(href));
      a.classList.toggle('active', on);
      a.setAttribute('aria-current', on ? 'page' : 'false');
    });
  };
  window.addEventListener('hashchange', window._bnHashHandler);
}

export function updateBottomNavBadge(count) {
  const dot = document.querySelector('#bottom-nav-inner .bottom-nav-dot');
  if (!dot) return;
  dot.style.display = count > 0 ? 'block' : 'none';
}

/* ══════════════════════════════════════════════════════════════
   6. PAGE TRANSITIONS
   ══════════════════════════════════════════════════════════════ */
const prefersReducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function pageTransitionOut(el) {
  if (!el || prefersReducedMotion()) return Promise.resolve();
  return new Promise(resolve => {
    el.style.transition = 'opacity 130ms ease, transform 130ms ease';
    el.style.opacity    = '0';
    el.style.transform  = 'translateY(5px)';
    setTimeout(resolve, 140);
  });
}

export function pageTransitionIn(el) {
  if (!el || prefersReducedMotion()) return;
  el.style.opacity    = '0';
  el.style.transform  = 'translateY(8px)';
  el.style.transition = 'none';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 240ms ease, transform 240ms cubic-bezier(.4,0,.2,1)';
      el.style.opacity    = '1';
      el.style.transform  = 'none';
    });
  });
}

/* ══════════════════════════════════════════════════════════════
   7. STAGGER HELPER
   ══════════════════════════════════════════════════════════════ */
export function staggerItems(parent, selector = ':scope > *', baseDelay = 0.035) {
  if (!parent) return;
  parent.querySelectorAll(selector).forEach((el, i) => {
    el.style.animationDelay    = (baseDelay * i) + 's';
    el.style.animationFillMode = 'both';
  });
}

/* ══════════════════════════════════════════════════════════════
   8. NUMBER COUNTER ANIMATION
   ══════════════════════════════════════════════════════════════ */
export function animateNumber(el, target, duration = 700) {
  if (!el || prefersReducedMotion()) { el && (el.textContent = target); return; }
  const start = performance.now();
  const from  = parseFloat(el.dataset.from || '0');
  const isFloat = String(target).includes('.');
  function step(now) {
    const p   = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    const val  = from + (target - from) * ease;
    el.textContent = isFloat ? val.toFixed(1) : Math.round(val).toLocaleString('id-ID');
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* ══════════════════════════════════════════════════════════════
   MASTER INIT  (safe to call multiple times)
   ══════════════════════════════════════════════════════════════ */
export function initInteractions(root = document) {
  initRipples(root);
  mobiliseTables(root);
  initLazyImages(root);
  // Slight delay so rendered DOM is fully painted
  setTimeout(() => initScrollReveal(root), 60);
}

/* Auto-run on DOMContentLoaded */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initInteractions());
} else {
  initInteractions();
}

/* Watch for dynamically added buttons / images */
if (typeof MutationObserver !== 'undefined') {
  new MutationObserver(mutations => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.('.btn'))  attachRipple(node);
        node.querySelectorAll?.('.btn').forEach(attachRipple);
        node.querySelectorAll?.('img').forEach(img => {
          if (img.complete && img.naturalWidth > 0) img.classList.add('loaded');
          else {
            img.addEventListener('load',  () => img.classList.add('loaded'), { once: true });
            img.addEventListener('error', () => img.classList.add('loaded'), { once: true });
          }
        });
      }
    }
  }).observe(document.body, { childList: true, subtree: true });
}
