// src/pages/hunt-widget.jsx
import React from "react";
import { supabase } from "@/lib/supabase";
import { getHuntByNumberId } from "@/lib/hunts";
import { listHuntSlots } from "@/lib/slots";

/* ───────────────── helpers ───────────────── */
const LOCALE = "pt-PT";
const RUBIK =
  "'Rubik', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial";

const toNum = (v) => {
  if (v == null || v === "") return 0;
  if (typeof v === "string") v = v.replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const fmtPlain = (n, d = 2) =>
  Number.isFinite(Number(n))
    ? new Intl.NumberFormat(LOCALE, {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      }).format(n)
    : "—";

const hexToRgba = (hex, a = 1) => {
  try {
    let h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255,
      g = (n >> 8) & 255,
      b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  } catch {
    return `rgba(232,121,249,${a})`;
  }
};
const anyToRgba = (c, a = 1) =>
  /^(rgba?|hsla?)\(/i.test(String(c || "")) ? c : hexToRgba(c, a);

/* ───────────────── tiny router via location.hash ───────────────── */
function parseHash() {
  const raw = (window.location.hash || "#").slice(1); // remove '#'
  const [path, query] = raw.split("?");
  let parts = (path || "").split("/").filter(Boolean);

  // compat
  if (parts[0] === "hunt-widget") parts = parts.slice(1);
  if (parts[0] === "overlay") parts = parts.slice(1);

  const type = parts[0] || "hunt";          // "hunt" | "opening"
  const numberId = parts[1] || "active";    // "active" ou número
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

/* ───────────────── qs → opções (só se existirem no URL) ───────────────── */
function readOptsFromQS(qs) {
  const getNum = (k, min, max) => {
    if (!qs.has(k)) return undefined;
    const v = Number(qs.get(k));
    if (!Number.isFinite(v)) return undefined;
    if (min != null && v < min) return min;
    if (max != null && v > max) return max;
    return v;
  };
  const getStr = (k) => (qs.has(k) ? qs.get(k) : undefined);
  const getFlag = (k) => (qs.has(k) ? qs.get(k) === "1" : undefined);

  const out = {};
  // gerais
  out.layout = getStr("layout"); // "carousel" | "grid" | "opening"
  out.visible = getNum("visible", 1, 12);
  out.autoScroll = getFlag("scroll");
  out.speedSec = getNum("speed", 5, 180);
  out.cardH = getNum("cardH", 100, 400);
  out.showBox = qs.has("box") ? qs.get("box") !== "0" : undefined;
  out.nameStyle = getStr("name");     // bar | float | hidden
  out.betStyle = getStr("bet");       // inline | chip | none
  out.showIdx = qs.has("showIdx") ? qs.get("showIdx") !== "0" : undefined;
  out.showBet = qs.has("showBet") ? qs.get("showBet") !== "0" : undefined;
  out.showSuper = qs.has("showSuper") ? qs.get("showSuper") !== "0" : undefined;
  out.vInfo = getFlag("vinfo");
  out.infoPos = getStr("infoside");   // left | right
  out.superGlow = qs.has("sg") ? qs.get("sg") !== "0" : undefined;
  out.superGlowColor = qs.has("sgc") ? "#" + qs.get("sgc") : undefined;
  out.superGlowStrength = getNum("sgs", 0, 1);
  out.superTagColor = qs.has("stc") ? "#" + qs.get("stc") : undefined;
  out.superTextColor = qs.has("stx") ? "#" + qs.get("stx") : undefined;
  out.panelBgStart = qs.has("bg1") ? "#" + qs.get("bg1") : undefined;
  out.panelBgEnd = qs.has("bg2") ? "#" + qs.get("bg2") : undefined;
  out.pad = getNum("pad", 0, 64);
  out.baseW = getNum("bw", 260, 3840);
  out.baseH = getNum("bh", 160, 2160);
  out.align = getStr("align");

  // lista Opening (novos)
  out.showList = getFlag("list");
  out.listSide = getStr("lside");           // left | right
  out.listWidth = getNum("lwidth", 160, 420);
  out.listVisible = getNum("lvisible", 3, 14);
  out.listAutoScroll = getFlag("lscroll");
  out.listSpeedSec = getNum("lspeed", 4, 120);
  out.listBox = getFlag("lbox");
  out.listShowBestWorst = getFlag("lbest");

  // KPIs
  out.kpiPos = getStr("kpos");             // top | bottom | side | hidden
  out.kpiDir = getStr("kdir");             // row | column
  out.kpiAlign = getStr("kalign");         // left | center | right
  out.kpiSide = getStr("kside");           // left | right
  out.kpiGap = getNum("kgap", 0, 48);
  out.kpiSideSpace = getNum("kspace", 0, 64);
  out.kpiSize = getNum("ksize", 0.6, 1.8);
  out.kpiShape = getStr("kshape");         // box | pill | circle
  out.kpiRound = getNum("kround", 0, 3);
  if (qs.has("klabels")) out.kpiShowLabels = qs.get("klabels") !== "0";
  out.kpiFont = getNum("kfont", 0.6, 2.0);
  out.kpiAltIconMs = getNum("kicon", 0, 10000);
  out.kpiAltValueMs = getNum("kval", 0, 10000);
  out.kpiAnim = getStr("kanim");
  out.kpiColorPreset = getStr("kcp");
  if (qs.has("kbg")) out.kpiBg = "#" + qs.get("kbg");
  if (qs.has("kbr")) out.kpiBorder = "#" + qs.get("kbr");
  if (qs.has("ktx")) out.kpiText = "#" + qs.get("ktx");

  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
}

/* ───────────────── defaults + cores KPI ───────────────── */
const KPI_COLOR_PRESETS = {
  glass:   { bg: "rgba(255,255,255,.10)", border: "rgba(255,255,255,.15)", text: "#ffffff" },
  slate:   { bg: "rgba(17,24,39,.70)",    border: "rgba(255,255,255,.12)", text: "#e5e7eb" },
  emerald: { bg: "rgba(16,185,129,.16)",  border: "rgba(16,185,129,.40)",  text: "#d1fae5" },
  amber:   { bg: "rgba(245,158,11,.16)",  border: "rgba(245,158,11,.40)",  text: "#fde68a" },
  rose:    { bg: "rgba(244,63,94,.17)",   border: "rgba(244,63,94,.40)",   text: "#fecdd3" },
  violet:  { bg: "rgba(139,92,246,.17)",  border: "rgba(139,92,246,.40)",  text: "#ddd6fe" },
  azure:   { bg: "rgba(59,130,246,.17)",  border: "rgba(59,130,246,.40)",  text: "#dbeafe" },
  neon:    { bg: hexToRgba("#22d3ee",.16),border: hexToRgba("#22d3ee",.45),text: "#cffafe" },
};
function kpiColors(opts){
  const p = KPI_COLOR_PRESETS[String(opts.kpiColorPreset||"glass")] || KPI_COLOR_PRESETS.glass;
  return {
    bg:     opts.kpiBg     || p.bg,
    border: opts.kpiBorder || p.border,
    text:   opts.kpiText   || p.text
  };
}

const DEFAULTS = {
  layout: "carousel",
  visible: 3,
  autoScroll: true,
  speedSec: 30,
  cardH: 160,
  showBox: true,
  nameStyle: "bar",
  betStyle: "inline",
  showIdx: true,
  showBet: true,
  showSuper: true,
  vInfo: false,
  infoPos: "left",
  superGlow: true,
  superGlowColor: "#e879f9",
  superGlowStrength: 0.6,
  superTagColor: "#e879f9",
  superTextColor: "#120614",
  panelBgStart: "#0b1020",
  panelBgEnd: "#111827",
  pad: 16,
  baseW: 560,
  baseH: 280,
  align: "center",

  // Opening sidebar (novos)
  showList: true,
  listSide: "right",
  listWidth: 232,
  listVisible: 9,
  listAutoScroll: true,
  listSpeedSec: 18,
  listBox: true,
  listShowBestWorst: false,

  // KPIs
  kpiPos: "top",
  kpiDir: "row",
  kpiAlign: "center",
  kpiSide: "right",
  kpiGap: 8,
  kpiSideSpace: 18,
  kpiSize: 1.0,
  kpiShape: "box",
  kpiRound: 2,
  kpiShowLabels: true,
  kpiFont: 1.0,
  kpiAltIconMs: 1200,
  kpiAltValueMs: 1800,
  kpiAnim: "fade",
  kpiColorPreset: "glass",
  kpiBg: "",
  kpiBorder: "",
  kpiText: "",
};

/* ───────────────── “active” → numberId ───────────────── */
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

  // 2) Fallback local
  try {
    const ls = localStorage.getItem(`active-hunt:${owner}`);
    if (ls) return Number(ls);
  } catch {}

  return null;
}

/* ───────────────── Lê overlay_settings guardado ───────────────── */
async function fetchOverlayOpts({ owner, type, huntId }) {
  if (!owner) return {};
  const cols = ["opts", "settings", "config", "data", "json"];

  // 1) tenta row específica do hunt
  const r1 = await supabase
    .from("overlay_settings")
    .select("*")
    .eq("user_id", owner)
    .eq("type", type || "hunt")
    .eq("hunt_number_id", huntId)
    .maybeSingle();
  if (!r1.error && r1.data) {
    for (const c of cols) if (r1.data[c]) return r1.data[c] || {};
  }

  // 2) fallback “global” (hunt_number_id NULL)
  const r2 = await supabase
    .from("overlay_settings")
    .select("*")
    .eq("user_id", owner)
    .eq("type", type || "hunt")
    .is("hunt_number_id", null)
    .maybeSingle();
  if (!r2.error && r2.data) {
    for (const c of cols) if (r2.data[c]) return r2.data[c] || {};
  }

  return {};
}

/* ───────────────── Página ───────────────── */
export default function HuntWidgetPage() {
  const { type, numberId, qs } = useHashRoute();
  const owner = qs.get("owner") || "";

  const [hunt, setHunt] = React.useState(null);
  const [slots, setSlots] = React.useState([]);
  const [dbOpts, setDbOpts] = React.useState({});
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  const qsOpts = React.useMemo(() => readOptsFromQS(qs), [qs]);
  const mergedOpts = React.useMemo(
    () => ({ ...DEFAULTS, ...dbOpts, ...qsOpts, ...(type === "opening" ? { layout: "opening" } : {}) }),
    [dbOpts, qsOpts, type]
  );

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // 1) resolve id
        let id = numberId;
        if (id === "active") {
          id = await resolveActiveNumberId(owner);
          if (!id) throw new Error("Não foi possível determinar o hunt ativo.");
        }
        id = Number(id);
        if (!Number.isFinite(id) || id <= 0)
          throw new Error("Parâmetro numberId inválido.");

        // 2) hunt (para Start dos KPIs)
        const { hunt } = await getHuntByNumberId(id);
        if (!alive) return;
        setHunt(hunt || null);

        // 3) slots
        const { slots: s } = await listHuntSlots({ numberId: id });
        if (!alive) return;
        setSlots(Array.isArray(s) ? s : []);

        // 4) opções guardadas na BD (tipo conforme rota)
        const o = await fetchOverlayOpts({ owner, type: type || "hunt", huntId: id });
        if (!alive) return;
        setDbOpts(o || {});
      } catch (e) {
        if (alive) setErr(e?.message || "Falha a carregar o widget.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [type, numberId, owner]);

  if (loading) {
    return (
      <div style={{
        display: "grid", placeItems: "center", height: "100vh",
        color: "#e5e7eb", background: "#0b1020",
        fontFamily: RUBIK,
      }}>
        A carregar widget…
      </div>
    );
  }

  if (err) {
    return (
      <div style={{
        display: "grid", placeItems: "center", height: "100vh",
        color: "#fca5a5", background: "#0b1020",
        fontFamily: RUBIK,
        padding: 16, textAlign: "center",
      }}>
        {err}
      </div>
    );
  }

  return <HuntOverlayCanvas hunt={hunt} slots={slots} opts={mergedOpts} />;
}

/* ───────────────── Render do overlay ───────────────── */
function HuntOverlayCanvas({ hunt, slots, opts }) {
  const baseW = Number(opts.baseW || 560);
  const baseH = Number(opts.baseH || 280);
  const visible = Math.max(1, Number(opts.visible || 3));
  const speedSec = Math.max(5, Math.min(180, Number(opts.speedSec || 30)));
  const layout = String(opts.layout || "carousel");
  const showBox = opts.showBox !== false;

  const alignMap = { left: "flex-start", center: "center", right: "flex-end" };
  const justify = alignMap[String(opts.align || "center")] || "center";

  const innerW = baseW - (opts.pad || 0) * 2;
  const gap = layout === "grid" ? 8 : 12;
  const cardW =
    layout === "carousel" || layout === "opening"
      ? Math.max(140, Math.floor((innerW - (visible - 1) * gap - (opts.showList ? (opts.listWidth || 232) : 0)) / visible))
      : undefined;

  const bg1 = opts.panelBgStart || "#0b1020";
  const bg2 = opts.panelBgEnd || "#111827";

  // KPIs — valores
  const startFromHunt = Number(hunt?.start_cost);
  const start = Number.isFinite(startFromHunt)
    ? startFromHunt
    : slots.reduce((a, s) => a + toNum(s.bet_size), 0);
  const won = slots.reduce((a, s) => a + toNum(s.payout), 0);
  const beLeft = Math.max(0, start - won);

  const items = [
    { key: "start", label: "Start", value: fmtPlain(start, opts.kpiRound ?? 2) },
    { key: "be",    label: "B/E",   value: fmtPlain(beLeft, opts.kpiRound ?? 2) },
    { key: "bonus", label: "# Bonus", value: String(slots.length) },
  ];

  const kColors = kpiColors(opts);
  const kpiFont = Math.max(0.6, Math.min(2, Number(opts.kpiFont ?? 1)));
  const kpiSize = Math.max(0.7, Math.min(1.6, Number(opts.kpiSize ?? 1)));
  const kpiShape = String(opts.kpiShape || "box"); // box | pill | circle
  const pillH   = Math.round(28 * kpiSize);
  const boxH    = Math.round(32 * kpiSize);
  const circleD = Math.round(36 * kpiSize);
  const kpiH    = kpiShape === "circle" ? circleD : (kpiShape === "box" ? boxH : pillH);

  function KpiBadge({ label, value }) {
    if (kpiShape === "circle") {
      const font = Math.max(10, Math.round(circleD * 0.36 * kpiFont));
      return (
        <div
          style={{
            width: circleD, height: circleD, borderRadius: 999,
            display: "grid", placeItems: "center",
            border: `1px solid ${kColors.border}`, background: kColors.bg, color: kColors.text,
            fontFamily: RUBIK
          }}
          title={label}
        >
          <b style={{ fontSize: font, lineHeight: 1, fontWeight: 700 }}>{value}</b>
        </div>
      );
    }
    return (
      <div
        style={{
          height: kpiH,
          borderRadius: kpiShape === "pill" ? 999 : 10,
          border: `1px solid ${kColors.border}`,
          background: kColors.bg,
          color: kColors.text,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "0 10px",
          fontFamily: RUBIK,
        }}
      >
        {opts.kpiShowLabels !== false && (
          <span style={{ opacity: .8, fontSize: 12, lineHeight: 1 }}>{label}:</span>
        )}
        <b style={{ fontSize: Math.round(12 * kpiFont), lineHeight: 1, fontWeight: 700 }}>{value}</b>
      </div>
    );
  }

  function KPIsInline() {
    const j =
      opts.kpiAlign === "left" ? "flex-start" :
      opts.kpiAlign === "right" ? "flex-end" : "center";
    const dir = opts.kpiDir === "column" ? "column" : "row";
    return (
      <div style={{ padding: "8px 12px", fontFamily: RUBIK }}>
        <div style={{ display: "flex", flexDirection: dir, gap: opts.kpiGap ?? 8, justifyContent: j }}>
          {items.map((it) => <KpiBadge key={it.key} label={it.label} value={it.value} />)}
        </div>
      </div>
    );
  }
  function KPIsSide() {
    const kpiGap = Number(opts.kpiGap ?? 8);
    const kpiSideSpace = Number(opts.kpiSideSpace ?? 18);
    return (
      <div
        style={{
          position: "absolute", top: "50%", transform: "translateY(-50%)",
          left:  opts.kpiSide === "left"  ? kpiSideSpace : undefined,
          right: opts.kpiSide === "right" ? kpiSideSpace : undefined,
          display: "flex", flexDirection: "column", gap: kpiGap, zIndex: 5,
        }}
      >
        {items.map((it) => <KpiBadge key={it.key} label={it.label} value={it.value} />)}
      </div>
    );
  }

  // Layout base com possível lista lateral (Opening)
  const showList = (layout === "opening") && (opts.showList !== false);
  const listOnLeft = String(opts.listSide || "right") === "left";
  const listW = Math.max(160, Math.min(420, Number(opts.listWidth || 232)));
  const gridCols = showList
    ? (listOnLeft ? `${listW}px 1fr` : `1fr ${listW}px`)
    : "1fr";

  return (
    <div
      style={{
        width: baseW,
        height: baseH,
        padding: opts.pad || 0,
        margin: "0 auto",
        background: showBox
          ? `linear-gradient(135deg, ${bg1} 0%, ${bg2} 100%)`
          : "transparent",
        border: showBox ? `1px solid rgba(255,255,255,.12)` : "none",
        borderRadius: 12,
        overflow: "hidden",
        fontFamily: RUBIK,
        color: "#e5e7eb",
        position: "relative",
        display: "grid",
        gridTemplateColumns: gridCols,
        gap: 10
      }}
    >
      <style>{`
        @keyframes marqueeX {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marqueeY {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
      `}</style>

      {showList && listOnLeft && (
        <OpeningList
          slots={slots}
          opts={opts}
          height={baseH - (opts.pad || 0) * 2}
        />
      )}

      <div style={{ position: "relative" }}>
        {opts.kpiPos === "top" && <KPIsInline />}
        {opts.kpiPos === "side" && <KPIsSide />}

        {layout === "grid" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(8,minmax(0,1fr))",
              gap,
              height: "100%",
            }}
          >
            {slots.slice(0, 16).map((s, i) => (
              <Card
                key={s.id}
                s={s}
                i={i}
                width="100%"
                cardH={opts.cardH || 160}
                opts={opts}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: justify,
              height: "100%",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                gap,
                width: "max-content",
                animation:
                  opts.autoScroll && slots.length > visible
                    ? `marqueeX ${speedSec}s linear infinite`
                    : undefined,
              }}
            >
              {[...slots, ...slots].map((s, i) => (
                <Card
                  key={`${s.id}-${i}`}
                  s={s}
                  i={i % slots.length}
                  width={cardW}
                  cardH={opts.cardH || 160}
                  opts={opts}
                />
              ))}
            </div>
          </div>
        )}

        {opts.kpiPos === "bottom" && <KPIsInline />}
      </div>

      {showList && !listOnLeft && (
        <OpeningList
          slots={slots}
          opts={opts}
          height={baseH - (opts.pad || 0) * 2}
        />
      )}
    </div>
  );
}

/* ───────────────── Lista lateral (Opening) ───────────────── */
function OpeningList({ slots, opts, height }) {
  const rowH = 56;                 // altura de cada linha (fixa → tudo alinhado)
  const thumb = 44;                // thumbnail quadrado
  const visible = Math.max(3, Math.min(14, Number(opts.listVisible || 9)));
  const boxBg = opts.listBox !== false ? "rgba(0,0,0,.55)" : "transparent";
  const boxBr = opts.listBox !== false ? "1px solid rgba(255,255,255,.12)" : "1px solid transparent";
  const listH = Math.min(height, visible * rowH + 12); // padding interno incluído
  const anim = (opts.listAutoScroll !== false) && slots.length > visible
    ? `marqueeY ${Math.max(4, Number(opts.listSpeedSec || 18))}s linear infinite`
    : undefined;

  const renderRows = (repeatKey = "") =>
    slots.map((s, i) => (
      <ListRow
        key={`${repeatKey}${s.id}-${i}`}
        s={s}
        idx={i + 1}
        rowH={rowH}
        thumb={thumb}
      />
    ));

  return (
    <div
      style={{
        height: listH,
        borderRadius: 12,
        background: boxBg,
        border: boxBr,
        padding: 6,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 6,
          animation: anim,
        }}
      >
        {renderRows("a-")}
        {anim && renderRows("b-")}
      </div>
    </div>
  );
}

function ListRow({ s, idx, rowH, thumb }) {
  // destaque do número e do nome
  return (
    <div
      title={s?.name}
      style={{
        height: rowH,
        display: "grid",
        gridTemplateColumns: "auto auto 1fr",
        alignItems: "center",
        gap: 10,
        padding: "0 6px",
        borderRadius: 10,
      }}
    >
      {/* # */}
      <div
        style={{
          minWidth: 28,
          height: 28,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          fontWeight: 800,
          fontSize: 12,
          letterSpacing: .2,
          background: "linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.08))",
          border: "1px solid rgba(255,255,255,.14)",
          boxShadow: "0 8px 18px rgba(0,0,0,.35)",
        }}
      >
        #{idx}
      </div>

      {/* thumb com tamanho fixo */}
      <div
        style={{
          width: thumb,
          height: thumb,
          borderRadius: 10,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,.18)",
          boxShadow: "0 10px 20px rgba(0,0,0,.35)",
        }}
      >
        {s?.thumbnail ? (
          <img
            src={s.thumbnail}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", background: "rgba(255,255,255,.08)" }} />
        )}
      </div>

      {/* nome (forte) */}
      <div
        style={{
          minWidth: 0,
          display: "flex",
          alignItems: "center",
          gap: 8,
          whiteSpace: "nowrap",
        }}
      >
        <span
          style={{
            fontWeight: 800,
            fontSize: 14,
            textShadow: "0 2px 6px rgba(0,0,0,.55)",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {s?.name || "—"}
        </span>
      </div>
    </div>
  );
}

/* ───────────────── Card principal ───────────────── */
function Card({ s, i, width, cardH, opts }) {
  const isSuper = !!(
    s?.is_super ?? s?.super ?? s?._raw?.is_super ?? s?._raw?.super
  );
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
      title={s?.name}
      style={{
        position: "relative",
        width,
        height: cardH,
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${isSuper ? borderCol : "rgba(255,255,255,.10)"}`,
        boxShadow: isSuper ? shadowSoft : "0 12px 28px rgba(0,0,0,.35)",
      }}
    >
      {s?.thumbnail ? (
        <img
          src={s.thumbnail}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(255,255,255,.08)",
          }}
        />
      )}

      {isSuper && opts.superGlow !== false && (
        <>
          <div
            style={{
              position: "absolute",
              inset: -1,
              borderRadius: 12,
              pointerEvents: "none",
              boxShadow: `0 0 ${22 + 40 * glowAlpha}px ${anyToRgba(glowColor, 0.5 * glowAlpha)}`,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background: `radial-gradient(60% 50% at 50% 40%, ${anyToRgba(glowColor, 0.28 * glowAlpha)} 0%, transparent 60%)`,
            }}
          />
        </>
      )}

      {/* gradientes topo/fundo */}
      <div
        style={{
          position: "absolute",
          inset: "0 0 auto 0",
          height: 80,
          background: "linear-gradient(to bottom, rgba(0,0,0,.65), transparent)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "auto 0 0 0",
          height: 96,
          background: "linear-gradient(to top, rgba(0,0,0,.65), transparent)",
        }}
      />

      {/* badges # / bet */}
      <div
        style={{
          position: "absolute",
          zIndex: 5,
          top: 6,
          [infoRight ? "right" : "left"]: 6,
          display: "flex",
          flexDirection: badgesVertical ? "column" : "row",
          alignItems: badgesVertical
            ? (infoRight ? "flex-end" : "flex-start")
            : "center",
          gap: 6,
          textAlign: infoRight ? "right" : "left",
        }}
      >
        {opts.showIdx && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 6px",
              borderRadius: 6,
              background: "rgba(0,0,0,.65)",
            }}
          >
            #{i + 1}
          </div>
        )}
        {(opts.betStyle === "chip" || !!opts.vInfo) && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: 6,
              background: "rgba(255,255,255,.85)",
              color: "#111",
            }}
          >
            {fmtPlain(toNum(s.bet_size), 2)}
          </div>
        )}
      </div>

      {/* selo SUPER */}
      {opts.showSuper && isSuper && (
        <div
          style={{
            position: "absolute",
            zIndex: 5,
            top: 6,
            [infoRight ? "left" : "right"]: 6,
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: 0.4,
            background: anyToRgba(opts.superTagColor || "#e879f9", 0.95),
            color: opts.superTextColor || "#120614",
          }}
        >
          SUPER
        </div>
      )}

      {/* nome (bar/float) */}
      {showName && captionIsBar && (
        <div style={{ position: "absolute", left: 8, right: 8, bottom: 8 }}>
          <div
            title={s?.name || ""}
            style={{
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,.18)",
              background: "rgba(0,0,0,.45)",
              boxShadow: "0 10px 30px rgba(0,0,0,.45)",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: 14
              }}
            >
              {s?.name || "—"}
            </div>
            {opts.betStyle === "inline" && (
              <div
                style={{
                  marginTop: 2,
                  fontSize: 11,
                  opacity: 0.85,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: "rgba(255,255,255,.7)",
                  }}
                />
                {s?.bet_size != null ? fmtPlain(toNum(s.bet_size), 2) : "—"}
              </div>
            )}
          </div>
        </div>
      )}

      {showName && captionIsFloat && (
        <div
          style={{
            position: "absolute",
            left: 8,
            right: 8,
            bottom: 8,
            pointerEvents: "none",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 14, textShadow: "0 2px 6px rgba(0,0,0,.8)" }}>
            {s?.name || "—"}
          </div>
          {opts.betStyle === "inline" && (
            <div
              style={{ fontSize: 11, opacity: 0.9, textShadow: "0 2px 6px rgba(0,0,0,.8)" }}
            >
              {s?.bet_size != null ? fmtPlain(toNum(s.bet_size), 2) : "—"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
