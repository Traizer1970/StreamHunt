// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Aviso útil se faltar configuração
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "[supabase] Faltam variáveis: VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY"
  );
}

const isBrowser = typeof window !== "undefined";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Mantém a sessão guardada
    persistSession: true,
    // Lê o token no fragmento do OAuth callback (#access_token)
    detectSessionInUrl: true,
    // Atualiza automaticamente os tokens
    autoRefreshToken: true,
    // Usa localStorage no browser para guardar a sessão
    storage: isBrowser ? window.localStorage : undefined,
  },
});

// Logout que funciona em produção (Netlify) e em dev
export async function safeSignOut() {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

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
      }).catch(() => {});
    }
  } catch (e) {
    // Não deites a app abaixo por causa do logout
    console.warn("safeSignOut fallback:", e?.message || e);
  }
}
