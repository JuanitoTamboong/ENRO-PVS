// ============================================================
// DIRECTORY PAGE
// ============================================================
(() => {
    renderDirectoryTable(permitteesData);
})();

function renderDirectoryTable(data) {
    const tbody = document.getElementById('directory-tbody');
    document.getElementById('directory-count-badge').innerText =
        `${data.length} ${data.length === 1 ? 'entry' : 'entries'}`;

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="9">
                <div class="empty-state">
                    <i class="fa-solid fa-inbox"></i>
                    No permittees match your search criteria.
                </div>
            </td></tr>`;
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

function filterDirectoryTable() {
    const q = document.getElementById('directory-search-input').value.toLowerCase();
    const selectedStatus = document.getElementById('directory-status-filter').value;

    const filtered = permitteesData.filter(p => {
        const matchesSearch = 
            p.name.toLowerCase().includes(q) ||
            p.permitNo.toLowerCase().includes(q) ||
            p.location.toLowerCase().includes(q);

        const statusInfo = getStatusInfo(p);
        const matchesStatus = (selectedStatus === "" || statusInfo.label === selectedStatus);

        return matchesSearch && matchesStatus;
    });

    renderDirectoryTable(filtered);
}

// ---------- MODAL: Add Permit ----------
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
    savePermittees(permitteesData);

    closeAddEntryModal();
    document.getElementById('form-add-entry').reset();
    renderDirectoryTable(permitteesData);
    showToast('Permittee record added successfully.', 'success');
}

// ============================================================
// EXCEL IMPORT & EXPORT
// ============================================================

function triggerExcelImport() {
    document.getElementById('excel-file-input').click();
}

function handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            let allImportedRows = [];

            // Loop through ALL sheets in the workbook
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                const jsonRows = XLSX.utils.sheet_to_json(worksheet);

                jsonRows.forEach((row, index) => {
                    const name = String(
                        row['PERMIT HOLDER'] || row['Permit Holder'] || row['name'] || ''
                    ).trim().toUpperCase();

                    if (!name) return; // Skip empty rows

                    const mun = String(row['MUNICIPALITY'] || row['Municipality'] || '').trim();
                    const loc = String(row['LOCATION'] || row['Location'] || row['location'] || '').trim();
                    const fullLocation = mun && loc ? `${mun} - ${loc}` : (mun || loc || 'Unknown Location');

                    const permitNo = String(
                        row['PERMIT NO.'] || row['Permit No.'] || row['ECC no.'] || row['ECC'] || row['permitNo'] || `ROM-${index}-26`
                    ).trim();

                    const rawVolStr = String(
                        row['ALLOWED VOLUME (CU.M)'] || 
                        row['Allowed Volume (Cu.M)'] || 
                        row['ANNUAL EXTRACTION RATE'] || 
                        row['Annual Extraction Rate'] || 
                        row['allowedVol'] || '0'
                    );
                    const numericVol = parseFloat(rawVolStr.replace(/[^0-9.-]+/g, "")) || 0;

                    allImportedRows.push({
                        id: permitteesData.length + allImportedRows.length + 1,
                        name: name,
                        location: fullLocation,
                        permitNo: permitNo,
                        type: String(row['TYPE OF PERMIT'] || row['Type of Permit'] || row['type'] || 'Commercial').trim(),
                        commodity: String(row['COMMODITY'] || row['Commodity'] || row['commodity'] || 'Sand & Gravel').trim(),
                        rate: rawVolStr,
                        allowedVol: numericVol,
                        remainingVol: numericVol,
                        startDate: String(row['ISSUED DATE'] || row['START DATE'] || row['Start Date'] || row['startDate'] || '').trim(),
                        endDate: String(row['END DATE'] || row['End Date'] || row['endDate'] || '').trim(),
                        status: String(row['AREA STATUS CLEARANCE'] || row['STATUS'] || row['Status'] || row['status'] || 'Active').trim(),
                        transactions: []
                    });
                });
            });

            if (allImportedRows.length === 0) {
                showToast('No valid permittee records found across sheets.', 'error');
                return;
            }

            permitteesData = permitteesData.concat(allImportedRows);
            savePermittees(permitteesData);
            renderDirectoryTable(permitteesData);
            
            showToast(`Successfully imported ${allImportedRows.length} records from all sheets.`, 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to parse Excel file. Please check structure.', 'error');
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsArrayBuffer(file);
}

function exportToExcel() {
    if (!permitteesData || permitteesData.length === 0) {
        showToast('No data available to export.', 'error');
        return;
    }

    const exportData = permitteesData.map(p => ({
        "LOCATION": p.location,
        "PERMIT HOLDER": p.name,
        "PERMIT NO.": p.permitNo,
        "TYPE OF PERMIT": p.type,
        "COMMODITY": p.commodity,
        "ANNUAL EXTRACTION RATE": p.rate,
        "ALLOWED VOLUME (CU.M)": p.allowedVol,
        "REMAINING VOLUME": p.remainingVol,
        "START DATE": p.startDate,
        "END DATE": p.endDate,
        "STATUS": p.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "TABLAS BASIC INFO");
    
    XLSX.writeFile(workbook, "Permittees_Directory_Export.xlsx");
    showToast('Directory successfully exported to Excel.', 'success');
}