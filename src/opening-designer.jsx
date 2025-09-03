// src/pages/opening-designer.jsx
import React from "react";
import { supabase } from "@/lib/supabase";

/* ───────────── helpers ───────────── */
const RUBIK = "'Rubik', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial";

function parseHash() {
  const raw = (window.location.hash || "#").slice(1);
  const [path, query] = raw.split("?");
  let parts = (path || "").split("/").filter(Boolean);

  // compat
  if (parts[0] === "opening-designer") parts = parts.slice(1);
  if (parts[0] === "designer") parts = parts.slice(1);

  const type = parts[0] || "opening";
  const numberId = parts[1] || "active";
  const qs = new URLSearchParams(query || "");
  return { type, numberId, qs };
}
function useHashRoute() {
  const [route, setRoute] = React.useState(parseHash());
  React.useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  return route;
}

async function resolveActiveNumberId(owner) {
  if (!owner) return null;
  try {
    const { data, error } = await supabase
      .from("overlay_settings")
      .select("*")
      .eq("user_id", owner)
      .eq("type", "active-hunt")
      .is("hunt_number_id", null)
      .maybeSingle();
    if (!error && data) {
      for (const c of ["opts", "settings", "config", "data", "json"]) {
        const latest = data?.[c]?.latest;
        if (latest) return Number(latest);
      }
    }
  } catch {}
  try {
    const ls = localStorage.getItem(`active-hunt:${owner}`);
    if (ls) return Number(ls);
  } catch {}
  return null;
}

async function fetchOverlayOpts({ owner, huntId }) {
  if (!owner) return {};
  const cols = ["opts", "settings", "config", "data", "json"];

  const r1 = await supabase
    .from("overlay_settings")
    .select("*")
    .eq("user_id", owner)
    .eq("type", "opening")
    .eq("hunt_number_id", huntId)
    .maybeSingle();
  if (!r1.error && r1.data) {
    for (const c of cols) if (r1.data[c]) return r1.data[c] || {};
  }

  const r2 = await supabase
    .from("overlay_settings")
    .select("*")
    .eq("user_id", owner)
    .eq("type", "opening")
    .is("hunt_number_id", null)
    .maybeSingle();
  if (!r2.error && r2.data) {
    for (const c of cols) if (r2.data[c]) return r2.data[c] || {};
  }
  return {};
}

async function upsertOverlayOpts({ owner, huntId, opts }) {
  if (!owner) return;
  const row = {
    user_id: owner,
    type: "opening",
    hunt_number_id: huntId,
    opts,
    updated_at: new Date().toISOString(),
  };
  // requer índice único (user_id,type,hunt_number_id)
  await supabase
    .from("overlay_settings")
    .upsert(row, { onConflict: "user_id,type,hunt_number_id" });
}

/* ───────────── defaults (apenas Opening) ───────────── */
const DEFAULTS = {
  // já existentes
  visible: 3,
  side: "left",            // left | right
  showBox: false,
  showBestWorst: true,
  bestWorstMetric: "payout", // apenas etiqueta

  // NOVOS — lista à esquerda
  listAutoScroll: true,
  listSpeedSec: 24,        // 6–120
};

