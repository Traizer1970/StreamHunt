// src/widget-overlay.jsx
import React from "react";
import { supabase } from "@/lib/supabase";

/* ───────────────────────── helpers ───────────────────────── */
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

const isUUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

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

  const has = (k) => qs.has(k);
  const size = (name, def) => {
    const v = (qs.get(name) || "").trim();
    if (!v) return def;
    if (/^\d+$/.test(v)) return `${v}px`;
    return v;
  };
  const int = (name, def) => {
    const v = Number(qs.get(name));
    return Number.isFinite(v) && v > 0 ? v : def;
  };

  return {
    token: seg0 === "overlay" && seg1 === "battle" ? (seg2 || "").trim() : "",
    battleId: (qs.get("id") || "").trim(),
    // Stage size (Browser Source)
    w: size("w", "100vw"),
    h: size("h", "100vh"),
    pinSize: (qs.get("pinsize") || "0") === "1",
    // Base panel (canvas) + overrides flags
    bw: int("bw", 1100),
    bh: int("bh", 420),
    pad: int("pad", 24),
    align: (qs.get("align") || "center").toLowerCase(),
    hasBw: has("bw"),
    hasBh: has("bh"),
    hasPad: has("pad"),
    hasAlign: has("align"),
    // animações
    anim: (qs.get("anim") || "auto").toLowerCase(), // "auto" | "0" | "off"
  };
}

/* ───────── tema/layout/opções (iguais ao preview) ───────── */
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

  radius: 18,      // boxes
  pillRadius: 16,  // badges/total
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
  // badges
  bonusLabelMode: "label+value",
  bonusLabelText: "Bonus Buy",
  bonusDock: "left",

  // VS
  vsStyle: "badge",              // 'badge' | 'big'
  vsPlacement: "center",         // 'left' | 'center' | 'right' | 'overlay'

  // Subtotal
  subtotalLabelMode: "label+value", // 'label+value' | 'value'
  subtotalLabelText: "Subtotal",
  subtotalAlign: "left",            // 'left' | 'center' | 'right' | 'split'

  // Total
  totalJustify: "center",           // 'left' | 'center' | 'right'
  totalLabelMode: "label+value",    // 'label+value' | 'value'
  totalLabelText: "Total paid",

  // Buys
  buyStyle: "pill",                 // 'pill' | 'soft' | 'flat' | 'tag'
  buyLayout: "wrap",                // 'wrap' | 'column'

  // orientação
  layoutKind: "horizontal",         // 'horizontal' | 'vertical'

  // OBS overlay
  overlay: {
    baseW: 1100,
    baseH: 420,
    pad: 24,
    align: "center",
    mode: "auto",
    width: 1920,
    height: 1080,
  },
};

/* Escala para caber (letterbox) */
function useFitScale(containerRef, baseW, baseH, pad = 24, min = 0.3, max = 3) {
  const [scale, setScale] = React.useState(1);
  React.useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      const availW = Math.max(100, rect.width - pad * 2);
      const availH = Math.max(100, rect.height - pad * 2);
      const s = Math.min(availW / baseW, availH / baseH);
      const clamped = Math.max(min, Math.min(max, s));
      setScale(clamped);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, baseW, baseH, pad, min, max]);
  return scale;
}

/* Enriquecer slot com thumbnail/provider */
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

