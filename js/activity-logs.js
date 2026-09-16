// ============================================================
// ACTIVITY LOGS PAGE — with realtime subscription
// ============================================================
let allLogs = [];
let filteredLogs = [];
let currentPage = 1;
const PAGE_SIZE = 25;
const CLEAR_LOGS_PHRASE = 'CLEAR LOGS';
let realtimeChannel = null;

function getClient() {
    return window.supabaseClient ||
           (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
}

// ------------------------------------------------------------
// INJECT ACTIVITY LOGS MODAL ANIMATION CSS (once)
// ------------------------------------------------------------
function ensureActivityModalStyles() {
    if (document.getElementById('activity-modal-animations')) return;

    const style = document.createElement('style');
    style.id = 'activity-modal-animations';
    style.innerHTML = `
        /* --- Overlay fade in / out --- */
        @keyframes actOverlayIn {
            from { opacity: 0; }
            to   { opacity: 1; }
        }
        @keyframes actOverlayOut {
            from { opacity: 1; }
            to   { opacity: 0; }
        }

        /* --- Card spring pop in / out --- */
        @keyframes actCardIn {
            0%   { opacity: 0; transform: translateY(24px) scale(0.92); }
            60%  { opacity: 1; transform: translateY(-4px) scale(1.02); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes actCardOut {
            0%   { opacity: 1; transform: translateY(0) scale(1); }
            100% { opacity: 0; transform: translateY(16px) scale(0.94); }
        }

        /* --- Icon pop --- */
        @keyframes actIconPop {
            0%   { opacity: 0; transform: scale(0.5) rotate(-90deg); }
            60%  { opacity: 1; transform: scale(1.15) rotate(8deg); }
            100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }

        /* --- Staggered text fade --- */
        @keyframes actTextIn {
            from { opacity: 0; transform: translateY(6px); }
            to   { opacity: 1; transform: translateY(0); }
        }

        /* --- Apply to any activity modal overlay --- */
        .modal-overlay.active {
            animation: actOverlayIn 0.26s ease-out both;
        }
        .modal-overlay.closing {
            animation: actOverlayOut 0.22s ease-in both;
        }

        /* --- Card --- */
        .modal-overlay.active > .modal-card {
            animation: actCardIn 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both;
            transform-origin: center center;
        }
        .modal-overlay.closing > .modal-card {
            animation: actCardOut 0.24s ease-in both;
        }

        /* --- Icon inside modal --- */
        .modal-overlay.active [style*="border-radius:9999px"] {
            animation: actIconPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s both;
        }

        /* --- Staggered content --- */
        .modal-overlay.active .p-5,
        .modal-overlay.active .modal-actions {
            animation: actTextIn 0.34s ease-out 0.14s both;
        }

        /* --- Close (X) icon rotate — only the header X button --- */
        .modal-overlay .modal-close-icon {
            transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
        }
        .modal-overlay .modal-close-icon:hover {
            transform: rotate(90deg) scale(1.05);
        }

        /* --- Keep modal action buttons from squishing --- */
        .modal-overlay .btn-secondary,
        .modal-overlay .btn-primary,
        .modal-overlay .modal-btn {
            flex-shrink: 0;
            white-space: nowrap;
        }

        /* --- Input focus glow --- */
        .modal-overlay .input-field {
            transition: border-color 0.2s ease, box-shadow 0.25s ease, background 0.2s ease;
        }
        .modal-overlay .input-field:focus {
            border-color: #16a34a;
            box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.08);
            background: #fafffb;
        }

        /* --- Button micro-interactions --- */
        .modal-overlay .btn-primary,
        .modal-overlay .btn-secondary,
        .modal-overlay .modal-btn {
            transition: background-color 0.2s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease, color 0.18s ease;
        }
        .modal-overlay .btn-primary:hover,
        .modal-overlay .btn-secondary:hover {
            transform: translateY(-1px);
        }
        .modal-overlay .btn-primary:active,
        .modal-overlay .btn-secondary:active {
            transform: scale(0.97);
        }
        .modal-overlay .modal-btn--danger:hover:not(:disabled) {
            transform: translateY(-1px) scale(1.02);
            background-color: #be123c;
            animation: actDangerPulse 1.4s ease-out infinite;
        }
        .modal-overlay .modal-btn--danger:active:not(:disabled) {
            transform: scale(0.97);
        }
        @keyframes actDangerPulse {
            0%   { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.55); }
            70%  { box-shadow: 0 0 0 10px rgba(225, 29, 72, 0); }
            100% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); }
        }

        /* --- New log row highlight --- */
        @keyframes newLogFlash {
            0%   { background-color: rgba(22, 163, 74, 0.18); }
            100% { background-color: transparent; }
        }
        tr.log-row-new {
            animation: newLogFlash 1.8s ease-out;
        }
    `;
    document.head.appendChild(style);
}

// ------------------------------------------------------------
// Generic smooth open/close helpers
// ------------------------------------------------------------
function smoothOpenModal(modalId) {
    ensureActivityModalStyles();
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

// ------------------------------------------------------------
// Fetch logs
// ------------------------------------------------------------
async function fetchLogs() {
    const client = getClient();
    if (!client) return [];

    const { data, error } = await client
        .from('activity_logs')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(1000);

    if (error) {
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to load logs: ' + error.message, 'error');
        }
        return [];
    }

    return data || [];
}

// ------------------------------------------------------------
// REALTIME — live updates on activity_logs table
// ------------------------------------------------------------
function setupRealtimeSubscription() {
    const client = getClient();
    if (!client) return;

    // Clean up any previous channel first
    if (realtimeChannel) {
        client.removeChannel(realtimeChannel);
        realtimeChannel = null;
    }

    realtimeChannel = client
        .channel('public:activity_logs')
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'activity_logs' },
            (payload) => {
                const newLog = payload.new;
                if (!newLog) return;

                // Prepend to local array (newest first)
                allLogs.unshift(newLog);

                // If we're on page 1, flash the new row
                const wasFirstPage = currentPage === 1;

                // Re-apply filters
                filterLogs();

                // If user is on page 1, highlight the new row
                if (wasFirstPage) {
                    requestAnimationFrame(() => highlightNewestRow(newLog.id));
                }
            }
        )
        .on(
            'postgres_changes',
            { event: 'DELETE', schema: 'public', table: 'activity_logs' },
            (payload) => {
                const deletedId = payload.old?.id;
                if (!deletedId) return;
                allLogs = allLogs.filter(l => String(l.id) !== String(deletedId));
                filterLogs();
            }
        )
        .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'activity_logs' },
            (payload) => {
                const updated = payload.new;
                if (!updated) return;
                const idx = allLogs.findIndex(l => String(l.id) === String(updated.id));
                if (idx !== -1) {
                    allLogs[idx] = updated;
                } else {
                    allLogs.unshift(updated);
                }
                filterLogs();
            }
        )
        .subscribe((status) => {
            console.log('[Activity Logs Realtime] status:', status);
        });
}

