// ============================================================
// DASHBOARD PAGE
// ============================================================

// ------------------------------------------------------------
// Resolve supabase client (global or module-scoped)
// ------------------------------------------------------------
function getSupabase() {
    return window.supabaseClient || (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
}

// ------------------------------------------------------------
// Fetch permittees from Supabase and map to app shape
// ------------------------------------------------------------
async function fetchPermittees() {
    const client = getSupabase();
    if (!client) {
        console.error('[Dashboard] Supabase client unavailable.');
        return [];
    }

    const { data, error } = await client
        .from('permittees')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[Dashboard] Failed to load permittees:', error.message);
        return [];
    }

    return (data || []).map(row => {
        // Prefer shared mapper if utils.js is loaded
        if (typeof window.mapDbRowToPermittee === 'function') {
            return window.mapDbRowToPermittee(row);
        }
        // Fallback inline mapping
        return {
            id: row.id,
            name: row.name || '',
            location: row.location || '',
            permitNo: row.permit_no || '',
            type: row.type || '',
            commodity: row.commodity || '',
            rate: row.rate || '',
            allowedVol: Number(row.allowed_vol) || 0,
            remainingVol: Number(row.remaining_vol) || 0,
            startDate: row.start_date || '',
            endDate: row.end_date || '',
            status: row.status || 'Active',
            transactions: row.transactions || []
        };
    });
}

// ------------------------------------------------------------
// Metrics
// ------------------------------------------------------------
function updateHubMetrics(permittees) {
    const totalAllowed   = permittees.reduce((s, p) => s + p.allowedVol, 0);
    const totalRemaining = permittees.reduce((s, p) => s + p.remainingVol, 0);
    const totalExtracted = totalAllowed - totalRemaining;
    const lowAlerts      = permittees.filter(p => p.remainingVol <= 100).length;

    document.getElementById('hub-metric-permits').innerText    = permittees.length;
    document.getElementById('hub-metric-allowed').innerText    = formatNumber(totalAllowed);
    document.getElementById('hub-metric-extracted').innerText  = formatNumber(totalExtracted);
    document.getElementById('hub-metric-alerts').innerText     = lowAlerts;
}

// ------------------------------------------------------------
// Recent list
// ------------------------------------------------------------
function renderHubRecent(permittees) {
    const container = document.getElementById('hub-recent-list');
    const recent = permittees.slice(0, 4);

    if (recent.length === 0) {
        container.innerHTML = `
            <div class="px-5 py-8 text-center">
                <p class="text-xs text-ink-400">No permit records yet.</p>
                <a href="./directory.html" class="text-[11px] font-bold text-enro-600 hover:text-enro-800 mt-2 inline-block">
                    Add your first permit entry →
                </a>
            </div>`;
        return;
    }

    container.innerHTML = recent.map(p => {
        const s = getStatusInfo(p);
        return `
            <a href="./annual-volume.html?id=${p.id}" class="px-5 py-3 flex items-center justify-between hover:bg-ink-50/50 transition cursor-pointer block">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 bg-enro-50 border border-enro-100 rounded-lg flex items-center justify-center text-enro-700 text-[10px] font-bold shrink-0">
                        ${p.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs font-bold text-ink-800 truncate">${p.name}</p>
                        <p class="text-[10px] text-ink-400 font-mono">${p.permitNo} • ${p.location}</p>
                    </div>
                </div>
                <div class="text-right shrink-0 ml-3">
                    <p class="text-xs font-bold ${p.remainingVol <= 100 ? 'text-rose-600' : 'text-ink-800'}">
                        ${formatNumber(p.remainingVol)} <span class="text-[10px] font-normal text-ink-400">cu.m</span>
                    </p>
                    <span class="status-badge ${s.css} mt-0.5">${s.label}</span>
                </div>
            </a>
        `;
    }).join('');
}

// ------------------------------------------------------------
// Bootstrap
// ------------------------------------------------------------
async function initDashboard() {
    // Date
    const dateEl = document.getElementById('hub-date');
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    // Fetch data
    const permittees = await fetchPermittees();

    // Keep the shared cache in sync so other pages benefit
    if (typeof window.savePermittees === 'function') {
        window.savePermittees(permittees);
    }
    window.permitteesData = permittees;

    // Render
    updateHubMetrics(permittees);
    renderHubRecent(permittees);
}

// Wait for DOM + auth session before bootstrapping
document.addEventListener('DOMContentLoaded', () => {
    const client = getSupabase();
    if (!client) {
        console.error('[Dashboard] Supabase client not found. Did supabase-client.js load?');
        return;
    }

    client.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
            window.location.href = '../index.html';
            return;
        }
        initDashboard();
    });
});