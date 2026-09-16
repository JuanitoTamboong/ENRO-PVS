(function () {
    'use strict';

    // ------------------------------------------------------------
    // Client resolver
    // ------------------------------------------------------------
    window.getClient = function () {
        return window.supabaseClient ||
               (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
    };

    // ------------------------------------------------------------
    // NUMBER FORMATTING
    // ------------------------------------------------------------
    window.formatNumber = function (num) {
        if (num === null || num === undefined || isNaN(num)) return '0';
        return Number(num).toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        });
    };

    // ------------------------------------------------------------
    // TOAST
    // ------------------------------------------------------------
    window.showToast = function (message, type = 'success') {
        const toast = document.getElementById('toast');
        const icon  = document.getElementById('toast-icon');
        if (!toast) { console.log('[Toast]', type, message); return; }

        const titleEl = document.getElementById('toast-title');
        const msgEl   = document.getElementById('toast-message');
        if (titleEl) titleEl.innerText = type === 'success' ? 'Success'
                                       : type === 'error'   ? 'Error'
                                       : 'Information';
        if (msgEl)   msgEl.innerText   = message;

        if (icon) {
            icon.innerHTML = type === 'success'
                ? '<i class="fa-solid fa-circle-check text-enro-400 text-lg"></i>'
                : type === 'error'
                ? '<i class="fa-solid fa-circle-exclamation text-rose-400 text-lg"></i>'
                : '<i class="fa-solid fa-circle-info text-sky-400 text-lg"></i>';
        }

        toast.classList.add('show');
        clearTimeout(showToast.timeout);
        showToast.timeout = setTimeout(() => toast.classList.remove('show'), 3500);
    };

    // ------------------------------------------------------------
    // STATUS LOGIC
    // ------------------------------------------------------------
    window.getStatusInfo = function (p) {
        const allowed   = Number(p.allowedVol)   || 0;
        const remaining = Number(p.remainingVol) || 0;

        if (p.endDate) {
            const end = new Date(p.endDate);
            if (!isNaN(end.getTime()) && end.getTime() < Date.now())
                return { label: 'Expired',          css: 'bg-ink-100 text-ink-600 border-ink-200' };
        }

        if (allowed > 0 && remaining === 0)
            return { label: 'Fully Consumed',       css: 'bg-rose-50 text-rose-700 border-rose-200' };

        if (allowed > 0 && remaining <= 100)
            return { label: 'Nearly Exhausted',     css: 'bg-amber-50 text-amber-700 border-amber-200' };

        if (allowed > 0 && remaining < allowed && (remaining / allowed) > 0.85)
            return { label: 'Low Production',       css: 'bg-blue-50 text-blue-700 border-blue-200' };

        return { label: 'Active',                   css: 'bg-enro-50 text-enro-700 border-enro-200' };
    };

    // ------------------------------------------------------------
    // HTML ESCAPE
    // ------------------------------------------------------------
    window.escapeHtml = function (str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    };

    // ------------------------------------------------------------
    // SUPABASE ROW → APP SHAPE
    // ------------------------------------------------------------
    window.mapDbRowToPermittee = function (row) {
        return {
            id:           row.id,
            name:         row.name || '',
            location:     row.location || '',
            permitNo:     row.permit_no || '',
            type:         row.type || '',
            commodity:    row.commodity || '',
            area:         row.area || '',
            rate:         row.rate || '',
            allowedVol:   Number(row.allowed_vol) || 0,
            remainingVol: Number(row.remaining_vol) || 0,
            startDate:    row.start_date || '',
            endDate:      row.end_date || '',
            status:       row.status || 'Active',
            transactions: row.transactions || []
        };
    };

    // ------------------------------------------------------------
    // SESSION STORAGE (non-critical cache)
    // ------------------------------------------------------------
    window.loadPermittees = function () {
        const raw = sessionStorage.getItem('enro_permittees');
        if (raw) { try { return JSON.parse(raw); } catch (e) {} }
        sessionStorage.setItem('enro_permittees', JSON.stringify([]));
        return [];
    };

    window.savePermittees = function (data) {
        sessionStorage.setItem('enro_permittees', JSON.stringify(data));
    };

    window.permitteesData = window.permitteesData || window.loadPermittees();

    // ============================================================
    // LOGOUT CONFIRMATION MODAL
    // ============================================================
    window.openLogoutModal = function () {
        const existing = document.getElementById('modal-logout-confirm');
        if (existing) existing.remove();

        const modalHTML = `
        <div id="modal-logout-confirm" class="modal-overlay active" style="z-index:100;">
            <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div class="p-5 text-center">
                    <div style="width:48px;height:48px;margin:0 auto 12px;border-radius:9999px;background:#fff1f2;display:flex;align-items:center;justify-content:center;">
                        <i class="fa-solid fa-arrow-right-from-bracket" style="color:#f43f5e;font-size:1.1rem;"></i>
                    </div>
                    <h3 class="text-sm font-bold text-ink-900">Sign out?</h3>
                    <p class="text-[11px] text-ink-500 mt-1.5 leading-relaxed">
                        You will be returned to the login page.<br>
                        Any unsaved changes will be lost.
                    </p>
                    <p class="text-[10px] text-ink-400 mt-2 font-semibold" id="logout-user-email">
                        Signed in as <span class="text-ink-700">—</span>
                    </p>
                </div>
                <div class="modal-actions">
                    <button type="button" onclick="closeLogoutModal()" class="modal-btn modal-btn--cancel">
                        Cancel
                    </button>
                    <button type="button" id="logout-confirm-btn" onclick="confirmLogout()"
                            class="modal-btn modal-btn--danger">
                        <i class="fa-solid fa-right-from-bracket text-[10px] mr-1"></i>
                        Sign out
                    </button>
                </div>
            </div>
        </div>`;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        const client = window.getClient();
        if (client) {
            client.auth.getSession().then(({ data: { session } }) => {
                const el = document.querySelector('#logout-user-email span');
                if (el) el.innerText = session?.user?.email || 'Authenticated user';
            });
        }

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                closeLogoutModal();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    };

    window.closeLogoutModal = function () {
        const modal = document.getElementById('modal-logout-confirm');
        if (modal) modal.remove();
    };

    window.confirmLogout = async function () {
        const client = window.getClient();

        const btn = document.getElementById('logout-confirm-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = 'Signing out...';
        }

        if (client) {
            try {
                const { data: { session } } = await client.auth.getSession();
                if (session?.user?.email) {
                    await client.rpc('log_auth_event', {
                        p_action:     'LOGOUT',
                        p_email:      session.user.email,
                        p_user_agent: navigator.userAgent + ' — Signed out'
                    });
                }
            } catch (_) { /* ignore */ }

            await client.auth.signOut();
        }

        window.location.href = '../index.html';
    };

    window.handleLogout = function () {
        window.openLogoutModal();
    };

    // ------------------------------------------------------------
    // MOBILE MENU
    // ------------------------------------------------------------
    window.toggleMobileMenu = function () {
        const menu   = document.getElementById('mobile-menu');
        const toggle = document.getElementById('mobile-menu-toggle');
        if (!menu || !toggle) return;

        const isOpen = menu.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(isOpen));
        toggle.querySelector('i').className = isOpen
            ? 'fa-solid fa-xmark text-sm'
            : 'fa-solid fa-bars text-sm';
    };
})();