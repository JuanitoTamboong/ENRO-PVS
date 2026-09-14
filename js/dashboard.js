// ============================================================
// DASHBOARD PAGE
// ============================================================
(() => {
    document.getElementById('hub-date').innerText = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    updateHubMetrics();
    renderHubRecent();
})();

function updateHubMetrics() {
    const totalAllowed   = permitteesData.reduce((s, p) => s + p.allowedVol, 0);
    const totalRemaining = permitteesData.reduce((s, p) => s + p.remainingVol, 0);
    const totalExtracted = totalAllowed - totalRemaining;
    const lowAlerts      = permitteesData.filter(p => p.remainingVol <= 100).length;

    document.getElementById('hub-metric-permits').innerText    = permitteesData.length;
    document.getElementById('hub-metric-allowed').innerText    = formatNumber(totalAllowed);
    document.getElementById('hub-metric-extracted').innerText  = formatNumber(totalExtracted);
    document.getElementById('hub-metric-alerts').innerText     = lowAlerts;
}

function renderHubRecent() {
    const container = document.getElementById('hub-recent-list');
    const recent = permitteesData.slice(0, 4);

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