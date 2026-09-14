

// ============================================================
// DATA
// ============================================================
let permitteesData = [
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
        id: 2,
        name: "ROSE MARY SABLIGAN",
        location: "Alcantara - Colongoso",
        permitNo: "ROM # 018-25",
        type: "Commercial",
        commodity: "Sand & Gravel",
        rate: "7,998 MT",
        allowedVol: 2400.00,
        remainingVol: 2250.00,
        startDate: "2026-04-14",
        endDate: "2027-04-14",
        status: "Active",
        transactions: [
            { date: "2026-05-10", drNo: "DR-2026-011", volume: 150.00, amount: 4500.00, opNo: "OP-9011", truckLoad: "2 Trucks / NAK-123", prevBal: 2400.00, newBal: 2250.00 }
        ]
    },
    {
        id: 3,
        name: "EDWIN QUSUMBING",
        location: "Alcantara - Colongoso",
        permitNo: "ROM # 026-6-25",
        type: "Commercial",
        commodity: "Sand & Gravel",
        rate: "4,976/1,449 MT",
        allowedVol: 2000.00,
        remainingVol: 1850.00,
        startDate: "2025-09-02",
        endDate: "2026-09-02",
        status: "Renewal in process",
        transactions: [
            { date: "2025-10-15", drNo: "DR-2025-001", volume: 150.00, amount: 4500.00, opNo: "OP-8410", truckLoad: "1 Dump Truck", prevBal: 2000.00, newBal: 1850.00 }
        ]
    },
    {
        id: 4,
        name: "ELMAR MARTINEZ",
        location: "Alcantara - Colongoso",
        permitNo: "ROM # 017-25",
        type: "Commercial",
        commodity: "Sand & Gravel",
        rate: "10,000 MT",
        allowedVol: 3600.00,
        remainingVol: 3200.00,
        startDate: "2025-05-19",
        endDate: "2026-05-19",
        status: "Active",
        transactions: [
            { date: "2025-08-12", drNo: "DR-2025-104", volume: 400.00, amount: 12000.00, opNo: "OP-8501", truckLoad: "3 Trucks", prevBal: 3600.00, newBal: 3200.00 }
        ]
    },
    {
        id: 5,
        name: "GAYMAR GAYTANO",
        location: "Alcantara - Colongoso",
        permitNo: "ROM # 09-3-25",
        type: "Commercial",
        commodity: "Sand & Gravel",
        rate: "0.8286",
        allowedVol: 2000.00,
        remainingVol: 2000.00,
        startDate: "2025-05-09",
        endDate: "2026-05-09",
        status: "Active",
        transactions: []
    },
    {
        id: 6,
        name: "JUNDL AGRIPINO NGO",
        location: "Alcantara - Cahayagan Camili",
        permitNo: "ROM # 025-3-24",
        type: "Commercial",
        commodity: "Sand & Gravel",
        rate: "15,792 CU.M",
        allowedVol: 20000.00,
        remainingVol: 15420.00,
        startDate: "2025-01-21",
        endDate: "2027-01-21",
        status: "Active",
        transactions: [
            { date: "2025-04-10", drNo: "DR-2025-88", volume: 4580.00, amount: 137400.00, opNo: "OP-8119", truckLoad: "10 Trailer Loads", prevBal: 20000.00, newBal: 15420.00 }
        ]
    },
    {
        id: 7,
        name: "JOEL SABLIGAN",
        location: "Limon Sur",
        permitNo: "ROM # 178-13-26",
        type: "Commercial",
        commodity: "Sand & Gravel",
        rate: "0.8454",
        allowedVol: 5000.00,
        remainingVol: 5000.00,
        startDate: "2026-03-11",
        endDate: "2027-03-11",
        status: "Active",
        transactions: []
    },
    {
        id: 8,
        name: "BURGOS LEQUIN",
        location: "Looc - Punta",
        permitNo: "ROM # 127-5",
        type: "Quarry",
        commodity: "Pebbles",
        rate: "4.9935",
        allowedVol: 2000.00,
        remainingVol: 0.00,
        startDate: "2024-08-04",
        endDate: "2025-08-04",
        status: "Expired",
        transactions: [
            { date: "2024-09-01", drNo: "DR-2024-090", volume: 2000.00, amount: 60000.00, opNo: "OP-7210", truckLoad: "5 Heavy Loads", prevBal: 2000.00, newBal: 0.00 }
        ]
    }
];

