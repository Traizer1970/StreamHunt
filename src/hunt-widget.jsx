// /src/hunt-widget.jsx
import React from "react";
import { supabase } from "@/lib/supabase";
import { getHuntByNumberId } from "@/lib/hunts";
import { listHuntSlots } from "@/lib/slots";

/* ───────── helpers ───────── */
const RUBIK =
  `'Rubik', ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial`;

// leitura segura de números
const n = (v, def = 0) => {
  const num = Number(v);
  return Number.isFinite(num) ? num : def;
};
const any = (v, def = "") => (v == null || v === "" ? def : String(v));
const yes = (v) => v === "1" || v === "true" || v === "yes";

/** Resolve :numberId que pode ser "active" ou um número, usando owner=? */
async function resolveHuntNumberId(numberId, owner) {
  if (numberId !== "active") return numberId;

  // 1) BD: overlay_settings (type='active-hunt', hunt_number_id NULL)
  if (owner) {
    const cols = ["opts", "settings", "config", "data", "json"];
    const { data } = await supabase
      .from("overlay_settings")
      .select("*")
      .eq("user_id", owner)
      .eq("type", "active-hunt")
      .is("hunt_number_id", null)
      .maybeSingle();

    for (const c of cols) {
      const latest = data?.[c]?.latest;
      if (latest) return String(latest);
    }
    // 2) Fallback: mesmo browser
    try {
      const ls = localStorage.getItem(`active-hunt:${owner}`);
      if (ls) return String(ls);
    } catch {}
  }
  return null;
}

