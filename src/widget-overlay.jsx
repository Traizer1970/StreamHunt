// src/widget-overlay.jsx
import React from "react";
import { supabase } from "@/lib/supabase";

/** ───────────────────────── Hash params ─────────────────────────
 * Aceita: "#/overlay/battle/<token>?id=<battleId>"
 * - <token> = widget_token (ou public_token / id do profile, como fallback)
 * - id=<battleId> é opcional; sem ele, usa a batalha mais recente do dono
 */
function parseHash() {
  const hash = typeof window !== "undefined" ? window.location.hash : "";
  const clean = hash.replace(/^#\/?/, "");
  const [seg0, seg1, seg2] = clean.split("?")[0].split("/");
  const qs = new URLSearchParams(clean.split("?")[1] || "");
  return {
    token: seg0 === "overlay" && seg1 === "battle" ? (seg2 || "").trim() : "",
    battleId: (qs.get("id") || "").trim(),
  };
}

/* ───────────────────────── utils / style helpers ───────────────────────── */
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

/* Theme (with border widths & typography) - deve bater com o battle-view */
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

  radius: 18, // boxes
  pillRadius: 16, // badges/total
  fontFamily:
    "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji'",
  fontScale: 100,
  fontWeight: 400, // normal
  strongWeight: 500, // emphasis

  showThumbs: true,
  shine: true,
  pulse: true,
};

/* Default layout + free drag positions */
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

/* Widget options (dock/justify + labels) */
const DEFAULT_OPTS = {
  bonusLabelMode: "label+value", // "label+value" | "value"
  bonusLabelText: "Bonus Buy",
  bonusDock: "left", // "left" | "right"
  totalJustify: "center", // "left" | "center" | "right"

  // (presentes no battle-view; podes usar no futuro)
  totalLabelMode: "label+value", // "label+value" | "value"
  totalLabelText: "Total paid",
};

/* Enrich slot -> thumbnail/provider a partir do catálogo (igual ao battle-view) */
async function enrichSlotInfo(slot) {
  if (!slot) return slot;
  if (slot.thumbnail && slot.provider) return slot;
  try {
    let q = supabase
      .from("slots_catalog")
      .select('id, "NAME", "PROVIDER", "THUMBNAIL"')
      .limit(1);
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

/* ───────── Free-drag helper (igual ao battle-view) ───────── */
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

/* ───────── Preview Panel (copiado do battle-view) ───────── */
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
          minHeight: layout?.mode === "free" ? 420 : "auto",
        }}
      >
        {theme.shine && (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{ animation: "sweep 4.8s linear infinite" }}
          />
        )}

        {/* default layout */}
        {layout?.mode !== "free" && (
          <>
            {/* badges row (Bonus dock configurável) */}
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
                {/* Podes adaptar para usar opts.totalLabelMode/totalLabelText se quiseres */}
                Total paid: {fmtMoney(aTotal + bTotal)}
              </div>
            </div>
          </>
        )}

        {/* free layout (drag) */}
        {layout?.mode === "free" && (
          <>
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "linear-gradient(transparent 95%, rgba(255,255,255,.05) 95%)",
                backgroundSize: "100% 40px",
              }}
            />

            <DragBox id="badges">
              <div className="flex items-center gap-2">
                {BadgeBest}
                {BadgeBonus}
              </div>
            </DragBox>

            <DragBox id="playerA">
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
            </DragBox>

            <DragBox id="playerB">
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
            </DragBox>

            <DragBox id="chipsA">
              <div>
                <div className="flex flex-wrap">
                  {aPays.map((p, i) => (
                    <Chip
                      key={`fa-${i}`}
                      amount={p.amount}
                      ok={Number(p.amount || 0) >= Number(buyCost || 0)}
                      i={i}
                    />
                  ))}
                </div>
                <div
                  className="inline-flex mt-2 items-center gap-2 px-3 py-1.5 text-[12px]"
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
                    {fmtMoney(aPays.reduce((s, r) => s + Number(r.amount || 0), 0))}
                  </span>
                </div>
              </div>
            </DragBox>

            <DragBox id="chipsB">
              <div>
                <div className="flex flex-wrap">
                  {bPays.map((p, i) => (
                    <Chip
                      key={`fb-${i}`}
                      amount={p.amount}
                      ok={Number(p.amount || 0) >= Number(buyCost || 0)}
                      i={i}
                    />
                  ))}
                </div>
                <div
                  className="inline-flex mt-2 items-center gap-2 px-3 py-1.5 text-[12px]"
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
                    {fmtMoney(bPays.reduce((s, r) => s + Number(r.amount || 0), 0))}
                  </span>
                </div>
              </div>
            </DragBox>

            <DragBox id="total">
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
                Total paid:{" "}
                {fmtMoney(
                  aPays.reduce((s, r) => s + Number(r.amount || 0), 0) +
                    bPays.reduce((s, r) => s + Number(r.amount || 0), 0)
                )}
              </div>
            </DragBox>
          </>
        )}
      </div>
    </>
  );
}

