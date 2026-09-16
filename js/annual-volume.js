// ============================================================
// ANNUAL VOLUME PAGE — DB-backed ledger with atomic transactions
// ============================================================
let selectedPermitteeId = null;

function getClient() {
    return window.supabaseClient ||
           (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
}

function mapTxRow(t) {
    return {
        id:         t.id,
        date:       t.date,
        drNo:       t.dr_no,
        volume:     Number(t.volume),
        amount:     Number(t.amount),
        opNo:       t.op_no,
        truckLoad:  t.truck_load,
        prevBal:    Number(t.prev_balance),
        newBal:     Number(t.new_balance),
        recordedBy: t.recorded_by,
        recordedAt: t.recorded_at
    };
}

async function reloadPermitteesFromDb() {
    const client = getClient();
    if (!client) return;

    const { data, error } = await client
        .from('permittees')
        .select('*')
        .order('created_at', { ascending: true });

    if (error) {
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to load permittees: ' + error.message, 'error');
        }
        return;
    }

    window.permitteesData = (data || []).map(row =>
        typeof window.mapDbRowToPermittee === 'function'
            ? window.mapDbRowToPermittee(row)
            : row
    );
    if (typeof savePermittees === 'function') savePermittees(window.permitteesData);
}

// ------------------------------------------------------------
// Bootstrap — robust, waits for client + DOM
// ------------------------------------------------------------
async function bootAnnualPage() {
    const client = getClient();
    if (!client) return;

    const { data: { session } } = await client.auth.getSession();
    if (!session) {
        window.location.href = '../index.html';
        return;
    }

    await reloadPermitteesFromDb();

    const urlId = new URLSearchParams(window.location.search).get('id');
    if (urlId) {
        selectedPermitteeId = urlId;
        showLedgerView();
    } else {
        showListView();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAnnualPage);
} else {
    bootAnnualPage();
}

// ------------------------------------------------------------
// View switching
// ------------------------------------------------------------
function showListView() {
    document.getElementById('annual-level-1-list').classList.remove('hidden');
    document.getElementById('annual-level-2-ledger').classList.add('hidden');
    renderAnnualLevel1List(window.permitteesData || []);
}

function showLedgerView() {
    document.getElementById('annual-level-1-list').classList.add('hidden');
    document.getElementById('annual-level-2-ledger').classList.remove('hidden');
    populateAnnualDropdown();
    loadPermitteeLedger(selectedPermitteeId);
}

function backToAnnualList() {
    history.replaceState(null, '', './annual-volume.html');
    selectedPermitteeId = null;
    showListView();
}