function highlightNewestRow(logId) {
    const tbody = document.getElementById('activity-logs-tbody');
    if (!tbody) return;

    // Find the row with data-log-id (we need to add it in renderLogs)
    const row = tbody.querySelector(`tr[data-log-id="${logId}"]`);
    if (!row) return;

    row.classList.remove('log-row-new');
    void row.offsetWidth;
    row.classList.add('log-row-new');

    // Remove the class after animation completes
    setTimeout(() => row.classList.remove('log-row-new'), 2000);
}

// ------------------------------------------------------------
// Action styling
// ------------------------------------------------------------
function getActionMeta(action) {
    return {
        LOGIN:        { label: 'Signed in',    css: 'bg-enro-50 text-enro-700 border-enro-200',          icon: 'fa-right-to-bracket'   },
        LOGOUT:       { label: 'Signed out',   css: 'bg-ink-100 text-ink-600 border-ink-200',            icon: 'fa-right-from-bracket' },
        FAILED_LOGIN: { label: 'Login failed', css: 'bg-rose-50 text-rose-700 border-rose-200',          icon: 'fa-user-lock'          },
        INSERT:       { label: 'Created',      css: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: 'fa-plus'               },
        UPDATE:       { label: 'Updated',      css: 'bg-blue-50 text-blue-700 border-blue-200',          icon: 'fa-pen'                },
        DELETE:       { label: 'Deleted',      css: 'bg-rose-50 text-rose-700 border-rose-200',          icon: 'fa-trash'              }
    }[action] || { label: action || '—', css: 'bg-ink-100 text-ink-600 border-ink-200', icon: 'fa-circle' };
}

