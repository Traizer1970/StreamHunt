// src/pages/opening-designer.jsx
import React from "react";
import { supabase } from "@/lib/supabase";

/* ───────────────── helpers ───────────────── */
const RUBIK = "'Rubik', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial";

function parseHash() {
  const raw = (window.location.hash || "#").slice(1);
  const [path, query] = raw.split("?");
  let parts = (path || "").split("/").filter(Boolean);

  // suportar "#/designer/opening/..." ou "#/opening/designer/..." ou variações
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

/* ───────────────── defaults ───────────────── */
const DEFAULTS = {
  // apenas opções relevantes ao Opening
  visible: 9,
  listSide: "right",         // left | right
  showBox: true,
  showBestWorst: false,
  bestWorstMetric: "payout", // payout | mult | bet
};

/* ───────────────── storage helpers ───────────────── */
async function loadOpeningOpts({ owner, huntNumberId }) {
  if (!owner) return {};
  const r = await supabase
    .from("overlay_settings")
    .select("*")
    .eq("user_id", owner)
    .eq("type", "opening")
    .eq("hunt_number_id", huntNumberId || null)
    .maybeSingle();

  if (!r.error && r.data) {
    // tentar nos campos usuais
    for (const c of ["opts", "settings", "config", "data", "json"]) {
      if (r.data[c]) return r.data[c] || {};
    }
  }
  return {};
}
async function saveOpeningOpts({ owner, huntNumberId, opts }) {
  if (!owner) return;
  // upsert simples; se tiveres onConflict diferente, ajusta a coluna
  await supabase
    .from("overlay_settings")
    .upsert({
      user_id: owner,
      type: "opening",
      hunt_number_id: huntNumberId || null,
      opts,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,type,hunt_number_id" });
}

/* ───────────────── UI atoms ───────────────── */
function Section({ title, children, actions }) {
  return (
    <div style={{
      background: "rgba(17,24,39,.6)",
      border: "1px solid rgba(255,255,255,.08)",
      borderRadius: 12,
      padding: 12,
      fontFamily: RUBIK,
      color: "#e5e7eb"
    }}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <b style={{opacity:.9}}>{title}</b>
        {actions}
      </div>
      {children}
    </div>
  );
}
function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${active ? "rgba(255,255,255,.28)" : "rgba(255,255,255,.14)"}`,
        background: active ? "rgba(255,255,255,.10)" : "transparent",
        color: "#e5e7eb",
        fontFamily: RUBIK,
        fontSize: 12,
        cursor: "pointer"
      }}
    >
      {children}
    </button>
  );
}
function Toggle({ checked, onChange, label }) {
  return (
    <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}}>
      <input type="checkbox" checked={checked} onChange={(e)=>onChange(e.target.checked)} />
      <span style={{fontSize:13,opacity:.9}}>{label}</span>
    </label>
  );
}

/* ───────────────── PAGE ───────────────── */
export default function OpeningDesignerPage(){
  const { numberId, qs } = useHashRoute();
  const owner = qs.get("owner") || "";

  const [opts, setOpts] = React.useState(DEFAULTS);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const huntNumberId = Number(numberId) || null;
        const db = await loadOpeningOpts({ owner, huntNumberId });
        if (!alive) return;
        setOpts({ ...DEFAULTS, ...db });
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [numberId, owner]);

  const update = (patch) => setOpts((o) => ({ ...o, ...patch }));

  const reset = () => setOpts(DEFAULTS);

  const save = async () => {
    const huntNumberId = Number(numberId) || null;
    await saveOpeningOpts({ owner, huntNumberId, opts });
  };

  if (loading) {
    return (
      <div style={{
        display:"grid",placeItems:"center",height:"100vh",
        fontFamily:RUBIK,color:"#e5e7eb",background:"#0b1020"
      }}>
        A carregar Designer (Opening)…
      </div>
    );
  }

  // ——— APENAS ESTA SECÇÃO ———
  return (
    <div style={{
      minHeight:"100vh",
      background:"#0b1020",
      padding:16,
      fontFamily:RUBIK,
      color:"#e5e7eb",
      display:"grid",
      gridTemplateColumns:"minmax(280px,420px)",
      justifyContent:"center"
    }}>
      <Section
        title="Layout (Opening)"
        actions={(
          <div style={{display:"flex",gap:8}}>
            <Pill onClick={reset}>Reset</Pill>
            <Pill onClick={save} active>Guardar</Pill>
          </div>
        )}
      >
        {/* Cards visíveis */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,opacity:.8,marginBottom:8}}>Cards visíveis</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[3,5,7,9,11].map(n => (
              <Pill key={n} active={Number(opts.visible)===n} onClick={()=>update({visible:n})}>
                {n}
              </Pill>
            ))}
          </div>
        </div>

        {/* Lista lateral */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,opacity:.8,marginBottom:8}}>Lista lateral</div>
          <div style={{display:"flex",gap:8}}>
            <Pill active={opts.listSide==="left"} onClick={()=>update({listSide:"left"})}>Esquerda</Pill>
            <Pill active={opts.listSide==="right"} onClick={()=>update({listSide:"right"})}>Direita</Pill>
          </div>
        </div>

        {/* Caixa de fundo */}
        <div style={{marginBottom:14}}>
          <Toggle
            checked={opts.showBox!==false}
            onChange={(v)=>update({showBox: !!v})}
            label="Caixa de fundo"
          />
        </div>

        {/* Best/Worst */}
        <div style={{display:"grid",gap:10}}>
          <Toggle
            checked={!!opts.showBestWorst}
            onChange={(v)=>update({showBestWorst: !!v})}
            label="Mostrar Best/Worst"
          />
          <div>
            <div style={{fontSize:12,opacity:.8,marginBottom:8}}>Métrica para Best/Worst</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[
                ["payout","Payout €"],
                ["mult","Multiplier"],
                ["bet","Bet €"],
              ].map(([k, lbl]) => (
                <Pill key={k} active={opts.bestWorstMetric===k} onClick={()=>update({bestWorstMetric:k})}>
                  {lbl}
                </Pill>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
