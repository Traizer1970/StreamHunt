import React from "react";
import { supabase } from "@/lib/supabase";
import WidgetOverlay from "@/pages/overlay/battle"; // importa o teu overlay

export default function WidgetByToken() {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [battleId, setBattleId] = React.useState(null);

  // lê o token a partir do hash: #/w/<token>
  function getTokenFromHash() {
    const h = String(window.location.hash || "").replace(/^#\//, "");
    const parts = h.split("?")[0].split("/");
    // ["w", "<token>", ...]
    return parts[1] || "";
  }

  const fetchState = React.useCallback(async () => {
    const token = getTokenFromHash();
    if (!token) { setError("Token em falta."); setLoading(false); return; }

    const { data, error } = await supabase.rpc("widget_state_by_token", { p_token: token });
    if (error) { setError(error.message); setLoading(false); return; }

    const id = data?.battle?.id || null;
    setBattleId((prev) => (prev === id ? prev : id));
    setLoading(false);
  }, []);

  React.useEffect(() => {
    fetchState();                          // carga inicial
    const id = setInterval(fetchState, 10000); // volta a verificar a cada 10s
    return () => clearInterval(id);
  }, [fetchState]);

  if (loading) return <div style={{color:"#e5e7eb",padding:12}}>A carregar…</div>;
  if (error) return <div style={{color:"#ef4444",padding:12}}>{error}</div>;
  if (!battleId) return <div style={{color:"#e5e7eb",padding:12}}>Sem battle ativa.</div>;

  // Mostra o mesmo overlay de sempre, mas passando o id via prop
  return <WidgetOverlay battleId={battleId} />;
}
