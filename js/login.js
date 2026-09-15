// ============================================================
// LOGIN PAGE — Role Selection & Authentication
// ============================================================

let currentLoginRole = 'admin';

// ------------------------------------------------------------
// Fallback: guarantee showToast exists even if utils.js fails
// ------------------------------------------------------------
if (typeof window.showToast !== 'function') {
    window.showToast = function (message, type = 'success') {
        const toast = document.getElementById('toast');
        const icon  = document.getElementById('toast-icon');
        if (!toast) { console.log('[Toast]', type, message); return; }

        const titleEl = document.getElementById('toast-title');
        const msgEl   = document.getElementById('toast-message');
        if (titleEl) titleEl.innerText = type === 'success' ? 'Success' : 'Information';
        if (msgEl)   msgEl.innerText   = message;

        if (icon) {
            icon.innerHTML = type === 'success'
                ? '<i class="fa-solid fa-circle-check text-enro-400 text-lg"></i>'
                : '<i class="fa-solid fa-circle-info text-sky-400 text-lg"></i>';
        }

        toast.classList.add('show');
        clearTimeout(window.showToast.timeout);
        window.showToast.timeout = setTimeout(() => toast.classList.remove('show'), 3500);
    };
}

// ------------------------------------------------------------
// Resolve supabase client (global or module-scoped)
// ------------------------------------------------------------
function getSupabase() {
    return window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
}

// ------------------------------------------------------------
// Role helpers
// ------------------------------------------------------------
function normalizeLoginRole(role) {
    return role?.toString().toLowerCase().replace(/[\s-]+/g, '_');
}

function getAccountRole(user) {
    return normalizeLoginRole(user?.app_metadata?.role || user?.user_metadata?.role);
}

// ------------------------------------------------------------
// Role toggle (segmented control)
// ------------------------------------------------------------
function selectLoginRole(role) {
    currentLoginRole = role;

    const toggle = document.querySelector('.login-role-toggle');
    const tabs = document.querySelectorAll('.login-role-tab');
    const btnText = document.getElementById('btn-login-text');

    tabs.forEach((tab) => {
        const isActive = tab.dataset.role === role;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', String(isActive));
    });

    if (toggle) {
        toggle.classList.toggle('is-staff', role === 'admin_staff');
    }

    if (btnText) {
        btnText.innerText = role === 'admin'
            ? 'Continue as Admin'
            : 'Continue as Admin Staff';
    }

    sessionStorage.setItem('enro_login_role', role);
}

// ------------------------------------------------------------
// Password visibility toggle
// ------------------------------------------------------------
function togglePassword() {
    const input = document.getElementById('password');
    const btn = document.getElementById('pw-toggle');
    if (!input || !btn) return;

    const isVisible = input.type === 'text';
    input.type = isVisible ? 'password' : 'text';
    btn.innerHTML = isVisible
        ? '<i class="fa-solid fa-eye"></i>'
        : '<i class="fa-solid fa-eye-slash"></i>';
    btn.setAttribute('aria-label', isVisible ? 'Show password' : 'Hide password');
}

// ------------------------------------------------------------
// Login handler
// ------------------------------------------------------------
async function handleLogin(e) {
    e.preventDefault();

    const error = document.getElementById('login-error');
    const button = document.getElementById('loginSubmit');
    const emailInput = document.getElementById('email');
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

    if (!emailInput.value.trim() || !passwordInput.value) {
        error.innerText = 'Please enter both email and password.';
        error.classList.remove('hidden');
        button.disabled = false;
        return;
    }

    try {
        const { error: authError } = await client.auth.signInWithPassword({
            email: emailInput.value.trim(),
            password: passwordInput.value
        });

        if (authError) throw authError;

        // Verify the account's role matches the selected login role
        const { data: { user } } = await client.auth.getUser();
        const accountRole = getAccountRole(user);

        if (accountRole && accountRole !== currentLoginRole) {
            await client.auth.signOut();
            throw new Error(
                `This account is not registered as ${
                    currentLoginRole === 'admin' ? 'an Admin' : 'Admin Staff'
                }.`
            );
        }

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

// ------------------------------------------------------------
// Wire up DOM-dependent handlers once page is ready
// ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Restore saved role
    const saved = sessionStorage.getItem('enro_login_role');
    if (saved === 'admin' || saved === 'admin_staff') {
        selectLoginRole(saved);
    } else {
        selectLoginRole('admin');
    }

    // Forgot password link
    const forgot = document.getElementById('forgot-link');
    if (forgot) {
        forgot.addEventListener('click', (ev) => {
            ev.preventDefault();
            showToast('Contact ENRO IT administrator for password reset.', 'info');
        });
    }

    // Session check — redirect if already authenticated
    const client = getSupabase();
    if (client) {
        client.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                window.location.href = './pages/dashboard.html';
            }
        });
    }
});