// ------------------------------------------------------------
// Render table
// ------------------------------------------------------------
function renderLogs() {
    const tbody = document.getElementById('activity-logs-tbody');
    const badge = document.getElementById('log-count-badge');
    if (!tbody) return;

    if (badge) badge.innerText = `${filteredLogs.length} ${filteredLogs.length === 1 ? 'entry' : 'entries'}`;

    if (filteredLogs.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="6">
                <div class="empty-state">
                    <i class="fa-solid fa-clipboard-list"></i>
                    No activity logs match your filters.
                </div>
            </td></tr>`;
        renderPagination(0);
        return;
    }

    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const start = (currentPage - 1) * PAGE_SIZE;
    const pageRows = filteredLogs.slice(start, start + PAGE_SIZE);

    const esc = window.escapeHtml || ((s) => s);

    tbody.innerHTML = pageRows.map(log => {
        const when = new Date(log.performed_at);
        const whenStr = isNaN(when.getTime())
            ? '—'
            : when.toLocaleString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

        const meta = getActionMeta(log.action);

        const entityLabel = {
            'auth':         'Authentication',
            'permittees':   'Permittee',
            'transactions': 'Transaction'
        }[log.entity_type] || log.entity_type || '—';

        const recordDisplay = log.entity_type === 'auth'
            ? esc(log.performed_by || log.entity_name || '—')
            : esc(log.entity_name || '—');

        return `
            <tr data-log-id="${log.id}">
                <td class="text-ink-500 text-[11px] whitespace-nowrap">${esc(whenStr)}</td>
                <td>
                    <span class="status-badge ${meta.css}">
                        <i class="fa-solid ${meta.icon} text-[8px]"></i>
                        ${esc(meta.label)}
                    </span>
                </td>
                <td class="text-ink-600 text-xs">${esc(entityLabel)}</td>
                <td class="font-bold text-ink-900 text-xs">${recordDisplay}</td>
                <td class="text-ink-500 text-[11px]">${esc(log.performed_by || 'system')}</td>
                <td class="text-center">
                    <button type="button"
                            onclick="openLogDetailsModal('${log.id}')"
                            class="text-[11px] font-bold text-enro-700 hover:text-enro-900 hover:underline">
                        View
                    </button>
                </td>
            </tr>
        `;
    }).join('');

    renderPagination(filteredLogs.length);
}

// ------------------------------------------------------------
// Filters
// ------------------------------------------------------------
function filterLogs() {
    const q      = (document.getElementById('log-search-input')?.value || '').toLowerCase();
    const action = document.getElementById('log-action-filter')?.value || '';
    const entity = document.getElementById('log-entity-filter')?.value || '';

    filteredLogs = allLogs.filter(log => {
        const matchesSearch =
            (log.entity_name  || '').toLowerCase().includes(q) ||
            (log.performed_by || '').toLowerCase().includes(q) ||
            (log.action       || '').toLowerCase().includes(q);

        const matchesAction = !action || log.action === action;
        const matchesEntity = !entity || log.entity_type === entity;

        return matchesSearch && matchesAction && matchesEntity;
    });

    currentPage = 1;
    renderLogs();
}

// ------------------------------------------------------------
// Pagination
// ------------------------------------------------------------
function renderPagination(totalRows) {
    const rangeEl = document.getElementById('pagination-range');
    const totalEl = document.getElementById('pagination-total');
    const prevBtn = document.getElementById('pagination-prev');
    const nextBtn = document.getElementById('pagination-next');
    const pagesEl = document.getElementById('pagination-pages');

    if (totalRows === 0) {
        if (rangeEl) rangeEl.innerText = '0–0';
        if (totalEl) totalEl.innerText = '0';
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        if (pagesEl)  pagesEl.innerHTML = '';
        return;
    }

    const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end   = Math.min(currentPage * PAGE_SIZE, totalRows);

    if (rangeEl) rangeEl.innerText = `${start}–${end}`;
    if (totalEl) totalEl.innerText = totalRows;
    if (prevBtn) prevBtn.disabled = (currentPage === 1);
    if (nextBtn) nextBtn.disabled = (currentPage === totalPages);

    if (pagesEl) {
        const pages = [];
        const push = (n) => pages.push(
            `<button class="pagination-page ${n === currentPage ? 'is-active' : ''}"
                     onclick="goToPage(${n})">${n}</button>`
        );
        const pushEllipsis = () => pages.push(`<span class="pagination-ellipsis">…</span>`);

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) push(i);
        } else {
            push(1);
            if (currentPage > 3) pushEllipsis();
            const from = Math.max(2, currentPage - 1);
            const to   = Math.min(totalPages - 1, currentPage + 1);
            for (let i = from; i <= to; i++) push(i);
            if (currentPage < totalPages - 2) pushEllipsis();
            push(totalPages);
        }
        pagesEl.innerHTML = pages.join('');
    }
}

function goToPage(n) {
    const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
    if (n < 1 || n > totalPages || n === currentPage) return;
    currentPage = n;
    renderLogs();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function goToPrevPage() { goToPage(currentPage - 1); }
function goToNextPage() { goToPage(currentPage + 1); }

// ------------------------------------------------------------
// Details modal — CLEAN, HUMAN-READABLE OUTPUT — SMOOTH
// ------------------------------------------------------------
function openLogDetailsModal(id) {
    const log = allLogs.find(l => String(l.id) === String(id));
    if (!log) return;

    const sub = document.getElementById('log-details-subtitle');
    if (sub) {
        sub.innerText = `${log.action} • ${log.entity_type} • ${log.performed_by || 'system'}`;
    }

    let details = log.details;
    if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch (_) { /* leave as string */ }
    }

    const lines = [];
    const add = (label, value) => {
        if (value !== undefined && value !== null && value !== '') {
            lines.push(`${label.padEnd(18)} ${value}`);
        }
    };

    add('Action:',  log.action);
    add('Who:',     log.performed_by || 'system');
    add('When:',    new Date(log.performed_at).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }));
    add('Entity:',  log.entity_type);
    if (log.entity_name) add('Record:', log.entity_name);

    if (log.entity_type === 'auth') {
        lines.push('');
        lines.push('─── Authentication ─────────────');
        add('Email:', log.performed_by);

        const reason = details?.reason;
        if (reason) {
            lines.push('');
            lines.push('  ⚠  ' + reason);
            lines.push('');
        }

        if (log.user_agent) {
            const ua = String(log.user_agent);
            const shortUA =
                ua.includes('Chrome')  ? 'Chrome'  :
                ua.includes('Firefox') ? 'Firefox' :
                ua.includes('Safari')  ? 'Safari'  :
                ua.includes('Edge')    ? 'Edge'    :
                'Browser';
            add('Browser:', shortUA);
        }
    }
    else if (log.entity_type === 'transactions') {
        const d = details || {};
        lines.push('');
        lines.push('─── Transaction ────────────────');
        add('Permittee:',   d.permittee);
        add('Permit No:',   d.permit_no);
        add('DR Number:',   d.dr_no);
        add('Date:',        d.date);
        add('Volume:',      d.volume ? `${d.volume} cu.m` : null);
        add('Amount:',      d.amount ? `₱${d.amount}` : null);
        add('OP #:',        d.op_no);
        add('Truck/Plate:', d.truck_load);
        if (d.prev_balance !== undefined) add('Prev Balance:', `${d.prev_balance} cu.m`);
        if (d.new_balance  !== undefined) add('New Balance:',  `${d.new_balance} cu.m`);
        if (d.recorded_by)                add('Recorded By:',  d.recorded_by);
    }
    else if (log.entity_type === 'permittees') {
        const before = details?.before || {};
        const after  = details?.after  || {};

        if (log.action === 'INSERT' && after.name) {
            lines.push('');
            lines.push('─── New Permittee ──────────────');
            add('Name:',        after.name);
            add('Location:',    after.location);
            add('Permit No:',   after.permit_no);
            add('Type:',        after.type);
            add('Commodity:',   after.commodity);
            add('Area:',        after.area);
            add('Allowed Vol:', after.allowed_vol ? `${after.allowed_vol} cu.m` : null);
            add('Start Date:',  after.start_date);
            add('End Date:',    after.end_date);
            add('Status:',      after.status);
        }
        else if (log.action === 'UPDATE') {
            lines.push('');
            lines.push('─── Changes ────────────────────');

            const fields = [
                ['name',          'Name'],
                ['location',      'Location'],
                ['permit_no',     'Permit No'],
                ['type',          'Type'],
                ['commodity',     'Commodity'],
                ['area',          'Area'],
                ['rate',          'Annual Extraction'],
                ['allowed_vol',   'Allowed Volume'],
                ['remaining_vol', 'Remaining Volume'],
                ['start_date',    'Start Date'],
                ['end_date',      'End Date'],
                ['status',        'Status']
            ];

            let anyChange = false;
            fields.forEach(([key, label]) => {
                const b = before[key];
                const a = after[key];
                if (String(b) !== String(a)) {
                    anyChange = true;
                    lines.push(`${label.padEnd(18)} ${b ?? '—'}  →  ${a ?? '—'}`);
                }
            });

            if (!anyChange) lines.push('  (No field values changed)');
        }
        else if (log.action === 'DELETE') {
            lines.push('');
            lines.push('─── Deleted Permittee ──────────');
            add('Name:',      before.name);
            add('Location:',  before.location);
            add('Permit No:', before.permit_no);
            add('Type:',      before.type);
            add('Commodity:', before.commodity);
        }
    }
    else {
        lines.push('');
        lines.push(JSON.stringify(details, null, 2));
    }

    const pre = document.getElementById('log-details-json');
    if (pre) pre.innerText = lines.join('\n');

    smoothOpenModal('modal-log-details');
}

function closeLogDetailsModal() {
    smoothCloseModal('modal-log-details');
}

// ------------------------------------------------------------
// Clear logs — SMOOTH
// ------------------------------------------------------------
function openClearLogsModal() {
    const countEl = document.getElementById('clear-logs-count');
    if (countEl) countEl.innerText = allLogs.length;

    const input = document.getElementById('clear-logs-confirm-input');
    if (input) input.value = '';

    const btn = document.getElementById('clear-logs-confirm-btn');
    if (btn) btn.disabled = true;

    smoothOpenModal('modal-clear-logs');

    if (input && !input.__wired) {
        input.addEventListener('input', function () {
            const confirmBtn = document.getElementById('clear-logs-confirm-btn');
            if (confirmBtn) confirmBtn.disabled =
                this.value.trim().toUpperCase() !== CLEAR_LOGS_PHRASE;
        });
        input.__wired = true;
    }

    setTimeout(() => {
        if (input) input.focus();
    }, 350);
}

function closeClearLogsModal() {
    smoothCloseModal('modal-clear-logs', () => {
        const input = document.getElementById('clear-logs-confirm-input');
        if (input) input.value = '';
        const btn = document.getElementById('clear-logs-confirm-btn');
        if (btn) btn.disabled = true;
    });
}

async function confirmClearLogs() {
    const input = document.getElementById('clear-logs-confirm-input');
    const typed = input ? input.value.trim().toUpperCase() : '';
    if (typed !== CLEAR_LOGS_PHRASE) return;

    const client = getClient();
    if (!client) return;

    const btn = document.getElementById('clear-logs-confirm-btn');
    const originalHTML = btn ? btn.innerHTML : 'Clear Logs';
    if (btn) { btn.disabled = true; btn.innerHTML = 'Clearing...'; }

    const { error } = await client
        .from('activity_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

    if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }

    if (error) {
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to clear logs: ' + error.message, 'error');
        }
        return;
    }

    closeClearLogsModal();
    await reload();
    if (typeof window.showToast === 'function') {
        window.showToast('All activity logs cleared.', 'success');
    }
}

// ------------------------------------------------------------
// CSV Export
// ------------------------------------------------------------
function exportLogsToExcel() {
    if (!filteredLogs || filteredLogs.length === 0) {
        window.showToast && window.showToast('No logs to export.', 'error');
        return;
    }

    const rows = [['When', 'Action', 'Entity', 'Record', 'Performed By', 'Details']];

    filteredLogs.forEach(log => {
        rows.push([
            log.performed_at,
            log.action,
            log.entity_type,
            log.entity_name || '',
            log.performed_by || 'system',
            JSON.stringify(log.details || {})
        ]);
    });

    const csv = rows.map(r =>
        r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ENRO_Activity_Logs_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    window.showToast && window.showToast('Activity logs exported.', 'success');
}

// ------------------------------------------------------------
// Boot
// ------------------------------------------------------------
async function reload() {
    allLogs = await fetchLogs();
    filterLogs();
}

async function bootActivityLogs() {
    const client = getClient();
    if (!client) return;

    const { data: { session } } = await client.auth.getSession();
    if (!session) {
        window.location.href = '../index.html';
        return;
    }

    await reload();
    setupRealtimeSubscription();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootActivityLogs);
} else {
    bootActivityLogs();
}

// ------------------------------------------------------------
// Expose to HTML
// ------------------------------------------------------------
window.filterLogs              = filterLogs;
window.goToPage                = goToPage;
window.goToPrevPage            = goToPrevPage;
window.goToNextPage            = goToNextPage;
window.openLogDetailsModal     = openLogDetailsModal;
window.closeLogDetailsModal    = closeLogDetailsModal;
window.openClearLogsModal      = openClearLogsModal;
window.closeClearLogsModal     = closeClearLogsModal;
window.confirmClearLogs        = confirmClearLogs;
window.exportLogsToExcel       = exportLogsToExcel;