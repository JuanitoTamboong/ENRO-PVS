// ============================================================
// ACTIVITY LOGS PAGE
// ============================================================
let allLogs = [];
let filteredLogs = [];
let currentPage = 1;
const PAGE_SIZE = 25;
const CLEAR_LOGS_PHRASE = 'CLEAR LOGS';

function getClient() {
    return window.supabaseClient ||
           (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
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
            <tr>
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
// Details modal — CLEAN, HUMAN-READABLE OUTPUT
// ------------------------------------------------------------
function openLogDetailsModal(id) {
    const log = allLogs.find(l => String(l.id) === String(id));
    if (!log) return;

    // Subtitle
    const sub = document.getElementById('log-details-subtitle');
    if (sub) {
        sub.innerText = `${log.action} • ${log.entity_type} • ${log.performed_by || 'system'}`;
    }

    // Parse details safely
    let details = log.details;
    if (typeof details === 'string') {
        try { details = JSON.parse(details); } catch (_) { /* leave as string */ }
    }

    // Build clean, human-readable output
    const lines = [];
    const add = (label, value) => {
        if (value !== undefined && value !== null && value !== '') {
            lines.push(`${label.padEnd(18)} ${value}`);
        }
    };

    // Header
    add('Action:',  log.action);
    add('Who:',     log.performed_by || 'system');
    add('When:',    new Date(log.performed_at).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    }));
    add('Entity:',  log.entity_type);
    if (log.entity_name) add('Record:', log.entity_name);

    // ---- Auth events ----
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

    // ---- Transaction events ----
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

    // ---- Permittee changes ----
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

    // ---- Unknown ----
    else {
        lines.push('');
        lines.push(JSON.stringify(details, null, 2));
    }

    const pre = document.getElementById('log-details-json');
    if (pre) pre.innerText = lines.join('\n');

    const modal = document.getElementById('modal-log-details');
    if (modal) modal.classList.add('active');
}

function closeLogDetailsModal() {
    const modal = document.getElementById('modal-log-details');
    if (modal) modal.classList.remove('active');
}

// ------------------------------------------------------------
// Clear logs
// ------------------------------------------------------------
function openClearLogsModal() {
    const countEl = document.getElementById('clear-logs-count');
    if (countEl) countEl.innerText = allLogs.length;

    const input = document.getElementById('clear-logs-confirm-input');
    if (input) input.value = '';

    const btn = document.getElementById('clear-logs-confirm-btn');
    if (btn) btn.disabled = true;

    const modal = document.getElementById('modal-clear-logs');
    if (modal) modal.classList.add('active');

    if (input && !input.__wired) {
        input.addEventListener('input', function () {
            const confirmBtn = document.getElementById('clear-logs-confirm-btn');
            if (confirmBtn) confirmBtn.disabled =
                this.value.trim().toUpperCase() !== CLEAR_LOGS_PHRASE;
        });
        input.__wired = true;
    }
}

function closeClearLogsModal() {
    const modal = document.getElementById('modal-clear-logs');
    if (modal) modal.classList.remove('active');
    const input = document.getElementById('clear-logs-confirm-input');
    if (input) input.value = '';
    const btn = document.getElementById('clear-logs-confirm-btn');
    if (btn) btn.disabled = true;
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