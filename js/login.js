// ============================================================
// LOGIN PAGE — Role Selection & Authentication
// ============================================================

let currentLoginRole = 'admin'; // 'admin' or 'admin_staff'

// Normalize a role string to snake_case lowercase
function normalizeLoginRole(role) {
    return role?.toString().toLowerCase().replace(/[\s-]+/g, '_');
}

// Extract role from Supabase user object (app_metadata or user_metadata)
function getAccountRole(user) {
    return normalizeLoginRole(user?.app_metadata?.role || user?.user_metadata?.role);
}

// Handle role selection (Admin / Admin Staff)
function selectLoginRole(role) {
    currentLoginRole = role;

    document.querySelectorAll('.login-role-option').forEach((option) => {
        option.classList.toggle('is-selected', option.dataset.role === role);
    });

    const btnText = document.getElementById('btn-login-text');
    if (btnText) {
        btnText.innerText = role === 'admin'
            ? 'Continue as Admin'
            : 'Continue as Admin Staff';
    }

    // Persist the selected role for other pages
    sessionStorage.setItem('enro_login_role', role);
}

// Restore previously selected role (if any)
(function restoreLoginRole() {
    const saved = sessionStorage.getItem('enro_login_role');
    if (saved === 'admin' || saved === 'admin_staff') {
        selectLoginRole(saved);
    } else {
        selectLoginRole('admin');
    }
})();

// ============================================================
// LOGIN HANDLER
// ============================================================
async function handleLogin(e) {
    e.preventDefault();

    const error = document.getElementById('login-error');
    const button = e.target.querySelector('button[type="submit"]');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    error.classList.add('hidden');
    button.disabled = true;

    if (!emailInput.value.trim() || !passwordInput.value) {
        error.innerText = 'Please enter both email and password.';
        error.classList.remove('hidden');
        button.disabled = false;
        return;
    }

    try {
        const { error: authError } = await supabaseClient.auth.signInWithPassword({
            email: emailInput.value.trim(),
            password: passwordInput.value
        });

        if (authError) throw authError;

        // Verify the account role matches the selected login role
        const { data: { user } } = await supabaseClient.auth.getUser();
        const accountRole = getAccountRole(user);

        if (accountRole && accountRole !== currentLoginRole) {
            await supabaseClient.auth.signOut();
            throw new Error(
                `This account is not registered as ${
                    currentLoginRole === 'admin' ? 'an Admin' : 'Admin Staff'
                }.`
            );
        }

        // Persist the selected role for the shell
        sessionStorage.setItem('enro_user_role', currentLoginRole);

        showToast(
            `Signed in as ${
                currentLoginRole === 'admin' ? 'Administrator' : 'Admin Staff'
            }`,
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

// ============================================================
// SESSION CHECK — redirect if already authenticated
// ============================================================
supabaseClient.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        window.location.href = './pages/dashboard.html';
    }
});