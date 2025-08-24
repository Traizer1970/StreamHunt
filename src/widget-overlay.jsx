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
    if (/^\d+$/.test(v)) return `${v}px`; // “1080” → “1080px”
    return v; // “100%”, “90vh”, …
  };

  return {
    token: seg0 === "overlay" && seg1 === "battle" ? (seg2 || "").trim() : "",
    battleId: qs.get("id") ? Number(qs.get("id")) : null,
    w: size("w", "100vw"),
    h: size("h", "100vh"),
    enableAnim: (qs.get("anim") || "0") === "1",
    interval: Math.max(900, Number(qs.get("interval") || 2500)),
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

/* Escala automática com ResizeObserver */
function useContainerScale(ref, base = 960, min = 0.75, max = 1.35) {
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      const w = Math.max(320, rect.width);
      const s = Math.max(min, Math.min(max, w / base));
      setScale(s);
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, [ref, base, min, max]);
  return scale;
}

/* ───────── Free-drag (se usares layout "free") ───────── */
function useDrag(containerRef, id, layout, setLayout) {
  const onMouseDown = (e) => {
    if (layout?.mode !== "free") return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const rect = containerRef.current?.getBoundingClientRect();
    const cur = layout.positions?.[id] || { x: 0, y: 0 };
    const onMove = (ev) => {
      if (!rect) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const nx = Math.max(0, Math.min((rect.width || 0) - 40, cur.x + dx));
      const ny = Math.max(0, Math.min((rect.height || 0) - 40, cur.y + dy));
      setLayout((l) => ({
        ...l,
        positions: { ...l.positions, [id]: { x: nx, y: ny } },
      }));
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };
  return onMouseDown;
}

/* ───────── UI do widget ───────── */
function WidgetPanel({
  theme,
  layout,
  setLayout,
  opts,
  bestOf,
  buyCost,
  sideA,
  sideB,
  playerA,
  playerB,
  aPays,
  bPays,
  animations = false,
  fillHeight = true,
}) {
  const aTotal = aPays.reduce((s, r) => s + Number(r?.amount || 0), 0);
  const bTotal = bPays.reduce((s, r) => s + Number(r?.amount || 0), 0);
  const containerRef = React.useRef(null);

  const Chip = ({ amount, ok, i }) => (
    <span
      key={i}
      className="inline-flex items-center gap-1.5 px-3 py-1 mr-2 mb-2 shadow-[0_0_0_1px_rgba(0,0,0,0.25)_inset,0_6px_18px_rgba(0,0,0,.36)]"
      style={{
        borderRadius: theme.chipRadius,
        background: ok ? `${theme.pos}1F` : `${theme.neg}1F`,
        border: `${theme.chipBorderWidth}px solid ${ok ? theme.pos : theme.neg}`,
        color: ok ? theme.pos : theme.neg,
        animation: animations ? `pop .16s ease-out both` : "none",
        animationDelay: `${i * 45}ms`,
        fontSize: `calc(12px * ${theme.fontScale / 100})`,
        fontFamily: theme.fontFamily,
        fontWeight: theme.strongWeight,
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

  const DragBox = ({ id, children }) => {
    if (layout?.mode !== "free") return children;
    const pos = layout?.positions?.[id] || { x: 0, y: 0 };
    const onMouseDown = useDrag(containerRef, id, layout, setLayout);
    return (
      <div
        onMouseDown={onMouseDown}
        style={{ position: "absolute", left: pos.x, top: pos.y, cursor: "grab" }}
      >
        {children}
      </div>
    );
  };

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
          style={{ marginLeft: 8, color: theme.accent, fontWeight: theme.strongWeight }}
        >
          {badgeBonusValue}
        </span>
      </div>
    );

  return (
    <>
      <style>{`
        @keyframes sweep { 0% { transform: translateX(-120%);} 100% { transform: translateX(120%);} }
        @keyframes pop { 0% { transform: scale(.96); opacity: 0;} 100% { transform: scale(1); opacity: 1;} }
      `}</style>

      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{
          width: "100%",
          height: fillHeight ? "100%" : "auto",
          padding: "clamp(12px,2vw,24px)",
          background: `linear-gradient(135deg, ${theme.bgStart}, ${theme.bgEnd})`,
          border: `${theme.panelBorderWidth}px solid ${theme.panelBorder}`,
          borderRadius: theme.radius,
          color: theme.text,
          fontFamily: theme.fontFamily,
          fontSize: `${theme.fontScale}%`,
        }}
      >
        {/* brilho desligado por defeito (ativa com &anim=1) */}
        {animations && theme.shine && (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{ animation: "sweep 4.8s linear infinite" }}
          />
        )}

        {/* default layout */}
        {layout?.mode !== "free" && (
          <>
            {/* badges */}
            {opts?.bonusDock === "right" ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">{BadgeBest}</div>
                <div>{BadgeBonus}</div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {BadgeBest}
                {BadgeBonus}
              </div>
            )}

            {/* players */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-5">
              <div className="flex items-center justify-end gap-3 min-w-0">
                <div className="min-w-0 text-right">
                  <div
                    className="truncate"
                    style={{ fontSize: "22px", color: theme.text, fontWeight: theme.strongWeight }}
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
                    style={{ fontSize: "22px", color: theme.text, fontWeight: theme.strongWeight }}
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
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
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
              className={
                opts?.totalJustify === "left"
                  ? "mt-6 flex justify-start"
                  : opts?.totalJustify === "right"
                  ? "mt-6 flex justify-end"
                  : "mt-6 flex justify-center"
              }
            >
              <div
                className="px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,.35)]"
                style={{
                  background: theme.totalBg,
                  border: `${theme.totalBorderWidth}px solid ${theme.totalBorder}`,
                  borderRadius: theme.pillRadius,
                  color: theme.accent,
                  fontWeight: theme.strongWeight,
                }}
              >
                {opts?.totalLabelMode === "value"
                  ? fmtMoney(aTotal + bTotal)
                  : `Total paid: ${fmtMoney(aTotal + bTotal)}`}
              </div>
            </div>
          </>
        )}

        {/* layout free – opcional */}
        {layout?.mode === "free" && (
          <div className="absolute inset-0 p-4">{/* … drag blocks se usar */}</div>
        )}
      </div>
    </>
  );
}

/* ───────── Página Overlay ───────── */
export default function WidgetOverlay() {
  const [{ token, battleId, w, h, enableAnim, interval }, setLoc] = React.useState(parseHash());

  const stageRef = React.useRef(null);
  const scale = useContainerScale(stageRef, 960, 0.75, 1.35);

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  // battle state
  const [bestOf, setBestOf] = React.useState(1);
  const [buyCost, setBuyCost] = React.useState(0);
  const [sideA, setSideA] = React.useState(null);
  const [sideB, setSideB] = React.useState(null);
  const [playerA, setPlayerA] = React.useState("");
  const [playerB, setPlayerB] = React.useState("");
  const [aPays, setAPays] = React.useState([]);
  const [bPays, setBPays] = React.useState([]);

  // theme/layout/options
  const [theme, setTheme] = React.useState(DEFAULT_THEME);
  const [layout, setLayout] = React.useState(DEFAULT_LAYOUT);
  const [opts, setOpts] = React.useState(DEFAULT_OPTS);

  // escala + animações
  const effTheme = React.useMemo(() => {
    const base = { ...theme, fontScale: Math.round(theme.fontScale * scale) };
    if (!enableAnim) { base.pulse = false; base.shine = false; }
    return base;
  }, [theme, scale, enableAnim]);

  // observar alterações do hash (OBS)
  React.useEffect(() => {
    const onHash = () => setLoc(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // debounce + polling
  const pollRef = React.useRef(null);
  const debounceRef = React.useRef(null);
  const schedule = (fn) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fn, 120);
  };

  // ******* FETCH por RPC (sem cookies) *******
  const fetchSnapshot = React.useCallback(async () => {
    const { data, error } = await supabase.rpc("overlay_snapshot", {
      p_token: token,
      p_battle_id: battleId,
    });
    if (error) throw error;

    // battle
    const b = data?.battle || {};
    const nb = Number(b.best_of || 1);
    const bc = Number(b.buy_cost || 0);
    setBestOf((v) => (v !== nb ? nb : v));
    setBuyCost((v) => (v !== bc ? bc : v));

    // settings (theme/layout/options) – se vierem do RPC
    const s = data?.settings || null;
    if (s?.theme && !shallowEq(s.theme, theme)) setTheme({ ...DEFAULT_THEME, ...s.theme });
    if (s?.layout && !shallowEq(s.layout, layout)) setLayout({ ...DEFAULT_LAYOUT, ...s.layout });
    if (s?.options && !shallowEq(s.options, opts)) setOpts({ ...DEFAULT_OPTS, ...s.options });

    // entries
    const entries = data?.entries || [];
    const bySeed = new Map();
    for (const e of entries) if (e.seed) bySeed.set(String(e.seed).toUpperCase(), e);
    const A = bySeed.get("A") || entries[0] || null;
    const B = bySeed.get("B") || entries[1] || null;

    const aSide = A ? { id: A.slot_id ?? null, name: A.slot_name || "", thumbnail: A.thumbnail || null } : null;
    const bSide = B ? { id: B.slot_id ?? null, name: B.slot_name || "", thumbnail: B.thumbnail || null } : null;

    setSideA((v) => (JSON.stringify(v) !== JSON.stringify(aSide) ? aSide : v));
    setSideB((v) => (JSON.stringify(v) !== JSON.stringify(bSide) ? bSide : v));
    setPlayerA((v) => (v !== (A?.player_name || "") ? (A?.player_name || "") : v));
    setPlayerB((v) => (v !== (B?.player_name || "") ? (B?.player_name || "") : v));

    // payments
    const pays = data?.pays || [];
    const as = pays.filter((p) => String(p.side || "").toUpperCase() === "L").map((p) => ({ amount: Number(p.amount) || 0 }));
    const bs = pays.filter((p) => String(p.side || "").toUpperCase() === "R").map((p) => ({ amount: Number(p.amount) || 0 }));
    setAPays((v) => (JSON.stringify(v) !== JSON.stringify(as) ? as : v));
    setBPays((v) => (JSON.stringify(v) !== JSON.stringify(bs) ? bs : v));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, battleId, theme, layout, opts]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        await fetchSnapshot();
        // polling
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => schedule(fetchSnapshot), interval);
      } catch (e) {
        if (mounted) setErr(e?.message || "Falha a carregar overlay.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      clearInterval(pollRef.current);
      clearTimeout(debounceRef.current);
    };
  }, [fetchSnapshot, interval]);

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
            setLayout={() => {}}
            opts={opts}
            bestOf={bestOf}
            buyCost={buyCost}
            sideA={sideA}
            sideB={sideB}
            playerA={playerA}
            playerB={playerB}
            aPays={aPays}
            bPays={bPays}
            animations={enableAnim}
            fillHeight
          />
        )}
      </div>
    </div>
  );
}