export default function OpeningDesignerPage() {
  const { numberId, qs } = useHashRoute();
  const owner = qs.get("owner") || "";

  const [huntId, setHuntId] = React.useState(null);
  const [opts, setOpts] = React.useState(DEFAULTS);
  const [loading, setLoading] = React.useState(true);

  // carregar id + opções
  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        let id = numberId;
        if (id === "active") id = await resolveActiveNumberId(owner);
        id = Number(id);
        if (!Number.isFinite(id) || id <= 0) throw new Error("ID inválido");
        if (!alive) return;
        setHuntId(id);

        const db = await fetchOverlayOpts({ owner, huntId: id });
        if (!alive) return;
        setOpts({ ...DEFAULTS, ...db });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [numberId, owner]);

  // persistência debounced
  const saveRef = React.useRef(null);
  const persist = React.useCallback((next) => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(() => {
      upsertOverlayOpts({ owner, huntId, opts: next }).catch(() => {});
    }, 350);
  }, [owner, huntId]);

  const update = React.useCallback((patch) => {
    setOpts((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      // opcional: refletir no hash para o preview ao vivo (se o teu preview lê do QS)
      try {
        const h = new URL(window.location.href);
        const p = h.hash.split("?")[0];
        const qs = new URLSearchParams(h.hash.split("?")[1] || "");
        // reflect new keys
        if ("listAutoScroll" in patch) qs.set("lscr", patch.listAutoScroll ? "1" : "0");
        if ("listSpeedSec" in patch) qs.set("lspeed", String(next.listSpeedSec));
        h.hash = `${p}?${qs.toString()}`;
        window.history.replaceState(null, "", h);
      } catch {}
      return next;
    });
  }, [persist]);

  if (loading) {
    return (
      <div style={{
        display: "grid", placeItems: "center", height: "100vh",
        color: "#e5e7eb", background: "#0b1020", fontFamily: RUBIK
      }}>
        A carregar Designer…
      </div>
    );
  }

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "420px 1fr",
      gap: 24,
      padding: 16,
      color: "#e5e7eb",
      background: "#0b1020",
      minHeight: "100vh",
      fontFamily: RUBIK
    }}>
      {/* Painel ÚNICO: Layout (Opening) */}
      <div style={{
        border: "1px solid rgba(255,255,255,.1)",
        borderRadius: 12,
        background: "rgba(17,24,39,.65)",
        padding: 16
      }}>
        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <b style={{opacity:.9}}>Layout (Opening)</b>
        </div>

        {/* Cards visíveis */}
        <div style={{marginTop:14}}>
          <div style={{fontSize:12, opacity:.8, marginBottom:8}}>Cards visíveis</div>
          <div style={{display:"flex", gap:8}}>
            {[3,5,7,9].map(n => (
              <button
                key={n}
                onClick={()=>update({visible:n})}
                style={{
                  padding:"8px 12px",
                  borderRadius:8,
                  border:"1px solid rgba(255,255,255,.12)",
                  background: opts.visible===n ? "rgba(59,130,246,.25)" : "transparent",
                  color:"#e5e7eb"
                }}
              >{n}</button>
            ))}
          </div>
        </div>

        {/* Lista lateral */}
        <div style={{marginTop:18}}>
          <div style={{fontSize:12, opacity:.8, marginBottom:8}}>Lista lateral</div>
          <div style={{display:"flex", gap:8}}>
            <button
              onClick={()=>update({side:"left"})}
              style={{
                padding:"8px 12px", borderRadius:8,
                border:"1px solid rgba(255,255,255,.12)",
                background: opts.side==="left" ? "rgba(59,130,246,.25)" : "transparent",
                color:"#e5e7eb"
              }}
            >Esquerda</button>
            <button
              onClick={()=>update({side:"right"})}
              style={{
                padding:"8px 12px", borderRadius:8,
                border:"1px solid rgba(255,255,255,.12)",
                background: opts.side==="right" ? "rgba(59,130,246,.25)" : "transparent",
                color:"#e5e7eb"
              }}
            >Direita</button>
          </div>
        </div>

        {/* Caixa de fundo */}
        <div style={{marginTop:18, display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <div style={{fontSize:12, opacity:.8}}>Caixa de fundo</div>
          <label style={{display:"inline-flex", alignItems:"center", gap:8, cursor:"pointer"}}>
            <input
              type="checkbox"
              checked={!!opts.showBox}
              onChange={(e)=>update({showBox:e.target.checked})}
            />
            <span>{opts.showBox ? "On" : "Off"}</span>
          </label>
        </div>

        {/* Best/Worst */}
        <div style={{marginTop:14, display:"flex", alignItems:"center", justifyContent:"space-between"}}>
          <div style={{fontSize:12, opacity:.8}}>Mostrar Best/Worst</div>
          <label style={{display:"inline-flex", alignItems:"center", gap:8, cursor:"pointer"}}>
            <input
              type="checkbox"
              checked={opts.showBestWorst !== false}
              onChange={(e)=>update({showBestWorst:e.target.checked})}
            />
            <span>{opts.showBestWorst !== false ? "On" : "Off"}</span>
          </label>
        </div>

        {/* ───── NOVO: Rolagem automática da lista ───── */}
        <div style={{
          marginTop:22,
          paddingTop:16,
          borderTop:"1px dashed rgba(255,255,255,.14)"
        }}>
          <div style={{fontSize:12, opacity:.8, marginBottom:8}}>Rolar lista (esquerda)</div>
          <label style={{display:"inline-flex", alignItems:"center", gap:8, cursor:"pointer"}}>
            <input
              type="checkbox"
              checked={opts.listAutoScroll !== false}
              onChange={(e)=>update({listAutoScroll:e.target.checked})}
            />
            <span>{opts.listAutoScroll !== false ? "Ativo" : "Inativo"}</span>
          </label>

          <div style={{marginTop:12, opacity: opts.listAutoScroll === false ? .45 : 1}}>
            <div style={{display:"flex", alignItems:"center", justifyContent:"space-between"}}>
              <div style={{fontSize:12, opacity:.8}}>Velocidade (segundos)</div>
              <div style={{fontSize:12, opacity:.8}}>
                {Number(opts.listSpeedSec||24)}s
              </div>
            </div>
            <input
              type="range"
              min={6}
              max={120}
              step={2}
              value={Number(opts.listSpeedSec||24)}
              onChange={(e)=>update({listSpeedSec:Number(e.target.value)})}
              disabled={opts.listAutoScroll === false}
              style={{width:"100%", marginTop:8}}
            />
          </div>
        </div>
      </div>

      {/* O preview fica do lado direito — a tua página de preview já lê de overlay_settings */}
      <div style={{
        borderRadius:12, overflow:"hidden",
        border:"1px solid rgba(255,255,255,.1)"
      }}>
        {/* normalmente aqui tens o teu preview; deixo um placeholder */}
        <div style={{
          height:"100%",
          minHeight:480,
          display:"grid", placeItems:"center",
          background:"radial-gradient(1200px 600px at 50% -20%, rgba(255,255,255,.05), transparent)",
        }}>
          <div style={{opacity:.7}}>Preview à direita (usa as tuas componentes atuais)</div>
        </div>
      </div>
    </div>
  );
}