// ------------------------------------------------------------
// Level 1: List
// ------------------------------------------------------------
function renderAnnualLevel1List(data) {
    const tbody = document.getElementById('annual-list-tbody');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6">
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    No permittees match your search.
                </div>
            </td></tr>`;
        return;
    }

    const stat = window.getStatusInfo || ((p) => ({ label: p.status || 'Active', css: '' }));
    const esc  = window.escapeHtml    || ((s) => s);
    const fmt  = window.formatNumber  || ((n) => n);

    tbody.innerHTML = data.map(p => {
        const s = stat(p);
        return `
            <tr class="cursor-pointer" onclick="openAnnualLedgerById('${p.id}')">
                <td class="font-bold text-ink-900">${esc(p.name)}</td>
                <td><span class="font-mono text-xs font-semibold text-enro-700">${esc(p.permitNo)}</span></td>
                <td class="text-right font-bold ${p.remainingVol <= 100 ? 'text-rose-600' : 'text-enro-700'}">
                    ${fmt(p.remainingVol)} <span class="text-[10px] font-normal text-ink-400">cu.m</span>
                </td>
                <td class="text-right text-ink-600">
                    ${fmt(p.allowedVol)} <span class="text-[10px] text-ink-400">cu.m</span>
                </td>
                <td class="text-center"><span class="status-badge ${s.css}">${s.label}</span></td>
                <td class="text-center"><span class="text-[11px] font-bold text-enro-700">Open →</span></td>
            </tr>
        `;
    }).join('');
}

function filterAnnualListTable() {
    const q = (document.getElementById('annual-list-search').value || '').toLowerCase();
    renderAnnualLevel1List(
        (window.permitteesData || []).filter(p =>
            (p.name     || '').toLowerCase().includes(q) ||
            (p.permitNo || '').toLowerCase().includes(q)
        )
    );
}

function openAnnualLedgerById(id) {
    selectedPermitteeId = String(id);
    history.replaceState(null, '', `./annual-volume.html?id=${selectedPermitteeId}`);
    showLedgerView();
}

// ------------------------------------------------------------
// Level 2: Ledger
// ------------------------------------------------------------
function populateAnnualDropdown() {
    const sel = document.getElementById('annual-permittee-select');
    if (!sel) return;

    const esc = window.escapeHtml || ((s) => s);
    sel.innerHTML = (window.permitteesData || []).map(p =>
        `<option value="${p.id}">${esc(p.name)} — ${esc(p.permitNo)}</option>`
    ).join('');
    if (selectedPermitteeId) sel.value = selectedPermitteeId;
}

async function loadPermitteeLedger(id) {
    selectedPermitteeId = String(id);
    const p = (window.permitteesData || []).find(x => String(x.id) === selectedPermitteeId);
    if (!p) return;

    const esc = window.escapeHtml   || ((s) => s);
    const fmt = window.formatNumber || ((n) => n);
    const stat = window.getStatusInfo || ((p) => ({ label: p.status || 'Active', css: '' }));

    document.getElementById('annual-permittee-select').value = selectedPermitteeId;
    document.getElementById('breadcrumb-name').innerText = p.name;
    document.getElementById('av-name').innerText = p.name;
    document.getElementById('av-location').innerHTML =
        `<i class="fa-solid fa-location-dot text-ink-300 text-[10px]"></i><span>${esc(p.location)}</span>`;
    document.getElementById('av-permit-no').innerText = p.permitNo;
    document.getElementById('av-dates').innerText = `${p.startDate || '—'} → ${p.endDate || '—'}`;
    document.getElementById('av-allowed').innerText = `${fmt(p.allowedVol)} cu.m`;
    document.getElementById('av-rate').innerText = `Rate: ${p.rate || '—'}`;
    document.getElementById('av-remaining').innerText = `${fmt(p.remainingVol)} cu.m`;

    const s = stat(p);
    document.getElementById('av-status-tag').className = `status-badge ${s.css}`;
    document.getElementById('av-status-tag').innerText = s.label;

    document.getElementById('warning-low-volume-banner')
        .classList.toggle('hidden', p.remainingVol > 100);

    const client = getClient();
    const { data: txs, error } = await client
        .from('transactions')
        .select('*')
        .eq('permittee_id', p.id)
        .order('recorded_at', { ascending: false });

    if (error) {
        renderLedgerTable([]);
        return;
    }

    renderLedgerTable((txs || []).map(mapTxRow));
}

function renderLedgerTable(transactions) {
    const tbody = document.getElementById('annual-transactions-tbody');
    if (!tbody) return;

    const esc = window.escapeHtml   || ((s) => s);
    const fmt = window.formatNumber || ((n) => n);

    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="8">
                <div class="empty-state">
                    <i class="fa-solid fa-receipt"></i>
                    No delivery receipt transactions recorded yet.
                </div>
            </td></tr>`;
        return;
    }

    tbody.innerHTML = transactions.map(tx => `
        <tr>
            <td class="text-ink-600 whitespace-nowrap">${esc(tx.date)}</td>
            <td class="text-right ledger-row-negative whitespace-nowrap">-${fmt(tx.volume)}</td>
            <td>
                <span class="font-mono text-[11px] font-semibold text-enro-700 bg-enro-50 px-1.5 py-0.5 rounded border border-enro-100">
                    ${esc(tx.drNo)}
                </span>
            </td>
            <td class="text-right text-ink-700 whitespace-nowrap">₱${fmt(tx.amount)}</td>
            <td><span class="font-mono text-[11px] text-ink-500">${esc(tx.opNo || '—')}</span></td>
            <td class="text-ink-600 text-xs">${esc(tx.truckLoad || '—')}</td>
            <td class="text-right text-ink-500 whitespace-nowrap">${fmt(tx.prevBal)}</td>
            <td class="text-right ledger-row-balance whitespace-nowrap">${fmt(tx.newBal)}</td>
        </tr>
    `).join('');
}

