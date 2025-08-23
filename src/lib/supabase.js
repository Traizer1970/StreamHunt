import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Logout que funciona em produção (Netlify) e em dev
export async function safeSignOut() {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    // 1) limpa logo no cliente (UI sai da sessão, mesmo que o server falhe)
    await supabase.auth.signOut({ scope: "local" });

    // 2) tenta revogar no servidor com os headers obrigatórios
    if (session?.access_token) {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session.access_token}`,
        },
        // não uses credentials aqui (o Supabase usa header, não cookie)
      }).catch(() => {});
    }
  } catch (e) {
    // Não deites a app abaixo por causa do logout
    console.warn("safeSignOut fallback:", e?.message || e);
  }
}
