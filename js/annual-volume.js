// ============================================================
// ANNUAL VOLUME PAGE
// ============================================================
let selectedPermitteeId = 1;

(() => {
    const urlId = new URLSearchParams(window.location.search).get('id');
    if (urlId) {
        selectedPermitteeId = parseInt(urlId);
        showLedgerView();
    } else {
        showListView();
    }
})();

// ---------- View Switching ----------
function showListView() {
    document.getElementById('annual-level-1-list').classList.remove('hidden');
    document.getElementById('annual-level-2-ledger').classList.add('hidden');
    renderAnnualLevel1List(permitteesData);
}

function showLedgerView() {
    document.getElementById('annual-level-1-list').classList.add('hidden');
    document.getElementById('annual-level-2-ledger').classList.remove('hidden');
    populateAnnualDropdown();
    loadPermitteeLedger(selectedPermitteeId);
}

function backToAnnualList() {
    // Remove ?id= from URL without reload
    history.replaceState(null, '', './annual-volume.html');
    showListView();
}

// ---------- Level 1: List ----------
function renderAnnualLevel1List(data) {
    const tbody = document.getElementById('annual-list-tbody');

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6">
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    No permittees match your search.
                </div>
            </td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(p => {
        const s = getStatusInfo(p);
        return `
            <tr class="cursor-pointer" onclick="openAnnualLedgerById(${p.id})">
                <td class="font-bold text-ink-900">${p.name}</td>
                <td><span class="font-mono text-xs font-semibold text-enro-700">${p.permitNo}</span></td>
                <td class="text-right font-bold ${p.remainingVol <= 100 ? 'text-rose-600' : 'text-enro-700'}">
                    ${formatNumber(p.remainingVol)} <span class="text-[10px] font-normal text-ink-400">cu.m</span>
                </td>
                <td class="text-right text-ink-600">
                    ${formatNumber(p.allowedVol)} <span class="text-[10px] text-ink-400">cu.m</span>
                </td>
                <td class="text-center"><span class="status-badge ${s.css}">${s.label}</span></td>
                <td class="text-center"><span class="text-[11px] font-bold text-enro-700">Open →</span></td>
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
    // Update URL so refresh keeps you here
    history.replaceState(null, '', `./annual-volume.html?id=${selectedPermitteeId}`);
    showLedgerView();
}

// ---------- Level 2: Ledger ----------
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
            <tr><td colspan="8">
                <div class="empty-state">
                    <i class="fa-solid fa-receipt"></i>
                    No delivery receipt transactions recorded yet.
                </div>
            </td></tr>`;
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
            <td><span class="font-mono text-[11px] text-ink-500">${tx.opNo || '—'}</span></td>
            <td class="text-ink-600 text-xs">${tx.truckLoad}</td>
            <td class="text-right text-ink-500 whitespace-nowrap">${formatNumber(tx.prevBal)}</td>
            <td class="text-right ledger-row-balance whitespace-nowrap">${formatNumber(tx.newBal)}</td>
        </tr>
    `).join('');
}

// ---------- MODAL: Add Transaction ----------
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

    savePermittees(permitteesData);

    closeAddTransactionModal();
    document.getElementById('form-add-tx').reset();
    loadPermitteeLedger(p.id);
    showToast('Delivery receipt recorded successfully.', 'success');
}