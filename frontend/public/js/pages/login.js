import { api }  from '../components/api.js';
import { auth } from '../components/auth.js';

export default {
  async render(app) {
    app.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <svg class="auth-logo-icon" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="9" fill="url(#alg)"/>
            <path d="M8 16h4l2-5 4 10 2-5h4" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <defs><linearGradient id="alg" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop stop-color="#60a5fa"/><stop offset="1" stop-color="#2563eb"/>
            </linearGradient></defs>
          </svg>
          <span class="auth-logo-name">WisataPass</span>
        </div>

        <h1 class="auth-heading">Welcome back</h1>
        <p class="auth-sub">Sign in to your account to continue.</p>

        <form id="login-form" novalidate>
          <div class="form-group">
            <label class="form-label" for="email">Email address</label>
            <input type="email" class="form-control" id="email"
              placeholder="you@example.com" autocomplete="email" required
              aria-required="true" />
          </div>
          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input type="password" class="form-control" id="password"
              placeholder="••••••••" autocomplete="current-password" required
              aria-required="true" />
          </div>

          <div id="form-err" class="form-error hidden" role="alert" aria-live="polite"
            style="margin-bottom:12px;padding:10px 12px;background:var(--danger-bg);
              border:1px solid var(--danger-border);border-radius:var(--radius-sm)">
          </div>

          <button type="submit" class="btn btn-primary btn-xl w-full" id="submit-btn">
            <span class="btn-text">Sign In</span>
          </button>
        </form>

        <div class="auth-footer">
          Don't have an account? <a href="#/register">Create one</a>
        </div>

        
      </div>
    </div>`;

    const form    = document.getElementById('login-form');
    const btn     = document.getElementById('submit-btn');
    const formErr = document.getElementById('form-err');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      formErr.classList.add('hidden');

      const email    = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      if (!email || !password) {
        formErr.textContent = 'Please enter your email and password.';
        formErr.classList.remove('hidden');
        return;
      }

      btn.classList.add('btn-loading');
      btn.disabled = true;

      try {
        const res = await api.auth.login({ email, password });
        // Normalize backend snake_case to camelCase before storing
        const user = {
          ...res.user,
          fullName: res.user.fullName || res.user.full_name || res.user.username,
        };
        auth.save(res.accessToken || res.token, user);

        const { socket } = await import('../components/socket.js');
        socket.connect(res.accessToken || res.token);

        window.toast?.success('Welcome back!', user.fullName);
        window.location.hash = user.role === 'customer' ? '#/' : '#/admin';
      } catch (err) {
        formErr.textContent = err.message;
        formErr.classList.remove('hidden');
        btn.classList.remove('btn-loading');
        btn.disabled = false;
      }
    });
  },
};
