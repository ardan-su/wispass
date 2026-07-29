import { api }  from '../components/api.js';
import { auth } from '../components/auth.js';

export default {
  async render(app) {
    app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <svg class="auth-logo-icon" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="9" fill="url(#rlg)"/>
            <path d="M8 16h4l2-5 4 10 2-5h4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <defs><linearGradient id="rlg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stop-color="#60a5fa"/><stop offset="1" stop-color="#2563eb"/>
            </linearGradient></defs>
          </svg>
          <span class="auth-logo-name">WisataPass</span>
        </div>

        <h1 class="auth-heading">Create account</h1>
        <p class="auth-sub">Start booking tickets to amazing destinations.</p>

        <form id="reg-form" novalidate>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px">
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label" for="fullName">Full Name <span class="req">*</span></label>
              <input type="text" class="form-control" id="fullName" placeholder="John Doe" autocomplete="name" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="username">Username <span class="req">*</span></label>
              <input type="text" class="form-control" id="username" placeholder="johndoe" autocomplete="username" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="phone">Phone</label>
              <input type="tel" class="form-control" id="phone" placeholder="+62…" autocomplete="tel" />
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label" for="email">Email <span class="req">*</span></label>
              <input type="email" class="form-control" id="email" placeholder="you@example.com" autocomplete="email" required />
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label" for="password">Password <span class="req">*</span></label>
              <input type="password" class="form-control" id="password" placeholder="Min. 6 characters" autocomplete="new-password" required />
              <span class="form-hint">At least 6 characters.</span>
            </div>
          </div>

          <div id="form-error" class="form-error hidden" role="alert" aria-live="polite"
            style="margin-bottom:12px;padding:10px 12px;background:var(--danger-bg);border:1px solid var(--danger-border);border-radius:var(--radius-sm)"></div>

          <button type="submit" class="btn btn-primary btn-xl w-full" id="submit-btn">
            <span class="btn-text">Create Account</span>
          </button>
        </form>

        <div class="auth-footer">
          Already have an account? <a href="#/login">Sign in</a>
        </div>
      </div>
    </div>`;

    document.getElementById('reg-form').addEventListener('submit', async e => {
      e.preventDefault();
      const errEl = document.getElementById('form-error');
      errEl.classList.add('hidden');

      const data = {
        fullName: document.getElementById('fullName').value.trim(),
        username: document.getElementById('username').value.trim(),
        email:    document.getElementById('email').value.trim(),
        phone:    document.getElementById('phone').value.trim(),
        password: document.getElementById('password').value,
      };

      if (!data.fullName || !data.username || !data.email || !data.password) {
        errEl.textContent = 'Please fill in all required fields.';
        errEl.classList.remove('hidden');
        return;
      }

      const btn = document.getElementById('submit-btn');
      btn.classList.add('btn-loading'); btn.disabled = true;

      try {
        const res = await api.auth.register(data);
        auth.save(res.token, res.user);
        const { socket } = await import('../components/socket.js');
        socket.connect(res.token);
        window.toast?.success('Account created!', 'Welcome to WisataPass!');
        window.location.hash = '#/';
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
        btn.classList.remove('btn-loading'); btn.disabled = false;
      }
    });
  },
};
