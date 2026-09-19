// ============================================================
// LOGIN PAGE — Role Selection & Authentication
// With IP capture + ban check (pre & post auth) + activity logging
// ============================================================
let currentLoginRole = 'admin';

// ------------------------------------------------------------
// Fallback showToast
// ------------------------------------------------------------
if (typeof window.showToast !== 'function') {
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
        clearTimeout(window.showToast.timeout);
        window.showToast.timeout = setTimeout(() => toast.classList.remove('show'), 3500);
    };
}

function getSupabase() {
    return window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
}

function normalizeLoginRole(role) {
    return role?.toString().toLowerCase().replace(/[\s-]+/g, '_');
}

function getAccountRole(user) {
    return normalizeLoginRole(user?.app_metadata?.role || user?.user_metadata?.role);
}

// ------------------------------------------------------------
// Human-readable role labels
// ------------------------------------------------------------
function roleLabel(role) {
    if (role === 'admin')       return 'Admin';
    if (role === 'admin_staff') return 'Admin Staff';
    return role || 'no assigned role';
}

function getSelectedRoleLabel() {
    return currentLoginRole === 'admin' ? 'Admin' : 'Admin Staff';
}

function getActualRoleLabel(user) {
    const raw = normalizeLoginRole(user?.app_metadata?.role || user?.user_metadata?.role);
    return roleLabel(raw);
}

// ------------------------------------------------------------
// LOG AUTH EVENT — WITH IP ADDRESS
// Signature: logAuthEvent(action, email, reason)
// ------------------------------------------------------------
async function logAuthEvent(action, email, reason) {
    try {
        // Fetch client IP (cached after first call)
        let ip = 'unknown';
        if (typeof window.getClientIP === 'function') {
            ip = await window.getClientIP();
        }

        // Build a *plain* details object — no client, no user, no session
        const details = {
            user_agent: navigator.userAgent
        };
        if (reason) details.reason = String(reason);

        // Use the shared logActivity helper (writes ip_address column)
        if (typeof window.logActivity === 'function') {
            await window.logActivity({
                action:       String(action),
                entity_type:  'auth',
                entity_name:  String(email || ''),
                performed_by: String(email || ''),
                ip_address:   String(ip),
                details
            });
            return;
        }

        // Fallback: direct insert if ip-helper.js didn't load
        const client = getSupabase();
        if (!client) return;

        await client.from('activity_logs').insert([{
            action:       String(action),
            entity_type:  'auth',
            entity_name:  String(email || ''),
            performed_by: String(email || ''),
            ip_address:   String(ip),
            details,
            performed_at: new Date().toISOString()
        }]);
    } catch (err) {
        console.warn('[logAuthEvent] failed:', err);
    }
}

// ------------------------------------------------------------
// CHECK IF IP IS BANNED
// ------------------------------------------------------------
async function checkBannedIP() {
    try {
        if (typeof window.isIpBanned !== 'function') return { banned: false };

        let ip = 'unknown';
        if (typeof window.getClientIP === 'function') {
            ip = await window.getClientIP();
        }
        if (!ip || ip === 'unknown') return { banned: false, ip };

        const result = await window.isIpBanned(ip);
        return { ...result, ip };
    } catch (err) {
        console.warn('[checkBannedIP] failed:', err);
        return { banned: false };
    }
}

// ------------------------------------------------------------
// Show ban overlay, or fall back to inline error if ban-guard
// isn't loaded on this page.
// No redirectTo passed → user stays on the login page.
// ------------------------------------------------------------
function showBanOverlayOrFallback(banInfo, fallbackErrorEl) {
    if (typeof window.__showBanWarning === 'function') {
        window.__showBanWarning({
            ip:       banInfo.ip,
            reason:   banInfo.reason,
            bannedBy: banInfo.banned_by,
            bannedAt: banInfo.banned_at
            // no redirectTo → stays put
        });
        return;
    }
    // Fallback: plain inline error
    if (fallbackErrorEl) {
        fallbackErrorEl.innerText = `Access denied. Your IP (${banInfo.ip || 'unknown'}) has been banned from this system.`;
        fallbackErrorEl.classList.remove('hidden');
    }
}

function selectLoginRole(role) {
    currentLoginRole = role;

    const toggle  = document.querySelector('.login-role-toggle');
    const tabs    = document.querySelectorAll('.login-role-tab');
    const btnText = document.getElementById('btn-login-text');

    tabs.forEach((tab) => {
        const isActive = tab.dataset.role === role;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
    });

    if (toggle) toggle.classList.toggle('is-staff', role === 'admin_staff');

    if (btnText) {
        btnText.innerText = role === 'admin'
            ? 'Continue as Admin'
            : 'Continue as Admin Staff';
    }

    sessionStorage.setItem('enro_login_role', role);
}

function togglePassword() {
    const input = document.getElementById('password');
    const btn   = document.getElementById('pw-toggle');
    if (!input || !btn) return;

    const isVisible = input.type === 'text';
    input.type = isVisible ? 'password' : 'text';
    btn.innerHTML = isVisible
        ? '<i class="fa-solid fa-eye"></i>'
        : '<i class="fa-solid fa-eye-slash"></i>';
    btn.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
}

