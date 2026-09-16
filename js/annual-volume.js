// ============================================================
// ANNUAL VOLUME PAGE — DB-backed ledger with pagination
// ============================================================
let selectedPermitteeId = null;

// Pagination state for the permittee list
let annualAllPermittees = [];
let annualCurrentPage = 1;
const ANNUAL_PAGE_SIZE = 25;

// ------------------------------------------------------------
// Config
// ------------------------------------------------------------
const LOW_VOLUME_THRESHOLD = 100;

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

// ------------------------------------------------------------
// AUTO-COMPUTE STATUS from remaining volume
// ------------------------------------------------------------
function computeStatus(remaining, allowed) {
    remaining = Number(remaining) || 0;
    allowed = Number(allowed) || 0;

    if (remaining <= 0) {
        return { label: 'Fully Consumed', css: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    if (remaining <= LOW_VOLUME_THRESHOLD) {
        return { label: 'Nearly Exhausted', css: 'bg-rose-50 text-rose-700 border-rose-200' };
    }
    const pct = allowed > 0 ? (remaining / allowed) * 100 : 0;
    if (pct <= 25) {
        return { label: 'Low Production', css: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { label: 'Active', css: 'bg-enro-50 text-enro-700 border-enro-200' };
}

// ------------------------------------------------------------
// INJECT ANNUAL VOLUME MODAL ANIMATION CSS (once)
// ------------------------------------------------------------
function ensureAnnualModalStyles() {
    if (document.getElementById('annual-modal-animations')) return;

    const style = document.createElement('style');
    style.id = 'annual-modal-animations';
    style.innerHTML = `
        @keyframes annualOverlayIn {
            from { opacity: 0; }
            to   { opacity: 1; }
        }
        @keyframes annualOverlayOut {
            from { opacity: 1; }
            to   { opacity: 0; }
        }
        @keyframes annualCardIn {
            0%   { opacity: 0; transform: translateY(24px) scale(0.92); }
            60%  { opacity: 1; transform: translateY(-4px) scale(1.02); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes annualCardOut {
            0%   { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(16px) scale(0.94); }
        }
        @keyframes annualIconPop {
            0%   { opacity: 0; transform: scale(0.5) rotate(-90deg); }
            60%  { opacity: 1; transform: scale(1.15) rotate(8deg); }
            100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes annualTextIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes annualSectionUnderline {
            from { width: 0; }
            to   { width: 100%; }
        }

        #modal-add-tx.active {
            animation: annualOverlayIn 0.26s ease-out both;
        }
        #modal-add-tx.closing {
            animation: annualOverlayOut 0.22s ease-in both;
        }
        #modal-add-tx.active .modal-card {
            animation: annualCardIn 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both;
            transform-origin: center center;
        }
        #modal-add-tx.closing .modal-card {
            animation: annualCardOut 0.24s ease-in both;
        }
        #modal-add-tx.active [style*="border-radius:9999px"] {
            animation: annualIconPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s both;
        }
        #modal-add-tx.active .form-stagger > * {
            animation: annualTextIn 0.34s ease-out both;
        }
        #modal-add-tx.active .form-stagger > *:nth-child(1) { animation-delay: 0.10s; }
        #modal-add-tx.active .form-stagger > *:nth-child(2) { animation-delay: 0.14s; }
        #modal-add-tx.active .form-stagger > *:nth-child(3) { animation-delay: 0.18s; }
        #modal-add-tx.active .form-stagger > *:nth-child(4) { animation-delay: 0.22s; }
        #modal-add-tx.active .form-stagger > *:nth-child(5) { animation-delay: 0.26s; }
        #modal-add-tx.active .form-stagger > *:nth-child(6) { animation-delay: 0.30s; }

        #modal-add-tx .modal-close-icon {
            transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
        }
        #modal-add-tx .modal-close-icon:hover {
            transform: rotate(90deg) scale(1.05);
        }

        #modal-add-tx .btn-secondary,
        #modal-add-tx .btn-primary,
        #modal-add-tx .modal-btn {
            flex-shrink: 0;
            white-space: nowrap;
        }

        #modal-add-tx .input-field {
            transition: border-color 0.2s ease, box-shadow 0.25s ease, background 0.2s ease;
        }
        #modal-add-tx .input-field:focus {
            border-color: #16a34a;
            box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.08);
            background: #fafffb;
        }

        #modal-add-tx.active .form-section-title {
            position: relative;
            display: inline-block;
        }
        #modal-add-tx.active .form-section-title::after {
            content: '';
            position: absolute;
            bottom: -3px;
            left: 0;
            height: 2px;
            background: #16a34a;
            border-radius: 1px;
            animation: annualSectionUnderline 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;
        }

        #modal-add-tx .btn-primary,
        #modal-add-tx .btn-secondary,
        #modal-add-tx .modal-btn {
            transition: background-color 0.2s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease, color 0.18s ease;
        }
        #modal-add-tx .btn-primary:hover,
        #modal-add-tx .btn-secondary:hover {
            transform: translateY(-1px);
        }
        #modal-add-tx .btn-primary:active,
        #modal-add-tx .btn-secondary:active {
            transform: scale(0.97);
        }
    `;
    document.head.appendChild(style);
}

// ------------------------------------------------------------
// Generic smooth open/close helpers
// ------------------------------------------------------------
function smoothOpenModal(modalId) {
    ensureAnnualModalStyles();
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('closing');
    modal.style.display = 'flex';
    void modal.offsetWidth;
    modal.classList.add('active');
}

function smoothCloseModal(modalId, onClosed) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove('active');
    modal.classList.add('closing');

    setTimeout(() => {
        modal.classList.remove('closing');
        modal.style.display = '';
        if (typeof onClosed === 'function') onClosed();
    }, 250);
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
// Bootstrap
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
// Level 1: List (paginated)
// ------------------------------------------------------------
function renderAnnualLevel1List(data) {
    annualAllPermittees = data || [];

    const tbody = document.getElementById('annual-list-tbody');
    if (!tbody) return;

    if (annualAllPermittees.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6">
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    No permittees match your search.
                </div>
            </td></tr>`;
        renderAnnualPagination(0);
        return;
    }

    const totalPages = Math.max(1, Math.ceil(annualAllPermittees.length / ANNUAL_PAGE_SIZE));
    if (annualCurrentPage > totalPages) annualCurrentPage = totalPages;
    if (annualCurrentPage < 1) annualCurrentPage = 1;

    const start = (annualCurrentPage - 1) * ANNUAL_PAGE_SIZE;
    const pageRows = annualAllPermittees.slice(start, start + ANNUAL_PAGE_SIZE);

    const esc  = window.escapeHtml    || ((s) => s);
    const fmt  = window.formatNumber  || ((n) => n);

    tbody.innerHTML = pageRows.map(p => {
        const s = computeStatus(p.remainingVol, p.allowedVol);
        return `
            <tr class="cursor-pointer" onclick="openAnnualLedgerById('${p.id}')">
                <td class="font-bold text-ink-900">${esc(p.name)}</td>
                <td><span class="font-mono text-xs font-semibold text-enro-700">${esc(p.permitNo)}</span></td>
                <td class="text-right font-bold ${p.remainingVol <= LOW_VOLUME_THRESHOLD ? 'text-rose-600' : 'text-enro-700'}">
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

    renderAnnualPagination(annualAllPermittees.length);
}

function filterAnnualListTable() {
    const q = (document.getElementById('annual-list-search').value || '').toLowerCase();
    annualCurrentPage = 1;
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
// Pagination
// ------------------------------------------------------------
function renderAnnualPagination(totalRows) {
    const rangeEl = document.getElementById('annual-pagination-range');
    const totalEl = document.getElementById('annual-pagination-total');
    const prevBtn = document.getElementById('annual-pagination-prev');
    const nextBtn = document.getElementById('annual-pagination-next');
    const pagesEl = document.getElementById('annual-pagination-pages');

    if (totalRows === 0) {
        if (rangeEl) rangeEl.innerText = '0–0';
        if (totalEl) totalEl.innerText = '0';
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        if (pagesEl)  pagesEl.innerHTML = '';
        return;
    }

    const totalPages = Math.max(1, Math.ceil(totalRows / ANNUAL_PAGE_SIZE));
    const start = (annualCurrentPage - 1) * ANNUAL_PAGE_SIZE + 1;
    const end   = Math.min(annualCurrentPage * ANNUAL_PAGE_SIZE, totalRows);

    if (rangeEl) rangeEl.innerText = `${start}–${end}`;
    if (totalEl) totalEl.innerText = totalRows;
    if (prevBtn) prevBtn.disabled = (annualCurrentPage === 1);
    if (nextBtn) nextBtn.disabled = (annualCurrentPage === totalPages);

    if (pagesEl) {
        const pages = [];
        const push = (n) => pages.push(
            `<button class="pagination-page ${n === annualCurrentPage ? 'is-active' : ''}"
                     onclick="goToAnnualPage(${n})">${n}</button>`
        );
        const pushEllipsis = () => pages.push(`<span class="pagination-ellipsis">…</span>`);

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) push(i);
        } else {
            push(1);
            if (annualCurrentPage > 3) pushEllipsis();
            const from = Math.max(2, annualCurrentPage - 1);
            const to   = Math.min(totalPages - 1, annualCurrentPage + 1);
            for (let i = from; i <= to; i++) push(i);
            if (annualCurrentPage < totalPages - 2) pushEllipsis();
            push(totalPages);
        }
        pagesEl.innerHTML = pages.join('');
    }
}

function goToAnnualPage(n) {
    const totalPages = Math.max(1, Math.ceil(annualAllPermittees.length / ANNUAL_PAGE_SIZE));
    if (n < 1 || n > totalPages || n === annualCurrentPage) return;
    annualCurrentPage = n;
    renderAnnualLevel1List(annualAllPermittees);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function goToAnnualPrevPage() { goToAnnualPage(annualCurrentPage - 1); }
function goToAnnualNextPage() { goToAnnualPage(annualCurrentPage + 1); }

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

    document.getElementById('annual-permittee-select').value = selectedPermitteeId;
    document.getElementById('breadcrumb-name').innerText = p.name;
    document.getElementById('av-name').innerText = p.name;
    document.getElementById('av-location').innerHTML =
        `<i class="fa-solid fa-location-dot text-ink-300 text-[10px]"></i><span>${esc(p.location)}</span>`;
    document.getElementById('av-permit-no').innerText = p.permitNo;
    document.getElementById('av-dates').innerText = `${p.startDate || '—'} → ${p.endDate || '—'}`;
    document.getElementById('av-allowed').innerText = `${fmt(p.allowedVol)} cu.m`;
    document.getElementById('av-remaining').innerText = `${fmt(p.remainingVol)} cu.m`;

    // Show used volume + percentage instead of redundant rate
    const allowed = Number(p.allowedVol) || 0;
    const remaining = Number(p.remainingVol) || 0;
    const used = allowed - remaining;
    const usedPct = allowed > 0 ? ((used / allowed) * 100).toFixed(1) : 0;

    const rateEl = document.getElementById('av-rate');
    if (used > 0) {
        rateEl.innerHTML = `Used: <strong class="text-ink-700">${fmt(used)}</strong> cu.m <span class="text-ink-400">(${usedPct}%)</span>`;
    } else {
        rateEl.innerHTML = `<span class="text-ink-400">No extraction yet</span>`;
    }

    // Auto-compute status from remaining volume
    const s = computeStatus(remaining, allowed);
    document.getElementById('av-status-tag').className = `status-badge ${s.css}`;
    document.getElementById('av-status-tag').innerText = s.label;

    document.getElementById('warning-low-volume-banner')
        .classList.toggle('hidden', remaining > LOW_VOLUME_THRESHOLD);

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
// Auto-fill remaining volume (Fill All button)
// ------------------------------------------------------------
function fillRemainingVolume() {
    const p = (window.permitteesData || []).find(x => String(x.id) === selectedPermitteeId);
    if (!p) return;

    const volInput = document.getElementById('tx-volume');
    const remaining = Number(p.remainingVol) || 0;

    volInput.value = remaining.toFixed(2);
    volInput.dispatchEvent(new Event('input'));

    const drInput = document.getElementById('tx-dr-no');
    if (drInput && !drInput.value) {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        drInput.value = `DR-${yyyy}-${mm}${dd}`;
    }
}

// ------------------------------------------------------------
// Add Transaction Modal — SMOOTH
// ------------------------------------------------------------
function openAddTransactionModal() {
    const p = (window.permitteesData || []).find(x => String(x.id) === selectedPermitteeId);
    if (!p) return;

    const fmt = window.formatNumber || ((n) => n);
    document.getElementById('tx-modal-permittee-name').innerText = p.name;
    document.getElementById('tx-modal-current-balance').innerText = `${fmt(p.remainingVol)} cu.m`;
    document.getElementById('tx-modal-error').classList.add('hidden');

    smoothOpenModal('modal-add-tx');

    const form = document.querySelector('#modal-add-tx form');
    if (form) form.scrollTop = 0;

    const dateInput = document.getElementById('tx-date');
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
    }

    setTimeout(() => {
        const first = document.getElementById('tx-date');
        if (first) first.focus();
    }, 350);
}

function closeAddTransactionModal() {
    smoothCloseModal('modal-add-tx', () => {
        const amountInput = document.getElementById('tx-amount');
        if (amountInput) amountInput.value = '';
        const volInput = document.getElementById('tx-volume');
        if (volInput) volInput.value = '';
    });
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
    if (balanceNum <= LOW_VOLUME_THRESHOLD) {
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
window.goToAnnualPage           = goToAnnualPage;
window.goToAnnualPrevPage       = goToAnnualPrevPage;
window.goToAnnualNextPage       = goToAnnualNextPage;
window.fillRemainingVolume      = fillRemainingVolume;