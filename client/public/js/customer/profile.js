import { api }  from '../components/api.js';
import { auth } from '../components/auth.js';
import { setPageTitle } from '../components/layout.js';

export default {
  async render(el) {
    setPageTitle('Profile');
    el.innerHTML = `<div class="page-spinner" style="min-height:300px"><div class="spinner"></div></div>`;
    try {
      const { user } = await api.auth.me();

      el.innerHTML = `
        <div class="page-header">
          <div class="page-header-left">
            <h2>My Profile</h2>
            <p style="font-size:.875rem;color:var(--text-secondary);margin-top:2px">Manage your personal information and account settings</p>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:900px">
          <!-- Left: profile form -->
          <div>
            <div class="card" style="margin-bottom:14px">
              <div class="card-header"><span class="card-title">Personal Information</span></div>

              <!-- Avatar -->
              <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:20px;border-bottom:1px solid var(--border-subtle)">
                <div id="avatar-ring" style="width:72px;height:72px;border-radius:50%;background:var(--accent-subtle);display:flex;align-items:center;justify-content:center;font-size:1.625rem;font-weight:700;color:var(--accent);overflow:hidden;flex-shrink:0;border:2px solid var(--accent-border)">
                  ${user.avatar ? `<img src="${user.avatar}" style="width:100%;height:100%;object-fit:cover" alt="Profile photo" />` : initials(user.full_name || user.username)}
                </div>
                <div>
                  <div style="font-weight:600;font-size:.9375rem">${user.full_name || user.username}</div>
                  <div style="font-size:.8125rem;color:var(--text-tertiary);margin-bottom:8px">${user.email}</div>
                  <input type="file" id="avatar-file" accept="image/jpeg,image/jpg,image/png,image/webp" style="display:none" aria-label="Upload profile photo" />
                  <button class="btn btn-ghost btn-sm" onclick="document.getElementById('avatar-file').click()" type="button">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                    Change Photo
                  </button>
                </div>
              </div>

              <form id="profile-form" novalidate>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 14px">
                  <div class="form-group" style="grid-column:1/-1">
                    <label class="form-label" for="p-fullname">Full Name</label>
                    <input class="form-control" id="p-fullname" name="fullName" value="${user.full_name||''}" placeholder="Your full name" autocomplete="name" />
                  </div>
                  <div class="form-group" style="grid-column:1/-1">
                    <label class="form-label">Username</label>
                    <input class="form-control" value="${user.username}" disabled aria-disabled="true"
                      style="background:var(--bg-secondary);cursor:not-allowed;color:var(--text-tertiary)" />
                    <span class="form-hint">Username cannot be changed.</span>
                  </div>
                  <div class="form-group" style="grid-column:1/-1">
                    <label class="form-label">Email</label>
                    <input class="form-control" value="${user.email}" disabled aria-disabled="true"
                      style="background:var(--bg-secondary);cursor:not-allowed;color:var(--text-tertiary)" />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="p-phone">Phone</label>
                    <input class="form-control" id="p-phone" name="phone" value="${user.phone||''}" placeholder="+62…" autocomplete="tel" />
                  </div>
                  <div class="form-group">
                    <label class="form-label" for="p-city">City</label>
                    <input class="form-control" id="p-city" name="city" value="${user.city||''}" placeholder="Jakarta" autocomplete="address-level2" />
                  </div>
                  <div class="form-group" style="grid-column:1/-1">
                    <label class="form-label" for="p-province">Province</label>
                    <input class="form-control" id="p-province" name="province" value="${user.province||''}" placeholder="DKI Jakarta" autocomplete="address-level1" />
                  </div>
                </div>
                <div id="profile-err" class="form-error hidden" style="margin-bottom:12px;padding:9px 12px;background:var(--danger-bg);border:1px solid var(--danger-border);border-radius:var(--radius-sm)" role="alert"></div>
                <button type="submit" class="btn btn-primary" id="profile-btn">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  <span class="btn-text">Save Changes</span>
                </button>
              </form>
            </div>
          </div>

          <!-- Right: password + account -->
          <div>
            <div class="card" style="margin-bottom:14px">
              <div class="card-header">
                <span class="card-title">Change Password</span>
              </div>
              <form id="pw-form" novalidate>
                <div class="form-group">
                  <label class="form-label" for="pw-current">Current Password</label>
                  <input type="password" class="form-control" id="pw-current" name="currentPassword" autocomplete="current-password" required />
                </div>
                <div class="form-group">
                  <label class="form-label" for="pw-new">New Password</label>
                  <input type="password" class="form-control" id="pw-new" name="newPassword" minlength="6" autocomplete="new-password" required />
                  <span class="form-hint">At least 6 characters.</span>
                </div>
                <div class="form-group">
                  <label class="form-label" for="pw-confirm">Confirm New Password</label>
                  <input type="password" class="form-control" id="pw-confirm" name="confirmPassword" autocomplete="new-password" required />
                </div>
                <div id="pw-err" class="form-error hidden" style="margin-bottom:12px;padding:9px 12px;background:var(--danger-bg);border:1px solid var(--danger-border);border-radius:var(--radius-sm)" role="alert"></div>
                <div id="pw-ok"  class="form-success hidden" style="margin-bottom:12px;padding:9px 12px;background:var(--success-bg);border:1px solid var(--success-border);border-radius:var(--radius-sm)"></div>
                <button type="submit" class="btn btn-primary" id="pw-btn">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                  <span class="btn-text">Update Password</span>
                </button>
              </form>
            </div>

            <div class="card">
              <div class="card-header"><span class="card-title">Account</span></div>
              <div style="display:flex;align-items:center;gap:12px;padding:10px;background:var(--bg-secondary);border-radius:var(--radius);margin-bottom:14px">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--accent-subtle);display:flex;align-items:center;justify-content:center;font-size:.875rem;font-weight:700;color:var(--accent);flex-shrink:0">${initials(user.full_name||user.username)}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:.8125rem;font-weight:600;color:var(--text-primary)">${user.email}</div>
                  <div style="font-size:.72rem;color:var(--text-tertiary);text-transform:capitalize">${user.role} account</div>
                </div>
                <span class="badge badge-success badge-dot">Active</span>
              </div>
              <button class="btn btn-danger btn-sm w-full" id="signout-btn" style="justify-content:center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>`;

      // Avatar preview
      document.getElementById('avatar-file').addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
          document.getElementById('avatar-ring').innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover" alt="Profile photo preview" />`;
        };
        reader.readAsDataURL(file);
      });

      // Profile save
      document.getElementById('profile-form').addEventListener('submit', async e => {
        e.preventDefault();
        const f  = e.target;
        const fd = new FormData();
        fd.append('fullName', f.fullName.value.trim());
        fd.append('phone',    f.phone.value.trim());
        fd.append('city',     f.city.value.trim());
        fd.append('province', f.province.value.trim());
        const avatarFile = document.getElementById('avatar-file').files[0];
        if (avatarFile) fd.append('avatar', avatarFile);

        const btn  = document.getElementById('profile-btn');
        const errEl = document.getElementById('profile-err');
        errEl.classList.add('hidden');
        btn.classList.add('btn-loading'); btn.disabled = true;
        try {
          const res = await api.auth.updateProfile(fd);
          auth.save(auth.getToken(), { ...auth.getUser(), fullName: res.user.full_name, avatar: res.user.avatar });
          window.toast.success('Profile saved!', 'Your changes have been applied.');
        } catch (err) {
          errEl.textContent = err.message;
          errEl.classList.remove('hidden');
        }
        btn.classList.remove('btn-loading'); btn.disabled = false;
      });

      // Password change
      document.getElementById('pw-form').addEventListener('submit', async e => {
        e.preventDefault();
        const f    = e.target;
        const errEl = document.getElementById('pw-err');
        const okEl  = document.getElementById('pw-ok');
        errEl.classList.add('hidden'); okEl.classList.add('hidden');

        if (f.newPassword.value !== f.confirmPassword.value) {
          errEl.textContent = 'New passwords do not match.';
          errEl.classList.remove('hidden');
          document.getElementById('pw-new').classList.add('is-error');
          document.getElementById('pw-confirm').classList.add('is-error');
          return;
        }
        document.getElementById('pw-new').classList.remove('is-error');
        document.getElementById('pw-confirm').classList.remove('is-error');

        const btn = document.getElementById('pw-btn');
        btn.classList.add('btn-loading'); btn.disabled = true;
        try {
          await api.auth.changePassword({ currentPassword: f.currentPassword.value, newPassword: f.newPassword.value });
          okEl.textContent = '✓ Password updated successfully.';
          okEl.classList.remove('hidden');
          f.reset();
          window.toast.success('Password updated!');
        } catch (err) {
          errEl.textContent = err.message;
          errEl.classList.remove('hidden');
        }
        btn.classList.remove('btn-loading'); btn.disabled = false;
      });

      // Sign out
      document.getElementById('signout-btn').addEventListener('click', async () => {
        if (!await window.modal.confirm({ title: 'Sign out?', message: 'You will need to sign in again.', okText: 'Sign Out', okClass: 'btn-danger', icon: '🚪' })) return;
        auth.logout();
        window.location.hash = '#/login';
      });

    } catch (err) {
      el.innerHTML = `<div class="empty-state" style="padding:80px 20px"><span class="empty-icon">⚠️</span><div class="empty-title">${err.message}</div></div>`;
    }
  },
};

function initials(name) {
  return (name || 'U').split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
}
