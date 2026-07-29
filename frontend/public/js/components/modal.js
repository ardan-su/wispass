/**
 * Confirmation modal helper – accessible, animated
 */
export const modal = {
  confirm({ title = 'Are you sure?', message = '', icon = '⚠️',
            okText = 'Confirm', okClass = 'btn-danger' } = {}) {
    return new Promise(resolve => {
      const overlay  = document.getElementById('confirm-modal');
      const titleEl  = document.getElementById('confirm-title');
      const msgEl    = document.getElementById('confirm-message');
      const iconEl   = document.getElementById('confirm-icon');
      const okBtn    = document.getElementById('confirm-ok-btn');
      const cancelBtn= document.getElementById('confirm-cancel-btn');

      iconEl.textContent  = icon;
      titleEl.textContent = title;
      msgEl.textContent   = message;
      okBtn.textContent   = okText;
      okBtn.className     = `btn ${okClass}`;

      overlay.classList.remove('hidden');
      okBtn.focus();

      const cleanup = () => overlay.classList.add('hidden');

      const onOk     = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };

      okBtn.onclick     = onOk;
      cancelBtn.onclick = onCancel;
      overlay.onclick   = e => { if (e.target === overlay) onCancel(); };

      // Trap Escape key
      const onKey = e => {
        if (e.key === 'Escape') { onCancel(); document.removeEventListener('keydown', onKey); }
      };
      document.addEventListener('keydown', onKey);
    });
  },
};
