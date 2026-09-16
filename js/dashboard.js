// ============================================================
// DASHBOARD PAGE
// ============================================================
function getClient() {
    return window.supabaseClient ||
           (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
}

async function fetchPermittees() {
    const client = getClient();
    if (!client) return [];
    const { data, error } = await client
        .from('permittees')
        .select('*')
        .order('created_at', { ascending: false });
    if (error) {
        console.error('[Dashboard] fetch error:', error);
        return [];
    }
    return (data || []).map(window.mapDbRowToPermittee);
}

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
                        ${escapeHtml(p.name.split(' ').map(w => w[0]).slice(0, 2).join(''))}
                    </div>
                    <div class="min-w-0">
                        <p class="text-xs font-bold text-ink-800 truncate">${escapeHtml(p.name)}</p>
                        <p class="text-[10px] text-ink-400 font-mono">${escapeHtml(p.permitNo)} • ${escapeHtml(p.location)}</p>
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

document.addEventListener('DOMContentLoaded', async () => {
    const dateEl = document.getElementById('hub-date');
    if (dateEl) {
        dateEl.innerText = new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    const client = getClient();
    if (!client) {
        console.error('[Dashboard] Supabase client not found.');
        return;
    }

    const { data: { session } } = await client.auth.getSession();
    if (!session) {
        window.location.href = '../index.html';
        return;
    }

    const permittees = await fetchPermittees();
    window.permitteesData = permittees;
    if (typeof savePermittees === 'function') savePermittees(permittees);

    updateHubMetrics(permittees);
    renderHubRecent(permittees);
});