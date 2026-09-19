
let __banTailwindReady = null;

// ------------------------------------------------------------
// Inject Tailwind + fonts + keyframes ONCE
// Returns a Promise that resolves when Tailwind is ready.
// ------------------------------------------------------------
function __ensureBanWarningStyles() {
    if (__banTailwindReady) return __banTailwindReady;

    __banTailwindReady = new Promise((resolve) => {
        if (window.tailwind) return resolve();

        const tw = document.createElement('script');
        tw.src = 'https://cdn.tailwindcss.com';
        tw.onload = () => requestAnimationFrame(() => requestAnimationFrame(resolve));
        tw.onerror = () => resolve();
        document.head.appendChild(tw);

        if (!document.getElementById('ban-guard-fonts')) {
            const fonts = document.createElement('link');
            fonts.id = 'ban-guard-fonts';
            fonts.rel = 'stylesheet';
            fonts.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;600&display=swap';
            document.head.appendChild(fonts);
        }
        if (!document.getElementById('ban-guard-fa')) {
            const fa = document.createElement('link');
            fa.id = 'ban-guard-fa';
            fa.rel = 'stylesheet';
            fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css';
            document.head.appendChild(fa);
        }

        if (!document.getElementById('ban-guard-keyframes')) {
            const style = document.createElement('style');
            style.id = 'ban-guard-keyframes';
            style.innerHTML = `
                @keyframes banFadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes banRise {
                    0%   { opacity: 0; transform: translateY(12px) scale(0.99); }
                    100% { opacity: 1; transform: translateY(0) scale(1); }
                }
                @keyframes banBar {
                    from { width: 0%; }
                    to   { width: 100%; }
                }
                @media (prefers-reduced-motion: reduce) {
                    [class*="ban-anim-"] { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
                }
                body.enro-ban-locked { overflow: hidden !important; }
            `;
            document.head.appendChild(style);
        }
    });

    return __banTailwindReady;
}