// ------------------------------------------------------------
// Add Transaction Modal
// ------------------------------------------------------------
function openAddTransactionModal() {
    const p = (window.permitteesData || []).find(x => String(x.id) === selectedPermitteeId);
    if (!p) return;

    const fmt = window.formatNumber || ((n) => n);
    document.getElementById('tx-modal-permittee-name').innerText = p.name;
    document.getElementById('tx-modal-current-balance').innerText = `${fmt(p.remainingVol)} cu.m`;
    document.getElementById('tx-modal-error').classList.add('hidden');
    document.getElementById('modal-add-tx').classList.add('active');

    const dateInput = document.getElementById('tx-date');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
    }
}

function closeAddTransactionModal() {
    document.getElementById('modal-add-tx').classList.remove('active');
}

async function submitTransactionEntry(e) {
    e.preventDefault();

    const client = getClient();
    if (!client) {
        window.showToast && window.showToast('Authentication service unavailable.', 'error');
        return;
    }

    const p = (window.permitteesData || []).find(x => String(x.id) === selectedPermitteeId);
    if (!p) return;

    const errEl = document.getElementById('tx-modal-error');
    errEl.classList.add('hidden');

    const volume = parseFloat(document.getElementById('tx-volume').value);
    if (!volume || volume <= 0) {
        errEl.innerText = '⚠ Volume must be greater than zero.';
        errEl.classList.remove('hidden');
        return;
    }

    const { data: { session } } = await client.auth.getSession();
    const recordedBy = session?.user?.email || 'unknown';

    const { data: newBalance, error } = await client.rpc('record_transaction', {
        p_permittee_id: p.id,
        p_date:         document.getElementById('tx-date').value,
        p_dr_no:        document.getElementById('tx-dr-no').value.trim(),
        p_volume:       volume,
        p_amount:       parseFloat(document.getElementById('tx-amount').value) || 0,
        p_op_no:        document.getElementById('tx-op-no').value.trim(),
        p_truck_load:   document.getElementById('tx-truck-load').value.trim(),
        p_recorded_by:  recordedBy
    });

    if (error) {
        errEl.innerText = '⚠ ' + (error.message || 'Transaction rejected.');
        errEl.classList.remove('hidden');
        return;
    }

    await reloadPermitteesFromDb();

    closeAddTransactionModal();
    document.getElementById('form-add-tx').reset();
    await loadPermitteeLedger(p.id);

    const fmt = window.formatNumber || ((n) => n);
    const balanceNum = Number(newBalance);
    if (balanceNum <= 100) {
        window.showToast && window.showToast(
            `⚠ LOW BALANCE: ${p.name} now has only ${fmt(balanceNum)} cu.m remaining.`,
            'info'
        );
    } else {
        window.showToast && window.showToast('Delivery receipt recorded successfully.', 'success');
    }
}

// ------------------------------------------------------------
// Expose to HTML
// ------------------------------------------------------------
window.showListView             = showListView;
window.showLedgerView           = showLedgerView;
window.backToAnnualList         = backToAnnualList;
window.filterAnnualListTable    = filterAnnualListTable;
window.openAnnualLedgerById     = openAnnualLedgerById;
window.openAddTransactionModal  = openAddTransactionModal;
window.closeAddTransactionModal = closeAddTransactionModal;
window.submitTransactionEntry   = submitTransactionEntry;