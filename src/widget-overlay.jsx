import React from "react";
import { supabase } from "@/lib/supabase";

/* ───────── helpers ───────── */
const cn = (...c) => c.filter(Boolean).join(" ");
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

/* ---------- Defaults (iguais ao battle-view) ---------- */
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
  mode: "default", // "default" | "free"
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
  bonusLabelMode: "label+value", // "label+value" | "value"
  bonusLabelText: "Bonus Buy",
  bonusDock: "left",             // "left" | "right"
  totalJustify: "center",        // "left" | "center" | "right"
  totalLabelMode: "label+value", // "label+value" | "value"
  totalLabelText: "Total paid",
};

/* ---------- DB helpers ---------- */
async function dbLoadWidgetSettings(battleId) {
  const { data, error } = await supabase
    .from("battle_widget_settings")
    .select("theme, layout, options")
    .eq("battle_id", battleId)
    .maybeSingle();
  if (error) return { theme: null, layout: null, options: null };
  return {
    theme: data?.theme || null,
    layout: data?.layout || null,
    options: data?.options || null,
  };
}

async function enrichSlotInfo(slot) {
  if (!slot) return slot;
  if (slot.thumbnail && slot.provider) return slot;
  try {
    let q = supabase.from("slots_catalog").select('id, "NAME", "PROVIDER", "THUMBNAIL"').limit(1);
    if (slot.id) q = q.eq("id", slot.id);
    else if (slot.name) q = q.ilike("NAME", `%${slot.name}%`);
    const { data } = await q.maybeSingle();
    if (data)
      return {
        id: data.id,
        name: data["NAME"],
        provider: data["PROVIDER"],
        thumbnail: data["THUMBNAIL"],
      };
  } catch {}
  return slot;
}

