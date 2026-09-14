// ============================================================
// DATA  (shared across all pages via sessionStorage)
// ============================================================

// Persist data in sessionStorage so it survives page navigation
function loadPermittees() {
    const raw = sessionStorage.getItem('enro_permittees');
    if (raw) {
        try { return JSON.parse(raw); } catch (e) { /* fall through */ }
    }
    const emptyData = [];
    sessionStorage.setItem('enro_permittees', JSON.stringify(emptyData));
    return emptyData;
}

function savePermittees(data) {
    sessionStorage.setItem('enro_permittees', JSON.stringify(data));
}

// Global reference every page uses
let permitteesData = loadPermittees();

// ============================================================
// AUTH HELPERS
// ============================================================
function normalizeLoginRole(role) {
    return role?.toString().toLowerCase().replace(/[\s-]+/g, '_');
}

function getAccountRole(user) {
    return normalizeLoginRole(user?.app_metadata?.role || user?.user_metadata?.role);
}

async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = '../index.html';
}

// ============================================================
// AUTH GUARD + HEADER INJECTION
// (runs on every pages/*.html file)
// ============================================================
async function initShell() {
    const headerMount = document.getElementById('app-header');
    if (!headerMount) return;   // We're on index.html — skip

    // --- Guard ---
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = '../index.html';
        return;
    }

    const userEmail = session.user.email || 'Authenticated user';
    const sessionRole = getAccountRole(session.user);
    const roleLabel = sessionRole === 'admin_staff'
        ? 'Admin Staff'
        : sessionRole === 'admin' ? 'Admin' : userEmail;
    const roleBadge = roleLabel.slice(0, 2).toUpperCase();

    // --- Determine active tab from filename ---
    const file = window.location.pathname.split('/').pop();
    const active = {
        'dashboard.html': 'hub',
        'directory.html': 'directory',
        'annual-volume.html': 'annual-volume'
    }[file] || 'hub';

    const cls = (key) => key === active ? 'nav-link active' : 'nav-link';

    // --- Inject header ---
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
                    <button id="mobile-menu-toggle" type="button" onclick="toggleMobileMenu()" aria-controls="mobile-menu" aria-expanded="false" class="md:hidden w-8 h-8 flex items-center justify-center text-enro-300 hover:bg-enro-800 rounded-lg transition">
                        <i class="fa-solid fa-bars text-sm"></i>
                    </button>
                </div>
            </div>
        </div>

        <div id="mobile-menu" class="mobile-menu md:hidden bg-enro-950 border-t border-enro-900 px-4 py-3 space-y-1">
            <a href="./dashboard.html" class="block w-full text-left px-3 py-2 text-sm font-semibold text-enro-100 hover:bg-enro-800 rounded-lg">Dashboard</a>
            <a href="./directory.html" class="block w-full text-left px-3 py-2 text-sm font-semibold text-enro-100 hover:bg-enro-800 rounded-lg">Directory</a>
            <a href="./annual-volume.html" class="block w-full text-left px-3 py-2 text-sm font-semibold text-enro-100 hover:bg-enro-800 rounded-lg">Annual Volume</a>
        </div>
    </header>`;
}

initShell();

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const toggle = document.getElementById('mobile-menu-toggle');
    const isOpen = menu.classList.toggle('is-open');

    toggle.setAttribute('aria-expanded', String(isOpen));
    toggle.querySelector('i').className = isOpen
        ? 'fa-solid fa-xmark text-sm'
        : 'fa-solid fa-bars text-sm';
}

// ============================================================
// SHARED HELPERS
// ============================================================
function getStatusInfo(p) {
    if (p.remainingVol === 0)
        return { label: "Consumed", css: "bg-rose-50 text-rose-700 border-rose-200" };
    if (p.remainingVol <= 100)
        return { label: "Low Volume", css: "bg-amber-50 text-amber-700 border-amber-200" };
    if (!p.transactions || p.transactions.length === 0)
        return { label: "No Production", css: "bg-ink-100 text-ink-600 border-ink-200" };
    if (p.remainingVol / p.allowedVol > 0.85)
        return { label: "Low Production", css: "bg-blue-50 text-blue-700 border-blue-200" };
    return { label: p.status || "Active", css: "bg-enro-50 text-enro-700 border-enro-200" };
}

function formatNumber(n) {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ============================================================
// TOAST
// ============================================================
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    if (!toast) return;

    document.getElementById('toast-title').innerText = type === 'success' ? 'Success' : 'Information';
    document.getElementById('toast-message').innerText = message;

    icon.innerHTML = type === 'success'
        ? '<i class="fa-solid fa-circle-check text-enro-400 text-lg"></i>'
        : '<i class="fa-solid fa-circle-info text-sky-400 text-lg"></i>';

    toast.classList.add('show');
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => toast.classList.remove('show'), 3500);
}