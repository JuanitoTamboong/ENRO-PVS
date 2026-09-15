// ============================================================
// DIRECTORY PAGE — Supabase + Realtime
// ============================================================
(function () {
    'use strict';

    // Guard against accidental double-loading
    if (window.__directoryAppLoaded) {
        console.warn('[Directory] already loaded — skipping duplicate init.');
        return;
    }
    window.__directoryAppLoaded = true;

    // Shared state (single source of truth on window)
    window.permitteesData = window.permitteesData || [];
    let realtimeChannel = null;

    // ------------------------------------------------------------
    // DATE HELPER — converts Excel dates / strings to "YYYY-MM-DD"
    // ------------------------------------------------------------
    function toIsoDate(v) {
        if (!v) return null;
        if (v instanceof Date && !isNaN(v.getTime())) {
            return v.toISOString().slice(0, 10);
        }
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }

    // ------------------------------------------------------------
    // LOAD FROM SUPABASE
    // ------------------------------------------------------------
    async function loadPermitteesFromSupabase() {
        if (!window.supabaseClient) {
            console.error('[Directory] supabaseClient missing.');
            return [];
        }

        const { data, error } = await window.supabaseClient
            .from('permittees')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error('[Directory] fetch error:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('Failed to load records from database.', 'error');
            }
            return [];
        }

        return (data || []).map(row =>
            typeof window.mapDbRowToPermittee === 'function'
                ? window.mapDbRowToPermittee(row)
                : row
        );
    }

    // ------------------------------------------------------------
    // REALTIME SUBSCRIPTION
    // ------------------------------------------------------------
    function setupRealtimeSubscription() {
        if (!window.supabaseClient) return;

        if (realtimeChannel) {
            window.supabaseClient.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }

        realtimeChannel = window.supabaseClient
            .channel('public:permittees')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'permittees' },
                async () => {
                    window.permitteesData = await loadPermitteesFromSupabase();
                    filterDirectoryTable();
                }
            )
            .subscribe((status) => {
                console.log('[Realtime] status:', status);
            });
    }

    // ------------------------------------------------------------
    // RENDER TABLE
    // ------------------------------------------------------------
    function renderDirectoryTable(data) {
        const tbody = document.getElementById('directory-tbody');
        const badge = document.getElementById('directory-count-badge');
        if (badge) {
            badge.innerText = `${data.length} ${data.length === 1 ? 'entry' : 'entries'}`;
        }
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="9">
                    <div class="empty-state">
                        <i class="fa-solid fa-inbox"></i>
                        No permittees match your search criteria.
                    </div>
                </td></tr>`;
            return;
        }

        const fmt = (typeof window.formatNumber === 'function')
            ? window.formatNumber
            : (n) => n;
        const stat = (typeof window.getStatusInfo === 'function')
            ? window.getStatusInfo
            : (p) => ({ label: p.status || '', css: 'bg-enro-50 text-enro-700' });
        const esc = (typeof window.escapeHtml === 'function')
            ? window.escapeHtml
            : (s) => s;

        tbody.innerHTML = data.map(p => {
            const s = stat(p);
            return `
                <tr data-id="${p.id}">
                    <td class="font-bold text-ink-900">${esc(p.name)}</td>
                    <td class="text-ink-500 text-xs">${esc(p.location)}</td>
                    <td>
                        <span class="font-mono text-xs font-semibold text-enro-700 bg-enro-50 px-1.5 py-0.5 rounded border border-enro-100">
                            ${esc(p.permitNo)}
                        </span>
                    </td>
                    <td class="text-ink-600 text-xs">${esc(p.type)}</td>
                    <td class="text-ink-600 text-xs">${esc(p.commodity)}</td>
                    <td class="text-right font-semibold text-ink-700">${fmt(p.allowedVol)}</td>
                    <td class="text-right font-bold ${p.remainingVol <= 100 ? 'text-rose-600' : 'text-enro-700'}">
                        ${fmt(p.remainingVol)}
                    </td>
                    <td class="text-center"><span class="status-badge ${s.css}">${s.label}</span></td>
                    <td class="text-center">
                        <a href="./annual-volume.html?id=${p.id}"
                           class="text-[11px] font-bold text-enro-700 hover:text-enro-900 hover:underline">
                            View Ledger
                        </a>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ------------------------------------------------------------
    // FILTER
    // ------------------------------------------------------------
    function filterDirectoryTable() {
        const searchInput = document.getElementById('directory-search-input');
        const statusFilter = document.getElementById('directory-status-filter');
        const q = searchInput ? searchInput.value.toLowerCase() : '';
        const selectedStatus = statusFilter ? statusFilter.value : '';

        const stat = (typeof window.getStatusInfo === 'function')
            ? window.getStatusInfo
            : (p) => ({ label: p.status });

        const filtered = window.permitteesData.filter(p => {
            const matchesSearch =
                (p.name || '').toLowerCase().includes(q) ||
                (p.permitNo || '').toLowerCase().includes(q) ||
                (p.location || '').toLowerCase().includes(q);

            const statusInfo = stat(p);
            const matchesStatus = (selectedStatus === '' || statusInfo.label === selectedStatus);

            return matchesSearch && matchesStatus;
        });

        renderDirectoryTable(filtered);
    }

    // ------------------------------------------------------------
    // MODAL: Add Permit
    // ------------------------------------------------------------
    function openAddEntryModal() {
        const modal = document.getElementById('modal-add-entry');
        if (modal) modal.classList.add('active');
    }

    function closeAddEntryModal() {
        const modal = document.getElementById('modal-add-entry');
        if (modal) modal.classList.remove('active');
    }

    async function submitNewPermitEntry(e) {
        e.preventDefault();

        const allowed = parseFloat(document.getElementById('new-allowed-vol').value) || 0;

        const newRow = {
            name:          document.getElementById('new-name').value.trim().toUpperCase(),
            location:      document.getElementById('new-location').value.trim(),
            permit_no:     document.getElementById('new-permit-no').value.trim(),
            type:          document.getElementById('new-permit-type').value,
            commodity:     document.getElementById('new-commodity').value,
            rate:          document.getElementById('new-rate').value.trim(),
            allowed_vol:   allowed,
            remaining_vol: allowed,
            start_date:    toIsoDate(document.getElementById('new-start-date').value),
            end_date:      toIsoDate(document.getElementById('new-end-date').value),
            status:        document.getElementById('new-status').value
        };

        if (!window.supabaseClient) {
            console.error('[Directory] supabaseClient missing.');
            return;
        }

        const { error } = await window.supabaseClient
            .from('permittees')
            .insert([newRow]);

        if (error) {
            console.error('[Directory] insert error:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('Failed to insert record: ' + error.message, 'error');
            }
            return;
        }

        closeAddEntryModal();
        document.getElementById('form-add-entry').reset();
        if (typeof window.showToast === 'function') {
            window.showToast('Permittee record added successfully.', 'success');
        }
    }

    // ------------------------------------------------------------
    // EXCEL IMPORT
    // ------------------------------------------------------------
    function triggerExcelImport() {
        const fileInput = document.getElementById('excel-file-input');
        if (fileInput) fileInput.click();
    }

    function handleExcelImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function (e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                const allImportedRows = [];

                workbook.SheetNames.forEach(sheetName => {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonRows = XLSX.utils.sheet_to_json(worksheet);

                    jsonRows.forEach((row, index) => {
                        const name = String(
                            row['PERMIT HOLDER'] || row['Permit Holder'] || row['name'] || ''
                        ).trim().toUpperCase();
                        if (!name) return;

                        const mun = String(row['MUNICIPALITY'] || row['Municipality'] || '').trim();
                        const loc = String(row['LOCATION'] || row['Location'] || row['location'] || '').trim();
                        const fullLocation = mun && loc
                            ? `${mun} - ${loc}`
                            : (mun || loc || 'Unknown Location');

                        const permitNo = String(
                            row['PERMIT NO.'] || row['Permit No.'] || row['permitNo'] ||
                            row['ECC no.'] || row['ECC'] || `ROM-${index}-26`
                        ).trim();

                        const rawVolStr = String(
                            row['ALLOWED VOLUME (CU.M)'] ||
                            row['Allowed Volume (Cu.M)'] ||
                            row['ANNUAL EXTRACTION RATE'] ||
                            row['Annual Extraction Rate'] ||
                            row['allowedVol'] || '0'
                        );
                        const numericVol = parseFloat(rawVolStr.replace(/[^0-9.-]+/g, '')) || 0;

                        allImportedRows.push({
                            name:          name,
                            location:      fullLocation,
                            permit_no:     permitNo,
                            type:          String(row['TYPE OF PERMIT'] || row['Type of Permit'] || row['type'] || 'Commercial').trim(),
                            commodity:     String(row['COMMODITY'] || row['Commodity'] || row['commodity'] || 'Sand & Gravel').trim(),
                            rate:          rawVolStr,
                            allowed_vol:   numericVol,
                            remaining_vol: numericVol,
                            start_date:    toIsoDate(row['ISSUED DATE'] || row['START DATE'] || row['Start Date'] || row['startDate']),
                            end_date:      toIsoDate(row['END DATE'] || row['End Date'] || row['endDate']),
                            status:        String(row['AREA STATUS CLEARANCE'] || row['STATUS'] || row['Status'] || row['status'] || 'Active').trim()
                        });
                    });
                });

                if (allImportedRows.length === 0) {
                    if (typeof window.showToast === 'function') {
                        window.showToast('No valid permittee records found across sheets.', 'error');
                    }
                    return;
                }

                if (!window.supabaseClient) {
                    console.error('[Directory] supabaseClient missing.');
                    return;
                }

                const { error } = await window.supabaseClient
                    .from('permittees')
                    .insert(allImportedRows);

                if (error) {
                    console.error('[Directory] bulk insert error:', error);
                    if (typeof window.showToast === 'function') {
                        window.showToast('Failed to save imported records: ' + error.message, 'error');
                    }
                    return;
                }

                if (typeof window.showToast === 'function') {
                    window.showToast(`Successfully imported ${allImportedRows.length} records.`, 'success');
                }
            } catch (err) {
                console.error(err);
                if (typeof window.showToast === 'function') {
                    window.showToast('Failed to parse Excel file. Please check structure.', 'error');
                }
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // ------------------------------------------------------------
    // EXCEL EXPORT
    // ------------------------------------------------------------
    function exportToExcel() {
        if (!window.permitteesData || window.permitteesData.length === 0) {
            if (typeof window.showToast === 'function') {
                window.showToast('No data available to export.', 'error');
            }
            return;
        }

        const exportData = window.permitteesData.map(p => ({
            'LOCATION':                p.location,
            'PERMIT HOLDER':           p.name,
            'PERMIT NO.':              p.permitNo,
            'TYPE OF PERMIT':          p.type,
            'COMMODITY':               p.commodity,
            'ANNUAL EXTRACTION RATE':  p.rate,
            'ALLOWED VOLUME (CU.M)':   p.allowedVol,
            'REMAINING VOLUME':        p.remainingVol,
            'START DATE':              p.startDate,
            'END DATE':                p.endDate,
            'STATUS':                  p.status
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook  = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'TABLAS BASIC INFO');
        XLSX.writeFile(workbook, 'Permittees_Directory_Export.xlsx');

        if (typeof window.showToast === 'function') {
            window.showToast('Directory successfully exported to Excel.', 'success');
        }
    }

    // ------------------------------------------------------------
    // EXPOSE FUNCTIONS TO HTML
    // ------------------------------------------------------------
    window.filterDirectoryTable  = filterDirectoryTable;
    window.openAddEntryModal     = openAddEntryModal;
    window.closeAddEntryModal    = closeAddEntryModal;
    window.submitNewPermitEntry  = submitNewPermitEntry;
    window.triggerExcelImport    = triggerExcelImport;
    window.handleExcelImport     = handleExcelImport;
    window.exportToExcel         = exportToExcel;

    // ------------------------------------------------------------
    // BOOT
    // ------------------------------------------------------------
    async function boot() {
        window.permitteesData = await loadPermitteesFromSupabase();
        renderDirectoryTable(window.permitteesData);
        setupRealtimeSubscription();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();