// src/widget-by-token.jsx
import React from "react";
import { supabase } from "@/lib/supabase";

export default function WidgetByToken() {
  const [err, setErr] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      const h = String(window.location.hash || "").replace(/^#\//, "");
      // form: #/w/<token>
      const token = h.split("?")[0].split("/")[1];
      if (!token) { setErr("Token em falta"); return; }

      const { data, error } = await supabase.rpc("widget_state_by_token", {
        p_token: token,
      });
      if (error) { setErr(error.message); return; }

      const battle = data?.battle;
      if (!battle) { setErr("Sem battle ativa para este token"); return; }

      // usa o overlay já existente
      window.location.hash = `#/overlay/battle/${battle.id}`;
    })();
  }, []);

  return (
    <div style={{color:"#e5e7eb",background:"transparent",padding:12}}>
      {err ? `⚠️ ${err}` : "A carregar widget..."}
    </div>
  );
}
