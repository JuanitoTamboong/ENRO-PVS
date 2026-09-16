(function () {
    'use strict';

    // ------------------------------------------------------------
    // Client resolver (safe even if global isn't set yet)
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

    // ------------------------------------------------------------
    // AUTH + ROLE HELPERS
    // ------------------------------------------------------------
    function normalizeLoginRole(role) {
        return role?.toString().toLowerCase().replace(/[\s-]+/g, '_');
    }
    function getAccountRole(user) {
        return normalizeLoginRole(user?.app_metadata?.role || user?.user_metadata?.role);
    }
    function getRoleLabel(user) {
        const r = getAccountRole(user);
        if (r === 'admin')       return 'Admin';
        if (r === 'admin_staff') return 'Admin Staff';
        return 'User';
    }

    // ------------------------------------------------------------
    // LOGOUT CONFIRMATION MODAL — with inline-styled icon circle
    // ------------------------------------------------------------
    window.openLogoutModal = function () {
        // Remove any existing modal first
        const existing = document.getElementById('modal-logout-confirm');
        if (existing) existing.remove();

        // Build the modal HTML (icon uses inline styles so it always
        // renders as a perfect 48×48 rose circle — no Tailwind needed)
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

        // Fill in the email on the modal
        const client = window.getClient();
        if (client) {
            client.auth.getSession().then(({ data: { session } }) => {
                const el = document.querySelector('#logout-user-email span');
                if (el) el.innerText = session?.user?.email || 'Authenticated user';
            });
        }

        // Allow Escape key to close
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

        // Disable the button during processing
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

    // ------------------------------------------------------------
    // handleLogout — opens the modal instead of signing out directly
    // ------------------------------------------------------------
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

    // ------------------------------------------------------------
    // HEADER INJECTION + AUTH GUARD
    // ------------------------------------------------------------
    window.initShell = async function () {
        const headerMount = document.getElementById('app-header');
        if (!headerMount) return;

        const client = window.getClient();
        if (!client) {
            console.error('[Shell] supabaseClient missing.');
            return;
        }

        const { data: { session } } = await client.auth.getSession();
        if (!session) {
            window.location.href = '../index.html';
            return;
        }

        const userEmail   = session.user.email || 'Authenticated user';
        const sessionRole = getAccountRole(session.user);
        const roleLabel   = sessionRole === 'admin_staff' ? 'Admin Staff'
                          : sessionRole === 'admin'       ? 'Admin'
                          : userEmail;
        const roleBadge = roleLabel.slice(0, 2).toUpperCase();

        const file = window.location.pathname.split('/').pop();
        const active = {
            'dashboard.html':     'hub',
            'directory.html':     'directory',
            'annual-volume.html': 'annual-volume',
            'activity-logs.html': 'activity-logs'
        }[file] || 'hub';
        const cls = (key) => key === active ? 'nav-link active' : 'nav-link';

        headerMount.innerHTML = `
        <header class="bg-enro-950 sticky top-0 z-30 border-b border-enro-900/50">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-14">
                    <a href="./dashboard.html" class="flex items-center gap-3 cursor-pointer">
                        <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-enro-700 overflow-hidden">
                            <img src="../assets/enro-logo.png" alt="ENRO logo" class="w-7 h-7 object-contain">
                        </div>
                        <div class="leading-tight">
                            <span class="text-white font-bold text-sm block">ENRO Portal</span>
                            <span class="text-enro-400 text-[10px] font-semibold uppercase tracking-wider">Extraction Monitoring</span>
                        </div>
                    </a>

                    <nav class="hidden md:flex items-center gap-1">
                        <a href="./dashboard.html" class="${cls('hub')}">
                            <i class="fa-solid fa-house mr-1.5 text-xs"></i>Dashboard
                        </a>
                        <a href="./directory.html" class="${cls('directory')}">
                            <i class="fa-solid fa-address-book mr-1.5 text-xs"></i>Directory
                        </a>
                        <a href="./annual-volume.html" class="${cls('annual-volume')}">
                            <i class="fa-solid fa-scale-balanced mr-1.5 text-xs"></i>Annual Volume
                        </a>
                        <a href="./activity-logs.html" class="${cls('activity-logs')}">
                            <i class="fa-solid fa-clock-rotate-left mr-1.5 text-xs"></i>Activity Logs
                        </a>
                    </nav>

                    <div class="flex items-center gap-2">
                        <div class="hidden sm:flex items-center gap-2 bg-enro-900/80 border border-enro-800 rounded-lg px-2.5 py-1.5">
                            <div class="w-5 h-5 bg-enro-600 rounded-full flex items-center justify-center text-[9px] font-bold text-white">${roleBadge}</div>
                            <span class="text-[11px] font-semibold text-enro-100">${roleLabel}</span>
                        </div>
                        <button onclick="handleLogout()" title="Sign out"
                            class="w-8 h-8 flex items-center justify-center text-enro-400 hover:text-white hover:bg-enro-800 rounded-lg transition">
                            <i class="fa-solid fa-arrow-right-from-bracket text-xs"></i>
                        </button>
                        <button id="mobile-menu-toggle" type="button" onclick="toggleMobileMenu()"
                                aria-controls="mobile-menu" aria-expanded="false"
                                class="md:hidden w-8 h-8 flex items-center justify-center text-enro-300 hover:bg-enro-800 rounded-lg transition">
                            <i class="fa-solid fa-bars text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div id="mobile-menu" class="mobile-menu md:hidden bg-enro-950 border-t border-enro-900 px-4 py-3 space-y-1">
                <a href="./dashboard.html" class="block w-full text-left px-3 py-2 text-sm font-semibold text-enro-100 hover:bg-enro-800 rounded-lg">Dashboard</a>
                <a href="./directory.html" class="block w-full text-left px-3 py-2 text-sm font-semibold text-enro-100 hover:bg-enro-800 rounded-lg">Directory</a>
                <a href="./annual-volume.html" class="block w-full text-left px-3 py-2 text-sm font-semibold text-enro-100 hover:bg-enro-800 rounded-lg">Annual Volume</a>
                <a href="./activity-logs.html" class="block w-full text-left px-3 py-2 text-sm font-semibold text-enro-100 hover:bg-enro-800 rounded-lg">Activity Logs</a>
            </div>
        </header>`;
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initShell);
    } else {
        window.initShell();
    }
})();