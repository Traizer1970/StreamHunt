// src/widget-overlay.jsx
import React from "react";
import { supabase } from "@/lib/supabase";

/* ───────── helpers ───────── */
const LOCALE = "pt-PT";
const fmtMoney = (n) =>
  Number.isFinite(Number(n))
    ? new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(n))
    : "—";

const shallowEq = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (a[k] !== b[k]) return false;
  return true;
};

function parseHash() {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const clean = hash.replace(/^#\/?/, "");
  const [seg0, seg1, seg2] = clean.split("?")[0].split("/");
  const qs = new URLSearchParams(clean.split("?")[1] || "");

  const size = (name, def) => {
    const v = (qs.get(name) || "").trim();
    if (!v) return def;
    if (/^\d+$/.test(v)) return `${v}px`; // "1080" -> "1080px"
    return v; // "100%", "90vh", "1920px"…
  };

  return {
    token: seg0 === "overlay" && seg1 === "battle" ? (seg2 || "").trim() : "",
    battleId: (qs.get("id") || "").trim(),
    w: size("w", "100vw"),
    h: size("h", "100vh"),
    pad: Number(qs.get("pad") || 24), // padding dentro do painel
    align: (qs.get("align") || "center").toLowerCase(), // center|top|bottom
    enableAnim: (qs.get("anim") || "0") === "1",
  };
}

/* ───────── tema/layout/opções ───────── */
const DEFAULT_THEME = {
  bgStart: "#0b1020",
  bgEnd: "#111827",
  panelBorder: "rgba(255,255,255,0.12)",
  panelBorderWidth: 1,
  text: "#e5e7eb",
  subtext: "#9ca3af",
  accent: "#7dd3fc",
  chipBg: "rgba(255,255,255,0.08)",
  chipBorder: "rgba(255,255,255,0.18)",
  chipBorderWidth: 1,
  chipRadius: 12,
  badgeBg: "rgba(255,255,255,0.08)",
  badgeBorder: "rgba(255,255,255,0.18)",
  badgeBorderWidth: 1,
  totalBg: "rgba(255,255,255,0.10)",
  totalBorder: "rgba(255,255,255,0.18)",
  totalBorderWidth: 1,
  pos: "#22c55e",
  neg: "#ef4444",
  vsBg: "rgba(99,102,241,0.35)",
  radius: 18,
  pillRadius: 16,
  fontFamily:
    "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji'",
  fontScale: 100,
  fontWeight: 400,
  strongWeight: 500,
  showThumbs: true,
  shine: true,
  pulse: true,
};
const DEFAULT_LAYOUT = {
  mode: "default",
  positions: {
    badges: { x: 16, y: 12 },
    playerA: { x: 40, y: 92 },
    playerB: { x: 560, y: 92 },
    chipsA: { x: 40, y: 180 },
    chipsB: { x: 560, y: 180 },
    total: { x: 360, y: 330 },
  },
};
const DEFAULT_OPTS = {
  bonusLabelMode: "label+value",
  bonusLabelText: "Bonus Buy",
  bonusDock: "left",
  totalJustify: "center",
  totalLabelMode: "label+value",
  totalLabelText: "Total paid",
};

/* Escala 2D: adapta à largura **e** à altura do container */
function useContainerScale2D(ref, baseW = 960, baseH = 420, min = 0.6, max = 2) {
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      const sx = r.width / baseW;
      const sy = r.height / baseH;
      const s = Math.max(min, Math.min(max, Math.min(sx, sy)));
      setScale(s);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref, baseW, baseH, min, max]);
  return scale;
}

function cn(...c) {
  return c.filter(Boolean).join(" ");
}

