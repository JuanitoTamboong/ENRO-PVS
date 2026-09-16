// ============================================================
// DIRECTORY PAGE — Supabase + Realtime + safe import
// ============================================================
(function () {
    'use strict';

    if (window.__directoryAppLoaded) {
        console.warn('[Directory] already loaded — skipping duplicate init.');
        return;
    }
    window.__directoryAppLoaded = true;

    window.permitteesData = window.permitteesData || [];
    let realtimeChannel = null;

    function getClient() {
        return window.supabaseClient ||
               (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
    }

    function toIsoDate(v) {
        if (!v) return null;
        if (v instanceof Date && !isNaN(v.getTime())) {
            return v.toISOString().slice(0, 10);
        }
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
    }

    function formatDateDisplay(v) {
        if (!v) return '—';
        const d = new Date(v);
        if (isNaN(d.getTime())) return v;
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    // ------------------------------------------------------------
    // Load
    // ------------------------------------------------------------
    async function loadPermitteesFromSupabase() {
        const client = getClient();
        if (!client) {
            console.error('[Directory] supabaseClient missing.');
            return [];
        }

        const { data, error } = await client
            .from('permittees')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('[Directory] fetch error:', error);
            if (typeof window.showToast === 'function') {
                window.showToast('Failed to load records: ' + error.message, 'error');
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
    // Realtime
    // ------------------------------------------------------------
    function setupRealtimeSubscription() {
        const client = getClient();
        if (!client) return;

        if (realtimeChannel) {
            client.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }

        realtimeChannel = client
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
    // Render — all 13 columns
    // ------------------------------------------------------------
    function renderDirectoryTable(data) {
        const tbody = document.getElementById('directory-tbody');
        const badge = document.getElementById('directory-count-badge');

        if (badge) badge.innerText = `${data.length} ${data.length === 1 ? 'entry' : 'entries'}`;
        if (!tbody) return;

        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="13">
                    <div class="empty-state">
                        <i class="fa-solid fa-inbox"></i>
                        No permittees match your search criteria.
                    </div>
                </td></tr>`;
            return;
        }

        const fmt  = window.formatNumber || ((n) => n);
        const stat = window.getStatusInfo || ((p) => ({ label: p.status || '', css: '' }));
        const esc  = window.escapeHtml    || ((s) => s);

        tbody.innerHTML = data.map(p => {
            const s = stat(p);
            const area             = p.area || p.areaHas || '—';
            const annualExtraction = p.rate || p.annualExtraction || '—';
            const startDate        = formatDateDisplay(p.startDate);
            const endDate          = formatDateDisplay(p.endDate);

            return `
                <tr data-id="${p.id}">
                    <td class="font-bold text-ink-900">${esc(p.name)}</td>
                    <td class="text-ink-500">${esc(p.location)}</td>
                    <td>
                        <span class="font-mono text-[11px] font-semibold text-enro-700 bg-enro-50 px-1.5 py-0.5 rounded border border-enro-100 whitespace-nowrap">
                            ${esc(p.permitNo)}
                        </span>
                    </td>
                    <td class="text-ink-600">${esc(p.type)}</td>
                    <td class="text-ink-600">${esc(p.commodity)}</td>
                    <td class="text-right font-semibold text-ink-700">${esc(area)}</td>
                    <td class="text-right font-semibold text-ink-700">${esc(annualExtraction)}</td>
                    <td class="text-right font-semibold text-ink-700">${fmt(p.allowedVol)}</td>
                    <td class="text-right font-bold ${p.remainingVol <= 100 ? 'text-rose-600' : 'text-enro-700'}">
                        ${fmt(p.remainingVol)}
                    </td>
                    <td class="text-center text-ink-500">${esc(startDate)}</td>
                    <td class="text-center text-ink-500">${esc(endDate)}</td>
                    <td class="text-center"><span class="status-badge ${s.css}">${s.label}</span></td>
                    <td class="text-center">
                        <a href="./annual-volume.html?id=${p.id}"
                           class="text-[11px] font-bold text-enro-700 hover:text-enro-900 hover:underline whitespace-nowrap">
                            View Ledger
                        </a>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ------------------------------------------------------------
    // Filter
    // ------------------------------------------------------------
    function filterDirectoryTable() {
        const searchInput  = document.getElementById('directory-search-input');
        const statusFilter = document.getElementById('directory-status-filter');
        const q = searchInput ? searchInput.value.toLowerCase() : '';
        const selectedStatus = statusFilter ? statusFilter.value : '';

        const stat = window.getStatusInfo || ((p) => ({ label: p.status }));

        const filtered = (window.permitteesData || []).filter(p => {
            const matchesSearch =
                (p.name     || '').toLowerCase().includes(q) ||
                (p.permitNo || '').toLowerCase().includes(q) ||
                (p.location || '').toLowerCase().includes(q);

            const statusInfo = stat(p);
            const matchesStatus = (selectedStatus === '' || statusInfo.label === selectedStatus);

            return matchesSearch && matchesStatus;
        });

        renderDirectoryTable(filtered);
    }

    // ------------------------------------------------------------
    // Add Permit Modal
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

        const client = getClient();
        if (!client) {
            console.error('[Directory] supabaseClient missing.');
            return;
        }

        const allowed = parseFloat(document.getElementById('new-allowed-vol').value) || 0;
        const areaValue = (document.getElementById('new-area')?.value || '').trim();
        const annualExtractionValue = (document.getElementById('new-annual-extraction')?.value || '').trim();

        const newRow = {
            name:          document.getElementById('new-name').value.trim().toUpperCase(),
            location:      document.getElementById('new-location').value.trim(),
            permit_no:     document.getElementById('new-permit-no').value.trim(),
            type:          document.getElementById('new-permit-type').value,
            commodity:     document.getElementById('new-commodity').value,
            area:          areaValue,
            rate:          annualExtractionValue,
            allowed_vol:   allowed,
            remaining_vol: allowed,
            start_date:    toIsoDate(document.getElementById('new-start-date').value),
            end_date:      toIsoDate(document.getElementById('new-end-date').value),
            status:        document.getElementById('new-status').value
        };

        const { error } = await client.from('permittees').insert([newRow]);

        if (error) {
            console.error('[Directory] insert error:', error);
            const msg = error.message || error.details || error.hint || JSON.stringify(error);
            if (typeof window.showToast === 'function') {
                window.showToast('Failed to insert record: ' + msg, 'error');
            }
            return;
        }

        window.permitteesData = await loadPermitteesFromSupabase();
        filterDirectoryTable();

        closeAddEntryModal();
        document.getElementById('form-add-entry').reset();
        const remainingField = document.getElementById('new-remaining-vol');
        if (remainingField) remainingField.value = '';

        if (typeof window.showToast === 'function') {
            window.showToast('Permittee record added successfully.', 'success');
        }
    }

    // ------------------------------------------------------------
    // Excel Import
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
                            row['ECC no.']     || row['ECC'] || `ROM-${sheetName}-${index}-26`
                        ).trim();

                        const areaRaw = String(
                            row['AREA (has.)'] || row['Area (has.)'] ||
                            row['AREA']        || row['Area'] || ''
                        ).trim();

                        const rawVolStr = String(
                            row['ANNUAL EXTRACTION']           ||
                            row['Annual Extraction']           ||
                            row['ANNUAL EXTRACTION RATE']      ||
                            row['Annual Extraction Rate']      ||
                            row['ALLOWED VOLUME (CU.M)']       ||
                            row['Allowed Volume (Cu.M)']       ||
                            row['allowedVol'] || '0'
                        );
                        const numericVol = parseFloat(rawVolStr.replace(/[^0-9.-]+/g, '')) || 0;

                        const allowedVolRaw = String(
                            row['ALLOWED VOLUME (CU.M)'] || row['Allowed Volume (Cu.M)'] || ''
                        );
                        const allowedVol = allowedVolRaw
                            ? parseFloat(allowedVolRaw.replace(/[^0-9.-]+/g, '')) || 0
                            : numericVol;

                        allImportedRows.push({
                            name:          name,
                            location:      fullLocation,
                            permit_no:     permitNo,
                            type:          String(row['TYPE OF PERMIT'] || row['Type of Permit'] || row['type'] || 'Commercial').trim(),
                            commodity:     String(row['COMMODITY'] || row['Commodity'] || row['commodity'] || 'Sand & Gravel').trim(),
                            area:          areaRaw,
                            rate:          rawVolStr,
                            allowed_vol:   allowedVol,
                            remaining_vol: allowedVol,
                            start_date:    toIsoDate(row['START DATE'] || row['Start Date'] || row['startDate'] || row['ISSUED DATE']),
                            end_date:      toIsoDate(row['END DATE'] || row['End Date'] || row['endDate']),
                            status:        String(row['STATUS'] || row['Status'] || row['status'] || row['AREA STATUS CLEARANCE'] || 'Active').trim()
                        });
                    });
                });

                if (allImportedRows.length === 0) {
                    window.showToast('No valid permittee records found across sheets.', 'error');
                    return;
                }

                const client = getClient();
                if (!client) {
                    console.error('[Directory] supabaseClient missing.');
                    return;
                }

                const byPermitNo = new Map();
                allImportedRows.forEach(r => byPermitNo.set(r.permit_no, r));
                const uniqueRows = Array.from(byPermitNo.values());
                const dupesInFile = allImportedRows.length - uniqueRows.length;

                const permitNos = uniqueRows.map(r => r.permit_no).filter(Boolean);
                const { data: existing, error: lookupErr } = await client
                    .from('permittees')
                    .select('permit_no')
                    .in('permit_no', permitNos);

                if (lookupErr) {
                    console.error('[Directory] lookup error:', lookupErr);
                    window.showToast('Failed to check duplicates: ' + lookupErr.message, 'error');
                    return;
                }

                const existingSet = new Set((existing || []).map(r => r.permit_no));
                const newRows     = uniqueRows.filter(r => !existingSet.has(r.permit_no));
                const skippedRows = uniqueRows.filter(r =>  existingSet.has(r.permit_no));

                if (newRows.length === 0) {
                    window.showToast(
                        `All ${uniqueRows.length} record(s) already exist. Nothing imported.`,
                        'error'
                    );
                    window.permitteesData = await loadPermitteesFromSupabase();
                    filterDirectoryTable();
                    return;
                }

                const { error: insertErr } = await client
                    .from('permittees')
                    .insert(newRows);

                if (insertErr) {
                    console.error('[Directory] bulk insert error:', insertErr);
                    const msg = insertErr.message
                             || insertErr.details
                             || insertErr.hint
                             || JSON.stringify(insertErr);
                    window.showToast('Import failed: ' + msg, 'error');
                    return;
                }

                window.permitteesData = await loadPermitteesFromSupabase();
                filterDirectoryTable();

                const parts = [`Imported ${newRows.length} record(s).`];
                if (skippedRows.length > 0) parts.push(`Skipped ${skippedRows.length} duplicate(s).`);
                if (dupesInFile > 0)        parts.push(`Removed ${dupesInFile} in-file duplicate(s).`);

                window.showToast(parts.join(' '), skippedRows.length > 0 ? 'info' : 'success');
            } catch (err) {
                console.error('[Directory] import exception:', err);
                window.showToast('Failed to parse Excel file: ' + (err.message || err), 'error');
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // ------------------------------------------------------------
    // Excel Export
    // ------------------------------------------------------------
    function exportToExcel() {
        if (!window.permitteesData || window.permitteesData.length === 0) {
            window.showToast('No data available to export.', 'error');
            return;
        }

        const exportData = window.permitteesData.map(p => ({
            'LOCATION':                p.location,
            'PERMIT HOLDER':           p.name,
            'PERMIT NO.':              p.permitNo,
            'TYPE OF PERMIT':          p.type,
            'COMMODITY':               p.commodity,
            'AREA (has.)':             p.area || p.areaHas || '',
            'ANNUAL EXTRACTION':       p.rate || p.annualExtraction || '',
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

        window.showToast('Directory successfully exported to Excel.', 'success');
    }

    // ------------------------------------------------------------
    // Auto-fill remaining volume
    // ------------------------------------------------------------
    function setupVolumeAutoFill() {
        const allowedInput = document.getElementById('new-allowed-vol');
        const remainingInput = document.getElementById('new-remaining-vol');

        if (allowedInput && remainingInput) {
            allowedInput.addEventListener('input', function () {
                remainingInput.value = this.value;
            });
        }
    }

    // ------------------------------------------------------------
    // Expose to HTML
    // ------------------------------------------------------------
    window.filterDirectoryTable  = filterDirectoryTable;
    window.openAddEntryModal     = openAddEntryModal;
    window.closeAddEntryModal    = closeAddEntryModal;
    window.submitNewPermitEntry  = submitNewPermitEntry;
    window.triggerExcelImport    = triggerExcelImport;
    window.handleExcelImport     = handleExcelImport;
    window.exportToExcel         = exportToExcel;

    // ------------------------------------------------------------
    // Boot
    // ------------------------------------------------------------
    async function boot() {
        const client = getClient();
        if (!client) {
            console.error('[Directory] Supabase client not found.');
            return;
        }

        const { data: { session } } = await client.auth.getSession();
        if (!session) {
            window.location.href = '../index.html';
            return;
        }

        window.permitteesData = await loadPermitteesFromSupabase();
        renderDirectoryTable(window.permitteesData);
        setupRealtimeSubscription();
        setupVolumeAutoFill();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();