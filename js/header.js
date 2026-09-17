(function () {
    'use strict';

    // ------------------------------------------------------------
    // ROLE HELPERS
    // ------------------------------------------------------------
    function normalizeRole(role) {
        return role?.toString().toLowerCase().replace(/[\s-]+/g, '_');
    }
    function getAccountRole(user) {
        return normalizeRole(user?.app_metadata?.role || user?.user_metadata?.role);
    }
    function getRoleLabel(user) {
        const r = getAccountRole(user);
        if (r === 'admin')       return 'Admin';
        if (r === 'admin_staff') return 'Admin Staff';
        return 'User';
    }

    // ------------------------------------------------------------
    // INJECT LOGOUT ANIMATION CSS (once)
    // ------------------------------------------------------------
    function ensureLogoutStyles() {
        if (document.getElementById('logout-animations')) return;

        const style = document.createElement('style');
        style.id = 'logout-animations';
        style.innerHTML = `
            /* --- Overlay fade in/out --- */
            @keyframes logoutOverlayIn {
                from { opacity: 0; }
                to   { opacity: 1; }
            }
            @keyframes logoutOverlayOut {
                from { opacity: 1; }
                to   { opacity: 0; }
            }

            /* --- Card pop in with spring bounce --- */
            @keyframes logoutCardIn {
                0%   { opacity: 0; transform: translateY(24px) scale(0.92); }
                60%  { opacity: 1; transform: translateY(-4px) scale(1.02); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes logoutCardOut {
                0%   { opacity: 1; transform: translateY(0) scale(1); }
                100% { opacity: 0; transform: translateY(16px) scale(0.94); }
            }

            /* --- Icon spin & pop --- */
            @keyframes logoutIconPop {
                0%   { opacity: 0; transform: scale(0.5) rotate(-90deg); }
                60%  { opacity: 1; transform: scale(1.15) rotate(8deg); }
                100% { opacity: 1; transform: scale(1) rotate(0deg); }
            }

            /* --- Staggered text fade --- */
            @keyframes logoutTextIn {
                from { opacity: 0; transform: translateY(6px); }
                to   { opacity: 1; transform: translateY(0); }
            }

            /* --- Sign out button pulse --- */
            @keyframes signOutPulse {
                0%   { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.55); }
                70%  { box-shadow: 0 0 0 10px rgba(225, 29, 72, 0); }
                100% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); }
            }

            /* --- Spinner --- */
            @keyframes spinLoader {
                to { transform: rotate(360deg); }
            }

            /* --- Apply animations --- */
            #modal-logout-confirm {
                animation: logoutOverlayIn 0.26s ease-out both;
            }
            #modal-logout-confirm.closing {
                animation: logoutOverlayOut 0.22s ease-in both;
            }

            #modal-logout-confirm .logout-card {
                animation: logoutCardIn 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both;
                transform-origin: center center;
            }
            #modal-logout-confirm.closing .logout-card {
                animation: logoutCardOut 0.24s ease-in both;
            }

            #modal-logout-confirm .logout-icon {
                animation: logoutIconPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s both;
            }
            #modal-logout-confirm .logout-title {
                animation: logoutTextIn 0.34s ease-out 0.14s both;
            }
            #modal-logout-confirm .logout-body {
                animation: logoutTextIn 0.34s ease-out 0.20s both;
            }
            #modal-logout-confirm .logout-email {
                animation: logoutTextIn 0.34s ease-out 0.26s both;
            }
            #modal-logout-confirm .logout-actions {
                animation: logoutTextIn 0.34s ease-out 0.30s both;
            }

            /* --- Cancel button smooth --- */
            #modal-logout-confirm .modal-btn--cancel {
                transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            #modal-logout-confirm .modal-btn--cancel:hover {
                transform: translateY(-1px);
            }
            #modal-logout-confirm .modal-btn--cancel:active {
                transform: scale(0.97);
            }

            /* --- Sign out button smooth + hover pulse --- */
            #modal-logout-confirm #logout-confirm-btn {
                transition: background-color 0.2s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease;
            }
            #modal-logout-confirm #logout-confirm-btn:hover:not(:disabled) {
                transform: translateY(-1px) scale(1.02);
                background-color: #be123c;
                animation: signOutPulse 1.4s ease-out infinite;
            }
            #modal-logout-confirm #logout-confirm-btn:active:not(:disabled) {
                transform: scale(0.97);
            }

            /* --- Spinner when processing --- */
            #logout-confirm-btn .logout-spinner {
                display: inline-block;
                width: 12px;
                height: 12px;
                border: 2px solid rgba(255, 255, 255, 0.35);
                border-top-color: #ffffff;
                border-radius: 50%;
                animation: spinLoader 0.7s linear infinite;
                margin-right: 6px;
                vertical-align: -1px;
            }

            /* --- Header sign-out icon hover lift --- */
            header .signout-btn {
                transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            header .signout-btn:hover {
                transform: scale(1.08);
            }
            header .signout-btn:active {
                transform: scale(0.94);
            }
        `;
        document.head.appendChild(style);
    }

    // ------------------------------------------------------------
    // LOGOUT MODAL — with smooth animations
    // ------------------------------------------------------------
    window.openLogoutModal = function () {
        ensureLogoutStyles();

        const existing = document.getElementById('modal-logout-confirm');
        if (existing) existing.remove();

        const modalHTML = `
        <div id="modal-logout-confirm" class="modal-overlay active" style="z-index:100;">
            <div class="logout-card bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div class="p-5 text-center">
                    <div class="logout-icon" style="width:48px;height:48px;margin:0 auto 12px;border-radius:9999px;background:#fff1f2;display:flex;align-items:center;justify-content:center;">
                        <i class="fa-solid fa-arrow-right-from-bracket" style="color:#f43f5e;font-size:1.1rem;"></i>
                    </div>
                    <h3 class="logout-title text-sm font-bold text-ink-900">Sign out?</h3>
                    <p class="logout-body text-[11px] text-ink-500 mt-1.5 leading-relaxed">
                        You will be returned to the login page.<br>
                        Any unsaved changes will be lost.
                    </p>
                    <p class="logout-email text-[10px] text-ink-400 mt-2 font-semibold" id="logout-user-email">
                        Signed in as <span class="text-ink-700">—</span>
                    </p>
                </div>
                <div class="logout-actions modal-actions">
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

        // Fill email
        const client = window.getClient();
        if (client) {
            client.auth.getSession().then(({ data: { session } }) => {
                const el = document.querySelector('#logout-user-email span');
                if (el) el.innerText = session?.user?.email || 'Authenticated user';
            });
        }

        // Click outside to close
        const overlay = document.getElementById('modal-logout-confirm');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeLogoutModal();
            });
        }

        // Escape to close
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
        if (!modal) return;
        modal.classList.add('closing');
        setTimeout(() => {
            if (modal && modal.parentNode) modal.remove();
        }, 240);
    };

    window.confirmLogout = async function () {
        const client = window.getClient();

        const btn = document.getElementById('logout-confirm-btn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<span class="logout-spinner"></span>Signing out...`;
        }

        // Small pause so the spinner is visible
        await new Promise(r => setTimeout(r, 400));

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

    // ------------------------------------------------------------
    // INIT HEADER
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
        
        // ★ UPDATED: Added 'view-ledger.html' so the Directory tab stays highlighted
        const active = {
            'dashboard.html':     'hub',
            'directory.html':     'directory',
            'view-ledger.html':   'directory', 
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
                        <button onclick="handleLogout()" title="Sign out" class="signout-btn w-8 h-8 flex items-center justify-center text-enro-400 hover:text-white hover:bg-enro-800 rounded-lg transition">
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

    // ------------------------------------------------------------
    // BOOT
    // ------------------------------------------------------------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.initShell);
    } else {
        window.initShell();
    }
})();