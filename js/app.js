// ============================================================
// DATA  (shared across all pages via sessionStorage)
// ============================================================
const DEFAULT_PERMITTEES = [
    {
        id: 1,
        name: "ALYCHAN FERNANDEZ",
        location: "Calatrava - Pangangan",
        permitNo: "ROM # 007-15",
        type: "Commercial",
        commodity: "Sand & Gravel",
        rate: "1,9715 CU.M",
        allowedVol: 2000.00,
        remainingVol: 95.00,
        startDate: "2025-04-11",
        endDate: "2026-06-04",
        status: "Active",
        transactions: [
            { date: "2025-07-10", drNo: "DR-2025-002", volume: 1905.00, amount: 57150.00, opNo: "OP-8812", truckLoad: "Bulk Load / NAK-992", prevBal: 2000.00, newBal: 95.00 }
        ]
    },
    {
        id: 2, name: "ROSE MARY SABLIGAN", location: "Alcantara - Colongoso",
        permitNo: "ROM # 018-25", type: "Commercial", commodity: "Sand & Gravel",
        rate: "7,998 MT", allowedVol: 2400.00, remainingVol: 2250.00,
        startDate: "2026-04-14", endDate: "2027-04-14", status: "Active",
        transactions: [
            { date: "2026-05-10", drNo: "DR-2026-011", volume: 150.00, amount: 4500.00, opNo: "OP-9011", truckLoad: "2 Trucks / NAK-123", prevBal: 2400.00, newBal: 2250.00 }
        ]
    },
    {
        id: 3, name: "EDWIN QUSUMBING", location: "Alcantara - Colongoso",
        permitNo: "ROM # 026-6-25", type: "Commercial", commodity: "Sand & Gravel",
        rate: "4,976/1,449 MT", allowedVol: 2000.00, remainingVol: 1850.00,
        startDate: "2025-09-02", endDate: "2026-09-02", status: "Renewal in process",
        transactions: [
            { date: "2025-10-15", drNo: "DR-2025-001", volume: 150.00, amount: 4500.00, opNo: "OP-8410", truckLoad: "1 Dump Truck", prevBal: 2000.00, newBal: 1850.00 }
        ]
    },
    {
        id: 4, name: "ELMAR MARTINEZ", location: "Alcantara - Colongoso",
        permitNo: "ROM # 017-25", type: "Commercial", commodity: "Sand & Gravel",
        rate: "10,000 MT", allowedVol: 3600.00, remainingVol: 3200.00,
        startDate: "2025-05-19", endDate: "2026-05-19", status: "Active",
        transactions: [
            { date: "2025-08-12", drNo: "DR-2025-104", volume: 400.00, amount: 12000.00, opNo: "OP-8501", truckLoad: "3 Trucks", prevBal: 3600.00, newBal: 3200.00 }
        ]
    },
    {
        id: 5, name: "GAYMAR GAYTANO", location: "Alcantara - Colongoso",
        permitNo: "ROM # 09-3-25", type: "Commercial", commodity: "Sand & Gravel",
        rate: "0.8286", allowedVol: 2000.00, remainingVol: 2000.00,
        startDate: "2025-05-09", endDate: "2026-05-09", status: "Active", transactions: []
    },
    {
        id: 6, name: "JUNDL AGRIPINO NGO", location: "Alcantara - Cahayagan Camili",
        permitNo: "ROM # 025-3-24", type: "Commercial", commodity: "Sand & Gravel",
        rate: "15,792 CU.M", allowedVol: 20000.00, remainingVol: 15420.00,
        startDate: "2025-01-21", endDate: "2027-01-21", status: "Active",
        transactions: [
            { date: "2025-04-10", drNo: "DR-2025-88", volume: 4580.00, amount: 137400.00, opNo: "OP-8119", truckLoad: "10 Trailer Loads", prevBal: 20000.00, newBal: 15420.00 }
        ]
    },
    {
        id: 7, name: "JOEL SABLIGAN", location: "Limon Sur",
        permitNo: "ROM # 178-13-26", type: "Commercial", commodity: "Sand & Gravel",
        rate: "0.8454", allowedVol: 5000.00, remainingVol: 5000.00,
        startDate: "2026-03-11", endDate: "2027-03-11", status: "Active", transactions: []
    },
    {
        id: 8, name: "BURGOS LEQUIN", location: "Looc - Punta",
        permitNo: "ROM # 127-5", type: "Quarry", commodity: "Pebbles",
        rate: "4.9935", allowedVol: 2000.00, remainingVol: 0.00,
        startDate: "2024-08-04", endDate: "2025-08-04", status: "Expired",
        transactions: [
            { date: "2024-09-01", drNo: "DR-2024-090", volume: 2000.00, amount: 60000.00, opNo: "OP-7210", truckLoad: "5 Heavy Loads", prevBal: 2000.00, newBal: 0.00 }
        ]
    }
];

