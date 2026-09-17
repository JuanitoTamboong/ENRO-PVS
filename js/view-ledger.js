// ============================================================
// VIEW LEDGER PAGE — View + Inline Edit with Smooth Animations
// Region/municipality logic is driven entirely by the `regions` table
// Logs INSERT + UPDATE to activity_logs
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

            /* ---------- Municipality suggestion modal ---------- */
            #municipality-suggest-modal {
                position: fixed;
                inset: 0;
                background: rgba(15, 23, 42, 0.55);
                backdrop-filter: blur(2px);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                animation: munFadeIn 0.22s ease-out both;
            }
            #municipality-suggest-modal.closing {
                animation: munFadeOut 0.2s ease-in both;
            }
            #municipality-suggest-modal .mun-card {
                background: #fff;
                border-radius: 16px;
                width: 100%;
                max-width: 500px;
                box-shadow: 0 20px 50px -10px rgba(15, 23, 42, 0.35);
                overflow: hidden;
                animation: munCardIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
            }
            @keyframes munFadeIn  { from { opacity: 0; } to { opacity: 1; } }
            @keyframes munFadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes munCardIn {
                0%   { opacity: 0; transform: translateY(24px) scale(0.94); }
                60%  { opacity: 1; transform: translateY(-3px) scale(1.01); }
                100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            #municipality-suggest-modal .mun-icon {
                width: 56px;
                height: 56px;
                margin: 0 auto 14px;
                border-radius: 9999px;
                background: #eff6ff;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: munIconPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both;
            }
            @keyframes munIconPop {
                0%   { opacity: 0; transform: scale(0.5) rotate(-90deg); }
                60%  { opacity: 1; transform: scale(1.15) rotate(8deg); }
                100% { opacity: 1; transform: scale(1) rotate(0deg); }
            }
            #municipality-suggest-modal .mun-code {
                background: #f1f5f9;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 2px 6px;
                font-family: 'JetBrains Mono', ui-monospace, monospace;
                font-size: 10.5px;
                color: #334155;
            }
            #municipality-suggest-modal .mun-option {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                padding: 10px 12px;
                border: 1px solid #e2e8f0;
                border-radius: 10px;
                background: #f8fafc;
                cursor: pointer;
                transition: all 0.18s cubic-bezier(0.22, 1, 0.36, 1);
                text-align: left;
                width: 100%;
            }
            #municipality-suggest-modal .mun-option:hover {
                background: #ecfdf5;
                border-color: #86efac;
                transform: translateY(-1px);
                box-shadow: 0 4px 10px -4px rgba(22, 163, 74, 0.25);
            }
            #municipality-suggest-modal .mun-option:active { transform: scale(0.99); }
            #municipality-suggest-modal .mun-option .mun-name {
                font-family: 'JetBrains Mono', ui-monospace, monospace;
                font-size: 12px;
                font-weight: 700;
                color: #0f172a;
            }
            #municipality-suggest-modal .mun-option .mun-region {
                font-size: 10px;
                color: #64748b;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.03em;
            }
            #municipality-suggest-modal .mun-option .mun-badge {
                font-size: 9px;
                font-weight: 800;
                padding: 2px 6px;
                border-radius: 999px;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                background: #dcfce7;
                color: #15803d;
                border: 1px solid #bbf7d0;
                white-space: nowrap;
            }
            #municipality-suggest-modal .mun-option .mun-badge.is-low {
                background: #fef3c7;
                color: #b45309;
                border-color: #fde68a;
            }
            #municipality-suggest-modal .mun-btn {
                display: inline-flex;
                align-items: center;
                gap: 0.4rem;
                padding: 0.55rem 1.2rem;
                font-size: 0.75rem;
                font-weight: 700;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s ease;
                border: 1px solid transparent;
            }
            #municipality-suggest-modal .mun-btn--cancel {
                color: #475569;
                background: #fff;
                border-color: #cbd5e1;
            }
            #municipality-suggest-modal .mun-btn--cancel:hover {
                background: #f8fafc;
                border-color: #94a3b8;
                transform: translateY(-1px);
            }
            #municipality-suggest-modal .mun-btn:active { transform: scale(0.97); }
        `;
        document.head.appendChild(style);
    }

    // ------------------------------------------------------------
    // Inject the Clear button into the actions bar (once)
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

    function escapeHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // ------------------------------------------------------------
    // ACTIVITY LOGGING
    // ------------------------------------------------------------
    async function logActivity({
        action,
        entityName = '',
        details = {}
    }) {
        try {
            const client = getClient();
            if (!client) return;

            const { data: { user } } = await client.auth.getUser();
            const performedBy = user?.email || 'system';

            await client.from('activity_logs').insert([{
                action,
                entity_type:  'ledger_entries',
                entity_name:  entityName,
                performed_by: performedBy,
                performed_at: new Date().toISOString(),
                details
            }]);
        } catch (err) {
            console.warn('[Ledger] Activity log skipped:', err);
        }
    }

    // ------------------------------------------------------------
    // Normalize municipality strings for loose comparison
    // ------------------------------------------------------------
    function normalizeMunicipality(s) {
        return String(s ?? '')
            .toUpperCase()
            .replace(/[^A-Z0-9 ]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function levenshtein(a, b) {
        a = normalizeMunicipality(a);
        b = normalizeMunicipality(b);
        if (a === b) return 0;
        if (!a.length) return b.length;
        if (!b.length) return a.length;

        const prev = new Array(b.length + 1);
        const curr = new Array(b.length + 1);
        for (let j = 0; j <= b.length; j++) prev[j] = j;

        for (let i = 1; i <= a.length; i++) {
            curr[0] = i;
            for (let j = 1; j <= b.length; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                curr[j] = Math.min(
                    curr[j - 1] + 1,
                    prev[j] + 1,
                    prev[j - 1] + cost
                );
            }
            for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
        }
        return prev[b.length];
    }

    function municipalityDistance(a, b) {
        const na = normalizeMunicipality(a);
        const nb = normalizeMunicipality(b);
        if (!na || !nb) return Infinity;
        if (na === nb) return 0;
        if (na.includes(nb) || nb.includes(na)) {
            return Math.abs(na.length - nb.length) * 0.5;
        }
        return levenshtein(na, nb);
    }

    function findClosestMunicipalities(target, regions, maxDistance = 4, maxResults = 5) {
        const results = [];
        for (const r of regions) {
            for (const m of (r.municipalities || [])) {
                const d = municipalityDistance(target, m);
                if (d <= maxDistance) {
                    results.push({
                        value: String(m),
                        region: r.name,
                        sheet: r.sheet_documentary || `${r.name} DOCUMENTARY REQUIREMENTS`,
                        distance: d
                    });
                }
            }
        }
        results.sort((a, b) => a.distance - b.distance);
        return results.slice(0, maxResults);
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
                regionsCache = [];
                return regionsCache;
            }
            regionsCache = data || [];
        } catch (err) {
            regionsCache = [];
        }
        return regionsCache;
    }

    // ------------------------------------------------------------
    // Resolve the documentary sheet for a permittee's location
    // ------------------------------------------------------------
    async function resolveSourceSheet(permittee) {
        const rawLocation  = String(permittee.location || '');
        const municipality = rawLocation.split(' - ')[0].trim().toUpperCase();
        const normalized   = normalizeMunicipality(municipality);

        const regions = await getRegions();

        // Pass 1 — exact normalized match
        for (const r of regions) {
            const munis = (r.municipalities || []).map(normalizeMunicipality);
            if (munis.includes(normalized)) {
                return r.sheet_documentary || `${r.name} DOCUMENTARY REQUIREMENTS`;
            }
        }

        // Pass 2 — fuzzy match
        const best = findClosestMunicipalities(municipality, regions, 4, 1);
        if (best.length > 0) {
            return best[0].sheet;
        }

        return null;
    }

    // ------------------------------------------------------------
    // MUNICIPALITY SUGGESTION MODAL
    // ------------------------------------------------------------
    function showMunicipalitySuggestModal({
        attempted,
        permittee,
        suggestions,
        allRegions,
        onPickRegion
    }) {
        ensureLedgerAnimations();

        const existing = document.getElementById('municipality-suggest-modal');
        if (existing) existing.remove();

        const permitteeName = permittee?.name || '—';
        const permitNo     = permittee?.permit_no || '—';
        const fullLocation = permittee?.location || '—';

        const hasSuggestions = suggestions && suggestions.length > 0;

        const suggestionList = hasSuggestions
            ? suggestions.map((s, i) => {
                const badgeClass = s.distance <= 1 ? 'mun-badge' : 'mun-badge is-low';
                const badgeText  = s.distance <= 1 ? 'Best match' : `Δ${s.distance}`;
                return `
                    <button type="button"
                            class="mun-option"
                            data-pick="${escapeHtml(s.value)}"
                            data-region-id="${escapeHtml(s.regionId ?? '')}"
                            data-sheet="${escapeHtml(s.sheet)}"
                            data-idx="${i}">
                        <div>
                            <div class="mun-name">${escapeHtml(s.value)}</div>
                            <div class="mun-region">in region · ${escapeHtml(s.region)}</div>
                        </div>
                        <span class="${badgeClass}">${escapeHtml(badgeText)}</span>
                    </button>
                `;
            }).join('')
            : `
                <div style="padding:10px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;font-size:11px;color:#991b1b;text-align:left;">
                    <i class="fa-solid fa-circle-exclamation" style="margin-right:4px;"></i>
                    No similar municipality found. Choose a region below to add
                    <strong>${escapeHtml(attempted)}</strong>.
                </div>
            `;

        const regionOptions = (allRegions || []).map(r => `
            <button type="button"
                    class="mun-option"
                    data-add-region-id="${escapeHtml(r.id)}"
                    data-add-region-name="${escapeHtml(r.name)}"
                    data-add-region-sheet="${escapeHtml(r.sheet_documentary || (r.name + ' DOCUMENTARY REQUIREMENTS'))}">
                <div>
                    <div class="mun-name">${escapeHtml(r.name)}</div>
                    <div class="mun-region">${(r.municipalities || []).length} municipalities</div>
                </div>
                <span class="mun-badge is-low">Add here</span>
            </button>
        `).join('');

        const modal = document.createElement('div');
        modal.id = 'municipality-suggest-modal';
        modal.innerHTML = `
            <div class="mun-card">
                <div class="p-6">
                    <div class="mun-icon">
                        <i class="fa-solid fa-map-location-dot" style="color:#2563eb;font-size:1.35rem;"></i>
                    </div>

                    <h3 class="text-base font-bold text-ink-900 text-center">
                        Municipality Not Recognized
                    </h3>

                    <p class="text-[12px] text-ink-500 mt-2 leading-relaxed text-center">
                        The permittee's location
                        <strong class="text-ink-900">${escapeHtml(attempted)}</strong>
                        wasn't found in any region. Pick the correct spelling below
                        and we'll update it — no database editing required.
                    </p>

                    <div class="mt-4 p-3 bg-ink-50 border border-ink-200 rounded-lg text-left">
                        <p class="text-[10px] font-bold text-ink-500 uppercase tracking-wider mb-1.5">
                            Permittee being edited
                        </p>
                        <div class="text-[11px] text-ink-700 space-y-0.5">
                            <div><span class="text-ink-400">Name:</span> <strong>${escapeHtml(permitteeName)}</strong></div>
                            <div><span class="text-ink-400">Permit No:</span> <span class="font-mono">${escapeHtml(permitNo)}</span></div>
                            <div><span class="text-ink-400">Location:</span> ${escapeHtml(fullLocation)}</div>
                        </div>
                    </div>

                    ${hasSuggestions ? `
                        <div class="mt-4">
                            <p class="text-[10px] font-bold text-ink-500 uppercase tracking-wider mb-2 text-left">
                                <i class="fa-solid fa-lightbulb text-[9px] mr-1" style="color:#16a34a;"></i>
                                Similar municipalities — click to use
                            </p>
                            <div class="space-y-2">${suggestionList}</div>
                        </div>
                    ` : `
                        <div class="mt-4">
                            ${suggestionList}
                        </div>
                    `}

                    <details class="mt-4 text-left">
                        <summary class="cursor-pointer text-[11px] font-bold text-ink-600 hover:text-ink-900 select-none">
                            <i class="fa-solid fa-plus text-[9px] mr-1"></i>
                            Or add "${escapeHtml(attempted)}" as a new municipality
                        </summary>
                        <div class="mt-3">
                            <p class="text-[10px] text-ink-400 mb-2">
                                Choose which region this municipality belongs to. It will be appended to that region's list.
                            </p>
                            <div class="space-y-2">${regionOptions || '<p class="text-[11px] text-ink-400">No regions available.</p>'}</div>
                        </div>
                    </details>
                </div>

                <div class="px-5 py-3 bg-ink-50 border-t border-ink-200 flex items-center justify-end gap-2">
                    <button type="button" class="mun-btn mun-btn--cancel" data-action="close">
                        <i class="fa-solid fa-xmark text-[10px]"></i>
                        <span>Cancel</span>
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        const close = () => {
            modal.classList.add('closing');
            setTimeout(() => modal.remove(), 200);
        };

        modal.querySelector('[data-action="close"]')?.addEventListener('click', close);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });
        document.addEventListener('keydown', function escHandler(e) {
            if (e.key === 'Escape') {
                close();
                document.removeEventListener('keydown', escHandler);
            }
        });

        modal.querySelectorAll('[data-pick]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const picked    = btn.dataset.pick;
                const regionId  = btn.dataset.regionId;
                const sheet     = btn.dataset.sheet;

                if (typeof onPickRegion === 'function') {
                    close();
                    await onPickRegion({
                        action: 'rename',
                        newMunicipality: picked,
                        regionId,
                        sheet
                    });
                }
            });
        });

        modal.querySelectorAll('[data-add-region-id]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const regionId   = btn.dataset.addRegionId;
                const regionName = btn.dataset.addRegionName;
                const sheet      = btn.dataset.addRegionSheet;

                if (typeof onPickRegion === 'function') {
                    close();
                    await onPickRegion({
                        action: 'append',
                        regionId,
                        regionName,
                        sheet,
                        newMunicipality: attempted
                    });
                }
            });
        });
    }

    // ------------------------------------------------------------
    // Helper: update permittee's location field in Supabase
    // ------------------------------------------------------------
    async function updatePermitteeLocation(permitteeId, newMunicipality, oldLocation) {
        const client = getClient();
        if (!client) return false;

        const parts = String(oldLocation || '').split(' - ');
        const rest = parts.slice(1).join(' - ').trim();
        const newLocation = rest ? `${newMunicipality} - ${rest}` : newMunicipality;

        const { error } = await client
            .from('permittees')
            .update({ location: newLocation })
            .eq('id', permitteeId);

        if (error) {
            window.showToast?.('Failed to update location: ' + error.message, 'error');
            return false;
        }

        currentPermittee.location = newLocation;
        return true;
    }

    // ------------------------------------------------------------
    // Helper: append municipality to region's municipalities array
    // ------------------------------------------------------------
    async function appendMunicipalityToRegion(regionId, newMunicipality) {
        const client = getClient();
        if (!client) return false;

        const { data: region, error: fetchErr } = await client
            .from('regions')
            .select('id, name, municipalities')
            .eq('id', regionId)
            .single();

        if (fetchErr || !region) {
            window.showToast?.('Failed to fetch region: ' + (fetchErr?.message || 'unknown'), 'error');
            return false;
        }

        const currentList = Array.isArray(region.municipalities)
            ? region.municipalities.map(String)
            : [];

        const exists = currentList.some(
            m => normalizeMunicipality(m) === normalizeMunicipality(newMunicipality)
        );
        if (exists) return true;

        const updatedList = [...currentList, String(newMunicipality).toUpperCase()];

        const { error: updErr } = await client
            .from('regions')
            .update({ municipalities: updatedList })
            .eq('id', regionId);

        if (updErr) {
            window.showToast?.('Failed to save municipality: ' + updErr.message, 'error');
            return false;
        }

        regionsCache = null;
        return true;
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
            const regions = await getRegions();
            const suggestions = findClosestMunicipalities(municipality, regions, 5, 5);

            return new Promise((resolve) => {
                showMunicipalitySuggestModal({
                    attempted: municipality,
                    permittee: currentPermittee,
                    suggestions: suggestions.map(s => {
                        const match = regions.find(r => r.name === s.region);
                        return { ...s, regionId: match?.id };
                    }),
                    allRegions: regions,
                    onPickRegion: async (choice) => {
                        let ok = false;

                        if (choice.action === 'rename') {
                            ok = await updatePermitteeLocation(
                                currentPermittee.id,
                                choice.newMunicipality,
                                currentPermittee.location
                            );
                            if (ok) {
                                window.showToast?.(
                                    `Updated location to "${choice.newMunicipality}". Creating ledger...`,
                                    'success'
                                );
                            }
                        } else if (choice.action === 'append') {
                            ok = await appendMunicipalityToRegion(
                                choice.regionId,
                                choice.newMunicipality
                            );
                            if (ok) {
                                window.showToast?.(
                                    `Added "${choice.newMunicipality}" to region "${choice.regionName}".`,
                                    'success'
                                );
                            }
                        }

                        if (!ok) {
                            resolve(null);
                            return;
                        }

                        const retry = await createBlankLedger();
                        resolve(retry);
                    }
                });
            });
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
            window.showToast?.('Failed to create ledger: ' + error.message, 'error');
            return null;
        }

        // ✅ Log the ledger creation
        await logActivity({
            action: 'INSERT',
            entityName: currentPermittee?.name || data.permit_holder || '',
            details: {
                after: {
                    permit_no:     data.permit_no,
                    permit_holder: data.permit_holder,
                    source_sheet:  data.source_sheet,
                    municipality:  data.municipality,
                    location:      data.location
                },
                permittee_id: currentPermittee?.id || null
            }
        });

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

        // Snapshot BEFORE state for logging
        const beforeSnapshot = currentLedger ? { ...currentLedger } : {};

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
            window.showToast?.('Failed to save: ' + error.message, 'error');
            return;
        }

        // ✅ Build changed-fields diff for activity log
        const afterSnapshot = data ? { ...data } : {};
        const changedBefore = {};
        const changedAfter  = {};
        Object.keys(updates).forEach(key => {
            const b = beforeSnapshot[key] ?? null;
            const a = afterSnapshot[key]  ?? null;
            if (String(b ?? '') !== String(a ?? '')) {
                changedBefore[key] = b;
                changedAfter[key]  = a;
            }
        });

        if (Object.keys(changedAfter).length > 0) {
            await logActivity({
                action: 'UPDATE',
                entityName: currentPermittee?.name || data.permit_holder || '',
                details: {
                    before: changedBefore,
                    after:  changedAfter,
                    permit_no:     data.permit_no,
                    permittee_id:  currentPermittee?.id || null
                }
            });
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
    // Wire buttons
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