/** Lê params do hash (ex.: #/hunt-widget/hunt/123?foo=bar) */
function readHash() {
  const hash = window.location.hash.replace(/^#/, "");
  const [path, qs = ""] = hash.split("?");
  const parts = path.split("/").filter(Boolean);

  // Suportar:
  //  - #/hunt-widget/hunt/:id
  //  - #/hunt-widget/opening/:id
  //  - #/overlay/hunt/:id (compat)
  //  - #/overlay/opening/:id (compat)
  let type = "hunt";
  let numberId = null;

  if (parts[0] === "hunt-widget" && parts[1] && parts[2]) {
    type = parts[1];              // hunt | opening
    numberId = parts[2];          // id | active
  } else if (parts[0] === "overlay" && parts[1] && parts[2]) {
    type = parts[1];              // hunt | opening
    numberId = parts[2];          // id | active
  }

  const q = new URLSearchParams(qs);
  return { type, numberId, q };
}

/* ───────── componentes visuais ───────── */
function KPIs({ start, won, count, opts }) {
  const left = Math.max(0, start - won);

  // helper de formatação
  const fmt = (s) =>
    new Intl.NumberFormat("pt-PT", {
      minimumFractionDigits: s,
      maximumFractionDigits: s,
    });

  const bg  = qColor(opts.kbg, "rgba(255,255,255,.10)");
  const br  = qColor(opts.kbr, "rgba(255,255,255,.15)");
  const txt = qColor(opts.ktx, "#fff");

  const shape = any(opts.kshape, "box");
  const size = Math.max(0.7, Math.min(1.6, n(opts.ksize, 1)));
  const precision = Math.max(0, Math.min(2, n(opts.kround, 2))); // ← renomeado

  const H = shape === "circle"
    ? Math.round(36 * size)
    : shape === "pill"
    ? Math.round(28 * size)
    : Math.round(32 * size);

  const Box = ({ labelTxt, value, children }) => {
    if (shape === "circle") {
      return (
        <div
          title={labelTxt}
          className="rounded-full border grid place-items-center"
          style={{
            width: H,
            height: H,
            background: bg,
            borderColor: br,
            color: txt,
          }}
        >
          <span
            className="font-bold tabular-nums"
            style={{ fontSize: Math.max(10, Math.round(H * 0.36 * n(opts.kfont, 1))) }}
          >
            {value}
          </span>
        </div>
      );
    }
    return (
      <div
        className={shape === "pill" ? "rounded-full border px-3 h-8 flex items-center gap-2" : "rounded-lg border px-3 h-9 flex items-center gap-2"}
        style={{ background: bg, borderColor: br, color: txt }}
      >
        {opts.klabels !== "0" && <span className="text-xs opacity-80">{labelTxt}:</span>}
        <b className="tabular-nums" style={{ fontSize: `${n(opts.kfont, 1)}rem` }}>{value}</b>
        {children}
      </div>
    );
  };

  const items = [
    { k: "start",  label: "Start",   value: fmt(precision).format(start) },
    { k: "be",     label: "B/E",     value: fmt(precision).format(left)  },
    { k: "bonus",  label: "# Bonus", value: String(count) },
  ];

  const pos   = any(opts.kpos, "top");
  const dir   = any(opts.kdir, "row");
  const align =
    any(opts.kalign, "center") === "left"  ? "justify-start" :
    any(opts.kalign, "center") === "right" ? "justify-end"   : "justify-center";
  const gap = n(opts.kgap, 8);

  const content = (
    <div className={`flex ${dir === "column" ? "flex-col" : "items-center"} ${align}`} style={{ gap }}>
      {items.map(it => <Box key={it.k} labelTxt={it.label} value={it.value} />)}
    </div>
  );

  if (pos === "hidden") return null;
  if (pos === "side") {
    const side = any(opts.kside, "right");
    const kspace = n(opts.kspace, 18);
    return (
      <div className="absolute z-20" style={{
        top: "50%", transform: "translateY(-50%)",
        [side]: kspace, display: "flex", flexDirection: "column", gap
      }}>
        {items.map(it => <Box key={it.k} labelTxt={it.label} value={it.value} />)}
      </div>
    );
  }
  return <div className="px-3 py-2">{content}</div>;
}


function qColor(v, fallback) {
  if (!v) return fallback;
  const s = String(v).trim();
  return s.startsWith("#") ? s : s; // já aceitamos hex/rgba pass-through
}

/* ───────── widget HUNT (cards/carousel) ───────── */
function HuntWidgetView({ hunt, slots, qs }) {
  const start = Number(hunt?.start_cost) || slots.reduce((a, s) => a + (Number(s.bet_size) || 0), 0);
  const won   = slots.reduce((a, s) => a + (Number(s.payout) || 0), 0);

  const layout   = any(qs.get("layout"), "carousel");
  const visible  = Math.max(1, n(qs.get("visible"), 3));
  const auto     = yes(qs.get("scroll") || "0");
  const speedSec = Math.max(5, Math.min(180, n(qs.get("speed"), 30)));
  const cardH    = Math.max(120, n(qs.get("cardH"), 160));
  const showBox  = qs.get("box") !== "0";
  const name     = any(qs.get("name"), "bar");    // bar | float | hidden
  const betStyle = any(qs.get("bet"), "inline");  // inline | chip | none

  const showIdx    = qs.get("showIdx") !== "0";
  const showBet    = qs.get("showBet") !== "0";
  const showSuper  = qs.get("showSuper") !== "0";
  const vInfo      = yes(qs.get("vinfo") || "0");
  const infoPos    = any(qs.get("infoside"), "left");

  const baseW   = n(qs.get("bw"), 560);
  const baseH   = n(qs.get("bh"), 280);
  const pad     = n(qs.get("pad"), 16);
  const align   = any(qs.get("align"), "center");

  const bg1 = `#${any(qs.get("bg1"), "0b1020")}`.replace("##","#");
  const bg2 = `#${any(qs.get("bg2"), "111827")}`.replace("##","#");
  const border = qColor(qs.get("panelBorder") || "", "rgba(255,255,255,.12)");

  const innerW = baseW;
  const visibleW = layout === "carousel"
    ? Math.max(140, Math.floor((innerW - 6 - (visible - 1) * 12) / visible))
    : undefined;

  return (
    <div
      className="rounded-xl overflow-hidden relative"
      style={{
        width: baseW,
        height: baseH,
        margin: align === "left" ? "0 auto 0 0" : align === "right" ? "0 0 0 auto" : "0 auto",
        padding: pad,
        border: showBox ? `1px solid ${border}` : "none",
        background: showBox ? `linear-gradient(135deg, ${bg1} 0%, ${bg2} 100%)` : "transparent",
        fontFamily: RUBIK,
      }}
    >
      <style>{`
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      `}</style>

      <KPIs start={start} won={won} count={slots.length} opts={{
        kpos: qs.get("kpos"), kdir: qs.get("kdir"), kalign: qs.get("kalign"),
        kside: qs.get("kside"), kgap: qs.get("kgap"), kspace: qs.get("kspace"),
        ksize: qs.get("ksize"), kshape: qs.get("kshape"), kround: qs.get("kround"),
        klabels: qs.get("klabels"), kfont: qs.get("kfont"),
        kbg: `#${qs.get("kbg")||""}`, kbr: `#${qs.get("kbr")||""}`, ktx: `#${qs.get("ktx")||""}`
      }} />

      {layout === "grid" ? (
        <div className="h-full px-3 relative flex items-center">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8,minmax(0,1fr))", gap: 8 }} className="flex-1">
            {slots.slice(0, 16).map((s, i) => (
              <Card key={s.id} s={s} i={i} infoPos={infoPos} vInfo={vInfo} showSuper={showSuper} cardH={cardH} width="100%" showIdx={showIdx} betStyle={betStyle} showBet={showBet} nameStyle={name}/>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-full px-3 relative flex items-center">
          <div className="overflow-hidden flex-1">
            <div
              className="flex"
              style={{
                gap: 12,
                width: "max-content",
                animation: auto && slots.length > visible ? `marquee ${speedSec}s linear infinite` : undefined,
              }}
            >
              {[...slots, ...slots].map((s, i) => (
                <Card key={`${s.id}-${i}`} s={s} i={i % slots.length}
                      infoPos={infoPos} vInfo={vInfo} showSuper={showSuper}
                      cardH={cardH} width={visibleW} showIdx={showIdx}
                      betStyle={betStyle} showBet={showBet} nameStyle={name}/>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ s, i, width, cardH, showIdx, showBet, betStyle, showSuper, nameStyle, vInfo, infoPos }) {
  const isSuper = !!(s?.is_super ?? s?.super ?? s?._raw?.is_super ?? s?._raw?.super);
  const captionIsBar = nameStyle === "bar";
  const captionIsFloat = nameStyle === "float";
  const showName = nameStyle !== "hidden";

  return (
    <div className="relative rounded-xl overflow-hidden border"
         style={{ height: cardH, width, borderColor: isSuper ? "rgba(232,121,249,.55)" : "rgba(255,255,255,.10)", boxShadow: isSuper ? "0 12px 28px rgba(232,121,249,.35)" : "0 12px 28px rgba(0,0,0,.35)" }}
         title={s?.name}>
      {s?.thumbnail
        ? <img src={s.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
        : <div className="absolute inset-0 bg-white/10" />}

      <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

      {/* badges */}
      <div
        className={`absolute top-1.5 z-10 ${infoPos === "right" ? "right-1.5" : "left-1.5"} ${vInfo ? "flex flex-col items-start gap-1" : "flex items-center gap-1"}`}
        style={infoPos === "right" ? { alignItems: vInfo ? "flex-end" : "center", textAlign: "right" } : {}}
      >
        {showIdx && <div className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-black/70">#{i + 1}</div>}
        {(betStyle === "chip" || vInfo) && showBet && (
          <div className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-white/85 text-black/90 shadow">
            {s?.bet_size ?? "—"}
          </div>
        )}
      </div>

      {showSuper && isSuper && (
        <div className={`absolute top-1.5 z-10 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${infoPos === "right" ? "left-1.5" : "right-1.5"}`}
             style={{ background: "rgba(232,121,249,.95)", color: "#120614" }}>
          SUPER
        </div>
      )}

      {showName && captionIsBar && (
        <div className="absolute left-2 right-2 bottom-2">
          <div className="px-2.5 py-1.5 rounded-lg border text-white shadow-[0_10px_30px_rgba(0,0,0,.45)] truncate"
               style={{ background: "rgba(0,0,0,.45)", borderColor: "rgba(255,255,255,.18)", fontFamily: RUBIK }}>
            <div className="font-semibold leading-tight truncate">{s?.name || "—"}</div>
            {betStyle === "inline" && showBet && (
              <div className="mt-0.5 text-[11px] opacity-85 flex items-center gap-1">
                <span className="h-[6px] w-[6px] rounded-full bg-white/70" />
                {s?.bet_size ?? "—"}
              </div>
            )}
          </div>
        </div>
      )}

      {showName && captionIsFloat && (
        <div className="absolute left-2 bottom-2 right-2 pointer-events-none" style={{ fontFamily: RUBIK }}>
          <div className="font-semibold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,.8)] truncate">{s?.name || "—"}</div>
          {betStyle === "inline" && showBet && (
            <div className="text-[11px] text-white/85 drop-shadow-[0_2px_6px_rgba(0,0,0,.8)]">{s?.bet_size ?? "—"}</div>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────── widget OPENING ───────── */
function OpeningWidgetView({ hunt, slots, qs }) {
  const baseW = n(qs.get("bw"), 560);
  const baseH = n(qs.get("bh"), 320);
  const pad   = n(qs.get("pad"), 16);
  const align = any(qs.get("align"), "center");
  const showTitle = qs.get("title") !== "0";
  const showCurrent = qs.get("current") !== "0";
  const bg = "linear-gradient(135deg, rgba(15,16,33,1) 0%, rgba(24,16,40,1) 100%)";

  const current = slots[0] || null;

  return (
    <div
      className="rounded-xl border border-white/10 overflow-hidden relative"
      style={{
        width: baseW,
        height: baseH,
        margin: align === "left" ? "0 auto 0 0" : align === "right" ? "0 0 0 auto" : "0 auto",
        padding: pad,
        background: bg,
        fontFamily: RUBIK,
      }}
    >
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        {showTitle ? (
          <div className="px-3 py-1.5 rounded-full border border-white/15 bg-white/10 text-[12px]">
            {hunt?.title || "Hunt"} — Opening
          </div>
        ) : <div />}
        {showCurrent ? (
          <div className="px-3 py-1.5 rounded-full border border-white/15 bg-white/10 text-[12px]">
            {current ? current.name : "—"}
          </div>
        ) : <div />}
      </div>

      <div className="px-3" style={{ display: "grid", gridTemplateColumns: "repeat(8,minmax(0,1fr))", gap: 8 }}>
        {slots.slice(0, 24).map((s, i) => (
          <div key={s.id} className="relative rounded-lg overflow-hidden border border-white/10" title={s.name}>
            <div className="absolute left-1 top-1 z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/70">#{i + 1}</div>
            {s.thumbnail ? (
              <img src={s.thumbnail} alt="" className="h-14 w-full object-cover object-bottom" />
            ) : (<div className="h-14 w-full bg-white/10" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────── Página ───────── */
export default function HuntWidget() {
  const [{ type, numberId, q }, setRoute] = React.useState(() => readHash());
  const [hunt, setHunt] = React.useState(null);
  const [slots, setSlots] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  React.useEffect(() => {
    const onHash = () => setRoute(readHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // suporta alias active
        const owner = q.get("owner") || "";
        const resolved = await resolveHuntNumberId(numberId, owner);
        if (!resolved) {
          setErr("Nenhum hunt ativo encontrado.");
          setHunt(null); setSlots([]); return;
        }

        const idNum = Number(resolved);
        if (!Number.isFinite(idNum)) throw new Error("ID inválido.");

        const { hunt: h } = await getHuntByNumberId(idNum);
        if (!alive) return;
        setHunt(h || null);

        const { slots: s } = await listHuntSlots({ numberId: idNum });
        if (!alive) return;
        setSlots(Array.isArray(s) ? s : []);
      } catch (e) {
        if (alive) {
          setErr(e?.message || "Falha a carregar o widget.");
          setHunt(null); setSlots([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, numberId, window.location.hash]);

  React.useEffect(() => { document.title = "Hunt Widget"; }, []);

  /* tela cheia, sem UI extra */
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-3">
      {loading && <div className="opacity-70 text-sm">A carregar…</div>}
      {!loading && err && <div className="opacity-80 text-sm">{err}</div>}
      {!loading && !err && hunt && (
        type === "opening"
          ? <OpeningWidgetView hunt={hunt} slots={slots} qs={q} />
          : <HuntWidgetView    hunt={hunt} slots={slots} qs={q} />
      )}
    </div>
  );
}
