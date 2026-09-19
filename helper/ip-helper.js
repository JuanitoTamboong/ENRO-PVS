// ============================================================
// IP HELPER + ACTIVITY LOGGER + IP BAN SYSTEM
// Location: helper/ip-helper.js
// ============================================================

function __getClient() {
    return window.supabaseClient ||
           (typeof supabaseClient !== 'undefined' ? supabaseClient : null);
}

// ------------------------------------------------------------
// SAFE JSON — strips out anything that can't be serialized
// (this is what was causing the circular structure error)
// ------------------------------------------------------------
function __safeJSON(value, depth = 0) {
    // Prevent infinite recursion / runaway deep structures
    if (depth > 4) return '[depth]';

    if (value === null || value === undefined) return null;

    const t = typeof value;

    // Primitives
    if (t === 'string' || t === 'number' || t === 'boolean') return value;
    if (t === 'function') return '[function]';
    if (t === 'bigint') return value.toString();
    if (t === 'symbol') return value.toString();

    // Arrays
    if (Array.isArray(value)) {
        return value.slice(0, 50).map(v => __safeJSON(v, depth + 1));
    }

    // DOM elements, windows, etc.
    if (value instanceof Element ||
        value instanceof Node ||
        value === window) {
        return '[dom]';
    }

    // Objects — only keep own enumerable keys
    if (t === 'object') {
        const out = {};
        let count = 0;
        for (const key of Object.keys(value)) {
            if (count++ > 40) { out.__truncated__ = true; break; }
            try {
                out[key] = __safeJSON(value[key], depth + 1);
            } catch (_) {
                out[key] = '[unserializable]';
            }
        }
        return out;
    }

    return String(value);
}

// ------------------------------------------------------------
// IP ADDRESS — cached per session
// ------------------------------------------------------------
let __cachedIP  = null;
let __ipPromise = null;

async function getClientIP() {
    if (__cachedIP) return __cachedIP;
    if (__ipPromise) return __ipPromise;

    __ipPromise = (async () => {
        const providers = [
            { url: 'https://api.ipify.org?format=json',   pick: d => d.ip },
            { url: 'https://api64.ipify.org?format=json', pick: d => d.ip },
            { url: 'https://ipapi.co/json/',              pick: d => d.ip },
        ];

        for (const p of providers) {
            try {
                const res = await fetch(p.url, { cache: 'no-store' });
                if (!res.ok) continue;
                const data = await res.json();
                const ip = p.pick(data);
                if (ip) {
                    __cachedIP = ip;
                    return ip;
                }
            } catch (_) { /* try next provider */ }
        }

        __cachedIP = 'unknown';
        return 'unknown';
    })();

    return __ipPromise;
}

// ------------------------------------------------------------
// Check if an IP is banned
// ------------------------------------------------------------
async function isIpBanned(ip) {
    const client = __getClient();
    if (!client) return { banned: false, ip: ip || 'unknown' };

    const target = ip || await getClientIP();
    if (!target || target === 'unknown') return { banned: false, ip: target };

    const { data, error } = await client
        .from('banned_ips')
        .select('reason, banned_by, banned_at')
        .eq('ip_address', target)
        .maybeSingle();

    if (error || !data) return { banned: false, ip: target };
    return { banned: true, ip: target, ...data };
}

// ------------------------------------------------------------
// Log an activity entry — auto-attaches IP if not given
// ------------------------------------------------------------
async function logActivity({
    action,
    entity_type,
    entity_name,
    performed_by,
    ip_address,
    details
} = {}) {
    const client = __getClient();
    if (!client) return;

    const ip = ip_address || await getClientIP();

    // ✅ HARDEN the payload — nothing circular can get through
    const safeDetails = __safeJSON(details || {});

    const row = {
        action:       action       ? String(action)       : null,
        entity_type:  entity_type  ? String(entity_type)  : null,
        entity_name:  entity_name  ? String(entity_name)  : null,
        performed_by: performed_by ? String(performed_by) : null,
        ip_address:   ip           ? String(ip)           : 'unknown',
        details:      safeDetails,
        performed_at: new Date().toISOString()
    };

    const { error } = await client.from('activity_logs').insert([row]);

    if (error) {
        console.warn('[logActivity] insert failed:', error.message, row);
    }
}

// ------------------------------------------------------------
// BAN / UNBAN
// ------------------------------------------------------------
async function banIpAddress(ip, reason = '') {
    const client = __getClient();
    if (!client || !ip || ip === 'unknown') {
        window.showToast?.('Cannot ban: invalid IP.', 'error');
        return false;
    }

    const { data: { session } } = await client.auth.getSession();
    const bannedBy = session?.user?.email || 'system';

    const { error } = await client
        .from('banned_ips')
        .upsert({
            ip_address: String(ip),
            reason:     reason ? String(reason) : null,
            banned_by:  bannedBy,
            banned_at:  new Date().toISOString()
        }, { onConflict: 'ip_address' });

    if (error) {
        window.showToast?.(`Failed to ban IP: ${error.message}`, 'error');
        return false;
    }

    window.showToast?.(`IP ${ip} has been banned.`, 'success');
    return true;
}

async function unbanIpAddress(ip) {
    const client = __getClient();
    if (!client || !ip) return false;

    const { error } = await client
        .from('banned_ips')
        .delete()
        .eq('ip_address', ip);

    if (error) {
        window.showToast?.(`Failed to unban: ${error.message}`, 'error');
        return false;
    }

    window.showToast?.(`IP ${ip} unbanned.`, 'success');
    return true;
}

async function fetchBannedIPs() {
    const client = __getClient();
    if (!client) return [];

    const { data, error } = await client
        .from('banned_ips')
        .select('*')
        .order('banned_at', { ascending: false });

    if (error) {
        window.showToast?.(`Failed to load banned IPs: ${error.message}`, 'error');
        return [];
    }
    return data || [];
}

// ------------------------------------------------------------
// Expose to window
// ------------------------------------------------------------
window.getClientIP    = getClientIP;
window.isIpBanned     = isIpBanned;
window.logActivity    = logActivity;
window.banIpAddress   = banIpAddress;
window.unbanIpAddress = unbanIpAddress;
window.fetchBannedIPs = fetchBannedIPs;