/* ───────────────────────── Overlay Page ───────────────────────── */
export default function WidgetOverlay() {
  const [{ token, battleId }, setLoc] = React.useState(parseHash());

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  // dados da batalha
  const [bestOf, setBestOf] = React.useState(1);
  const [buyCost, setBuyCost] = React.useState(0);

  const [sideA, setSideA] = React.useState(null);
  const [sideB, setSideB] = React.useState(null);
  const [playerA, setPlayerA] = React.useState("");
  const [playerB, setPlayerB] = React.useState("");

  const [aPays, setAPays] = React.useState([]);
  const [bPays, setBPays] = React.useState([]);
  const [totalPay, setTotalPay] = React.useState(0);

  // tema/layout/opções vindos da tabela (igual ao battle-view)
  const [theme, setTheme] = React.useState(DEFAULT_THEME);
  const [layout, setLayout] = React.useState(DEFAULT_LAYOUT);
  const [opts, setOpts] = React.useState(DEFAULT_OPTS);

  // reagir a alterações do hash (OBS)
  React.useEffect(() => {
    const onHash = () => setLoc(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // carregar dados + settings
  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // 1) Resolver dono pelo token (widget_token -> fallback public_token -> fallback id)
        let ownerId = null;
        if (token) {
          let prof = null;

          // widget_token
          if (!ownerId) {
            const { data } = await supabase
              .from("profiles")
              .select("id")
              .eq("widget_token", token)
              .maybeSingle();
            prof = data || null;
            if (prof?.id) ownerId = prof.id;
          }
          // public_token
          if (!ownerId) {
            const { data } = await supabase
              .from("profiles")
              .select("id")
              .eq("public_token", token)
              .maybeSingle();
            prof = data || null;
            if (prof?.id) ownerId = prof.id;
          }
          // id (uuid)
          if (!ownerId) {
            const { data } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", token)
              .maybeSingle();
            prof = data || null;
            if (prof?.id) ownerId = prof.id;
          }

          if (!ownerId) throw new Error("Token inválida ou conta não encontrada.");
        }

        // 2) Determinar battle id
        let bId = battleId || null;
        if (!bId) {
          const { data: b, error: eB } = await supabase
            .from("battles")
            .select("id, best_of, buy_cost, created_at")
            .eq("created_by", ownerId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (eB) throw eB;
          if (!b?.id) throw new Error("Nenhuma batalha encontrada para esta conta.");
          bId = b.id;
          setBestOf(Number(b.best_of || 1));
          setBuyCost(Number(b.buy_cost || 0));
        } else {
          const { data: b, error: eB } = await supabase
            .from("battles")
            .select("id, best_of, buy_cost")
            .eq("id", bId)
            .maybeSingle();
          if (eB) throw eB;
          setBestOf(Number(b?.best_of || 1));
          setBuyCost(Number(b?.buy_cost || 0));
        }

        // 3) Carregar widget settings (tema/layout/opções)
        const { data: ws } = await supabase
          .from("battle_widget_settings")
          .select("theme, layout, options")
          .eq("battle_id", bId)
          .maybeSingle();
        if (ws?.theme) setTheme({ ...DEFAULT_THEME, ...ws.theme });
        else setTheme({ ...DEFAULT_THEME });
        if (ws?.layout) setLayout({ ...DEFAULT_LAYOUT, ...ws.layout });
        else setLayout({ ...DEFAULT_LAYOUT });
        if (ws?.options) setOpts({ ...DEFAULT_OPTS, ...ws.options });
        else setOpts({ ...DEFAULT_OPTS });

        // 4) Entradas (A/B) + enriquecimento
        const { data: entries } = await supabase
          .from("battle_entries")
          .select("seed, slot_name, slot_id, player_name")
          .eq("battle_id", bId);

        const bySeed = new Map();
        for (const e of entries || []) {
          if (e?.seed) bySeed.set(String(e.seed).toUpperCase(), e);
        }
        const A = bySeed.get("A") || (entries && entries[0]) || null;
        const B = bySeed.get("B") || (entries && entries[1]) || null;

        let aBase = A ? { id: A.slot_id ?? null, name: A.slot_name || "" } : null;
        let bBase = B ? { id: B.slot_id ?? null, name: B.slot_name || "" } : null;
        if (aBase) aBase = await enrichSlotInfo(aBase);
        if (bBase) bBase = await enrichSlotInfo(bBase);

        setSideA(aBase);
        setPlayerA(A?.player_name || "");
        setSideB(bBase);
        setPlayerB(B?.player_name || "");

        // 5) Pagamentos (L/R)
        const { data: pays } = await supabase
          .from("battle_payments")
          .select("side, amount, buy_idx")
          .eq("battle_id", bId)
          .order("buy_idx", { ascending: true });

        const as = (pays || [])
          .filter((p) => String(p.side || "").toUpperCase() === "L")
          .map((p) => ({ amount: Number(p.amount) || 0 }));
        const bs = (pays || [])
          .filter((p) => String(p.side || "").toUpperCase() === "R")
          .map((p) => ({ amount: Number(p.amount) || 0 }));
        setAPays(as);
        setBPays(bs);
        const sum = (arr) => arr.reduce((s, r) => s + Number(r.amount || 0), 0);
        setTotalPay(sum(as) + sum(bs));
      } catch (e) {
        setErr(e?.message || "Falha a carregar overlay.");
        setSideA(null);
        setSideB(null);
        setPlayerA("");
        setPlayerB("");
        setAPays([]);
        setBPays([]);
        setTotalPay(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, battleId]);

  return (
    <div className="w-screen h-screen grid place-items-center bg-transparent">
      {/* mensagem de erro / loading minimalista para OBS */}
      {loading ? (
        <div className="px-4 py-2 rounded-lg text-sm opacity-80 bg-black/40 text-white">
          Loading overlay…
        </div>
      ) : err ? (
        <div className="px-4 py-2 rounded-lg text-sm bg-red-500/15 text-red-200 border border-red-500/30">
          {err}
        </div>
      ) : (
        <div className="max-w-[960px] w-[92vw]">
          <WidgetPreviewPanel
            theme={theme}
            layout={layout}
            setLayout={() => {}} // overlay não precisa arrastar; ignora
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
      )}
    </div>
  );
}