/* ---------- Preview panel (cópia do battle-view) ---------- */
function WidgetPreviewPanel({
  theme,
  layout,
  setLayout,
  opts,
  bestOf,
  buyCost,
  totalPay,
  sideA,
  sideB,
  playerA,
  playerB,
  aPays,
  bPays,
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
        animation: theme.pulse ? `pop .16s ease-out both` : "none",
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
      <span style={{ marginLeft: 6, fontWeight: theme.strongWeight }}>{bestOf}</span>
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

  return (
    <>
      <style>{`
        @keyframes sweep { 0% { transform: translateX(-120%);} 100% { transform: translateX(120%);} }
        @keyframes pop { 0% { transform: scale(.96); opacity: 0;} 100% { transform: scale(1); opacity: 1;} }
        @keyframes glow { 0% { box-shadow: 0 0 0 rgba(0,0,0,0);} 100% { box-shadow: 0 15px 40px rgba(0,0,0,.45);} }
      `}</style>

      <div
        ref={containerRef}
        className="relative overflow-hidden p-5 sm:p-6"
        style={{
          background: `linear-gradient(135deg, ${theme.bgStart}, ${theme.bgEnd})`,
          border: `${theme.panelBorderWidth}px solid ${theme.panelBorder}`,
          borderRadius: theme.radius,
          color: theme.text,
          fontFamily: theme.fontFamily,
          fontSize: `${theme.fontScale}%`,
          animation: "glow .3s ease-out both",
          minWidth: 640,
        }}
      >
        {theme.shine && (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{ animation: "sweep 4.8s linear infinite" }}
          />
        )}

        {/* badges (dock) */}
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
          <div className="flex items-center justify-end gap-3">
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
              <div
                className="text-[12px] truncate"
                style={{ color: theme.subtext, fontWeight: theme.fontWeight }}
              >
                {sideA?.name || "—"}
              </div>
            </div>
            {theme.showThumbs && (
              <div
                className="h-14 w-14 overflow-hidden ring-1 bg-white/5"
                style={{ borderColor: theme.panelBorder, borderRadius: theme.radius }}
              >
                {sideA?.thumbnail ? (
                  <img
                    src={sideA.thumbnail}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <div
              className={cn("px-3 py-1 text-xs", theme.pulse ? "animate-pulse" : "")}
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

          <div className="flex items-center gap-3">
            {theme.showThumbs && (
              <div
                className="h-14 w-14 overflow-hidden ring-1 bg-white/5"
                style={{ borderColor: theme.panelBorder, borderRadius: theme.radius }}
              >
                {sideB?.thumbnail ? (
                  <img
                    src={sideB.thumbnail}
                    alt=""
                    className="h-full w-full object-cover"
                  />
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
              <div
                className="text-[12px] truncate"
                style={{ color: theme.subtext, fontWeight: theme.fontWeight }}
              >
                {sideB?.name || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* chips + subtotals */}
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
                fontWeight: theme.fontWeight,
              }}
            >
              <span>Subtotal</span>
              <span
                style={{ color: theme.text, fontWeight: theme.strongWeight }}
              >
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
                fontWeight: theme.fontWeight,
              }}
            >
              <span>Subtotal</span>
              <span
                style={{ color: theme.text, fontWeight: theme.strongWeight }}
              >
                {fmtMoney(bTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* total (left/center/right) */}
        <div
          className={cn(
            "mt-6 flex",
            opts?.totalJustify === "left"
              ? "justify-start"
              : opts?.totalJustify === "right"
              ? "justify-end"
              : "justify-center"
          )}
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
            Total paid: {fmtMoney(totalPay)}
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Página de Overlay ---------- */
export default function WidgetOverlay() {
  const [battleId, setBattleId] = React.useState(null);

  // aceitar #/overlay/battle/:id e #/widget/battle/:id
  React.useEffect(() => {
    function read() {
      const h = String(window.location.hash || "").replace(/^#\//, "");
      const parts = h.split("?")[0].split("/");
      // formatos possíveis:
      // overlay / battle / :id
      // widget  / battle / :id
      const id = Number(parts[2] || parts[1] || parts[0]);
      setBattleId(Number.isFinite(id) ? id : null);
    }
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  // fundo totalmente transparente para OBS
  React.useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.background;
    const prevBody = body.style.background;
    html.style.background = "transparent";
    body.style.background = "transparent";
    return () => {
      html.style.background = prevHtml;
      body.style.background = prevBody;
    };
  }, []);

  const [theme, setTheme] = React.useState(DEFAULT_THEME);
  const [layout, setLayout] = React.useState(DEFAULT_LAYOUT);
  const [opts, setOpts] = React.useState(DEFAULT_OPTS);

  const [bestOf, setBestOf] = React.useState(1);
  const [buyCost, setBuyCost] = React.useState(0);
  const [sideA, setSideA] = React.useState(null);
  const [sideB, setSideB] = React.useState(null);
  const [playerA, setPlayerA] = React.useState("");
  const [playerB, setPlayerB] = React.useState("");
  const [pays, setPays] = React.useState([]);
  const aPays = React.useMemo(
    () => (pays || []).filter((r) => String(r.side || "").toUpperCase() === "L"),
    [pays]
  );
  const bPays = React.useMemo(
    () => (pays || []).filter((r) => String(r.side || "").toUpperCase() === "R"),
    [pays]
  );
  const totalPay = React.useMemo(
    () => (pays || []).reduce((s, r) => s + Number(r.amount || 0), 0),
    [pays]
  );

  React.useEffect(() => {
    (async () => {
      if (!battleId) return;
      // Carregar opções salvas
      const { theme: t, layout: l, options: o } = await dbLoadWidgetSettings(
        battleId
      );
      if (t) setTheme({ ...DEFAULT_THEME, ...t });
      if (l) setLayout({ ...DEFAULT_LAYOUT, ...l });
      if (o) setOpts({ ...DEFAULT_OPTS, ...o });

      // Carregar dados do battle
      const { data: battle } = await supabase
        .from("battles")
        .select("*")
        .eq("id", battleId)
        .maybeSingle();
      setBestOf(Number(battle?.best_of) || 1);
      setBuyCost(Number(battle?.buy_cost) || 0);

      const { data: es } = await supabase
        .from("battle_entries")
        .select("seed, slot_name, slot_id, player_name")
        .eq("battle_id", battleId);

      const A = (es || []).find(
        (e) => String(e.seed).toUpperCase() === "A"
      );
      const B = (es || []).find(
        (e) => String(e.seed).toUpperCase() === "B"
      );

      let aBase = A ? { id: A.slot_id ?? null, name: A.slot_name || "" } : null;
      let bBase = B ? { id: B.slot_id ?? null, name: B.slot_name || "" } : null;
      if (aBase) aBase = await enrichSlotInfo(aBase);
      if (bBase) bBase = await enrichSlotInfo(bBase);

      setSideA(aBase);
      setPlayerA(A?.player_name || "");
      setSideB(bBase);
      setPlayerB(B?.player_name || "");

      const { data: ps } = await supabase
        .from("battle_payments")
        .select("*")
        .eq("battle_id", battleId)
        .order("buy_idx", { ascending: true });
      setPays(ps || []);
    })();
  }, [battleId]);

  if (!battleId) {
    return null;
  }

  return (
    <div
      style={{
        background: "transparent",
        width: "100vw",
        height: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "12px",
      }}
    >
      <WidgetPreviewPanel
        theme={theme}
        layout={layout}
        setLayout={setLayout}
        opts={opts}
        bestOf={bestOf}
        buyCost={buyCost}
        totalPay={totalPay}
        sideA={sideA}
        sideB={sideB}
        playerA={playerA}
        playerB={playerB}
        aPays={aPays}
        bPays={bPays}
      />
    </div>
  );
}
