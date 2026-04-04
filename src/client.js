import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("Missing VITE_SUPABASE_URL");
}

if (!supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_ANON_KEY");
}

// ── SECURITY: Idle session timeout (30 minutes) ──
const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
let idleTimer = null;
const resetIdleTimer = () => {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.signOut();
        window.location.reload();
      }
    } catch (e) {
      console.warn("Idle logout failed", e);
    }
  }, IDLE_TIMEOUT_MS);
};
if (typeof window !== "undefined") {
  ["mousemove", "keydown", "scroll", "touchstart", "click"].forEach((evt) =>
    window.addEventListener(evt, resetIdleTimer, { passive: true })
  );
  resetIdleTimer();
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});