// ------------------------------------------------------------
// Show the ban overlay
// redirectTo: optional. If provided, auto-redirects after 6s.
//             If omitted/null, overlay auto-dismisses after 6s.
// Close (✕) button always available for immediate dismissal.
// ------------------------------------------------------------
async function __showBanWarning({ ip, reason, bannedBy, bannedAt, redirectTo }) {
    await __ensureBanWarningStyles();
    document.body.classList.add('enro-ban-locked');

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));

    const fmtDate = bannedAt ? new Date(bannedAt).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    }) : '';

    // -------- Backdrop --------
    const backdrop = document.createElement('div');
    backdrop.className = 'fixed inset-0 flex items-center justify-center p-4 sm:p-6 ban-anim-fadein';
    backdrop.style.cssText = `
        z-index: 2147483647;
        background: rgba(15, 23, 42, 0.45);
        backdrop-filter: blur(6px) saturate(1.1);
        -webkit-backdrop-filter: blur(6px) saturate(1.1);
        opacity: 0;
        animation: banFadeIn .3s ease-out .05s forwards;
        font-family: 'Inter', system-ui, -apple-system, sans-serif;
    `;

    // -------- Card --------
    const card = document.createElement('div');
    card.className = 'relative w-full max-w-[460px] rounded-2xl overflow-hidden ban-anim-rise';
    card.setAttribute('role', 'alertdialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'ban-title');
    card.setAttribute('aria-describedby', 'ban-subtitle');
    card.style.cssText = `
        background: #ffffff;
        border: 1px solid #e2e8f0;
        box-shadow:
            0 1px 2px rgba(15, 23, 42, 0.04),
            0 12px 32px -8px rgba(15, 23, 42, 0.12),
            0 32px 64px -24px rgba(15, 23, 42, 0.16);
        opacity: 0;
        animation: banRise .45s cubic-bezier(.16, 1, .3, 1) .1s forwards;
    `;

    // Helper: dismiss overlay (used by close button + auto-dismiss)
    const dismiss = () => {
        backdrop.style.transition = 'opacity .3s ease';
        backdrop.style.opacity = '0';
        setTimeout(() => {
            backdrop.remove();
            document.body.classList.remove('enro-ban-locked');
        }, 300);
    };

    // ============ HEADER BAR (matches portal top nav) ============
    const headerBar = document.createElement('div');
    headerBar.className = 'flex items-center justify-between px-6 py-3.5';
    headerBar.style.cssText = `
        background: linear-gradient(135deg, #065f46 0%, #047857 100%);
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    `;

    const headerLeft = document.createElement('div');
    headerLeft.className = 'flex items-center gap-2.5';

    const headerDot = document.createElement('span');
    headerDot.className = 'relative flex h-2 w-2';
    headerDot.innerHTML = `
        <span class="absolute inline-flex h-full w-full rounded-full bg-rose-300 opacity-75"></span>
        <span class="relative inline-flex rounded-full h-2 w-2 bg-rose-400"></span>
    `;

    const headerLabel = document.createElement('span');
    headerLabel.className = 'text-[11px] font-bold uppercase tracking-[0.14em] text-white/90';
    headerLabel.textContent = 'Security Alert';

    headerLeft.appendChild(headerDot);
    headerLeft.appendChild(headerLabel);

    // Right side: meta + close button
    const headerRightGroup = document.createElement('div');
    headerRightGroup.className = 'flex items-center gap-3';

    const headerRight = document.createElement('span');
    headerRight.className = 'text-[10px] font-mono uppercase tracking-wider text-emerald-200/70';
    headerRight.textContent = 'ENRO · 403';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.className = 'w-6 h-6 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors';
    closeBtn.style.cursor = 'pointer';
    closeBtn.innerHTML = '<i class="fa-solid fa-xmark text-[12px]"></i>';
    closeBtn.onclick = dismiss;

    headerRightGroup.appendChild(headerRight);
    headerRightGroup.appendChild(closeBtn);

    headerBar.appendChild(headerLeft);
    headerBar.appendChild(headerRightGroup);
    card.appendChild(headerBar);

    // ============ BODY ============
    const content = document.createElement('div');
    content.className = 'px-7 pt-7 pb-6';

    // ---- Warning banner ----
    const banner = document.createElement('div');
    banner.className = 'flex items-start gap-3 rounded-xl px-4 py-3.5 mb-6';
    banner.style.cssText = `
        background: #fef2f2;
        border: 1px solid #fecdd3;
    `;

    const bannerIcon = document.createElement('div');
    bannerIcon.className = 'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center';
    bannerIcon.style.cssText = `
        background: #ffffff;
        border: 1px solid #fecdd3;
        box-shadow: 0 1px 2px rgba(190, 18, 60, 0.06);
    `;
    bannerIcon.innerHTML = `<i class="fa-solid fa-ban text-rose-600 text-[15px]"></i>`;

    const bannerText = document.createElement('div');
    bannerText.className = 'min-w-0 flex-1 pt-0.5';

    const title = document.createElement('h1');
    title.id = 'ban-title';
    title.className = 'text-[15px] font-bold text-slate-900 leading-tight mb-1';
    title.textContent = 'Your IP has been banned';

    const subtitle = document.createElement('p');
    subtitle.id = 'ban-subtitle';
    subtitle.className = 'text-[12.5px] leading-relaxed text-slate-600';
    subtitle.innerHTML = 'You no longer have access to this system. Contact the ENRO administrator if you believe this is a mistake.';

    bannerText.appendChild(title);
    bannerText.appendChild(subtitle);
    banner.appendChild(bannerIcon);
    banner.appendChild(bannerText);
    content.appendChild(banner);

    // ---- Section label ----
    const sectionLabel = document.createElement('div');
    sectionLabel.className = 'flex items-center justify-between mb-3';
    sectionLabel.innerHTML = `
        <h2 class="text-[12px] font-bold text-slate-800 uppercase tracking-[0.08em]">Ban Details</h2>
        <span class="text-[10px] font-medium text-slate-400">Restricted Access</span>
    `;
    content.appendChild(sectionLabel);

    // ---- Info list ----
    const list = document.createElement('div');
    list.className = 'rounded-xl overflow-hidden mb-6';
    list.style.cssText = `
        background: #ffffff;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
    `;

    const rows = [];
    if (ip) rows.push({ label: 'IP Address', value: ip, mono: true, icon: 'fa-network-wired' });
    if (reason) rows.push({ label: 'Reason', value: reason, accent: true, icon: 'fa-circle-exclamation' });
    if (bannedBy) rows.push({ label: 'Banned By', value: bannedBy, icon: 'fa-user-shield' });
    if (bannedAt) rows.push({ label: 'Date', value: fmtDate, icon: 'fa-calendar-day' });

    rows.forEach((row, i) => {
        const rowEl = document.createElement('div');
        rowEl.className = 'flex items-center justify-between gap-4 px-4 py-3';
        if (i > 0) {
            rowEl.style.borderTop = '1px solid #f1f5f9';
        }

        const left = document.createElement('div');
        left.className = 'flex items-center gap-2.5 flex-shrink-0';

        const rowIcon = document.createElement('i');
        rowIcon.className = `fa-solid ${row.icon} text-[11px] text-slate-400`;
        rowIcon.style.width = '14px';
        rowIcon.style.textAlign = 'center';

        const label = document.createElement('span');
        label.className = 'text-[11px] font-semibold text-slate-500 uppercase tracking-[0.04em]';
        label.textContent = row.label;

        left.appendChild(rowIcon);
        left.appendChild(label);

        const value = document.createElement('span');
        value.className = 'text-[13px] font-semibold text-slate-900 text-right break-all';
        if (row.mono) {
            value.style.fontFamily = "'JetBrains Mono', ui-monospace, monospace";
            value.style.fontSize = '12px';
            value.style.letterSpacing = '-0.02em';
        }
        if (row.accent) {
            value.style.color = '#be123c';
            value.style.fontStyle = 'italic';
            value.style.fontWeight = '600';
        }
        value.textContent = row.value;

        rowEl.appendChild(left);
        rowEl.appendChild(value);
        list.appendChild(rowEl);
    });

    content.appendChild(list);

    // ---- Footer ----
    const footer = document.createElement('div');
    footer.className = 'flex items-center justify-between gap-3 pt-1';

    const footerLeft = document.createElement('div');
    footerLeft.className = 'flex items-center gap-2 text-[12px] text-slate-500';
    footerLeft.innerHTML = `
        <i class="fa-solid fa-arrow-right-from-bracket text-slate-400 text-[10px]"></i>
        <span>${redirectTo ? 'Redirecting to sign-in…' : 'Contact your administrator.'}</span>
    `;

    const footerRight = document.createElement('div');
    footerRight.className = 'flex items-center gap-1.5 text-[11px] font-mono font-semibold text-emerald-700';
    footerRight.innerHTML = redirectTo ? `
        <i class="fa-solid fa-clock text-[10px]"></i>
        <span>6s</span>
    ` : `
        <i class="fa-solid fa-shield-halved text-[10px]"></i>
        <span>BLOCKED</span>
    `;

    footer.appendChild(footerLeft);
    footer.appendChild(footerRight);
    content.appendChild(footer);

    card.appendChild(content);

    // ---- Progress bar (always shown) ----
    const progress = document.createElement('div');
    progress.className = 'absolute bottom-0 left-0 right-0 h-[3px] overflow-hidden';
    progress.style.background = '#f1f5f9';

    const bar = document.createElement('div');
    bar.className = 'h-full ban-anim-bar';
    bar.style.cssText = `
        width: 0;
        background: linear-gradient(90deg, #10b981, #047857);
        animation: banBar 6s linear forwards;
    `;
    progress.appendChild(bar);
    card.appendChild(progress);

    backdrop.appendChild(card);
    document.body.appendChild(backdrop);

    // ---- Auto-redirect OR auto-dismiss after 6s ----
    setTimeout(() => {
        if (redirectTo) {
            window.location.replace(redirectTo);
        } else {
            dismiss();
        }
    }, 6000);
}