// Persist data in sessionStorage so it survives page navigation
function loadPermittees() {
    const raw = sessionStorage.getItem('enro_permittees');
    if (raw) {
        try { return JSON.parse(raw); } catch (e) { /* fall through */ }
    }
    sessionStorage.setItem('enro_permittees', JSON.stringify(DEFAULT_PERMITTEES));
    return JSON.parse(JSON.stringify(DEFAULT_PERMITTEES));
}

function savePermittees(data) {
    sessionStorage.setItem('enro_permittees', JSON.stringify(data));
}

// Global reference every page uses
let permitteesData = loadPermittees();

// ============================================================
// AUTH
// ============================================================
let currentLoginRole = sessionStorage.getItem('enro_role') || 'admin';

function toggleLoginMode(mode) {
    currentLoginRole = mode;
    const btnAdmin = document.getElementById('tab-login-admin');
    const btnUser = document.getElementById('tab-login-user');
    const lblUser = document.getElementById('lbl-username');
    const btnText = document.getElementById('btn-login-text');

    if (mode === 'admin') {
        btnAdmin.className = "flex-1 py-3.5 text-xs font-bold text-enro-700 border-b-2 border-enro-700 bg-white transition";
        btnUser.className = "flex-1 py-3.5 text-xs font-bold text-ink-400 border-b-2 border-transparent hover:text-ink-600 transition";
        lblUser.innerText = "Username";
        btnText.innerText = "Sign in as Admin";
        document.getElementById('username').value = "admin";
    } else {
        btnUser.className = "flex-1 py-3.5 text-xs font-bold text-enro-700 border-b-2 border-enro-700 bg-white transition";
        btnAdmin.className = "flex-1 py-3.5 text-xs font-bold text-ink-400 border-b-2 border-transparent hover:text-ink-600 transition";
        lblUser.innerText = "Staff ID";
        btnText.innerText = "Sign in as Staff";
        document.getElementById('username').value = "user";
    }
}

function handleLogin(e) {
    e.preventDefault();
    sessionStorage.setItem('enro_logged_in', '1');
    sessionStorage.setItem('enro_role', currentLoginRole);
    window.location.href = './pages/dashboard.html';
}

function handleLogout() {
    sessionStorage.removeItem('enro_logged_in');
    sessionStorage.removeItem('enro_role');
    window.location.href = '../index.html';
}

// ============================================================
// AUTH GUARD + HEADER INJECTION
// (runs on every pages/*.html file)
// ============================================================
(function initShell() {
    const headerMount = document.getElementById('app-header');
    if (!headerMount) return;   // We're on index.html — skip

    // --- Guard ---
    if (sessionStorage.getItem('enro_logged_in') !== '1') {
        window.location.href = '../index.html';
        return;
    }
    const role = sessionStorage.getItem('enro_role') || 'admin';
    const roleLabel = role === 'admin' ? 'Admin Officer' : 'Field Staff';
    const roleBadge = role === 'admin' ? 'AD' : 'ST';

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
})();

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