// ------------------------------------------------------------
// MAIN LOGIN HANDLER
// ------------------------------------------------------------
async function handleLogin(e) {
    e.preventDefault();

    const error         = document.getElementById('login-error');
    const button        = document.getElementById('loginSubmit');
    const emailInput    = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    error.classList.add('hidden');
    error.innerText = '';
    button.disabled = true;

    const client = getSupabase();
    if (!client) {
        error.innerText = 'System error: Authentication service unavailable. Please refresh.';
        error.classList.remove('hidden');
        button.disabled = false;
        return;
    }

    const email    = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        error.innerText = 'Please enter both email and password.';
        error.classList.remove('hidden');
        button.disabled = false;
        return;
    }

    try {
        // ============================================================
        // 1. PRE-CHECK: Is this IP banned BEFORE attempting login?
        // ============================================================
        const banCheck = await checkBannedIP();
        if (banCheck.banned) {
            await logAuthEvent(
                'FAILED_LOGIN',
                email,
                `Banned IP attempted login (${banCheck.reason || 'no reason given'})`
            );
            showBanOverlayOrFallback(banCheck, error);
            button.disabled = false;
            return;
        }

        // ============================================================
        // 2. ATTEMPT SIGN-IN
        // ============================================================
        const { error: authError } = await client.auth.signInWithPassword({
            email: email,
            password: password
        });

        // ---- Wrong password / unknown email ----
        if (authError) {
            await logAuthEvent('FAILED_LOGIN', email, 'Wrong email or password');
            throw authError;
        }

        const { data: { user } } = await client.auth.getUser();
        const accountRole = getAccountRole(user);

        // ---- Role mismatch (correct credentials, wrong portal) ----
        if (accountRole && accountRole !== currentLoginRole) {
            const selected = getSelectedRoleLabel();
            const actual   = getActualRoleLabel(user);

            await logAuthEvent(
                'FAILED_LOGIN',
                email,
                `Tried to sign in as ${selected} but this account is ${actual}`
            );

            await client.auth.signOut();
            throw new Error(
                `This account is not registered as ${selected}. ` +
                `Please select "${actual}" and try again.`
            );
        }

        // ============================================================
        // 3. POST-CHECK: Re-verify ban AFTER auth
        //    Closes the race window between pre-check and login.
        // ============================================================
        const postBanCheck = await checkBannedIP();
        if (postBanCheck.banned) {
            await logAuthEvent(
                'LOGIN_BLOCKED',
                email,
                `Banned IP blocked after authentication (${postBanCheck.reason || 'no reason given'})`
            );
            await client.auth.signOut();
            showBanOverlayOrFallback(postBanCheck, error);
            button.disabled = false;
            return;
        }

        // ============================================================
        // 4. EVERYTHING OK → proceed to dashboard
        // ============================================================
        await logAuthEvent('LOGIN', email, `Signed in as ${getSelectedRoleLabel()}`);

        sessionStorage.setItem('enro_user_role', currentLoginRole);
        showToast(
            `Signed in as ${currentLoginRole === 'admin' ? 'Administrator' : 'Admin Staff'}`,
            'success'
        );

        setTimeout(() => {
            window.location.href = './pages/dashboard.html';
        }, 400);

    } catch (authError) {
        error.innerText = authError.message || 'Unable to sign in. Please try again.';
        error.classList.remove('hidden');
        button.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const saved = sessionStorage.getItem('enro_login_role');
    if (saved === 'admin' || saved === 'admin_staff') {
        selectLoginRole(saved);
    } else {
        selectLoginRole('admin');
    }

    const forgot = document.getElementById('forgot-link');
    if (forgot) {
        forgot.addEventListener('click', (ev) => {
            ev.preventDefault();
            showToast('Contact ENRO IT administrator for password reset.', 'info');
        });
    }

    // ----------------------------------------------------------
    // Auto-redirect if already signed in — BUT check ban first
    // so a banned user with a stale session can't slip through.
    // ----------------------------------------------------------
    const client = getSupabase();
    if (client) {
        client.auth.getSession().then(async ({ data: { session } }) => {
            if (!session) return;

            // Re-verify ban before letting them auto-jump to dashboard
            const banCheck = await checkBannedIP();
            if (banCheck.banned) {
                await client.auth.signOut();
                await logAuthEvent(
                    'LOGIN_BLOCKED',
                    session.user?.email || 'unknown',
                    `Banned IP blocked on auto-redirect (${banCheck.reason || 'no reason given'})`
                );
                showBanOverlayOrFallback(banCheck, document.getElementById('login-error'));
                return;
            }

            window.location.href = './pages/dashboard.html';
        });
    }
});

// Expose to window (for inline onclick handlers)
window.selectLoginRole = selectLoginRole;
window.togglePassword  = togglePassword;
window.handleLogin     = handleLogin;