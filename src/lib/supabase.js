import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true }
});

// Logout à prova de 403
export async function safeSignOut() {
  // lê a sessão atual
  const { data: { session } } = await supabase.auth.getSession();

  // limpa imediatamente no cliente
  await supabase.auth.signOut({ scope: "local" });

  // revoga no servidor com os headers exigidos
  if (session?.access_token) {
    await fetch(`${url}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${session.access_token}`,
      },
    }).catch(() => {});
  }
}
