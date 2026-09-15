// ============================================================
// SUPABASE CLIENT
// Exposes window.supabaseClient to all other scripts
// ============================================================
(function () {
    'use strict';

    const SUPABASE_URL = 'https://tulnxemtkifyhzupldpy.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1bG54ZW10a2lmeWh6dXBsZHB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzNzc0NzAsImV4cCI6MjEwNDk1MzQ3MH0.Nv84p60op5YZ69GyTQeieAoS_TbDjCg55K5BnQj9cHA';

    if (!window.supabase) return;

    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
})();