let selectedPermitteeId = 1;
let currentLoginRole = 'admin';

// ============================================================
// HELPERS
// ============================================================
function getStatusInfo(p) {
    if (p.remainingVol === 0) {
        return { label: "Consumed", css: "bg-rose-50 text-rose-700 border-rose-200" };
    }
    if (p.remainingVol <= 100) {
        return { label: "Low Volume", css: "bg-amber-50 text-amber-700 border-amber-200" };
    }
    if (!p.transactions || p.transactions.length === 0) {
        return { label: "No Production", css: "bg-ink-100 text-ink-600 border-ink-200" };
    }
    if (p.remainingVol / p.allowedVol > 0.85) {
        return { label: "Low Production", css: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    return { label: p.status || "Active", css: "bg-enro-50 text-enro-700 border-enro-200" };
}

function formatNumber(n) {
    return Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

// ============================================================
// LOGIN
// ============================================================
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
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('app-view').classList.remove('hidden');
    document.getElementById('user-role-label').innerText = currentLoginRole === 'admin' ? 'Admin Officer' : 'Field Staff';
    document.getElementById('user-badge').innerText = currentLoginRole === 'admin' ? 'AD' : 'ST';
    initDashboard();
    showToast(`Signed in as ${currentLoginRole === 'admin' ? 'Admin Officer' : 'Field Staff'}`, 'success');
}

function handleLogout() {
    document.getElementById('app-view').classList.add('hidden');
    document.getElementById('login-view').classList.remove('hidden');
    showToast('Signed out securely.', 'info');
}

// ============================================================
// NAVIGATION
// ============================================================
function switchTab(tab) {
    ['hub', 'directory', 'annual-volume'].forEach(t => {
        document.getElementById('tab-' + t).classList.add('hidden');
    });
    document.querySelectorAll('.nav-link').forEach(b => b.classList.remove('active'));

    if (tab === 'hub') {
        document.getElementById('tab-hub').classList.remove('hidden');
        document.getElementById('nav-hub').classList.add('active');
        updateHubMetrics();
        renderHubRecent();
    } else if (tab === 'directory') {
        document.getElementById('tab-directory').classList.remove('hidden');
        document.getElementById('nav-directory').classList.add('active');
        renderDirectoryTable(permitteesData);
    } else if (tab === 'annual-volume') {
        document.getElementById('tab-annual-volume').classList.remove('hidden');
        document.getElementById('nav-annual-volume').classList.add('active');
        document.getElementById('annual-level-1-list').classList.remove('hidden');
        document.getElementById('annual-level-2-ledger').classList.add('hidden');
        renderAnnualLevel1List(permitteesData);
    }
}

function toggleMobileMenu() {
    document.getElementById('mobile-menu').classList.toggle('hidden');
}

function initDashboard() {
    document.getElementById('hub-date').innerText = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    updateHubMetrics();
    renderHubRecent();
    renderDirectoryTable(permitteesData);
    renderAnnualLevel1List(permitteesData);
    populateAnnualDropdown();
}

// ============================================================
// DASHBOARD
// ============================================================
function updateHubMetrics() {
    const totalAllowed = permitteesData.reduce((s, p) => s + p.allowedVol, 0);
    const totalRemaining = permitteesData.reduce((s, p) => s + p.remainingVol, 0);
    const totalExtracted = totalAllowed - totalRemaining;
    const lowAlerts = permitteesData.filter(p => p.remainingVol <= 100).length;

    document.getElementById('hub-metric-permits').innerText = permitteesData.length;
    document.getElementById('hub-metric-allowed').innerText = formatNumber(totalAllowed);
    document.getElementById('hub-metric-extracted').innerText = formatNumber(totalExtracted);
    document.getElementById('hub-metric-alerts').innerText = lowAlerts;
}

function renderHubRecent() {
    const container = document.getElementById('hub-recent-list');
    const recent = permitteesData.slice(0, 4);

    container.innerHTML = recent.map(p => {
        const s = getStatusInfo(p);
        return `
            <div class="px-5 py-3 flex items-center justify-between hover:bg-ink-50/50 transition cursor-pointer" onclick="openAnnualLedgerById(${p.id})">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 bg-enro-50 border border-enro-100 rounded-lg flex items-center justify-center text-enro-700 text-[10px] font-bold shrink-0">
                        ${p.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs font-bold text-ink-800 truncate">${p.name}</p>
                        <p class="text-[10px] text-ink-400 font-mono">${p.permitNo} • ${p.location}</p>
                    </div>
                </div>
                <div class="text-right shrink-0 ml-3">
                    <p class="text-xs font-bold ${p.remainingVol <= 100 ? 'text-rose-600' : 'text-ink-800'}">
                        ${formatNumber(p.remainingVol)} <span class="text-[10px] font-normal text-ink-400">cu.m</span>
                    </p>
                    <span class="status-badge ${s.css} mt-0.5">${s.label}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================================
// DIRECTORY
// ============================================================
function renderDirectoryTable(data) {
    const tbody = document.getElementById('directory-tbody');
    document.getElementById('directory-count-badge').innerText =
        `${data.length} ${data.length === 1 ? 'entry' : 'entries'}`;

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <i class="fa-solid fa-inbox"></i>
                        No permittees match your search criteria.
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = data.map(p => {
        const s = getStatusInfo(p);
        return `
            <tr>
                <td class="font-bold text-ink-900">${p.name}</td>
                <td class="text-ink-500 text-xs">${p.location}</td>
                <td>
                    <span class="font-mono text-xs font-semibold text-enro-700 bg-enro-50 px-1.5 py-0.5 rounded border border-enro-100">
                        ${p.permitNo}
                    </span>
                </td>
                <td class="text-ink-600 text-xs">${p.type}</td>
                <td class="text-ink-600 text-xs">${p.commodity}</td>
                <td class="text-right font-semibold text-ink-700">${formatNumber(p.allowedVol)}</td>
                <td class="text-right font-bold ${p.remainingVol <= 100 ? 'text-rose-600' : 'text-enro-700'}">
                    ${formatNumber(p.remainingVol)}
                </td>
                <td class="text-center">
                    <span class="status-badge ${s.css}">${s.label}</span>
                </td>
                <td class="text-center">
                    <button onclick="openAnnualLedgerById(${p.id})"
                        class="text-[11px] font-bold text-enro-700 hover:text-enro-900 hover:underline">
                        View Ledger
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterDirectoryTable() {
    const q = document.getElementById('directory-search-input').value.toLowerCase();
    const s = document.getElementById('directory-status-filter').value;

    const filtered = permitteesData.filter(p =>
        (p.name.toLowerCase().includes(q) ||
         p.permitNo.toLowerCase().includes(q) ||
         p.location.toLowerCase().includes(q)) &&
        (s === "" || p.status === s)
    );

    renderDirectoryTable(filtered);
}

// ============================================================
// ANNUAL VOLUME
// ============================================================
function renderAnnualLevel1List(data) {
    const tbody = document.getElementById('annual-list-tbody');

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    <div class="empty-state">
                        <i class="fa-solid fa-inbox"></i>
                        No permittees match your search.
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = data.map(p => {
        const s = getStatusInfo(p);
        return `
            <tr class="cursor-pointer" onclick="openAnnualLedgerById(${p.id})">
                <td class="font-bold text-ink-900">${p.name}</td>
                <td>
                    <span class="font-mono text-xs font-semibold text-enro-700">${p.permitNo}</span>
                </td>
                <td class="text-right font-bold ${p.remainingVol <= 100 ? 'text-rose-600' : 'text-enro-700'}">
                    ${formatNumber(p.remainingVol)} <span class="text-[10px] font-normal text-ink-400">cu.m</span>
                </td>
                <td class="text-right text-ink-600">
                    ${formatNumber(p.allowedVol)} <span class="text-[10px] text-ink-400">cu.m</span>
                </td>
                <td class="text-center">
                    <span class="status-badge ${s.css}">${s.label}</span>
                </td>
                <td class="text-center">
                    <span class="text-[11px] font-bold text-enro-700">Open →</span>
                </td>
            </tr>
        `;
    }).join('');
}

function filterAnnualListTable() {
    const q = document.getElementById('annual-list-search').value.toLowerCase();
    renderAnnualLevel1List(
        permitteesData.filter(p =>
            p.name.toLowerCase().includes(q) ||
            p.permitNo.toLowerCase().includes(q)
        )
    );
}

function openAnnualLedgerById(id) {
    selectedPermitteeId = parseInt(id);
    switchTab('annual-volume');
    document.getElementById('annual-level-1-list').classList.add('hidden');
    document.getElementById('annual-level-2-ledger').classList.remove('hidden');
    populateAnnualDropdown();
    loadPermitteeLedger(selectedPermitteeId);
}

function backToAnnualList() {
    document.getElementById('annual-level-2-ledger').classList.add('hidden');
    document.getElementById('annual-level-1-list').classList.remove('hidden');
    renderAnnualLevel1List(permitteesData);
}

function populateAnnualDropdown() {
    const sel = document.getElementById('annual-permittee-select');
    sel.innerHTML = permitteesData.map(p =>
        `<option value="${p.id}">${p.name} — ${p.permitNo}</option>`
    ).join('');
    sel.value = selectedPermitteeId;
}

function loadPermitteeLedger(id) {
    selectedPermitteeId = parseInt(id);
    const p = permitteesData.find(x => x.id === selectedPermitteeId);
    if (!p) return;

    document.getElementById('annual-permittee-select').value = selectedPermitteeId;
    document.getElementById('breadcrumb-name').innerText = p.name;
    document.getElementById('av-name').innerText = p.name;
    document.getElementById('av-location').innerHTML =
        `<i class="fa-solid fa-location-dot text-ink-300 text-[10px]"></i><span>${p.location}</span>`;
    document.getElementById('av-permit-no').innerText = p.permitNo;
    document.getElementById('av-dates').innerText = `${p.startDate} → ${p.endDate}`;
    document.getElementById('av-allowed').innerText = `${formatNumber(p.allowedVol)} cu.m`;
    document.getElementById('av-rate').innerText = `Rate: ${p.rate}`;
    document.getElementById('av-remaining').innerText = `${formatNumber(p.remainingVol)} cu.m`;

    const s = getStatusInfo(p);
    document.getElementById('av-status-tag').className = `status-badge ${s.css}`;
    document.getElementById('av-status-tag').innerText = s.label;

    document.getElementById('warning-low-volume-banner').classList.toggle('hidden', p.remainingVol > 100);

    renderLedgerTable(p);
}

function renderLedgerTable(p) {
    const tbody = document.getElementById('annual-transactions-tbody');

    if (!p.transactions || p.transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8">
                    <div class="empty-state">
                        <i class="fa-solid fa-receipt"></i>
                        No delivery receipt transactions recorded yet.
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = [...p.transactions].reverse().map(tx => `
        <tr>
            <td class="text-ink-600 whitespace-nowrap">${tx.date}</td>
            <td class="text-right ledger-row-negative whitespace-nowrap">-${formatNumber(tx.volume)}</td>
            <td>
                <span class="font-mono text-[11px] font-semibold text-enro-700 bg-enro-50 px-1.5 py-0.5 rounded border border-enro-100">
                    ${tx.drNo}
                </span>
            </td>
            <td class="text-right text-ink-700 whitespace-nowrap">₱${formatNumber(tx.amount)}</td>
            <td>
                <span class="font-mono text-[11px] text-ink-500">${tx.opNo || '—'}</span>
            </td>
            <td class="text-ink-600 text-xs">${tx.truckLoad}</td>
            <td class="text-right text-ink-500 whitespace-nowrap">${formatNumber(tx.prevBal)}</td>
            <td class="text-right ledger-row-balance whitespace-nowrap">${formatNumber(tx.newBal)}</td>
        </tr>
    `).join('');
}

// ============================================================
// MODALS
// ============================================================
function openAddEntryModal() {
    document.getElementById('modal-add-entry').classList.add('active');
}

function closeAddEntryModal() {
    document.getElementById('modal-add-entry').classList.remove('active');
}

function submitNewPermitEntry(e) {
    e.preventDefault();
    const allowed = parseFloat(document.getElementById('new-allowed-vol').value);

    const np = {
        id: permitteesData.length + 1,
        name: document.getElementById('new-name').value.trim().toUpperCase(),
        location: document.getElementById('new-location').value.trim(),
        permitNo: document.getElementById('new-permit-no').value.trim(),
        type: document.getElementById('new-permit-type').value,
        commodity: document.getElementById('new-commodity').value,
        rate: document.getElementById('new-rate').value.trim(),
        allowedVol: allowed,
        remainingVol: allowed,
        startDate: document.getElementById('new-start-date').value,
        endDate: document.getElementById('new-end-date').value,
        status: document.getElementById('new-status').value,
        transactions: []
    };

    permitteesData.push(np);
    closeAddEntryModal();
    document.getElementById('form-add-entry').reset();
    updateHubMetrics();
    renderHubRecent();
    renderDirectoryTable(permitteesData);
    renderAnnualLevel1List(permitteesData);
    populateAnnualDropdown();
    showToast('Permittee record added successfully.', 'success');
}

function openAddTransactionModal() {
    const p = permitteesData.find(x => x.id === selectedPermitteeId);
    if (!p) return;
    document.getElementById('tx-modal-permittee-name').innerText = p.name;
    document.getElementById('tx-modal-current-balance').innerText = `${formatNumber(p.remainingVol)} cu.m`;
    document.getElementById('tx-modal-error').classList.add('hidden');
    document.getElementById('modal-add-tx').classList.add('active');
}

function closeAddTransactionModal() {
    document.getElementById('modal-add-tx').classList.remove('active');
}

function submitTransactionEntry(e) {
    e.preventDefault();
    const p = permitteesData.find(x => x.id === selectedPermitteeId);
    const volume = parseFloat(document.getElementById('tx-volume').value);
    if (!p || volume > p.remainingVol) {
        document.getElementById('tx-modal-error').classList.remove('hidden');
        return;
    }

    const previousBalance = p.remainingVol;
    p.remainingVol -= volume;
    p.transactions.push({
        date: document.getElementById('tx-date').value,
        drNo: document.getElementById('tx-dr-no').value.trim(),
        volume,
        amount: parseFloat(document.getElementById('tx-amount').value),
        opNo: document.getElementById('tx-op-no').value.trim(),
        truckLoad: document.getElementById('tx-truck-load').value.trim(),
        prevBal: previousBalance,
        newBal: p.remainingVol
    });

    closeAddTransactionModal();
    document.getElementById('form-add-tx').reset();
    loadPermitteeLedger(p.id);
    updateHubMetrics();
    renderHubRecent();
    renderDirectoryTable(permitteesData);
    renderAnnualLevel1List(permitteesData);
    showToast('Delivery receipt recorded successfully.', 'success');
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const icon = document.getElementById('toast-icon');
    document.getElementById('toast-title').innerText = type === 'success' ? 'Success' : 'Information';
    document.getElementById('toast-message').innerText = message;
    icon.innerHTML = type === 'success'
        ? '<i class="fa-solid fa-circle-check text-enro-400 text-lg"></i>'
        : '<i class="fa-solid fa-circle-info text-sky-400 text-lg"></i>';
    toast.classList.add('show');
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => toast.classList.remove('show'), 3500);
}