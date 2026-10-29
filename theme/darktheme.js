/* ============================================================
   ENRO Portal — Dark Theme Toggle
   ============================================================ */
(function () {
    'use strict';

    const STORAGE_KEY = 'enro-theme';
    const DARK_CLASS = 'dark';

    // ------------------------------------------------------------
    // Apply theme on page load (before paint to avoid flash)
    // ------------------------------------------------------------
    function applyStoredTheme() {
        const stored = localStorage.getItem(STORAGE_KEY);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const shouldDark = stored === 'dark' || (!stored && prefersDark);

        document.documentElement.classList.toggle(DARK_CLASS, shouldDark);
        return shouldDark;
    }

    // Apply immediately (inline script would be better, but this runs early)
    applyStoredTheme();

    // ------------------------------------------------------------
    // Toggle theme
    // ------------------------------------------------------------
    window.toggleDarkTheme = function () {
        const isDark = document.documentElement.classList.toggle(DARK_CLASS);
        localStorage.setItem(STORAGE_KEY, isDark ? 'dark' : 'light');
        updateToggleIcon();
        return isDark;
    };

    // ------------------------------------------------------------
    // Update toggle button icon
    // ------------------------------------------------------------
    function updateToggleIcon() {
        const btn = document.getElementById('theme-toggle');
        if (!btn) return;
        const isDark = document.documentElement.classList.contains(DARK_CLASS);
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = isDark
                ? 'fa-solid fa-sun text-xs'
                : 'fa-solid fa-moon text-xs';
        }
        btn.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }

    // ------------------------------------------------------------
    // Inject toggle button into header (called after header renders)
    // ------------------------------------------------------------
    window.injectThemeToggle = function () {
        // Find the signout button's parent container
        const signoutBtn = document.querySelector('header .signout-btn');
        if (!signoutBtn || document.getElementById('theme-toggle')) return;

        const btn = document.createElement('button');
        btn.id = 'theme-toggle';
        btn.type = 'button';
        btn.onclick = window.toggleDarkTheme;
        btn.className = 'theme-toggle-btn w-8 h-8 flex items-center justify-center text-enro-400 hover:text-white hover:bg-enro-800 rounded-lg transition';
        btn.innerHTML = '<i class="fa-solid fa-moon text-xs"></i>';

        signoutBtn.parentNode.insertBefore(btn, signoutBtn);
        updateToggleIcon();
    };

    // ------------------------------------------------------------
    // Auto-inject after shell renders
    // ------------------------------------------------------------
    const origInitShell = window.initShell;
    if (typeof origInitShell === 'function') {
        window.initShell = async function () {
            await origInitShell.apply(this, arguments);
            window.injectThemeToggle();
        };
    }

    // Fallback: observe header mount
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(window.injectThemeToggle, 300);
        });
    } else {
        setTimeout(window.injectThemeToggle, 300);
    }

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(STORAGE_KEY)) {
            document.documentElement.classList.toggle(DARK_CLASS, e.matches);
            updateToggleIcon();
        }
    });
})();