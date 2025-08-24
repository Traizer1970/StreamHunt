// src/widget-overlay.jsx
import React from "react";
import { supabase } from "@/lib/supabase";

/* ───────────────────────── helpers ───────────────────────── */
const LOCALE = "pt-PT";
const fmtMoney = (n) =>
  Number.isFinite(Number(n))
    ? new Intl.NumberFormat(LOCALE, { style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n))
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

    w: size("w", "100vw"),
    h: size("h", "100vh"),
    pinSize: (qs.get("pinsize") || "0") === "1",

    bw: int("bw", 1100),
    bh: int("bh", 420),
    pad: int("pad", 24),
    align: (qs.get("align") || "center").toLowerCase(),
    enableAnim: (qs.get("anim") || "0") === "1",
  };
}

/* ───────── defaults (iguais ao app) ───────── */
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
  overlay: {
    mode: "auto",
    width: 1920,
    height: 1080,
    baseW: 1100,
    baseH: 420,
    pad: 24,
    align: "center",
  },
};

/* Escala para caber */
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

/* Enriquecer slot */
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

/* ───────── UI ───────── */
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
  animations = false,
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
        boxShadow:
          "0 0 0 1px rgba(0,0,0,0.25) inset, 0 6px 18px rgba(0,0,0,.36)",
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
          display: "inline-block",
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
        <span style={{ marginLeft: 8, color: theme.accent, fontWeight: theme.strongWeight }}>
          {badgeBonusValue}
        </span>
      </div>
    );

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
      `}</style>

      {(animations && theme.shine) && (
        <div
          className="pointer-events-none"
          style={{
            position: "absolute",
            inset: 0,
            width: "33%",
            background: "linear-gradient(to right, transparent, rgba(255,255,255,.10), transparent)",
            animation: "sweep 4.8s linear infinite",
            mixBlendMode: "screen",
          }}
        />
      )}

      {/* default layout */}
      {layout?.mode !== "free" && (
        <>
          {opts?.bonusDock === "right" ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>{BadgeBest}</div>
              <div>{BadgeBonus}</div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {BadgeBest}
              {BadgeBonus}
            </div>
          )}

          <div
            style={{
              marginTop: 20,
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              gap: 20,
            }}
          >
            {/* A */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, minWidth: 0 }}>
              <div style={{ minWidth: 0, textAlign: "right" }}>
                <div className="truncate" style={{ fontSize: 22, color: theme.text, fontWeight: theme.strongWeight }}>
                  {playerA || "—"}
                </div>
                <div className="truncate" style={{ fontSize: 12, color: theme.subtext }}>
                  {sideA?.name || "—"}
                </div>
              </div>
              {theme.showThumbs && (
                <div
                  style={{
                    height: 56, width: 56, overflow: "hidden", borderRadius: theme.radius,
                    background: "rgba(255,255,255,.05)", border: `1px solid ${theme.panelBorder}`, flexShrink: 0,
                  }}
                >
                  {sideA?.thumbnail ? (
                    <img src={sideA.thumbnail} alt="" style={{ height: "100%", width: "100%", objectFit: "cover" }} />
                  ) : null}
                </div>
              )}
            </div>

            {/* VS */}
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  padding: "4px 10px", fontSize: 12, background: theme.vsBg,
                  border: `${theme.panelBorderWidth}px solid ${theme.panelBorder}`, borderRadius: 10,
                  fontWeight: theme.strongWeight,
                }}
              >
                VS
              </div>
            </div>

            {/* B */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              {theme.showThumbs && (
                <div
                  style={{
                    height: 56, width: 56, overflow: "hidden", borderRadius: theme.radius,
                    background: "rgba(255,255,255,.05)", border: `1px solid ${theme.panelBorder}`, flexShrink: 0,
                  }}
                >
                  {sideB?.thumbnail ? (
                    <img src={sideB.thumbnail} alt="" style={{ height: "100%", width: "100%", objectFit: "cover" }} />
                  ) : null}
                </div>
              )}
              <div style={{ minWidth: 0, textAlign: "left" }}>
                <div className="truncate" style={{ fontSize: 22, color: theme.text, fontWeight: theme.strongWeight }}>
                  {playerB || "—"}
                </div>
                <div className="truncate" style={{ fontSize: 12, color: theme.subtext }}>
                  {sideB?.name || "—"}
                </div>
              </div>
            </div>
          </div>

          {/* chips + subtotais */}
          <div style={{ marginTop: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {aPays.map((p, i) => (
                  <Chip key={`a-${i}`} amount={p.amount} ok={Number(p.amount || 0) >= Number(buyCost || 0)} i={i} />
                ))}
              </div>
              <div
                style={{
                  display: "inline-flex", marginTop: 10, alignItems: "center", gap: 8, padding: "6px 12px",
                  fontSize: 12, background: theme.chipBg, border: `${theme.chipBorderWidth}px solid ${theme.chipBorder}`,
                  borderRadius: theme.radius, color: theme.subtext,
                }}
              >
                <span>Subtotal</span>
                <span style={{ color: theme.text, fontWeight: theme.strongWeight }}>{fmtMoney(aPays.reduce((s, r) => s + Number(r?.amount || 0), 0))}</span>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", flexWrap: "wrap" }}>
                {bPays.map((p, i) => (
                  <Chip key={`b-${i}`} amount={p.amount} ok={Number(p.amount || 0) >= Number(buyCost || 0)} i={i} />
                ))}
              </div>
              <div
                style={{
                  display: "inline-flex", marginTop: 10, alignItems: "center", gap: 8, padding: "6px 12px",
                  fontSize: 12, background: theme.chipBg, border: `${theme.chipBorderWidth}px solid ${theme.chipBorder}`,
                  borderRadius: theme.radius, color: theme.subtext,
                }}
              >
                <span>Subtotal</span>
                <span style={{ color: theme.text, fontWeight: theme.strongWeight }}>{fmtMoney(bPays.reduce((s, r) => s + Number(r?.amount || 0), 0))}</span>
              </div>
            </div>
          </div>

          {/* total */}
          <div
            style={{
              marginTop: 24,
              display: "flex",
              justifyContent:
                opts?.totalJustify === "left" ? "flex-start" :
                opts?.totalJustify === "right" ? "flex-end" : "center",
            }}
          >
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
              {opts?.totalLabelMode === "value"
                ? fmtMoney(aTotal + bTotal)
                : `Total paid: ${fmtMoney(aTotal + bTotal)}`}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────────────────── Página Overlay ───────────────────────── */
export default function WidgetOverlay() {
  const [
    { token, battleId, w, h, bw, bh, pad, align, enableAnim, pinSize },
    setLoc,
  ] = React.useState(parseHash());

  // fundo transparente
  React.useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `html,body,#root,#__next{height:100%;width:100%;margin:0;padding:0;background:transparent;overflow:hidden}`;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  // estado
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
    const t = { ...theme };
    if (!enableAnim) { t.pulse = false; t.shine = false; }
    return t;
  }, [theme, enableAnim]);

  React.useEffect(() => {
    const onHash = () => setLoc(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Overlay efetivo (URL só fixa W/H quando pinsize=1; caso contrário usa BD)
  const effOverlay = React.useMemo(() => {
    const o = (opts && opts.overlay) || {};
    const pin = pinSize || o.mode === "fixed";
    const effW = pin ? (pinSize ? w : `${o.width || 1920}px`) : "100vw";
    const effH = pin ? (pinSize ? h : `${o.height || 1080}px`) : "100vh";
    return {
      pin,
      w: effW,
      h: effH,
      baseW: o.baseW || bw || DEFAULT_OPTS.overlay.baseW,
      baseH: o.baseH || bh || DEFAULT_OPTS.overlay.baseH,
      pad: o.pad ?? pad ?? DEFAULT_OPTS.overlay.pad,
      align: (o.align || align || DEFAULT_OPTS.overlay.align).toLowerCase(),
    };
  }, [opts, w, h, bw, bh, pad, align, pinSize]);

  const stageRef = React.useRef(null);
  const scale = useFitScale(stageRef, effOverlay.baseW, effOverlay.baseH, effOverlay.pad, 0.3, 3);

  // realtime + polling
  const channelRef = React.useRef(null);
  const pollRef = React.useRef(null);
  const debounceRef = React.useRef(null);
  const scheduleLoad = (fn) => { clearTimeout(debounceRef.current); debounceRef.current = setTimeout(fn, 120); };

  // resolve ownerId SEM public_token
  async function resolveOwnerIdByToken(tk) {
    if (!tk) return null;

    // 1) tentar por widget_token (se a coluna não existir, ignoramos o erro)
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("widget_token", tk)
        .maybeSingle();
      if (!error && data?.id) return data.id;
    } catch (_) {}

    // 2) se token for UUID, tratar como id direto
    if (isUUID(tk)) return tk;

    return null;
  }

  async function loadAll({ ownerId, bId }) {
    // battle basics
    const { data: bRow } = await supabase
      .from("battles")
      .select("id, best_of, buy_cost")
      .eq("id", bId)
      .maybeSingle();
    if (bRow) {
      setBestOf(Number(bRow.best_of || 1));
      setBuyCost(Number(bRow.buy_cost || 0));
    }

    // settings
    const { data: ws } = await supabase
      .from("battle_widget_settings")
      .select("theme, layout, options")
      .eq("battle_id", bId)
      .maybeSingle();
    if (ws?.theme && !shallowEq(ws.theme, theme)) setTheme({ ...DEFAULT_THEME, ...ws.theme });
    if (ws?.layout && !shallowEq(ws.layout, layout)) setLayout({ ...DEFAULT_LAYOUT, ...ws.layout });
    if (ws?.options && !shallowEq(ws.options, opts)) setOpts({ ...DEFAULT_OPTS, ...ws.options });

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
      setSideA(aBase); setPlayerA(A.player_name || "");
    } else { setSideA(null); setPlayerA(""); }

    if (B) {
      let bBase = { id: B.slot_id ?? null, name: B.slot_name || "" };
      bBase = await enrichSlotInfo(bBase);
      setSideB(bBase); setPlayerB(B.player_name || "");
    } else { setSideB(null); setPlayerB(""); }

    // payments
    const { data: pays } = await supabase
      .from("battle_payments")
      .select("side, amount, buy_idx")
      .eq("battle_id", bId)
      .order("buy_idx", { ascending: true });

    setAPays((pays || [])
      .filter((p) => String(p.side || "").toUpperCase() === "L")
      .map((p) => ({ amount: Number(p.amount) || 0 })));

    setBPays((pays || [])
      .filter((p) => String(p.side || "").toUpperCase() === "R")
      .map((p) => ({ amount: Number(p.amount) || 0 })));
  }

  React.useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr("");

        // 1) battle alvo
        let bId = battleId || null;

        // 2) se não vier o id, resolver pelo token (widget_token ou UUID de profile)
        if (!bId) {
          const ownerId = await resolveOwnerIdByToken(token);
          if (!ownerId) throw new Error("Token inválida ou conta não encontrada.");
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

        await loadAll({ bId });

        // realtime
        if (channelRef.current) supabase.removeChannel(channelRef.current);
        const ch = supabase
          .channel(`overlay-${bId}`)
          .on("postgres_changes",
            { event: "*", schema: "public", table: "battle_payments", filter: `battle_id=eq.${bId}` },
            () => { clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => loadAll({ bId }), 120); })
          .on("postgres_changes",
            { event: "*", schema: "public", table: "battle_entries", filter: `battle_id=eq.${bId}` },
            () => { clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => loadAll({ bId }), 120); })
          .on("postgres_changes",
            { event: "*", schema: "public", table: "battle_widget_settings", filter: `battle_id=eq.${bId}` },
            () => { clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => loadAll({ bId }), 120); })
          .on("postgres_changes",
            { event: "*", schema: "public", table: "battles", filter: `id=eq.${bId}` },
            () => { clearTimeout(debounceRef.current); debounceRef.current = setTimeout(() => loadAll({ bId }), 120); })
          .subscribe();
        channelRef.current = ch;

        // polling de segurança
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => loadAll({ bId }), 7000);
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

  const alignItems =
    effOverlay.align === "top" ? "flex-start" :
    effOverlay.align === "bottom" ? "flex-end" : "center";

  return (
    <div
      ref={stageRef}
      style={{
        position: "fixed",
        inset: 0,
        width: effOverlay.pin ? effOverlay.w : "100vw",
        height: effOverlay.pin ? effOverlay.h : "100vh",
        margin: 0,
        padding: 0,
        background: "transparent",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: "100%", height: "100%",
          display: "flex", justifyContent: "center", alignItems,
          padding: effOverlay.pad, boxSizing: "border-box",
        }}
      >
        {loading ? (
          <div style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, opacity: 0.8, background: "rgba(0,0,0,.35)", color: "white" }}>
            Loading overlay…
          </div>
        ) : err ? (
          <div style={{ padding: "8px 12px", borderRadius: 8, fontSize: 12, background: "rgba(239,68,68,.15)", color: "rgb(252,165,165)", border: "1px solid rgba(239,68,68,.35)" }}>
            {err}
          </div>
        ) : (
          <div style={{ position: "relative", width: effOverlay.baseW * scale, height: effOverlay.baseH * scale }}>
            <div style={{ position: "absolute", left: 0, top: 0, width: effOverlay.baseW, height: effOverlay.baseH, transform: `scale(${scale})`, transformOrigin: "top left" }}>
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
                animations={enableAnim}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
