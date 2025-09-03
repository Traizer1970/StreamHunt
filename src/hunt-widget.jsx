// src/pages/hunt-widget.jsx
import React from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { getHuntByNumberId } from "@/lib/hunts";
import { listHuntSlots } from "@/lib/slots";

/* ─ helpers ─ */
const LOCALE = "pt-PT";
const numCls = "tabular-nums whitespace-nowrap";

const toNum = (v) => {
  if (v == null || v === "") return 0;
  if (typeof v === "string") v = v.replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const fmtPlain = (n, d = 2) =>
  Number.isFinite(Number(n))
    ? new Intl.NumberFormat(LOCALE, { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)
    : "—";

const hexToRgba = (hex, a = 1) => {
  try {
    let h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  } catch { return `rgba(232,121,249,${a})`; }
};
const anyToRgba = (c, a = 1) => (/^(rgba?|hsla?)\(/i.test(String(c||"")) ? c : hexToRgba(c, a));

/* ler query string mesmo em HashRouter */
function useQS() {
  const { search } = useLocation();
  return React.useMemo(() => new URLSearchParams(search), [search]);
}

/* traduz a QS para opções de layout */
function readOptsFromQS(qs) {
  const getN = (k, f, min, max) => {
    const v = Number(qs.get(k));
    if (!Number.isFinite(v)) return f;
    if (min != null && v < min) return min;
    if (max != null && v > max) return max;
    return v;
  };
  return {
    layout: qs.get("layout") || "carousel",
    visible: getN("visible", 3, 1, 12),
    autoScroll: qs.get("scroll") === "1",
    speedSec: getN("speed", 30, 5, 180),
    cardH: getN("cardH", 160, 100, 400),
    showBox: qs.get("box") !== "0",
    nameStyle: qs.get("name") || "bar",        // bar | float | hidden
    betStyle: qs.get("bet") || "inline",       // inline | chip | none
    showIdx: qs.get("showIdx") !== "0",
    showBet: qs.get("showBet") !== "0",
    showSuper: qs.get("showSuper") !== "0",
    vInfo: qs.get("vinfo") === "1",
    infoPos: qs.get("infoside") || "left",
    superGlow: qs.get("sg") !== "0",
    superGlowColor: "#" + (qs.get("sgc") || "e879f9"),
    superGlowStrength: Number(qs.get("sgs") ?? 0.6),
    superTagColor: "#" + (qs.get("stc") || "e879f9"),
    superTextColor: "#" + (qs.get("stx") || "120614"),
    panelBgStart: "#" + (qs.get("bg1") || "0b1020"),
    panelBgEnd:   "#" + (qs.get("bg2") || "111827"),
    pad: getN("pad", 16, 0, 64),
    baseW: getN("bw", 560, 260, 3840),
    baseH: getN("bh", 280, 160, 2160),
    align: qs.get("align") || "center",
  };
}

/* resolve o “active” para um numberId via DB/LS */
async function resolveActiveNumberId(owner) {
  if (!owner) return null;

  // 1) BD (overlay_settings.type = 'active-hunt')
  try {
    const { data, error } = await supabase
      .from("overlay_settings")
      .select("*")
      .eq("user_id", owner)
      .eq("type", "active-hunt")
      .is("hunt_number_id", null)
      .maybeSingle();
    if (!error && data) {
      const cols = ["opts", "settings", "config", "data", "json"];
      for (const c of cols) {
        const latest = data?.[c]?.latest;
        if (latest) return Number(latest);
      }
    }
  } catch {}

  // 2) Fallback: localStorage
  try {
    const ls = localStorage.getItem(`active-hunt:${owner}`);
    if (ls) return Number(ls);
  } catch {}

  return null;
}

/* ─ UI principal ─ */
export default function HuntWidget() {
  const { numberId } = useParams(); // pode ser "active" ou um número
  const qs = useQS();
  const owner = qs.get("owner") || "";

  const [resolvedId, setResolvedId] = React.useState(null);
  const [hunt, setHunt] = React.useState(null);
  const [slots, setSlots] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  const opts = React.useMemo(() => readOptsFromQS(qs), [qs]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        let id = numberId;
        if (numberId === "active") {
          id = await resolveActiveNumberId(owner);
          if (!id) throw new Error("Não foi possível determinar o hunt ativo para este owner.");
        }
        id = Number(id);
        if (!Number.isFinite(id) || id <= 0) throw new Error("Parâmetro numberId inválido.");

        if (!alive) return;
        setResolvedId(id);

        const { hunt: h } = await getHuntByNumberId(id);
        if (!alive) return;
        setHunt(h || null);

        const { slots: s } = await listHuntSlots({ numberId: id });
        if (!alive) return;
        setSlots(Array.isArray(s) ? s : []);
      } catch (e) {
        if (alive) setErr(e?.message || "Falha a carregar o widget.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [numberId, owner]);

  if (loading) {
    return (
      <div style={{display:"grid",placeItems:"center",height:"100vh",color:"#e5e7eb",background:"#0b1020"}}>
        <div style={{opacity:.85}}>A carregar widget…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div style={{display:"grid",placeItems:"center",height:"100vh",color:"#fca5a5",background:"#0b1020"}}>
        <div style={{maxWidth:680,textAlign:"center",padding:"16px"}}>{err}</div>
      </div>
    );
  }

  return <HuntOverlayCanvas slots={slots} opts={opts} />;
}

/* ─ Render do overlay (compacto) ─ */
function HuntOverlayCanvas({ slots, opts }) {
  const baseW = Number(opts.baseW || 560);
  const baseH = Number(opts.baseH || 280);
  const visible = Math.max(1, Number(opts.visible || 3));
  const speedSec = Math.max(5, Math.min(180, Number(opts.speedSec || 30)));
  const layout = String(opts.layout || "carousel");
  const showBox = opts.showBox !== false;

  const innerW = baseW - (opts.pad || 0) * 2;
  const gap = layout === "grid" ? 8 : 12;
  const cardW = layout === "carousel"
    ? Math.max(140, Math.floor((innerW - (visible - 1) * gap) / visible))
    : undefined;

  const bg1 = opts.panelBgStart || "#0b1020";
  const bg2 = opts.panelBgEnd   || "#111827";

  return (
    <div
      style={{
        width: baseW,
        height: baseH,
        padding: opts.pad || 0,
        margin: "0 auto",
        background: showBox ? `linear-gradient(135deg, ${bg1} 0%, ${bg2} 100%)` : "transparent",
        border: showBox ? `1px solid rgba(255,255,255,.12)` : "none",
        borderRadius: 12,
        overflow: "hidden",
        fontFamily: `'Rubik', ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial`,
        color: "#e5e7eb",
      }}
    >
      <style>{`
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {layout === "grid" ? (
        <div style={{display:"grid", gridTemplateColumns:"repeat(8,minmax(0,1fr))", gap}}>
          {slots.slice(0, 16).map((s, i) => (
            <Card key={s.id} s={s} i={i} width="100%" cardH={opts.cardH || 160} opts={opts} />
          ))}
        </div>
      ) : (
        <div style={{display:"flex", alignItems:"center", height:"100%", overflow:"hidden"}}>
          <div style={{
            display:"flex",
            gap,
            width:"max-content",
            animation: opts.autoScroll && slots.length > visible ? `marquee ${speedSec}s linear infinite` : undefined,
          }}>
            {[...slots, ...slots].map((s, i) => (
              <Card key={`${s.id}-${i}`} s={s} i={i % slots.length} width={cardW} cardH={opts.cardH || 160} opts={opts} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ s, i, width, cardH, opts }) {
  const isSuper = !!(s?.is_super ?? s?.super ?? s?._raw?.is_super ?? s?._raw?.super);
  const glowColor = opts.superGlowColor || "#e879f9";
  const glowAlpha = Math.max(0, Math.min(1, Number(opts.superGlowStrength ?? 0.6)));
  const borderCol = hexToRgba(glowColor, 0.45 + glowAlpha * 0.35);
  const shadowSoft = `0 0 ${18 + 30 * glowAlpha}px ${anyToRgba(glowColor, 0.35 * glowAlpha)}, 0 12px 28px rgba(0,0,0,.35)`;
  const captionIsBar = opts.nameStyle === "bar";
  const captionIsFloat = opts.nameStyle === "float";
  const showName = opts.nameStyle !== "hidden";
  const badgesVertical = !!opts.vInfo;
  const infoRight = String(opts.infoPos || "left") === "right";

  return (
    <div
      className="overlay-card"
      title={s?.name}
      style={{
        position:"relative",
        width,
        height: cardH,
        borderRadius: 12,
        overflow:"hidden",
        border: `1px solid ${isSuper ? borderCol : "rgba(255,255,255,.10)"}`,
        boxShadow: isSuper ? shadowSoft : "0 12px 28px rgba(0,0,0,.35)",
      }}
    >
      {s?.thumbnail ? (
        <img src={s.thumbnail} alt="" style={{position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center"}} />
      ) : (
        <div style={{position:"absolute", inset:0, background:"rgba(255,255,255,.08)"}} />
      )}

      {isSuper && opts.superGlow !== false && (
        <>
          <div style={{position:"absolute", inset:-1, borderRadius:12, pointerEvents:"none", boxShadow:`0 0 ${22 + 40 * glowAlpha}px ${anyToRgba(glowColor, 0.5 * glowAlpha)}`}} />
          <div style={{position:"absolute", inset:0, pointerEvents:"none", background:`radial-gradient(60% 50% at 50% 40%, ${anyToRgba(glowColor, 0.28 * glowAlpha)} 0%, transparent 60%)`}} />
        </>
      )}

      {/* gradientes topo/fundo */}
      <div style={{position:"absolute", inset:"0 0 auto 0", height:80, background:"linear-gradient(to bottom, rgba(0,0,0,.65), transparent)"}} />
      <div style={{position:"absolute", inset:"auto 0 0 0", height:96, background:"linear-gradient(to top, rgba(0,0,0,.65), transparent)"}} />

      {/* badges # / bet */}
      <div
        style={{
          position:"absolute",
          zIndex:5,
          top:6,
          [infoRight ? "right" : "left"]:6,
          display:"flex",
          flexDirection: badgesVertical ? "column" : "row",
          alignItems: badgesVertical ? (infoRight ? "flex-end" : "flex-start") : "center",
          gap:6,
          textAlign: infoRight ? "right" : "left",
        }}
      >
        {opts.showIdx && (
          <div style={{fontSize:11, fontWeight:700, padding:"2px 6px", borderRadius:6, background:"rgba(0,0,0,.65)"}}>
            #{i + 1}
          </div>
        )}
        {(opts.betStyle === "chip" || !!opts.vInfo) && (
          <div style={{fontSize:11, fontWeight:600, padding:"2px 6px", borderRadius:6, background:"rgba(255,255,255,.85)", color:"#111"}}>
            {fmtPlain(toNum(s.bet_size), 2)}
          </div>
        )}
      </div>

      {/* selo SUPER */}
      {opts.showSuper && isSuper && (
        <div
          style={{
            position:"absolute",
            zIndex:5,
            top:6,
            [infoRight ? "left" : "right"]:6,
            padding:"2px 8px",
            borderRadius:999,
            fontSize:10,
            fontWeight:700,
            letterSpacing:.4,
            background: anyToRgba(opts.superTagColor || "#e879f9", 0.95),
            color: opts.superTextColor || "#120614",
          }}
        >
          SUPER
        </div>
      )}

      {/* nome (bar/float) */}
      {showName && captionIsBar && (
        <div style={{position:"absolute", left:8, right:8, bottom:8}}>
          <div
            title={s?.name || ""}
            style={{
              padding:"8px 10px",
              borderRadius:10,
              border:"1px solid rgba(255,255,255,.18)",
              background:"rgba(0,0,0,.45)",
              boxShadow:"0 10px 30px rgba(0,0,0,.45)",
            }}
          >
            <div style={{fontWeight:600, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
              {s?.name || "—"}
            </div>
            {opts.betStyle === "inline" && (
              <div style={{marginTop:2, fontSize:11, opacity:.85, display:"flex", alignItems:"center", gap:6}}>
                <span style={{display:"inline-block", width:6, height:6, borderRadius:999, background:"rgba(255,255,255,.7)"}} />
                {s?.bet_size != null ? fmtPlain(toNum(s.bet_size), 2) : "—"}
              </div>
            )}
          </div>
        </div>
      )}

      {showName && captionIsFloat && (
        <div style={{position:"absolute", left:8, right:8, bottom:8, pointerEvents:"none"}}>
          <div style={{fontWeight:600, textShadow:"0 2px 6px rgba(0,0,0,.8)"}}>
            {s?.name || "—"}
          </div>
          {opts.betStyle === "inline" && (
            <div style={{fontSize:11, opacity:.9, textShadow:"0 2px 6px rgba(0,0,0,.8)"}}>
              {s?.bet_size != null ? fmtPlain(toNum(s.bet_size), 2) : "—"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
