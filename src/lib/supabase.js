import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true }
});

/**
 * Faz signOut local e garante POST /auth/v1/logout com Authorization + apikey (evitando 403).
 */
export async function safeSignOut() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    // limpa sessão local (evita UI ficar "presa")
    await supabase.auth.signOut({ scope: "local" });
    if (session?.access_token) {
      await fetch(`${url}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: anon,
          Authorization: `Bearer ${session.access_token}`,
        },
      });
    }
  } catch (e) {
    // sem stress se falhar o fetch; o local já foi limpo
    console.warn("safeSignOut warning:", e?.message || e);
  }
}