/* ───────── Chip designs (iguais ao preview) ───────── */
function Chip({ amount, ok, i, theme, opts, stacked }) {
  const common = {
    borderRadius: theme.chipRadius,
    color: ok ? theme.pos : theme.neg,
    fontSize: `calc(12px * ${theme.fontScale / 100})`,
    fontFamily: theme.fontFamily,
    fontWeight: theme.strongWeight,
    animation: theme.pulse ? `pop .16s ease-out both` : "none",
    animationDelay: `${i * 45}ms`,
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "4px 12px",
    marginRight: stacked ? 0 : "8px",
    marginBottom: "8px",
  };

  if (opts.buyStyle === "flat") {
    return (
      <span
        style={{
          ...common,
          background: "transparent",
          border: `1px solid ${ok ? theme.pos : theme.neg}55`,
          boxShadow: "none",
        }}
        title={ok ? "Covers buy" : "Below buy"}
      >
        <span
          style={{
            display: "inline-block",
            height: 6,
            width: 6,
            borderRadius: 999,
            background: ok ? theme.pos : theme.neg,
          }}
        />
        {fmtMoney(Number(amount || 0))}
      </span>
    );
  }

  if (opts.buyStyle === "soft") {
    return (
      <span
        style={{
          ...common,
          background: ok ? `${theme.pos}18` : `${theme.neg}18`,
          border: `1px solid ${ok ? theme.pos : theme.neg}66`,
          boxShadow: `0 8px 22px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06)`,
          backdropFilter: "blur(2px)",
        }}
        title={ok ? "Covers buy" : "Below buy"}
      >
        <span
          style={{
            display: "inline-block",
            height: 6,
            width: 6,
            borderRadius: 999,
            background: ok ? theme.pos : theme.neg,
          }}
        />
        {fmtMoney(Number(amount || 0))}
      </span>
    );
  }

  if (opts.buyStyle === "tag") {
    return (
      <span
        style={{
          ...common,
          background: "rgba(0,0,0,.25)",
          border: `1px solid ${theme.chipBorder}`,
          boxShadow: "0 6px 18px rgba(0,0,0,.36)",
        }}
        title={ok ? "Covers buy" : "Below buy"}
      >
        <span
          style={{
            display: "inline-block",
            height: 8,
            width: 8,
            borderRadius: 999,
            background: ok ? theme.pos : theme.neg,
            boxShadow: `0 0 0 2px ${ok ? theme.pos : theme.neg}33`,
          }}
        />
        {fmtMoney(Number(amount || 0))}
      </span>
    );
  }

  // default: pill
  return (
    <span
      style={{
        ...common,
        background: ok ? `${theme.pos}1F` : `${theme.neg}1F`,
        border: `${theme.chipBorderWidth}px solid ${ok ? theme.pos : theme.neg}`,
        boxShadow:
          "0 0 0 1px rgba(0,0,0,0.25) inset, 0 6px 18px rgba(0,0,0,.36)",
      }}
      title={ok ? "Covers buy" : "Below buy"}
    >
      <span
        style={{
          display: "inline-block",
          height: 6,
          width: 6,
          borderRadius: 999,
          background: ok ? theme.pos : theme.neg,
          boxShadow: `0 0 0 2px ${ok ? theme.pos : theme.neg}26`,
        }}
      />
      {fmtMoney(Number(amount || 0))}
    </span>
  );
}