// ------------------------------------------------------------
// MAIN GUARD — runs on every protected page
// ------------------------------------------------------------
(async function banGuard() {
    const releaseGate = () => {
        document.documentElement.classList.remove('enro-gate-pending');
        const loader = document.getElementById('enro-gate-loader');
        if (loader) loader.remove();
    };

    try {
        if (typeof window.getClientIP !== 'function') {
            console.warn('[ban-guard] getClientIP missing — releasing gate');
            releaseGate();
            return;
        }

        const client = window.supabaseClient ||
                       (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
        if (!client) {
            console.warn('[ban-guard] supabase client missing — releasing gate');
            releaseGate();
            return;
        }

        const { data: { session } } = await client.auth.getSession();
        if (!session) {
            // Not logged in — login page will handle. Release gate.
            releaseGate();
            return;
        }

        const ip = await window.getClientIP();
        const result = await window.isIpBanned(ip);

        if (result.banned) {
            // Log the termination
            try {
                await window.logActivity({
                    action: 'LOGOUT',
                    entity_type: 'auth',
                    entity_name: session.user.email,
                    performed_by: session.user.email,
                    ip_address: ip,
                    details: {
                        reason: 'Banned IP detected — session terminated',
                        ban_reason: result.reason
                    }
                });
            } catch (_) { /* ignore */ }

            // Sign out in the background
            try { await client.auth.signOut(); } catch (_) { /* ignore */ }

            // Show overlay. Gate stays closed — page stays hidden.
            __showBanWarning({
                ip:       result.ip || ip,
                reason:   result.reason,
                bannedBy: result.banned_by,
                bannedAt: result.banned_at,
                redirectTo: '../index.html'
            });
            return;
        }

        // Not banned → reveal the page
        releaseGate();

    } catch (err) {
        console.warn('[ban-guard]', err);
        releaseGate();
    }
})();

// Expose for login page use
window.__showBanWarning = __showBanWarning;