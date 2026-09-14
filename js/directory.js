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