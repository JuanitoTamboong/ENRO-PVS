// ============================================================
// DIRECTORY PAGE — Supabase + Realtime + safe import + pagination + delete + edit
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

    const PAGE_SIZE = 25;
    let currentPage = 1;
    let filteredData = [];

    let deleteTargetId = null;
    let editOriginalAllowed = 0;
    let editOriginalRemaining = 0;

    const DELETE_ALL_PHRASE = 'DELETE ALL';

    // ------------------------------------------------------------
    // AUTO-COMPUTE STATUS
    // ------------------------------------------------------------
    function computeStatus(remaining, allowed) {
        remaining = Number(remaining) || 0;
        allowed = Number(allowed) || 0;

        if (remaining <= 0) {
            return { label: 'Fully Consumed', css: 'bg-rose-50 text-rose-700 border-rose-200' };
        }
        if (remaining <= 100) {
            return { label: 'Nearly Exhausted', css: 'bg-rose-50 text-rose-700 border-rose-200' };
        }
        const pct = allowed > 0 ? (remaining / allowed) * 100 : 0;
        if (pct <= 25) {
            return { label: 'Low Production', css: 'bg-amber-50 text-amber-700 border-amber-200' };
        }
        return { label: 'Active', css: 'bg-enro-50 text-enro-700 border-enro-200' };
    }

    function getStatusFor(p) {
        if (typeof window.computeStatus === 'function') {
            return window.computeStatus(p.remainingVol, p.allowedVol);
        }
        return computeStatus(p.remainingVol, p.allowedVol);
    }

    // ------------------------------------------------------------
    // MODAL ANIMATION CSS
    // ------------------------------------------------------------
    function ensureDirectoryModalStyles() {
        if (document.getElementById('directory-modal-animations')) return;

        const style = document.createElement('style');
        style.id = 'directory-modal-animations';
        style.innerHTML = `
            @keyframes modalOverlayIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes modalOverlayOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes modalCardIn {
                0%   { opacity: 0; transform: translateY(24px) scale(0.92); }
                60%  { opacity: 1; transform: translateY(-4px) scale(1.02); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes modalCardOut {
                0%   { opacity: 1; transform: translateY(0) scale(1); }
                100% { opacity: 0; transform: translateY(16px) scale(0.94); }
            }
            @keyframes modalIconPop {
                0%   { opacity: 0; transform: scale(0.5) rotate(-90deg); }
                60%  { opacity: 1; transform: scale(1.15) rotate(8deg); }
                100% { opacity: 1; transform: scale(1) rotate(0deg); }
            }
            @keyframes modalTextIn {
                from { opacity: 0; transform: translateY(6px); }
                to   { opacity: 1; transform: translateY(0); }
            }
            .modal-overlay.active { animation: modalOverlayIn 0.26s ease-out both; }
            .modal-overlay.closing { animation: modalOverlayOut 0.22s ease-in both; }
            .modal-overlay.active > .modal-card,
            .modal-overlay.active > .logout-card,
            .modal-overlay.active > div:not(.modal-card):not(.logout-card) {
                animation: modalCardIn 0.42s cubic-bezier(0.34, 1.56, 0.64, 1) both;
                transform-origin: center center;
            }
            .modal-overlay.closing > .modal-card,
            .modal-overlay.closing > .logout-card,
            .modal-overlay.closing > div:not(.modal-card):not(.logout-card) {
                animation: modalCardOut 0.24s ease-in both;
            }
            .modal-overlay.active [style*="border-radius:9999px"] {
                animation: modalIconPop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) 0.08s both;
            }
            .modal-overlay.active > div > .p-5,
            .modal-overlay.active .form-section {
                animation: modalTextIn 0.34s ease-out 0.14s both;
            }
            .modal-overlay .modal-close-icon {
                transition: transform 0.2s ease, background 0.2s ease, color 0.2s ease;
            }
            .modal-overlay .modal-close-icon:hover { transform: rotate(90deg) scale(1.05); }
            .modal-overlay .btn-secondary,
            .modal-overlay .btn-primary,
            .modal-overlay .modal-btn {
                flex-shrink: 0;
                white-space: nowrap;
            }
            .modal-overlay .input-field {
                transition: border-color 0.2s ease, box-shadow 0.25s ease, background 0.2s ease;
            }
            .modal-overlay .input-field:focus {
                border-color: #16a34a;
                box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.08);
                background: #fafffb;
            }
            .modal-overlay .input-field:read-only {
                background: #f8fafc;
                cursor: default;
            }
            .modal-overlay select.input-field {
                appearance: none;
                background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M6 8L1 3h10z'/%3E%3C/svg%3E");
                background-repeat: no-repeat;
                background-position: right 0.75rem center;
                background-size: 10px;
                padding-right: 2rem;
            }
            .modal-overlay.active .form-section-title {
                position: relative;
                display: inline-block;
            }
            .modal-overlay.active .form-section-title::after {
                content: '';
                position: absolute;
                bottom: -3px;
                left: 0;
                height: 2px;
                background: #16a34a;
                border-radius: 1px;
                animation: sectionUnderline 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both;
            }
            @keyframes sectionUnderline { from { width: 0; } to { width: 100%; } }
            .modal-overlay .btn-primary,
            .modal-overlay .btn-secondary,
            .modal-overlay .modal-btn {
                transition: background-color 0.2s ease, transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.22s ease, color 0.18s ease;
            }
            .modal-overlay .btn-primary:hover,
            .modal-overlay .btn-secondary:hover { transform: translateY(-1px); }
            .modal-overlay .btn-primary:active,
            .modal-overlay .btn-secondary:active { transform: scale(0.97); }
            .modal-overlay .modal-btn--danger:hover:not(:disabled) {
                transform: translateY(-1px) scale(1.02);
                background-color: #be123c;
                animation: dangerPulse 1.4s ease-out infinite;
            }
            .modal-overlay .modal-btn--danger:active:not(:disabled) { transform: scale(0.97); }
            @keyframes dangerPulse {
                0%   { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0.55); }
                70%  { box-shadow: 0 0 0 10px rgba(225, 29, 72, 0); }
                100% { box-shadow: 0 0 0 0 rgba(225, 29, 72, 0); }
            }
            @keyframes volumePulse {
                0%   { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.3); }
                70%  { box-shadow: 0 0 0 8px rgba(22, 163, 74, 0); }
                100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
            }
            .volume-pulse { animation: volumePulse 1.2s ease-out; }
        `;
        document.head.appendChild(style);
    }

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

    function smoothOpenModal(modalId) {
        ensureDirectoryModalStyles();
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

    async function loadPermitteesFromSupabase() {
        const client = getClient();
        if (!client) return [];

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

    function setupRealtimeSubscription() {
        const client = getClient();
        if (!client) return;

        if (realtimeChannel) {
            client.removeChannel(realtimeChannel);
            realtimeChannel = null;
        }

        realtimeChannel = client
            .channel('public:permittees')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'permittees' },
                async () => {
                    window.permitteesData = await loadPermitteesFromSupabase();
                    filterDirectoryTable();
                }
            )
            .subscribe((status) => {
                console.log('[Realtime] status:', status);
            });
    }

    function renderDirectoryTable(data) {
        filteredData = data || [];

        const tbody = document.getElementById('directory-tbody');
        const badge = document.getElementById('directory-count-badge');

        if (badge) badge.innerText = `${filteredData.length} ${filteredData.length === 1 ? 'entry' : 'entries'}`;
        if (!tbody) return;

        if (filteredData.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="13">
                    <div class="empty-state">
                        <i class="fa-solid fa-inbox"></i>
                        No permittees match your search criteria.
                    </div>
                </td></tr>`;
            renderPagination(0);
            return;
        }

        const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const start = (currentPage - 1) * PAGE_SIZE;
        const pageRows = filteredData.slice(start, start + PAGE_SIZE);

        const fmt = window.formatNumber || ((n) => n);
        const esc = window.escapeHtml    || ((s) => s);

        tbody.innerHTML = pageRows.map(p => {
            const s = getStatusFor(p);

            const area             = p.area || p.areaHas || '—';
            const annualExtraction = p.rate || p.annualExtraction || '—';
            const startDate        = formatDateDisplay(p.startDate);
            const endDate          = formatDateDisplay(p.endDate);
            const remainingNum     = Number(p.remainingVol) || 0;

            const safeName = String(p.name || '').replace(/'/g, "\\'");

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
                    <td class="text-right font-bold ${remainingNum <= 100 ? 'text-rose-600' : 'text-enro-700'}">
                        ${fmt(p.remainingVol)}
                    </td>
                    <td class="text-center text-ink-500">${esc(startDate)}</td>
                    <td class="text-center text-ink-500">${esc(endDate)}</td>
                    <td class="text-center"><span class="status-badge ${s.css}">${s.label}</span></td>
                    <td class="text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            <a href="./ledger.html?id=${p.id}"
                               class="text-[11px] font-bold text-enro-700 hover:text-enro-900 hover:underline whitespace-nowrap">
                                View Ledger
                            </a>
                            <button type="button"
                                    onclick="openEditModal('${p.id}')"
                                    title="Edit record"
                                    class="edit-btn">
                                <i class="fa-solid fa-pen text-[10px]"></i>
                            </button>
                            <button type="button"
                                    onclick="openDeleteModal('${p.id}', '${safeName}')"
                                    title="Delete record"
                                    class="delete-btn">
                                <i class="fa-solid fa-trash text-[10px]"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        renderPagination(filteredData.length);
    }

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
        if (pagesEl) pagesEl.innerHTML = buildPageButtons(currentPage, totalPages);
    }

    function buildPageButtons(current, total) {
        const pages = [];
        const push = (n) => pages.push(
            `<button class="pagination-page ${n === current ? 'is-active' : ''}"
                     onclick="goToPage(${n})">${n}</button>`
        );
        const pushEllipsis = () => pages.push(`<span class="pagination-ellipsis">…</span>`);

        if (total <= 7) {
            for (let i = 1; i <= total; i++) push(i);
        } else {
            push(1);
            if (current > 3) pushEllipsis();
            const from = Math.max(2, current - 1);
            const to   = Math.min(total - 1, current + 1);
            for (let i = from; i <= to; i++) push(i);
            if (current < total - 2) pushEllipsis();
            push(total);
        }
        return pages.join('');
    }

    function goToPage(n) {
        const totalPages = Math.max(1, Math.ceil(filteredData.length / PAGE_SIZE));
        if (n < 1 || n > totalPages || n === currentPage) return;
        currentPage = n;
        renderDirectoryTable(filteredData);
        scrollTableToTop();
    }

    function goToPrevPage() { goToPage(currentPage - 1); }
    function goToNextPage() { goToPage(currentPage + 1); }

    function scrollTableToTop() {
        const wrapper = document.querySelector('.directory-scroll');
        if (wrapper) wrapper.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function filterDirectoryTable() {
        const searchInput  = document.getElementById('directory-search-input');
        const statusFilter = document.getElementById('directory-status-filter');
        const q = searchInput ? searchInput.value.toLowerCase() : '';
        const selectedStatus = statusFilter ? statusFilter.value : '';

        const filtered = (window.permitteesData || []).filter(p => {
            const matchesSearch =
                (p.name     || '').toLowerCase().includes(q) ||
                (p.permitNo || '').toLowerCase().includes(q) ||
                (p.location || '').toLowerCase().includes(q);

            const statusInfo = getStatusFor(p);
            const matchesStatus = (selectedStatus === '' || statusInfo.label === selectedStatus);

            return matchesSearch && matchesStatus;
        });

        currentPage = 1;
        renderDirectoryTable(filtered);
    }

    function openAddEntryModal() {
        smoothOpenModal('modal-add-entry');
        const form = document.querySelector('#modal-add-entry form');
        if (form) form.scrollTop = 0;
        setTimeout(() => {
            const first = document.getElementById('new-name');
            if (first) first.focus();
        }, 350);
    }

    function closeAddEntryModal() { smoothCloseModal('modal-add-entry'); }

    async function submitNewPermitEntry(e) {
        e.preventDefault();
        const client = getClient();
        if (!client) return;

        const allowed = parseFloat(document.getElementById('new-allowed-vol').value) || 0;
        const areaValue = (document.getElementById('new-area')?.value || '').trim();
        const annualExtractionValue = (document.getElementById('new-annual-extraction')?.value || '').trim();
        const allowedRounded = Math.round(allowed);

        const newRow = {
            name:          document.getElementById('new-name').value.trim().toUpperCase(),
            location:      document.getElementById('new-location').value.trim(),
            permit_no:     document.getElementById('new-permit-no').value.trim(),
            type:          document.getElementById('new-permit-type').value,
            commodity:     document.getElementById('new-commodity').value,
            area:          areaValue,
            rate:          annualExtractionValue,
            allowed_vol:   allowedRounded,
            remaining_vol: allowedRounded,
            start_date:    toIsoDate(document.getElementById('new-start-date').value),
            end_date:      toIsoDate(document.getElementById('new-end-date').value),
            status:        document.getElementById('new-status').value
        };

        const { error } = await client.from('permittees').insert([newRow]);

        if (error) {
            console.error('[Directory] insert error:', error);
            window.showToast('Failed to insert record: ' + (error.message || error.details), 'error');
            return;
        }

        window.permitteesData = await loadPermitteesFromSupabase();
        filterDirectoryTable();
        closeAddEntryModal();
        document.getElementById('form-add-entry').reset();
        const remainingField = document.getElementById('new-remaining-vol');
        if (remainingField) remainingField.value = '';
        window.showToast('Permittee record added successfully.', 'success');
    }

    function openEditModal(id) {
        const p = (window.permitteesData || []).find(x => String(x.id) === String(id));
        if (!p) return;

        editOriginalAllowed = Number(p.allowedVol) || 0;
        editOriginalRemaining = Number(p.remainingVol) || 0;

        document.getElementById('edit-id').value = p.id;
        document.getElementById('edit-name').value = p.name || '';
        document.getElementById('edit-location').value = p.location || '';
        document.getElementById('edit-permit-no').value = p.permitNo || '';
        document.getElementById('edit-permit-type').value = p.type || 'Commercial';
        document.getElementById('edit-commodity').value = p.commodity || 'Sand & Gravel';
        document.getElementById('edit-area').value = p.area || p.areaHas || '';
        document.getElementById('edit-annual-extraction').value = p.rate || p.annualExtraction || '';
        document.getElementById('edit-allowed-vol').value = Math.round(p.allowedVol);
        document.getElementById('edit-remaining-vol').value = Math.round(p.remainingVol);
        document.getElementById('edit-start-date').value = p.startDate || '';
        document.getElementById('edit-end-date').value = p.endDate || '';
        document.getElementById('edit-status').value = p.status || 'Active';

        const subtitle = document.getElementById('edit-modal-subtitle');
        if (subtitle) subtitle.innerText = p.name;

        setupEditAutoCompute();
        smoothOpenModal('modal-edit-entry');
        const form = document.querySelector('#modal-edit-entry form');
        if (form) form.scrollTop = 0;
    }

    function closeEditEntryModal() {
        smoothCloseModal('modal-edit-entry', () => {
            editOriginalAllowed = 0;
            editOriginalRemaining = 0;
        });
    }

    function setupEditAutoCompute() {
        const allowedInput = document.getElementById('edit-allowed-vol');
        const remainingInput = document.getElementById('edit-remaining-vol');
        if (!allowedInput || !remainingInput) return;
        if (allowedInput.__wiredEdit) return;
        allowedInput.__wiredEdit = true;

        allowedInput.addEventListener('input', function () {
            const newAllowed = parseInt(this.value, 10) || 0;
            const delta = newAllowed - editOriginalAllowed;
            const newRemaining = Math.max(0, editOriginalRemaining + delta);
            remainingInput.value = Math.round(newRemaining);
        });
    }

    async function submitEditPermitEntry(e) {
        e.preventDefault();
        const client = getClient();
        if (!client) return;

        const id = document.getElementById('edit-id').value;
        if (!id) return;

        const newAllowedRaw = parseInt(document.getElementById('edit-allowed-vol').value, 10) || 0;
        const newAllowed = Math.round(newAllowedRaw);
        const delta = newAllowed - editOriginalAllowed;
        const newRemaining = Math.max(0, Math.round(editOriginalRemaining + delta));

        const updates = {
            name:          document.getElementById('edit-name').value.trim().toUpperCase(),
            location:      document.getElementById('edit-location').value.trim(),
            permit_no:     document.getElementById('edit-permit-no').value.trim(),
            type:          document.getElementById('edit-permit-type').value,
            commodity:     document.getElementById('edit-commodity').value,
            area:          (document.getElementById('edit-area').value || '').trim(),
            rate:          (document.getElementById('edit-annual-extraction').value || '').trim(),
            allowed_vol:   newAllowed,
            remaining_vol: newRemaining,
            start_date:    toIsoDate(document.getElementById('edit-start-date').value),
            end_date:      toIsoDate(document.getElementById('edit-end-date').value),
            status:        document.getElementById('edit-status').value
        };

        const btn = e.target.querySelector('button[type="submit"]');
        const originalHTML = btn ? btn.innerHTML : 'Save Changes';
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-xs"></i><span>Saving...</span>'; }

        const { error } = await client.from('permittees').update(updates).eq('id', id);

        if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }

        if (error) {
            console.error('[Directory] update error:', error);
            window.showToast('Failed to update record: ' + (error.message || error.details), 'error');
            return;
        }

        closeEditEntryModal();
        window.permitteesData = await loadPermitteesFromSupabase();
        filterDirectoryTable();
        window.showToast('Permittee record updated successfully.', 'success');
    }

    function openDeleteModal(id, name) {
        deleteTargetId = id;
        const nameEl = document.getElementById('delete-target-name');
        if (nameEl) nameEl.innerText = name || 'this record';
        smoothOpenModal('modal-delete-confirm');
    }

    function closeDeleteModal() {
        smoothCloseModal('modal-delete-confirm', () => { deleteTargetId = null; });
    }

    async function confirmDelete() {
        if (!deleteTargetId) return;
        const client = getClient();
        if (!client) return;

        const btn = document.getElementById('delete-confirm-btn');
        const originalHTML = btn ? btn.innerHTML : 'Delete';
        if (btn) { btn.disabled = true; btn.innerHTML = 'Deleting...'; }

        const { error } = await client.from('permittees').delete().eq('id', deleteTargetId);

        if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }

        if (error) {
            console.error('[Directory] delete error:', error);
            window.showToast('Failed to delete record: ' + (error.message || error.details), 'error');
            return;
        }

        closeDeleteModal();
        window.permitteesData = await loadPermitteesFromSupabase();
        filterDirectoryTable();
        window.showToast('Record deleted successfully.', 'success');
    }

    function openDeleteAllModal() {
        const countEl = document.getElementById('delete-all-count');
        if (countEl) countEl.innerText = (window.permitteesData || []).length;
        const input = document.getElementById('delete-all-confirm-input');
        if (input) input.value = '';
        const btn = document.getElementById('delete-all-confirm-btn');
        if (btn) btn.disabled = true;

        smoothOpenModal('modal-delete-all');

        if (input && !input.__wired) {
            input.addEventListener('input', function () {
                const confirmBtn = document.getElementById('delete-all-confirm-btn');
                if (confirmBtn) confirmBtn.disabled = this.value.trim().toUpperCase() !== DELETE_ALL_PHRASE;
            });
            input.__wired = true;
        }
    }

    function closeDeleteAllModal() {
        smoothCloseModal('modal-delete-all', () => {
            const input = document.getElementById('delete-all-confirm-input');
            if (input) input.value = '';
            const btn = document.getElementById('delete-all-confirm-btn');
            if (btn) btn.disabled = true;
        });
    }

    async function confirmDeleteAll() {
        const input = document.getElementById('delete-all-confirm-input');
        const typed = input ? input.value.trim().toUpperCase() : '';
        if (typed !== DELETE_ALL_PHRASE) return;

        const client = getClient();
        if (!client) return;

        const btn = document.getElementById('delete-all-confirm-btn');
        const originalHTML = btn ? btn.innerHTML : 'Delete All';
        if (btn) { btn.disabled = true; btn.innerHTML = 'Deleting...'; }

        const { error } = await client
            .from('permittees')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');

        if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }

        if (error) {
            console.error('[Directory] delete-all error:', error);
            window.showToast('Failed to delete all records: ' + (error.message || error.details), 'error');
            return;
        }

        closeDeleteAllModal();
        window.permitteesData = await loadPermitteesFromSupabase();
        filterDirectoryTable();
        window.showToast('All permittee records deleted.', 'success');
    }

    // ------------------------------------------------------------
    // Excel Import — FIXED to handle all 4 sheet types
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

                const allPermitteeRows = [];
                const allLedgerRows = [];

                // Helper: robust column finder
                function getVal(row, names) {
                    for (const name of names) {
                        const key = Object.keys(row).find(
                            k => k.toUpperCase().trim() === name.toUpperCase().trim()
                        );
                        if (key && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
                            return String(row[key]).trim();
                        }
                    }
                    return '';
                }

                console.log('[Import] Sheets found:', workbook.SheetNames);

                workbook.SheetNames.forEach(sheetName => {
                    const sheetUpper = sheetName.toUpperCase();
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonRows = XLSX.utils.sheet_to_json(worksheet);
                    if (jsonRows.length === 0) return;

                    // Determine sheet type by NAME first, then columns
                    const isDocumentary = sheetUpper.includes('DOCUMENTARY');
                    const isBasicInfo = sheetUpper.includes('BASIC');

                    console.log(`[Import] Processing "${sheetName}" (${jsonRows.length} rows) — isBasic: ${isBasicInfo}, isDocumentary: ${isDocumentary}`);

                    jsonRows.forEach((row) => {
                        // ============================================
                        // PATH A: BASIC INFO sheets → permittees
                        // ============================================
                        if (isBasicInfo) {
                            const name = getVal(row, ['PERMIT HOLDER', 'PERMIT HOLDER NAME']).toUpperCase();
                            if (!name) return;

                            const mun = getVal(row, ['MUNICIPALITY']);
                            const loc = getVal(row, ['LOCATION']);
                            const fullLocation = mun && loc
                                ? `${mun} - ${loc}`
                                : (mun || loc || 'Unknown Location');

                            const permitNo = getVal(row, ['PERMIT NO.', 'PERMIT NO', 'PERMIT_NO']);
                            const areaRaw = getVal(row, ['AREA (has.)', 'AREA (HAS.)', 'AREA', 'AREA HAS']);

                            const rawVolStr = getVal(row, [
                                'ANNUAL EXTRACTION', 'ANNUAL EXTRACTION RATE',
                                'ALLOWED VOLUME (CU.M)', 'ALLOWED VOLUME'
                            ]) || '0';

                            const numericVol = parseFloat(rawVolStr.replace(/[^0-9.-]+/g, '')) || 0;

                            allPermitteeRows.push({
                                name:          name,
                                location:      fullLocation,
                                permit_no:     permitNo,
                                type:          getVal(row, ['TYPE OF PERMIT', 'TYPE']) || 'Commercial',
                                commodity:     getVal(row, ['COMMODITY']) || 'Sand & Gravel',
                                area:          areaRaw,
                                rate:          rawVolStr,
                                allowed_vol:   Math.round(numericVol),
                                remaining_vol: Math.round(numericVol),
                                start_date:    toIsoDate(getVal(row, ['START DATE', 'ISSUED DATE', 'ISSUED DATE 1'])),
                                end_date:      toIsoDate(getVal(row, ['END DATE'])),
                                status:        'Active'
                            });
                            return;
                        }

                        // ============================================
                        // PATH B: DOCUMENTARY sheets → ledger_entries
                        // ============================================
                        if (isDocumentary) {
                            const eccNo = getVal(row, ['ECC NO.', 'ECC NO', 'ECC']);
                            const permitHolder = getVal(row, ['PERMIT HOLDER', 'PERMIT HOLDER NAME']).toUpperCase();
                            const fallbackPermitNo = getVal(row, ['PERMIT NO.', 'PERMIT NO', 'PERMIT_NO']);

                            const ledgerKey = eccNo || fallbackPermitNo || permitHolder;
                            if (!ledgerKey) return;

                            allLedgerRows.push({
                                permit_no: ledgerKey,
                                permit_holder: permitHolder,
                                source_sheet: sheetName,
                                municipality: getVal(row, ['MUNICIPALITY']),
                                location: getVal(row, ['LOCATION']),
                                type_of_permit: getVal(row, ['TYPE OF PERMIT', 'TYPE']),
                                commodity: getVal(row, ['COMMODITY']),
                                issued_date: toIsoDate(getVal(row, ['ISSUED DATE', 'ISSUED DATE 1'])),
                                ecc_amendment: getVal(row, ['ECC AMENDMENT', 'ECC AMENDMENT/REMARKS']),
                                remarks: getVal(row, ['REMARKS']),
                                issued_date_2: toIsoDate(getVal(row, ['ISSUED DATE 2'])),
                                annual_extraction_rate: getVal(row, ['ANNUAL EXTRACTION RATE', 'ANNUAL EXTRACTION']),
                                area_status_clearance: getVal(row, ['AREA STATUS CLEARANCE']),
                                issued_date_3: toIsoDate(getVal(row, ['ISSUED DATE 3']))
                            });
                            return;
                        }

                        // ============================================
                        // PATH C: Unknown sheet → detect by columns
                        // ============================================
                        const columns = Object.keys(row).map(c => c.toUpperCase().trim());
                        const hasPermitHolder = columns.some(c => c.includes('PERMIT HOLDER'));
                        const hasEccNo = columns.some(c => c.includes('ECC NO') || c === 'ECC');

                        if (hasPermitHolder && !hasEccNo) {
                            // Treat as basic info
                            const name = getVal(row, ['PERMIT HOLDER']).toUpperCase();
                            if (name) {
                                const permitNo = getVal(row, ['PERMIT NO.', 'PERMIT NO', 'PERMIT_NO']);
                                const rawVolStr = getVal(row, ['ANNUAL EXTRACTION', 'ALLOWED VOLUME (CU.M)']) || '0';
                                const numericVol = parseFloat(rawVolStr.replace(/[^0-9.-]+/g, '')) || 0;

                                allPermitteeRows.push({
                                    name:          name,
                                    location:      getVal(row, ['MUNICIPALITY', 'LOCATION']),
                                    permit_no:     permitNo,
                                    type:          getVal(row, ['TYPE OF PERMIT', 'TYPE']) || 'Commercial',
                                    commodity:     getVal(row, ['COMMODITY']) || 'Sand & Gravel',
                                    area:          getVal(row, ['AREA (has.)', 'AREA']),
                                    rate:          rawVolStr,
                                    allowed_vol:   Math.round(numericVol),
                                    remaining_vol: Math.round(numericVol),
                                    start_date:    toIsoDate(getVal(row, ['START DATE', 'ISSUED DATE'])),
                                    end_date:      toIsoDate(getVal(row, ['END DATE'])),
                                    status:        'Active'
                                });
                            }
                        } else if (hasEccNo) {
                            // Treat as documentary
                            const eccNo = getVal(row, ['ECC NO.', 'ECC NO', 'ECC']);
                            const permitHolder = getVal(row, ['PERMIT HOLDER']).toUpperCase();
                            const fallbackPermitNo = getVal(row, ['PERMIT NO.', 'PERMIT NO', 'PERMIT_NO']);
                            const ledgerKey = eccNo || fallbackPermitNo || permitHolder;

                            if (ledgerKey) {
                                allLedgerRows.push({
                                    permit_no: ledgerKey,
                                    permit_holder: permitHolder,
                                    source_sheet: sheetName,
                                    municipality: getVal(row, ['MUNICIPALITY']),
                                    location: getVal(row, ['LOCATION']),
                                    type_of_permit: getVal(row, ['TYPE OF PERMIT', 'TYPE']),
                                    commodity: getVal(row, ['COMMODITY']),
                                    issued_date: toIsoDate(getVal(row, ['ISSUED DATE', 'ISSUED DATE 1'])),
                                    ecc_amendment: getVal(row, ['ECC AMENDMENT']),
                                    remarks: getVal(row, ['REMARKS']),
                                    issued_date_2: toIsoDate(getVal(row, ['ISSUED DATE 2'])),
                                    annual_extraction_rate: getVal(row, ['ANNUAL EXTRACTION RATE', 'ANNUAL EXTRACTION']),
                                    area_status_clearance: getVal(row, ['AREA STATUS CLEARANCE']),
                                    issued_date_3: toIsoDate(getVal(row, ['ISSUED DATE 3']))
                                });
                            }
                        }
                    });
                });

                console.log(`[Import] Collected ${allPermitteeRows.length} permittees, ${allLedgerRows.length} ledger rows.`);

                if (allPermitteeRows.length === 0 && allLedgerRows.length === 0) {
                    window.showToast('No valid records found across sheets.', 'error');
                    return;
                }

                const client = getClient();
                if (!client) {
                    console.error('[Directory] supabaseClient missing.');
                    return;
                }

                // --- INSERT PERMITTEES ---
                if (allPermitteeRows.length > 0) {
                    const byPermitNo = new Map();
                    allPermitteeRows.forEach(r => {
                        if (r.permit_no) byPermitNo.set(r.permit_no, r);
                    });
                    const uniqueRows = Array.from(byPermitNo.values());

                    const permitNos = uniqueRows.map(r => r.permit_no).filter(Boolean);
                    const { data: existing } = await client
                        .from('permittees')
                        .select('permit_no')
                        .in('permit_no', permitNos);

                    const existingSet = new Set((existing || []).map(r => r.permit_no));
                    const newRows = uniqueRows.filter(r => !existingSet.has(r.permit_no));
                    const skipped = uniqueRows.length - newRows.length;

                    if (newRows.length > 0) {
                        const { error: insertErr } = await client.from('permittees').insert(newRows);
                        if (insertErr) {
                            console.error('[Directory] permittee insert error:', insertErr);
                            window.showToast('Permittee import failed: ' + insertErr.message, 'error');
                        } else {
                            window.showToast(`Imported ${newRows.length} permittee(s). Skipped ${skipped} duplicate(s).`, 'info');
                        }
                    } else {
                        window.showToast(`All ${uniqueRows.length} permittees already exist.`, 'info');
                    }
                }

                // --- INSERT LEDGER ENTRIES ---
                if (allLedgerRows.length > 0) {
                    const byKey = new Map();
                    allLedgerRows.forEach(r => {
                        const key = `${r.permit_no}||${r.permit_holder || ''}`;
                        byKey.set(key, r);
                    });
                    const uniqueLedgerRows = Array.from(byKey.values());

                    console.log(`[Import] Unique ledger rows: ${uniqueLedgerRows.length}`);

                    const permitNos = uniqueLedgerRows.map(r => r.permit_no).filter(Boolean);
                    const { data: existingLedger } = await client
                        .from('ledger_entries')
                        .select('permit_no, permit_holder')
                        .in('permit_no', permitNos);

                    const existingSet = new Set(
                        (existingLedger || []).map(r => `${r.permit_no}||${r.permit_holder || ''}`)
                    );
                    const newLedgerRows = uniqueLedgerRows.filter(
                        r => !existingSet.has(`${r.permit_no}||${r.permit_holder || ''}`)
                    );

                    console.log(`[Import] New ledger rows to insert: ${newLedgerRows.length}`);

                    if (newLedgerRows.length > 0) {
                        const { error: ledgerInsertErr } = await client
                            .from('ledger_entries')
                            .insert(newLedgerRows);

                        if (ledgerInsertErr) {
                            console.error('[Directory] Ledger insert error:', ledgerInsertErr);
                            window.showToast('Ledger import failed: ' + ledgerInsertErr.message, 'error');
                        } else {
                            window.showToast(`Imported ${newLedgerRows.length} ledger entry(ies).`, 'success');
                        }
                    } else {
                        window.showToast('All ledger entries already exist.', 'info');
                    }
                } else {
                    console.warn('[Import] No ledger rows collected.');
                    window.showToast('No documentary/ledger data found in Excel.', 'error');
                }

                window.permitteesData = await loadPermitteesFromSupabase();
                filterDirectoryTable();

            } catch (err) {
                console.error('[Directory] import exception:', err);
                window.showToast('Failed to parse Excel file: ' + (err.message || err), 'error');
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    }

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
            'STATUS':                  getStatusFor(p).label
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook  = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'TABLAS BASIC INFO');
        XLSX.writeFile(workbook, 'Permittees_Directory_Export.xlsx');
        window.showToast('Directory successfully exported to Excel.', 'success');
    }

    function setupVolumeAutoFill() {
        const allowedInput = document.getElementById('new-allowed-vol');
        const remainingInput = document.getElementById('new-remaining-vol');

        if (allowedInput && remainingInput) {
            allowedInput.addEventListener('input', function () {
                remainingInput.value = this.value;
                remainingInput.classList.remove('volume-pulse');
                void remainingInput.offsetWidth;
                remainingInput.classList.add('volume-pulse');
            });
        }
    }

    window.filterDirectoryTable  = filterDirectoryTable;
    window.openAddEntryModal     = openAddEntryModal;
    window.closeAddEntryModal    = closeAddEntryModal;
    window.submitNewPermitEntry  = submitNewPermitEntry;
    window.openEditModal         = openEditModal;
    window.closeEditEntryModal   = closeEditEntryModal;
    window.submitEditPermitEntry = submitEditPermitEntry;
    window.triggerExcelImport    = triggerExcelImport;
    window.handleExcelImport     = handleExcelImport;
    window.exportToExcel         = exportToExcel;
    window.goToPage              = goToPage;
    window.goToPrevPage          = goToPrevPage;
    window.goToNextPage          = goToNextPage;
    window.openDeleteModal       = openDeleteModal;
    window.closeDeleteModal      = closeDeleteModal;
    window.confirmDelete         = confirmDelete;
    window.openDeleteAllModal    = openDeleteAllModal;
    window.closeDeleteAllModal   = closeDeleteAllModal;
    window.confirmDeleteAll      = confirmDeleteAll;

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