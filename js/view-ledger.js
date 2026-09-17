// ============================================================
// VIEW LEDGER PAGE — View + Inline Edit with Smooth Animations
// Region/municipality logic is driven entirely by the `regions` table
// ============================================================
(function () {
    'use strict';

    let currentLedger = null;
    let currentPermittee = null;
    let isEditing = false;

    // ------------------------------------------------------------
    // Button inline styles
    // ------------------------------------------------------------
    const STYLE_EDIT   = 'display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 0.9rem; font-size:0.75rem; font-weight:700; color:#15803d; background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; cursor:pointer; transition:all 0.2s cubic-bezier(0.22, 1, 0.36, 1);';
    const STYLE_SAVE   = 'display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 0.9rem; font-size:0.75rem; font-weight:700; color:#ffffff; background:#15803d; border:1px solid #15803d; border-radius:8px; cursor:pointer; transition:all 0.2s cubic-bezier(0.22, 1, 0.36, 1); animation:ledgerBtnIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;';
    const STYLE_SAVING = 'display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 0.9rem; font-size:0.75rem; font-weight:700; color:#ffffff; background:#94a3b8; border:1px solid #94a3b8; border-radius:8px; cursor:wait; opacity:0.85;';
    const STYLE_CANCEL = 'display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 0.9rem; font-size:0.75rem; font-weight:700; color:#475569; background:#ffffff; border:1px solid #cbd5e1; border-radius:8px; cursor:pointer; transition:all 0.2s cubic-bezier(0.22, 1, 0.36, 1); animation:ledgerBtnIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;';
    const STYLE_CLEAR  = 'display:inline-flex; align-items:center; gap:0.5rem; padding:0.5rem 0.9rem; font-size:0.75rem; font-weight:700; color:#b45309; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; cursor:pointer; transition:all 0.2s cubic-bezier(0.22, 1, 0.36, 1); animation:ledgerBtnIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;';
    const STYLE_HIDDEN = 'display:none;';

    const HTML_EDIT   = '<i class="fa-solid fa-pen" style="font-size:0.65rem;"></i><span>Edit</span>';
    const HTML_ADD    = '<i class="fa-solid fa-plus" style="font-size:0.65rem;"></i><span>Add Ledger</span>';
    const HTML_SAVE   = '<i class="fa-solid fa-check" style="font-size:0.65rem;"></i><span>Save Changes</span>';
    const HTML_SAVING = '<i class="fa-solid fa-spinner fa-spin" style="font-size:0.65rem;"></i><span>Saving...</span>';
    const HTML_CANCEL = '<i class="fa-solid fa-xmark" style="font-size:0.65rem;"></i><span>Cancel</span>';
    const HTML_CLEAR  = '<i class="fa-solid fa-eraser" style="font-size:0.65rem;"></i><span>Clear All</span>';

    let regionsCache = null;

    // ------------------------------------------------------------
    // Inject animation CSS once
    // ------------------------------------------------------------
    function ensureLedgerAnimations() {
        if (document.getElementById('ledger-animations')) return;
        const style = document.createElement('style');
        style.id = 'ledger-animations';
        style.innerHTML = `
            @keyframes ledgerBtnIn {
                0%   { opacity: 0; transform: translateY(-6px) scale(0.85); }
                60%  { opacity: 1; transform: translateY(2px) scale(1.05); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes ledgerFieldSwapIn {
                0%   { opacity: 0; transform: translateY(-4px) scale(0.98); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes ledgerCardPulse {
                0%   { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.0); }
                40%  { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0.10); }
                100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.0); }
            }
            [data-field].ledger-input-in {
                animation: ledgerFieldSwapIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) both;
            }
            .ledger-edit-active {
                animation: ledgerCardPulse 0.55s cubic-bezier(0.22, 1, 0.36, 1);
            }
            #btn-edit:hover:not(:disabled) {
                background: #dcfce7 !important;
                border-color: #86efac !important;
                transform: translateY(-1px);
            }
            #btn-edit:active:not(:disabled) { transform: scale(0.97); }
            #btn-save:hover:not(:disabled) {
                background: #166534 !important;
                border-color: #166534 !important;
                transform: translateY(-1px);
                box-shadow: 0 4px 10px -2px rgba(22, 163, 74, 0.4);
            }
            #btn-save:active:not(:disabled) { transform: scale(0.97); }
            #btn-cancel:hover:not(:disabled) {
                background: #f8fafc !important;
                border-color: #94a3b8 !important;
                transform: translateY(-1px);
            }
            #btn-cancel:active:not(:disabled) { transform: scale(0.97); }
            #btn-clear:hover:not(:disabled) {
                background: #fef3c7 !important;
                border-color: #fbbf24 !important;
                transform: translateY(-1px);
            }
            #btn-clear:active:not(:disabled) { transform: scale(0.97); }
            [data-field]:focus {
                outline: none !important;
                border-color: #16a34a !important;
                box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12) !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ------------------------------------------------------------
    // Inject the Clear button into the actions bar (once)
    // Attaches onclick directly — doesn't rely on wireButtons()
    // ------------------------------------------------------------
    function ensureClearButton() {
        if (document.getElementById('btn-clear')) return;
        const actions = document.getElementById('ledger-actions');
        if (!actions) return;
        const btn = document.createElement('button');
        btn.id = 'btn-clear';
        btn.type = 'button';
        btn.setAttribute('style', STYLE_HIDDEN);
        btn.innerHTML = HTML_CLEAR;
        btn.onclick = clearAllFields;
        actions.appendChild(btn);
    }

    // ------------------------------------------------------------
    // Helpers
    // ------------------------------------------------------------
    function formatDateDisplay(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return d;
        return dateObj.toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    }

    function toIsoDate(v) {
        if (!v) return null;
        const s = String(v).trim();
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return null;

        const year  = parseInt(m[1], 10);
        const month = parseInt(m[2], 10);
        const day   = parseInt(m[3], 10);

        if (year < 1900 || year > 2100) return null;
        if (month < 1 || month > 12) return null;
        if (day < 1 || day > 31) return null;

        const d = new Date(Date.UTC(year, month - 1, day));
        if (isNaN(d.getTime())) return null;

        return d.toISOString().slice(0, 10);
    }

    function getClient() {
        return window.supabaseClient ||
               (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
    }

    function getSectionTitle(sourceSheet) {
        if (!sourceSheet) return 'Documentary Requirements';
        const s = String(sourceSheet).toUpperCase();
        if (s.includes('ROM-SIB') || s.includes('ROMSIB')) return 'ROM-SIB Documentary Requirements';
        if (s.includes('TABLAS')) return 'Tablas Documentary Requirements';
        return 'Documentary Requirements';
    }

    function setFieldValue(fieldName, value) {
        const el = document.querySelector(`[data-field="${fieldName}"]`);
        if (!el) return;
        if (['issued_date', 'issued_date_2', 'issued_date_3'].includes(fieldName)) {
            el.innerText = formatDateDisplay(value) || '—';
        } else {
            el.innerText = value || '—';
        }
    }

    // ------------------------------------------------------------
    // Fetch regions once (cached)
    // ------------------------------------------------------------
    async function getRegions() {
        if (regionsCache !== null) return regionsCache;
        const client = getClient();
        if (!client) return (regionsCache = []);
        try {
            const { data, error } = await client
                .from('regions')
                .select('*')
                .order('sort_order', { ascending: true });
            if (error) {
                console.error('[Ledger] Failed to load regions:', error);
                regionsCache = [];
                return regionsCache;
            }
            regionsCache = data || [];
        } catch (err) {
            console.error('[Ledger] Exception loading regions:', err);
            regionsCache = [];
        }
        return regionsCache;
    }

    // ------------------------------------------------------------
    // Resolve the documentary sheet for a permittee's location
    // ------------------------------------------------------------
    async function resolveSourceSheet(permittee) {
        const municipality = String(permittee.location || '')
            .split(' - ')[0].trim().toUpperCase();

        const regions = await getRegions();
        for (const r of regions) {
            const munis = (r.municipalities || [])
                .map(m => String(m).trim().toUpperCase());
            if (munis.includes(municipality)) {
                return r.sheet_documentary || `${r.name} DOCUMENTARY REQUIREMENTS`;
            }
        }
        return null;
    }

    // ------------------------------------------------------------
    // ENTER edit mode
    // ------------------------------------------------------------
    function enterEditMode() {
        isEditing = true;

        const card = document.querySelector('main > div');
        if (card) {
            card.classList.remove('ledger-edit-active');
            void card.offsetWidth;
            card.classList.add('ledger-edit-active');
        }

        const fields = document.querySelectorAll('[data-field]');
        const dateFields = ['issued_date', 'issued_date_2', 'issued_date_3'];
        const monoFields = ['permit_no'];
        const longFields = ['ecc_amendment', 'remarks'];

        fields.forEach((el, idx) => {
            const field = el.dataset.field;
            const currentValue = currentLedger?.[field] ?? '';
            const isDate = dateFields.includes(field);
            const isMono = monoFields.includes(field);
            const isLong = longFields.includes(field);

            let input;
            if (isDate) {
                input = document.createElement('input');
                input.type = 'date';
                input.min = '1900-01-01';
                input.max = '2100-12-31';
                input.value = currentValue ? String(currentValue).slice(0, 10) : '';
            } else if (isLong) {
                input = document.createElement('textarea');
                input.rows = 2;
                input.value = currentValue || '';
            } else {
                input = document.createElement('input');
                input.type = 'text';
                input.value = currentValue || '';
            }

            input.dataset.field = field;
            input.className = 'w-full mt-1 px-2 py-1.5 text-sm border border-ink-300 rounded-md ' +
                (isMono ? 'font-mono' : '') +
                (isLong ? ' resize-none' : '');

            input.style.animationDelay = (idx * 30) + 'ms';
            input.classList.add('ledger-input-in');

            el.replaceWith(input);
        });
    }

    // ------------------------------------------------------------
    // EXIT edit mode
    // ------------------------------------------------------------
    function exitEditMode() {
        isEditing = false;
        const inputs = document.querySelectorAll('[data-field]');

        inputs.forEach((input, idx) => {
            const field = input.dataset.field;
            const span = document.createElement('span');
            span.dataset.field = field;
            span.className = input.classList.contains('font-mono')
                ? 'font-mono text-sm font-semibold text-ink-800 block min-h-[1.5rem]'
                : 'text-sm font-semibold text-ink-800 block min-h-[1.5rem]';

            const value = currentLedger?.[field];
            if (field.startsWith('issued_date')) {
                span.innerText = formatDateDisplay(value) || '—';
            } else {
                span.innerText = value || '—';
            }

            span.style.animationDelay = (idx * 20) + 'ms';
            span.classList.add('ledger-input-in');

            input.replaceWith(span);
        });
    }

    // ------------------------------------------------------------
    // Create a blank ledger entry
    // ------------------------------------------------------------
    async function createBlankLedger() {
        const client = getClient();
        if (!client || !currentPermittee) return null;

        const fullLocation = String(currentPermittee.location || '').trim();
        const municipality = fullLocation.split(' - ')[0].trim().toUpperCase();

        const sourceSheet = await resolveSourceSheet(currentPermittee);

        if (!sourceSheet) {
            window.showToast?.(
                `No region configured for "${municipality}". Add this municipality ` +
                `to the "regions" table in Supabase first.`,
                'error'
            );
            return null;
        }

        const blank = {
            permit_no:     currentPermittee.permit_no || '',
            permit_holder: currentPermittee.name || '',
            source_sheet:  sourceSheet,
            municipality:  municipality,
            location:      fullLocation.split(' - ').slice(1).join(' - ').trim()
        };

        const { data, error } = await client
            .from('ledger_entries')
            .insert([blank])
            .select()
            .single();

        if (error) {
            console.error('[Ledger] Create failed:', error);
            window.showToast?.('Failed to create ledger: ' + error.message, 'error');
            return null;
        }

        window.showToast?.('New ledger entry created. Fill in the details and click Save.', 'success');
        return data;
    }

    // ------------------------------------------------------------
    // SAVE
    // ------------------------------------------------------------
    async function saveChanges() {
        const client = getClient();
        if (!client || !currentLedger || !currentPermittee) {
            window.showToast?.('Cannot save: missing data', 'error');
            return;
        }

        const btnSave = document.getElementById('btn-save');
        if (!btnSave) return;

        const updates = {};
        const invalidDates = [];
        const dateFields = ['issued_date', 'issued_date_2', 'issued_date_3'];

        document.querySelectorAll('[data-field]').forEach(el => {
            const field = el.dataset.field;
            const raw = (el.value || '').trim();

            if (dateFields.includes(field)) {
                if (!raw) {
                    updates[field] = null;
                } else {
                    const iso = toIsoDate(raw);
                    if (!iso) {
                        invalidDates.push(field);
                        updates[field] = null;
                    } else {
                        updates[field] = iso;
                    }
                }
            } else {
                updates[field] = raw || null;
            }
        });

        if (invalidDates.length > 0) {
            const pretty = invalidDates.map(f =>
                f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            ).join(', ');
            window.showToast?.('Invalid date(s): ' + pretty + '. Please fix and try again.', 'error');
            return;
        }

        btnSave.disabled = true;
        btnSave.setAttribute('style', STYLE_SAVING);
        btnSave.innerHTML = HTML_SAVING;

        const { data, error } = await client
            .from('ledger_entries')
            .update(updates)
            .eq('id', currentLedger.id)
            .select()
            .single();

        btnSave.disabled = false;
        btnSave.setAttribute('style', STYLE_SAVE);
        btnSave.innerHTML = HTML_SAVE;

        if (error) {
            console.error('[Ledger] Update failed:', error);
            window.showToast?.('Failed to save: ' + error.message, 'error');
            return;
        }

        currentLedger = data;
        exitEditMode();
        setButtonsForViewMode();
        window.showToast?.('Ledger updated successfully.', 'success');
    }

    // ------------------------------------------------------------
    // CLEAR ALL fields
    // ------------------------------------------------------------
    function clearAllFields() {
        const editableFields = [
            'issued_date',
            'ecc_amendment',
            'remarks',
            'issued_date_2',
            'area_status_clearance',
            'issued_date_3'
        ];

        let clearedCount = 0;

        document.querySelectorAll('[data-field]').forEach(el => {
            const field = el.dataset.field;
            if (field === 'permit_no') return;
            if (editableFields.includes(field)) {
                el.value = '';
                clearedCount++;
            }
        });

        if (clearedCount > 0) {
            window.showToast?.(
                `Cleared ${clearedCount} field(s). Click "Save Changes" to persist.`,
                'info'
            );
        }
    }

    // ------------------------------------------------------------
    // Button toggles
    // ------------------------------------------------------------
    function setButtonsForViewMode() {
        const btnEdit   = document.getElementById('btn-edit');
        const btnSave   = document.getElementById('btn-save');
        const btnCancel = document.getElementById('btn-cancel');
        const btnClear  = document.getElementById('btn-clear');

        if (btnEdit) {
            btnEdit.setAttribute('style', STYLE_EDIT);
            btnEdit.disabled = false;

            if (currentLedger) {
                btnEdit.title = 'Edit this ledger entry';
                btnEdit.innerHTML = HTML_EDIT;
            } else {
                btnEdit.title = 'Create a new ledger entry';
                btnEdit.innerHTML = HTML_ADD;
            }
        }

        if (btnSave)   { btnSave.setAttribute('style', STYLE_HIDDEN);   btnSave.disabled = false; btnSave.innerHTML = HTML_SAVE; }
        if (btnCancel) { btnCancel.setAttribute('style', STYLE_HIDDEN); btnCancel.innerHTML = HTML_CANCEL; }
        if (btnClear)  { btnClear.setAttribute('style', STYLE_HIDDEN);  btnClear.innerHTML = HTML_CLEAR; }
    }

    function setButtonsForEditMode() {
        const btnEdit   = document.getElementById('btn-edit');
        const btnSave   = document.getElementById('btn-save');
        const btnCancel = document.getElementById('btn-cancel');
        const btnClear  = document.getElementById('btn-clear');

        if (btnEdit)   btnEdit.setAttribute('style', STYLE_HIDDEN);
        if (btnSave)   { btnSave.setAttribute('style', STYLE_SAVE); btnSave.disabled = false; btnSave.innerHTML = HTML_SAVE; }
        if (btnCancel) { btnCancel.setAttribute('style', STYLE_CANCEL); btnCancel.innerHTML = HTML_CANCEL; }
        if (btnClear)  { btnClear.setAttribute('style', STYLE_CLEAR); btnClear.innerHTML = HTML_CLEAR; }
    }

    // ------------------------------------------------------------
    // Main loader
    // ------------------------------------------------------------
    async function loadLedgerData() {
        const urlParams = new URLSearchParams(window.location.search);
        const permitteeId = urlParams.get('id');

        const titleEl    = document.getElementById('ledger-title');
        const subtitleEl = document.getElementById('ledger-subtitle');
        const sectionEl  = document.getElementById('ledger-section-title');

        if (!permitteeId) {
            if (titleEl) titleEl.innerText = 'Error';
            if (subtitleEl) subtitleEl.innerText = 'No Permit ID provided.';
            return;
        }

        const client = getClient();
        if (!client) {
            if (titleEl) titleEl.innerText = 'Error';
            if (subtitleEl) subtitleEl.innerText = 'Database connection failed.';
            return;
        }

        const { data: permittee, error: pError } = await client
            .from('permittees')
            .select('*')
            .eq('id', permitteeId)
            .single();

        if (pError || !permittee) {
            if (titleEl) titleEl.innerText = 'Record Not Found';
            if (subtitleEl) subtitleEl.innerText = 'The permittee could not be found.';
            return;
        }

        currentPermittee = permittee;

        if (titleEl) titleEl.innerText = permittee.name || 'Unknown Permittee';
        if (subtitleEl) {
            subtitleEl.innerText =
                `Permit No: ${permittee.permit_no || '—'} | Location: ${permittee.location || '—'}`;
        }

        let ledgerData = null;

        if (permittee.permit_no) {
            const r = await client.from('ledger_entries')
                .select('*')
                .eq('permit_no', permittee.permit_no)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (r.data) ledgerData = r.data;
        }

        if (!ledgerData && permittee.name) {
            const r = await client.from('ledger_entries')
                .select('*')
                .ilike('permit_holder', permittee.name)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            if (r.data) ledgerData = r.data;
        }

        currentLedger = ledgerData;

        let sectionTitle;
        const resolvedSheet = await resolveSourceSheet(permittee);
        if (resolvedSheet) {
            sectionTitle = getSectionTitle(resolvedSheet);
        } else if (ledgerData?.source_sheet) {
            sectionTitle = getSectionTitle(ledgerData.source_sheet);
        } else {
            sectionTitle = 'Documentary Requirements';
        }
        if (sectionEl) sectionEl.innerText = sectionTitle;

        if (!ledgerData) {
            const fields = ['permit_no', 'issued_date', 'ecc_amendment', 'remarks', 'issued_date_2', 'area_status_clearance', 'issued_date_3'];
            fields.forEach(f => setFieldValue(f, null));
            const eccEl = document.getElementById('view-ecc-no');
            if (eccEl) eccEl.innerText = 'No ledger entry found';
            setButtonsForViewMode();
            return;
        }

        setFieldValue('permit_no', ledgerData.permit_no);
        setFieldValue('issued_date', ledgerData.issued_date);
        setFieldValue('ecc_amendment', ledgerData.ecc_amendment);
        setFieldValue('remarks', ledgerData.remarks);
        setFieldValue('issued_date_2', ledgerData.issued_date_2);
        setFieldValue('area_status_clearance', ledgerData.area_status_clearance);
        setFieldValue('issued_date_3', ledgerData.issued_date_3);

        setButtonsForViewMode();
    }

    // ------------------------------------------------------------
    // Wire buttons (except Clear, which wires itself in ensureClearButton)
    // ------------------------------------------------------------
    function wireButtons() {
        document.getElementById('btn-edit')?.addEventListener('click', async () => {
            if (!currentLedger && currentPermittee) {
                const btnEdit = document.getElementById('btn-edit');
                if (btnEdit) btnEdit.disabled = true;

                const created = await createBlankLedger();

                if (btnEdit) btnEdit.disabled = false;
                if (!created) return;

                currentLedger = created;

                setFieldValue('permit_no', created.permit_no);
                setFieldValue('issued_date', created.issued_date);
                setFieldValue('ecc_amendment', created.ecc_amendment);
                setFieldValue('remarks', created.remarks);
                setFieldValue('issued_date_2', created.issued_date_2);
                setFieldValue('area_status_clearance', created.area_status_clearance);
                setFieldValue('issued_date_3', created.issued_date_3);

                const sectionEl = document.getElementById('ledger-section-title');
                const resolved = await resolveSourceSheet(currentPermittee);
                if (sectionEl) {
                    sectionEl.innerText = resolved
                        ? getSectionTitle(resolved)
                        : getSectionTitle(created.source_sheet || '');
                }
            }

            if (!currentLedger) return;

            setButtonsForEditMode();
            enterEditMode();
        });

        document.getElementById('btn-cancel')?.addEventListener('click', () => {
            exitEditMode();
            setButtonsForViewMode();
        });

        document.getElementById('btn-save')?.addEventListener('click', saveChanges);
    }

    // ------------------------------------------------------------
    // Boot
    // ------------------------------------------------------------
    function boot() {
        ensureLedgerAnimations();
        ensureClearButton();
        wireButtons();
        loadLedgerData();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();