/* ───────── UI do widget ───────── */
function WidgetPanel({
  theme,
  layout,
  opts,
  bestOf,
  buyCost,
  sideA,
  sideB,
  playerA,
  playerB,
  aPays,
  bPays,
  pad = 24,
  vAlign = "center",
  enableAnim = false,
}) {
  const aTotal = aPays.reduce((s, r) => s + Number(r?.amount || 0), 0);
  const bTotal = bPays.reduce((s, r) => s + Number(r?.amount || 0), 0);

  const Chip = ({ amount, ok, i }) => (
    <span
      key={i}
      className="inline-flex items-center gap-1.5 px-3 py-1 mr-2 mb-2"
      style={{
        borderRadius: theme.chipRadius,
        background: ok ? `${theme.pos}1F` : `${theme.neg}1F`,
        border: `${theme.chipBorderWidth}px solid ${ok ? theme.pos : theme.neg}`,
        color: ok ? theme.pos : theme.neg,
        animation: enableAnim ? `pop .16s ease-out both` : "none",
        animationDelay: `${i * 45}ms`,
        fontSize: `calc(12px * ${theme.fontScale / 100})`,
        fontFamily: theme.fontFamily,
        fontWeight: theme.strongWeight,
        boxShadow:
          "0 0 0 1px rgba(0,0,0,0.25) inset, 0 6px 18px rgba(0,0,0,.36)",
      }}
      title={ok ? "Covers buy" : "Below buy"}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{
          background: ok ? theme.pos : theme.neg,
          boxShadow: `0 0 0 2px ${ok ? theme.pos : theme.neg}26`,
        }}
      />
      {fmtMoney(Number(amount || 0))}
    </span>
  );

  const BadgeBest = (
    <div
      className="px-3 py-1.5"
      style={{
        background: theme.badgeBg,
        border: `${theme.badgeBorderWidth}px solid ${theme.badgeBorder}`,
        borderRadius: theme.pillRadius,
        color: theme.text,
        fontWeight: theme.fontWeight,
      }}
    >
      <span>Best of</span>
      <span style={{ marginLeft: 6, fontWeight: theme.strongWeight }}>
        {bestOf}
      </span>
    </div>
  );

  const badgeBonusValue = fmtMoney(buyCost);
  const BadgeBonus =
    opts?.bonusLabelMode === "value" ? (
      <div
        className="px-3 py-1.5"
        style={{
          background: theme.badgeBg,
          border: `${theme.badgeBorderWidth}px solid ${theme.badgeBorder}`,
          borderRadius: theme.pillRadius,
          color: theme.accent,
          fontWeight: theme.strongWeight,
        }}
      >
        {badgeBonusValue}
      </div>
    ) : (
      <div
        className="px-3 py-1.5"
        style={{
          background: theme.badgeBg,
          border: `${theme.badgeBorderWidth}px solid ${theme.badgeBorder}`,
          borderRadius: theme.pillRadius,
          color: theme.text,
          fontWeight: theme.fontWeight,
        }}
      >
        <span>{opts?.bonusLabelText || "Bonus Buy"}</span>
        <span
          style={{
            marginLeft: 8,
            color: theme.accent,
            fontWeight: theme.strongWeight,
          }}
        >
          {badgeBonusValue}
        </span>
      </div>
    );

  const justify =
    vAlign === "top" ? "justify-start" : vAlign === "bottom" ? "justify-end" : "justify-center";

  return (
    <>
      <style>{`
        @keyframes pop { 0% { transform: scale(.96); opacity: 0;} 100% { transform: scale(1); opacity: 1;} }
      `}</style>

      <div
        className="relative overflow-hidden w-full h-full"
        style={{
          padding: pad,
          background: `linear-gradient(135deg, ${theme.bgStart}, ${theme.bgEnd})`,
          border: `${theme.panelBorderWidth}px solid ${theme.panelBorder}`,
          borderRadius: theme.radius,
          color: theme.text,
          fontFamily: theme.fontFamily,
          fontSize: `${theme.fontScale}%`,
        }}
      >
        {/* CONTENT WRAPPER – centra verticalmente o bloco todo */}
        <div className={cn("relative z-10 h-full flex flex-col", justify)}>
          <div className="space-y-5">
            {/* badges */}
            <div className={opts?.bonusDock === "right" ? "flex items-center justify-between gap-2" : "flex items-center gap-2"}>
              <div className="flex items-center gap-2">{BadgeBest}</div>
              {opts?.bonusDock === "right" && <div>{BadgeBonus}</div>}
              {opts?.bonusDock !== "right" && <>{BadgeBest && BadgeBonus}</>}
            </div>

            {/* players */}
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-5">
              <div className="flex items-center justify-end gap-3 min-w-0">
                <div className="min-w-0 text-right">
                  <div
                    className="truncate"
                    style={{
                      fontSize: "22px",
                      color: theme.text,
                      fontWeight: theme.strongWeight,
                    }}
                  >
                    {playerA || "—"}
                  </div>
                  <div className="text-[12px] truncate" style={{ color: theme.subtext }}>
                    {sideA?.name || "—"}
                  </div>
                </div>
                {theme.showThumbs && (
                  <div
                    className="h-14 w-14 overflow-hidden ring-1 bg-white/5 shrink-0"
                    style={{ borderColor: theme.panelBorder, borderRadius: theme.radius }}
                  >
                    {sideA?.thumbnail ? (
                      <img src={sideA.thumbnail} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <div
                  className="px-3 py-1 text-xs"
                  style={{
                    background: theme.vsBg,
                    border: `${theme.panelBorderWidth}px solid ${theme.panelBorder}`,
                    borderRadius: 10,
                    fontWeight: theme.strongWeight,
                  }}
                >
                  VS
                </div>
              </div>

              <div className="flex items-center gap-3 min-w-0">
                {theme.showThumbs && (
                  <div
                    className="h-14 w-14 overflow-hidden ring-1 bg-white/5 shrink-0"
                    style={{ borderColor: theme.panelBorder, borderRadius: theme.radius }}
                  >
                    {sideB?.thumbnail ? (
                      <img src={sideB.thumbnail} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                  </div>
                )}
                <div className="min-w-0 text-left">
                  <div
                    className="truncate"
                    style={{
                      fontSize: "22px",
                      color: theme.text,
                      fontWeight: theme.strongWeight,
                    }}
                  >
                    {playerB || "—"}
                  </div>
                  <div className="text-[12px] truncate" style={{ color: theme.subtext }}>
                    {sideB?.name || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* chips + subtotais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="flex flex-wrap">
                  {aPays.map((p, i) => (
                    <Chip
                      key={`a-${i}`}
                      amount={p.amount}
                      ok={Number(p.amount || 0) >= Number(buyCost || 0)}
                      i={i}
                    />
                  ))}
                </div>
                <div
                  className="inline-flex mt-3 items-center gap-2 px-3 py-1.5 text-[12px]"
                  style={{
                    background: theme.chipBg,
                    border: `${theme.chipBorderWidth}px solid ${theme.chipBorder}`,
                    borderRadius: theme.radius,
                    color: theme.subtext,
                  }}
                >
                  <span>Subtotal</span>
                  <span style={{ color: theme.text, fontWeight: theme.strongWeight }}>
                    {fmtMoney(aTotal)}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex flex-wrap">
                  {bPays.map((p, i) => (
                    <Chip
                      key={`b-${i}`}
                      amount={p.amount}
                      ok={Number(p.amount || 0) >= Number(buyCost || 0)}
                      i={i}
                    />
                  ))}
                </div>
                <div
                  className="inline-flex mt-3 items-center gap-2 px-3 py-1.5 text-[12px]"
                  style={{
                    background: theme.chipBg,
                    border: `${theme.chipBorderWidth}px solid ${theme.chipBorder}`,
                    borderRadius: theme.radius,
                    color: theme.subtext,
                  }}
                >
                  <span>Subtotal</span>
                  <span style={{ color: theme.text, fontWeight: theme.strongWeight }}>
                    {fmtMoney(bTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* total */}
            <div
              className={cn(
                "flex",
                opts?.totalJustify === "left"
                  ? "justify-start"
                  : opts?.totalJustify === "right"
                  ? "justify-end"
                  : "justify-center"
              )}
            >
              <div
                className="px-4 py-2"
                style={{
                  background: theme.totalBg,
                  border: `${theme.totalBorderWidth}px solid ${theme.totalBorder}`,
                  borderRadius: theme.pillRadius,
                  color: theme.accent,
                  fontWeight: theme.strongWeight,
                  boxShadow: "0 10px 30px rgba(0,0,0,.35)",
                }}
              >
                {opts?.totalLabelMode === "value"
                  ? fmtMoney(aTotal + bTotal)
                  : `Total paid: ${fmtMoney(aTotal + bTotal)}`}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ───────── página ───────── */
export default function WidgetOverlay() {
  const [{ token, battleId, w, h, pad, align, enableAnim }, setLoc] =
    React.useState(parseHash());

  React.useEffect(() => {
    document.documentElement.style.margin = "0";
    document.body.style.margin = "0";
  }, []);

  const stageRef = React.useRef(null);
  // baseW/baseH são o "tamanho natural" do widget
  const scale = useContainerScale2D(stageRef, 960, 420, 0.6, 2);

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  const [bestOf, setBestOf] = React.useState(1);
  const [buyCost, setBuyCost] = React.useState(0);
  const [sideA, setSideA] = React.useState(null);
  const [sideB, setSideB] = React.useState(null);
  const [playerA, setPlayerA] = React.useState("");
  const [playerB, setPlayerB] = React.useState("");
  const [aPays, setAPays] = React.useState([]);
  const [bPays, setBPays] = React.useState([]);

  const [theme, setTheme] = React.useState(DEFAULT_THEME);
  const [layout, setLayout] = React.useState(DEFAULT_LAYOUT);
  const [opts, setOpts] = React.useState(DEFAULT_OPTS);

  const effTheme = React.useMemo(() => {
    const t = { ...theme, fontScale: Math.round(theme.fontScale * scale) };
    if (!enableAnim) {
      t.pulse = false;
      t.shine = false;
    }
    return t;
  }, [theme, scale, enableAnim]);

  React.useEffect(() => {
    const onHash = () => setLoc(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // realtime + polling com RPC
  const channelRef = React.useRef(null);
  const pollRef = React.useRef(null);
  const debounceRef = React.useRef(null);
  const schedule = (fn) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fn, 120);
  };

  async function loadFromSnapshot(tok, bIdMaybe) {
    const withTimeout = (p, ms = 10000) =>
      Promise.race([
        p,
        new Promise((_, rej) =>
          setTimeout(() => rej(new Error("Timeout a carregar overlay.")), ms)
        ),
      ]);

    const { data: snap, error } = await withTimeout(
      supabase.rpc("overlay_snapshot", {
        p_token: tok || "",
        p_battle_id: bIdMaybe ? Number(bIdMaybe) : null,
      })
    );
    if (error) throw error;
    if (!snap) throw new Error("Snapshot vazio.");

    const b = snap.battle || {};
    setBestOf((v) => (v !== Number(b.best_of || 1) ? Number(b.best_of || 1) : v));
    setBuyCost((v) => (v !== Number(b.buy_cost || 0) ? Number(b.buy_cost || 0) : v));

    const ws = snap.settings || {};
    if (ws.theme && !shallowEq(ws.theme, theme)) setTheme({ ...DEFAULT_THEME, ...ws.theme });
    if (ws.layout && !shallowEq(ws.layout, layout)) setLayout({ ...DEFAULT_LAYOUT, ...ws.layout });
    if (ws.options && !shallowEq(ws.options, opts)) setOpts({ ...DEFAULT_OPTS, ...ws.options });

    const es = Array.isArray(snap.entries) ? snap.entries : [];
    const bySeed = new Map();
    for (const e of es) if (e?.seed) bySeed.set(String(e.seed).toUpperCase(), e);
    const A = bySeed.get("A") || es[0] || null;
    const B = bySeed.get("B") || es[1] || null;

    const aBase = A ? { id: A.slot_id ?? null, name: A.slot_name || "", thumbnail: A.thumbnail || null } : null;
    const bBase = B ? { id: B.slot_id ?? null, name: B.slot_name || "", thumbnail: B.thumbnail || null } : null;

    setSideA((v) => (JSON.stringify(v) !== JSON.stringify(aBase) ? aBase : v));
    setSideB((v) => (JSON.stringify(v) !== JSON.stringify(bBase) ? bBase : v));
    setPlayerA((v) => (v !== (A?.player_name || "") ? (A?.player_name || "") : v));
    setPlayerB((v) => (v !== (B?.player_name || "") ? (B?.player_name || "") : v));

    const pays = Array.isArray(snap.pays) ? snap.pays : [];
    const as = pays.filter((p) => String(p.side || "").toUpperCase() === "L").map((p) => ({ amount: Number(p.amount) || 0 }));
    const bs = pays.filter((p) => String(p.side || "").toUpperCase() === "R").map((p) => ({ amount: Number(p.amount) || 0 }));
    setAPays((v) => (JSON.stringify(v) !== JSON.stringify(as) ? as : v));
    setBPays((v) => (JSON.stringify(v) !== JSON.stringify(bs) ? bs : v));

    return b.id;
  }

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        const bId = await loadFromSnapshot(token, battleId);

        if (channelRef.current) supabase.removeChannel(channelRef.current);
        const ch = supabase
          .channel(`overlay-${bId}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "battle_payments", filter: `battle_id=eq.${bId}` },
            () => schedule(() => loadFromSnapshot(token, bId))
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "battle_entries", filter: `battle_id=eq.${bId}` },
            () => schedule(() => loadFromSnapshot(token, bId))
          )
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "battle_widget_settings", filter: `battle_id=eq.${bId}` },
            () => schedule(() => loadFromSnapshot(token, bId))
          )
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "battles", filter: `id=eq.${bId}` },
            () => schedule(() => loadFromSnapshot(token, bId))
          )
          .subscribe();
        channelRef.current = ch;

        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => loadFromSnapshot(token, bId), 8000);
      } catch (e) {
        setErr(e?.message || "Falha a carregar overlay.");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, battleId]);

  return (
    <div
      ref={stageRef}
      className="overflow-hidden"
      style={{ width: w || "100vw", height: h || "100vh", margin: 0, padding: 0 }}
    >
      <div className="w-full h-full grid place-items-center">
        {loading ? (
          <div className="px-4 py-2 rounded-lg text-sm opacity-80 bg-black/40 text-white">
            Loading overlay…
          </div>
        ) : err ? (
          <div className="px-4 py-2 rounded-lg text-sm bg-red-500/15 text-red-200 border border-red-500/30">
            {err}
          </div>
        ) : (
          <WidgetPanel
            theme={effTheme}
            layout={layout}
            opts={opts}
            bestOf={bestOf}
            buyCost={buyCost}
            sideA={sideA}
            sideB={sideB}
            playerA={playerA}
            playerB={playerB}
            aPays={aPays}
            bPays={bPays}
            pad={pad}
            vAlign={align}
            enableAnim={enableAnim}
          />
        )}
      </div>
    </div>
  );
}