/* ───────── UI do widget ───────── */
function WidgetPanel({
  theme,
  opts,
  bestOf,
  buyCost,
  sideA,
  sideB,
  playerA,
  playerB,
  aPays,
  bPays,
}) {
  const aTotal = aPays.reduce((s, r) => s + Number(r?.amount || 0), 0);
  const bTotal = bPays.reduce((s, r) => s + Number(r?.amount || 0), 0);
  const stacked = opts.buyLayout === "column";
  const vsBig = opts.vsStyle === "big";

  const BadgeBest = (
    <div
      style={{
        padding: "6px 12px",
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
        style={{
          padding: "6px 12px",
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
        style={{
          padding: "6px 12px",
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

  const SubtotalBadge = ({ value, align = "left" }) => {
    const showOnlyValue = opts?.subtotalLabelMode === "value";
    const label = (opts?.subtotalLabelText ?? "Subtotal").trim();
    const txt = showOnlyValue ? fmtMoney(value) : `${label} ${fmtMoney(value)}`;
    const jc =
      align === "center"
        ? "center"
        : align === "right"
        ? "flex-end"
        : "flex-start";
    return (
      <div style={{ marginTop: 12, display: "flex", justifyContent: jc }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 12px",
            fontSize: 12,
            background: theme.chipBg,
            border: `${theme.chipBorderWidth}px solid ${theme.chipBorder}`,
            borderRadius: theme.radius,
            color: theme.subtext,
            fontWeight: theme.fontWeight,
          }}
        >
          <span style={{ color: theme.text, fontWeight: theme.strongWeight }}>
            {txt}
          </span>
        </div>
      </div>
    );
  };

  const TotalBadge = ({ value }) => {
    const showOnlyValue = opts?.totalLabelMode === "value";
    const label = (opts?.totalLabelText ?? "").trim();
    return (
      <div
        style={{
          padding: "8px 16px",
          background: theme.totalBg,
          border: `${theme.totalBorderWidth}px solid ${theme.totalBorder}`,
          borderRadius: theme.pillRadius,
          color: theme.accent,
          fontWeight: theme.strongWeight,
          boxShadow: "0 10px 30px rgba(0,0,0,.35)",
        }}
      >
        {showOnlyValue ? fmtMoney(value) : (label ? `${label}: ${fmtMoney(value)}` : fmtMoney(value))}
      </div>
    );
  };

  return (
    <div
      className="relative overflow-hidden"
      style={{
        width: "100%",
        height: "100%",
        padding: 24,
        background: `linear-gradient(135deg, ${theme.bgStart}, ${theme.bgEnd})`,
        border: `${theme.panelBorderWidth}px solid ${theme.panelBorder}`,
        borderRadius: theme.radius,
        color: theme.text,
        fontFamily: theme.fontFamily,
        fontSize: `${theme.fontScale}%`,
      }}
    >
      <style>{`
        @keyframes sweep { 0% { transform: translateX(-120%);} 100% { transform: translateX(120%);} }
        @keyframes pop { 0% { transform: scale(.96); opacity: 0;} 100% { transform: scale(1); opacity: 1;} }
        @keyframes vsPulse { 0%{ transform:scale(1); opacity:1 } 50%{ transform:scale(1.04); opacity:.92 } 100%{ transform:scale(1); opacity:1 } }
      `}</style>

      {theme.shine && (
        <div
          className="pointer-events-none"
          style={{
            position: "absolute",
            inset: 0,
            width: "33%",
            background:
              "linear-gradient(to right, transparent, rgba(255,255,255,.10), transparent)",
            animation: "sweep 4.8s linear infinite",
            mixBlendMode: "screen",
          }}
        />
      )}

      {/* ───────── Horizontal layout (default) ───────── */}
      {opts?.layoutKind !== "vertical" && (
        <>
          {/* badges topo */}
          {opts?.bonusDock === "right" ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>{BadgeBest}</div>
              <div>{BadgeBonus}</div>
            </div>
          ) : (
            <div
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              {BadgeBest}
              {BadgeBonus}
            </div>
          )}

          {/* players row */}
          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 20,
              position: "relative",
            }}
          >
            {/* A */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 12,
                minWidth: 0,
              }}
            >
              <div style={{ minWidth: 0, textAlign: "right" }}>
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
                  className="truncate"
                  style={{ fontSize: 12, color: theme.subtext }}
                >
                  {sideA?.name || "—"}
                </div>
              </div>
              {theme.showThumbs && (
                <div
                  style={{
                    height: 56,
                    width: 56,
                    overflow: "hidden",
                    borderRadius: theme.radius,
                    background: "rgba(255,255,255,.05)",
                    border: `1px solid ${theme.panelBorder}`,
                    flexShrink: 0,
                  }}
                >
                  {sideA?.thumbnail ? (
                    <img
                      src={sideA.thumbnail}
                      alt=""
                      style={{
                        height: "100%",
                        width: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : null}
                </div>
              )}
            </div>

            {/* VS normal (left/center/right) */}
            {opts.vsPlacement !== "overlay" && (
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    opts.vsPlacement === "left"
                      ? "flex-start"
                      : opts.vsPlacement === "right"
                      ? "flex-end"
                      : "center",
                }}
              >
                <div
                  style={{
                    padding: vsBig ? "12px 16px" : "4px 10px",
                    fontSize: vsBig ? 14 : 12,
                    background: theme.vsBg,
                    border: `${theme.panelBorderWidth}px solid ${theme.panelBorder}`,
                    borderRadius: vsBig ? 999 : 10,
                    fontWeight: theme.strongWeight,
                    animation: theme.pulse
                      ? "vsPulse 1.8s ease-in-out infinite"
                      : "none",
                  }}
                >
                  VS
                </div>
              </div>
            )}

            {/* B */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              {theme.showThumbs && (
                <div
                  style={{
                    height: 56,
                    width: 56,
                    overflow: "hidden",
                    borderRadius: theme.radius,
                    background: "rgba(255,255,255,.05)",
                    border: `1px solid ${theme.panelBorder}`,
                    flexShrink: 0,
                  }}
                >
                  {sideB?.thumbnail ? (
                    <img
                      src={sideB.thumbnail}
                      alt=""
                      style={{
                        height: "100%",
                        width: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : null}
                </div>
              )}
              <div style={{ minWidth: 0, textAlign: "left" }}>
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
                <div className="truncate" style={{ fontSize: 12, color: theme.subtext }}>
                  {sideB?.name || "—"}
                </div>
              </div>
            </div>

            {/* VS overlay */}
            {opts.vsPlacement === "overlay" && (
              <div
                style={{
                  pointerEvents: "none",
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    padding: vsBig ? "12px 16px" : "4px 10px",
                    fontSize: vsBig ? 14 : 12,
                    background: theme.vsBg,
                    border: `${theme.panelBorderWidth}px solid ${theme.panelBorder}`,
                    borderRadius: vsBig ? 999 : 10,
                    fontWeight: theme.strongWeight,
                    animation: theme.pulse
                      ? "vsPulse 1.8s ease-in-out infinite"
                      : "none",
                  }}
                >
                  VS
                </div>
              </div>
            )}
          </div>

          {/* chips + subtotais */}
          <div
            style={{
              marginTop: 24,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 24,
            }}
          >
            {/* A */}
            <div>
              <div
                style={{
                  display: stacked ? "flex" : "flex",
                  flexDirection: stacked ? "column" : "row",
                  flexWrap: stacked ? "nowrap" : "wrap",
                  alignItems: "flex-start",
                }}
              >
                {aPays.map((p, i) => (
                  <Chip
                    key={`a-${i}`}
                    amount={p.amount}
                    ok={Number(p.amount || 0) >= Number(buyCost || 0)}
                    i={i}
                    theme={theme}
                    opts={opts}
                    stacked={stacked}
                  />
                ))}
              </div>
              <SubtotalBadge
                value={aTotal}
                align={opts.subtotalAlign === "split" ? "left" : opts.subtotalAlign}
              />
            </div>

            {/* B */}
            <div>
              <div
                style={{
                  display: stacked ? "flex" : "flex",
                  flexDirection: stacked ? "column" : "row",
                  flexWrap: stacked ? "nowrap" : "wrap",
                  alignItems: "flex-start",
                }}
              >
                {bPays.map((p, i) => (
                  <Chip
                    key={`b-${i}`}
                    amount={p.amount}
                    ok={Number(p.amount || 0) >= Number(buyCost || 0)}
                    i={i}
                    theme={theme}
                    opts={opts}
                    stacked={stacked}
                  />
                ))}
              </div>
              <SubtotalBadge
                value={bTotal}
                align={opts.subtotalAlign === "split" ? "right" : opts.subtotalAlign}
              />
            </div>
          </div>

          {/* total */}
          <div
            style={{
              marginTop: 24,
              display: "flex",
              justifyContent:
                opts?.totalJustify === "left"
                  ? "flex-start"
                  : opts?.totalJustify === "right"
                  ? "flex-end"
                  : "center",
            }}
          >
            <TotalBadge value={aTotal + bTotal} />
          </div>
        </>
      )}

      {/* ───────── Vertical layout (paridade com preview) ───────── */}
      {opts?.layoutKind === "vertical" && (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
          {opts?.bonusDock === "right" ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>{BadgeBest}{/* vazio */}</div>
              <div>{BadgeBonus}</div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{BadgeBest}{BadgeBonus}</div>
          )}

          {/* A */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {theme.showThumbs && (
              <div
                style={{
                  height: 48, width: 48, overflow: "hidden", borderRadius: theme.radius,
                  background: "rgba(255,255,255,.05)", border: `1px solid ${theme.panelBorder}`, flexShrink: 0,
                }}
              >
                {sideA?.thumbnail ? <img src={sideA.thumbnail} alt="" style={{ height:"100%", width:"100%", objectFit:"cover" }} /> : null}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div className="truncate" style={{ fontSize: 20, color: theme.text, fontWeight: theme.strongWeight }}>{playerA || "—"}</div>
              <div className="truncate" style={{ fontSize: 12, color: theme.subtext }}>{sideA?.name || "—"}</div>
            </div>
          </div>

          <div style={{ display: stacked ? "flex" : "flex", flexDirection: stacked ? "column" : "row", flexWrap: stacked ? "nowrap" : "wrap", alignItems: "flex-start" }}>
            {aPays.map((p,i)=>(
              <Chip key={`va-${i}`} amount={p.amount} ok={Number(p.amount||0)>=Number(buyCost||0)} i={i} theme={theme} opts={opts} stacked={stacked}/>
            ))}
          </div>
          <SubtotalBadge value={aTotal} align="left" />

          {/* VS */}
          <div style={{ width: "100%", display: "flex", justifyContent: "center", padding: "4px 0" }}>
            <div
              style={{
                padding: vsBig ? "12px 16px" : "4px 10px",
                fontSize: vsBig ? 14 : 12,
                background: theme.vsBg,
                border: `${theme.panelBorderWidth}px solid ${theme.panelBorder}`,
                borderRadius: vsBig ? 999 : 10,
                fontWeight: theme.strongWeight,
                animation: theme.pulse ? "vsPulse 1.8s ease-in-out infinite" : "none",
              }}
            >
              VS
            </div>
          </div>

          {/* B */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {theme.showThumbs && (
              <div
                style={{
                  height: 48, width: 48, overflow: "hidden", borderRadius: theme.radius,
                  background: "rgba(255,255,255,.05)", border: `1px solid ${theme.panelBorder}`, flexShrink: 0,
                }}
              >
                {sideB?.thumbnail ? <img src={sideB.thumbnail} alt="" style={{ height:"100%", width:"100%", objectFit:"cover" }} /> : null}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div className="truncate" style={{ fontSize: 20, color: theme.text, fontWeight: theme.strongWeight }}>{playerB || "—"}</div>
              <div className="truncate" style={{ fontSize: 12, color: theme.subtext }}>{sideB?.name || "—"}</div>
            </div>
          </div>

          <div style={{ display: stacked ? "flex" : "flex", flexDirection: stacked ? "column" : "row", flexWrap: stacked ? "nowrap" : "wrap", alignItems: "flex-start" }}>
            {bPays.map((p,i)=>(
              <Chip key={`vb-${i}`} amount={p.amount} ok={Number(p.amount||0)>=Number(buyCost||0)} i={i} theme={theme} opts={opts} stacked={stacked}/>
            ))}
          </div>
          <SubtotalBadge value={bTotal} align="left" />

          <div style={{ marginTop: "auto", display: "flex", justifyContent: opts?.totalJustify === "left" ? "flex-start" : opts?.totalJustify === "right" ? "flex-end" : "center" }}>
            <TotalBadge value={aTotal + bTotal} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Página Overlay ───────────────────────── */
export default function WidgetOverlay() {
  const [loc, setLoc] = React.useState(parseHash());

  // CSS global transparente (OBS)
  React.useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      html,body,#root,#__next{height:100%;width:100%;margin:0;padding:0;background:transparent;overflow:hidden}
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // Estado de carregamento/erros
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState("");

  // Dados da battle
  const [bestOf, setBestOf] = React.useState(1);
  const [buyCost, setBuyCost] = React.useState(0);
  const [sideA, setSideA] = React.useState(null);
  const [sideB, setSideB] = React.useState(null);
  const [playerA, setPlayerA] = React.useState("");
  const [playerB, setPlayerB] = React.useState("");
  const [aPays, setAPays] = React.useState([]);
  const [bPays, setBPays] = React.useState([]);

  // tema/layout/opções
  const [theme, setTheme] = React.useState(DEFAULT_THEME);
  const [layout, setLayout] = React.useState(DEFAULT_LAYOUT);
  const [opts, setOpts] = React.useState(DEFAULT_OPTS);

  // anim=0 no URL desliga pulse/shine
  const effTheme = React.useMemo(() => {
    if (loc.anim === "0" || loc.anim === "off") {
      return { ...theme, pulse: false, shine: false };
    }
    return theme;
  }, [theme, loc.anim]);

  // ouvir alterações do hash
  React.useEffect(() => {
    const onHash = () => setLoc(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Stage + escala para caber (usar valores do URL se existirem, senão os guardados)
  const baseW = loc.hasBw ? loc.bw : (opts?.overlay?.baseW ?? 1100);
  const baseH = loc.hasBh ? loc.bh : (opts?.overlay?.baseH ?? 420);
  const pad   = loc.hasPad ? loc.pad : (opts?.overlay?.pad ?? 24);
  const align = loc.hasAlign ? loc.align : (opts?.overlay?.align ?? "center");

  const stageRef = React.useRef(null);
  const scale = useFitScale(stageRef, baseW, baseH, pad, 0.3, 3);

  // realtime + polling
  const channelRef = React.useRef(null);
  const pollRef = React.useRef(null);
  const debounceRef = React.useRef(null);
  const scheduleLoad = (fn) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(fn, 150);
  };

  async function loadAll({ ownerId, bId }) {
    // battle basics
    const { data: bRow } = await supabase
      .from("battles")
      .select("id, best_of, buy_cost")
      .eq("id", bId)
      .maybeSingle();
    if (bRow) {
      const nb = Number(bRow.best_of || 1);
      const bc = Number(bRow.buy_cost || 0);
      setBestOf((v) => (v !== nb ? nb : v));
      setBuyCost((v) => (v !== bc ? bc : v));
    }

    // settings
    const { data: ws } = await supabase
      .from("battle_widget_settings")
      .select("theme, layout, options")
      .eq("battle_id", bId)
      .maybeSingle();

    if (ws?.theme && !shallowEq(ws.theme, theme))
      setTheme({ ...DEFAULT_THEME, ...ws.theme });
    if (ws?.layout && !shallowEq(ws.layout, layout))
      setLayout({ ...DEFAULT_LAYOUT, ...ws.layout });
    if (ws?.options && !shallowEq(ws.options, opts))
      setOpts({
        ...DEFAULT_OPTS,
        ...ws.options,
        overlay: { ...DEFAULT_OPTS.overlay, ...(ws.options?.overlay || {}) },
      });

    // entries
    const { data: entries } = await supabase
      .from("battle_entries")
      .select("seed, slot_name, slot_id, player_name")
      .eq("battle_id", bId);

    const map = new Map();
    for (const e of entries || []) if (e?.seed) map.set(String(e.seed).toUpperCase(), e);
    const A = map.get("A") || (entries && entries[0]) || null;
    const B = map.get("B") || (entries && entries[1]) || null;

    if (A) {
      let aBase = { id: A.slot_id ?? null, name: A.slot_name || "" };
      aBase = await enrichSlotInfo(aBase);
      setSideA((v) => (JSON.stringify(v) !== JSON.stringify(aBase) ? aBase : v));
      setPlayerA((v) => (v !== (A.player_name || "") ? (A.player_name || "") : v));
    } else {
      setSideA(null);
      setPlayerA("");
    }

    if (B) {
      let bBase = { id: B.slot_id ?? null, name: B.slot_name || "" };
      bBase = await enrichSlotInfo(bBase);
      setSideB((v) => (JSON.stringify(v) !== JSON.stringify(bBase) ? bBase : v));
      setPlayerB((v) => (v !== (B.player_name || "") ? (B.player_name || "") : v));
    } else {
      setSideB(null);
      setPlayerB("");
    }

    // payments
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

    setAPays((v) => (JSON.stringify(v) !== JSON.stringify(as) ? as : v));
    setBPays((v) => (JSON.stringify(v) !== JSON.stringify(bs) ? bs : v));
  }

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setErr("");

        // descobrir o owner pela token
        let ownerId = null;
        const t = loc.token;
        if (t) {
          if (!ownerId) {
            const { data } = await supabase
              .from("profiles")
              .select("id")
              .eq("widget_token", t)
              .maybeSingle();
            if (data?.id) ownerId = data.id;
          }
          if (!ownerId) {
            const { data } = await supabase
              .from("profiles")
              .select("id")
              .eq("public_token", t)
              .maybeSingle();
            if (data?.id) ownerId = data.id;
          }
          if (!ownerId && isUUID(t)) {
            const { data } = await supabase
              .from("profiles")
              .select("id")
              .eq("id", t)
              .maybeSingle();
            if (data?.id) ownerId = data.id;
          }
          if (!ownerId) throw new Error("Token inválida ou conta não encontrada.");
        }

        // battle alvo
        let bId = loc.battleId || null;
        if (!bId) {
          const { data: b } = await supabase
            .from("battles")
            .select("id")
            .eq("created_by", ownerId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (!b?.id) throw new Error("Nenhuma batalha encontrada para esta conta.");
          bId = b.id;
        }

        await loadAll({ ownerId, bId });

        // realtime
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        const ch = supabase
          .channel(`overlay-${bId}`)
          .on("postgres_changes", { event: "*", schema: "public", table: "battle_payments", filter: `battle_id=eq.${bId}` }, () => scheduleLoad(() => loadAll({ ownerId, bId })))
          .on("postgres_changes", { event: "*", schema: "public", table: "battle_entries", filter: `battle_id=eq.${bId}` }, () => scheduleLoad(() => loadAll({ ownerId, bId })))
          .on("postgres_changes", { event: "*", schema: "public", table: "battle_widget_settings", filter: `battle_id=eq.${bId}` }, () => scheduleLoad(() => loadAll({ ownerId, bId })))
          .on("postgres_changes", { event: "*", schema: "public", table: "battles", filter: `id=eq.${bId}` }, () => scheduleLoad(() => loadAll({ ownerId, bId })))
          .subscribe();
        channelRef.current = ch;

        // polling de segurança
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => loadAll({ ownerId, bId }), 7000);
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
  }, [loc.token, loc.battleId]);

  // alinhamento vertical da caixa escalada
  const alignItems =
    (loc.hasAlign ? loc.align : (opts?.overlay?.align ?? "center")) === "top"
      ? "flex-start"
      : (loc.hasAlign ? loc.align : (opts?.overlay?.align ?? "center")) === "bottom"
      ? "flex-end"
      : "center";

  return (
    <div
      ref={stageRef}
      style={{
        position: "fixed",
        inset: 0,
        width: loc.pinSize ? loc.w : "100vw",
        height: loc.pinSize ? loc.h : "100vh",
        margin: 0,
        padding: 0,
        background: "transparent",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems,
          padding: pad,
          boxSizing: "border-box",
        }}
      >
        {loading ? (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12,
              opacity: 0.8,
              background: "rgba(0,0,0,.35)",
              color: "white",
            }}
          >
            Loading overlay…
          </div>
        ) : err ? (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              fontSize: 12,
              background: "rgba(239,68,68,.15)",
              color: "rgb(252,165,165)",
              border: "1px solid rgba(239,68,68,.35)",
            }}
          >
            {err}
          </div>
        ) : (
          // Wrapper com scale (letterbox: nunca corta)
          <div style={{ position: "relative", width: baseW * scale, height: baseH * scale }}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: baseW,
                height: baseH,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <WidgetPanel
                theme={effTheme}
                opts={opts}
                bestOf={bestOf}
                buyCost={buyCost}
                sideA={sideA}
                sideB={sideB}
                playerA={playerA}
                playerB={playerB}
                aPays={aPays}
                bPays={bPays}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
