// src/battle-view.jsx
import React from "react";
import { useTheme } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Coins,
  Gamepad2,
  TrendingUp,
  Shield,
  Users,
} from "lucide-react";

/* ───────────────────────── utils / style helpers ───────────────────────── */
const cn = (...c) => c.filter(Boolean).join(" ");
const LOCALE = "pt-PT";
const CURRENCY = "EUR";
const fmtMoney = (n) =>
  Number.isFinite(Number(n))
    ? new Intl.NumberFormat(LOCALE, {
        style: "currency",
        currency: CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(n))
    : "—";

const toNum = (v) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/* ───────────────────────── debounce ───────────────────────── */
function useDebounced(v, delay) {
  const [s, setS] = React.useState(v);
  React.useEffect(() => {
    const id = setTimeout(() => setS(v), delay || 300);
    return () => clearTimeout(id);
  }, [v, delay]);
  return s;
}

/* ───────────────────────── SlotsAutocomplete ───────────────────────── */
function SlotsAutocomplete({ value, onSelect, placeholder = "Add a Slot" }) {
  const { isDark } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(
    typeof value === "object" && value !== null
      ? value.name ?? ""
      : typeof value === "string"
      ? value
      : ""
  );
  const [items, setItems] = React.useState([]);
  const [errorMsg, setErrorMsg] = React.useState("");
  const boxRef = React.useRef(null);
  const dQuery = useDebounced(query, 250);

  const currentValueName = React.useMemo(
    () =>
      typeof value === "object" && value !== null
        ? value.name ?? ""
        : typeof value === "string"
        ? value
        : "",
    [value]
  );

  React.useEffect(() => setQuery(currentValueName), [currentValueName]);

  const commitFreeText = React.useCallback(() => {
    const q = (query || "").trim();
    const cur = (currentValueName || "").trim();
    if (!q || q === cur) {
      setOpen(false);
      return;
    }
    onSelect && onSelect({ id: null, name: q });
    setOpen(false);
  }, [onSelect, query, currentValueName]);

  React.useEffect(() => {
    const onDoc = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setOpen(false);
        commitFreeText();
      }
    };
    const onEsc = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        commitFreeText();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [commitFreeText]);

  React.useEffect(() => {
    let cancelled = false;
    (async function run() {
      const q = (dQuery || "").trim();
      setErrorMsg("");
      if (q.length < 3) {
        if (!cancelled) setItems([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("slots_catalog")
          .select('id, "NAME", "PROVIDER", "THUMBNAIL"')
          .or(`NAME.ilike.%${q}%,PROVIDER.ilike.%${q}%`)
          .order("NAME", { ascending: true })
          .limit(12);
        if (error) throw error;
        if (!cancelled) setItems(data || []);
      } catch (e) {
        if (!cancelled) {
          setErrorMsg(e?.message || "Erro na pesquisa.");
          setItems([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dQuery]);

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="h-11 rounded-xl bg-zinc-900/60 border-white/10 text-white pl-9 focus-visible:ring-1 focus-visible:ring-sky-400 placeholder:text-white/40"
        />
        <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60" />
      </div>
      {open && (
        <div
          className={cn(
            "absolute z-40 mt-2 w-full rounded-xl overflow-hidden border",
            isDark ? "bg-zinc-950/95 border-white/10 shadow-2xl" : "bg-white border-zinc-200 shadow-xl"
          )}
        >
          {errorMsg && <div className="px-3 py-2 text-sm text-red-400">{errorMsg}</div>}
          {!errorMsg && items.length === 0 ? (
            <div className="px-3 py-2 text-sm opacity-70">
              Sem resultados. Escreve o nome e clica fora para usar o texto.
            </div>
          ) : (
            <ul className="max-h-72 overflow-auto divide-y divide-white/5">
              {items.map((it) => (
                <li key={it.id}>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-white/5 transition flex items-center gap-3"
                    onClick={() => {
                      onSelect &&
                        onSelect({
                          id: it.id,
                          name: it["NAME"],
                          provider: it["PROVIDER"],
                          thumbnail: it["THUMBNAIL"],
                        });
                      setQuery(it["NAME"]);
                      setOpen(false);
                    }}
                  >
                    {it["THUMBNAIL"] ? (
                      <img src={it["THUMBNAIL"]} alt="" className="h-6 w-6 rounded object-contain" />
                    ) : (
                      <div className="h-6 w-6 rounded bg-white/10" />
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm">{it["NAME"]}</div>
                      <div className="text-[11px] opacity-60 truncate">{it["PROVIDER"] || "—"}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Accent/ KPI cards usados fora do widget ───────────────────────── */
function AccentCard({ title, children, className }) {
  const { isDark } = useTheme();
  return (
    <div
      className={cn(
        "relative rounded-xl",
        isDark ? "bg-white/5 border border-white/10" : "bg-white border border-zinc-200",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-sky-500/70 shadow-[0_0_12px_2px_rgba(56,189,248,0.35)]" />
      {title && <div className="px-4 pt-4 pb-1 text-xs opacity-80">{title}</div>}
      <div className="px-4 pt-5 pb-4">{children}</div>
    </div>
  );
}
function Kpi({ icon, label, value, tone = "neutral" }) {
  const toneCls =
    tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-rose-400" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
      <div className="rounded-lg bg-black/40 p-2 border border-white/10">{icon}</div>
      <div>
        <div className="text-xs opacity-70">{label}</div>
        <div className={cn("text-lg", toneCls)}>{value}</div>
      </div>
    </div>
  );
}

/* ╔══════════════════════╗
   ║  WIDGET + CUSTOMIZE  ║
   ╚══════════════════════╝ */
const DEFAULT_WIDGET_THEME = {
  panelBgStart: "#0b1020",
  panelBgEnd: "#131a3a",
  panelBorder: "rgba(255,255,255,.08)",
  textMain: "#d7e6ff",
  textSub: "rgba(255,255,255,.65)",
  pillBg: "rgba(255,255,255,.06)",
  pillBorder: "rgba(255,255,255,.14)",
  pillText: "#cfe6ff",
  pillRadius: 18,
  chipGoodBg: "rgba(34,197,94,.18)",
  chipGoodText: "#8ef5b9",
  chipBadBg: "rgba(244,63,94,.18)",
  chipBadText: "#ffb3bf",
  chipNeutralBg: "rgba(255,255,255,.08)",
  chipNeutralText: "rgba(255,255,255,.85)",
  chipRadius: 12,
  chipBorder: "rgba(255,255,255,.12)",
  subBoxBg: "rgba(255,255,255,.06)",
  subBoxBorder: "rgba(255,255,255,.12)",
  subBoxText: "#cfe6ff",
  subBoxRadius: 14,
  totalBg: "rgba(255,255,255,.06)",
  totalBorder: "rgba(255,255,255,.14)",
  totalText: "#aee0ff",
  totalRadius: 20,
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Apple Color Emoji, Segoe UI Emoji",
  fontSize: 16,
};
const pick = (o, k, d) => (o && o[k] != null ? o[k] : d);

function Pill({ theme, children }) {
  return (
    <div
      style={{
        background: pick(theme, "pillBg"),
        border: `1px solid ${pick(theme, "pillBorder")}`,
        color: pick(theme, "pillText"),
        borderRadius: pick(theme, "pillRadius"),
        fontWeight: 400,
        padding: "8px 14px",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        lineHeight: 1,
      }}
    >
      {children}
    </div>
  );
}
function BuyChip({ theme, value, good, bad }) {
  const bg = good
    ? pick(theme, "chipGoodBg")
    : bad
    ? pick(theme, "chipBadBg")
    : pick(theme, "chipNeutralBg");
  const fg = good
    ? pick(theme, "chipGoodText")
    : bad
    ? pick(theme, "chipBadText")
    : pick(theme, "chipNeutralText");
  return (
    <div
      style={{
        background: bg,
        color: fg,
        border: `1px solid ${pick(theme, "chipBorder")}`,
        borderRadius: pick(theme, "chipRadius"),
        padding: "6px 12px",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        lineHeight: 1,
        fontWeight: 400,
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: fg,
          opacity: 0.9,
        }}
      />
      {value}
    </div>
  );
}
function SmallBox({ theme, label, value }) {
  return (
    <div
      style={{
        background: pick(theme, "subBoxBg"),
        border: `1px solid ${pick(theme, "subBoxBorder")}`,
        borderRadius: pick(theme, "subBoxRadius"),
        padding: "10px 14px",
        color: pick(theme, "subBoxText"),
        fontWeight: 400,
        lineHeight: 1.25,
      }}
    >
      <div style={{ opacity: 0.7, fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 14, marginTop: 3 }}>{value}</div>
    </div>
  );
}
function BattleWidget({
  theme,
  bestOf,
  buyCost,
  sideA,
  sideB,
  playerA,
  playerB,
  paysLeft = [],
  paysRight = [],
  totalPay = 0,
}) {
  const base = {
    fontFamily: pick(theme, "fontFamily"),
    fontSize: pick(theme, "fontSize"),
    color: pick(theme, "textMain"),
    fontWeight: 400,
  };
  const sub = { color: pick(theme, "textSub") };
  const good = (v) => toNum(v) >= toNum(buyCost);
  const bad = (v) => toNum(v) > 0 && toNum(v) < toNum(buyCost);
  const sum = (arr) => arr.reduce((a, b) => a + toNum(b), 0);
  const leftSum = sum(paysLeft.map((p) => p.amount ?? p));
  const rightSum = sum(paysRight.map((p) => p.amount ?? p));

  return (
    <div
      style={{
        ...base,
        background: `linear-gradient(90deg, ${pick(theme, "panelBgStart")} 0%, ${pick(
          theme,
          "panelBgEnd"
        )} 100%)`,
        border: `1px solid ${pick(theme, "panelBorder")}`,
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 18,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Pill theme={theme}>
          <span style={sub}>Best of</span>
          <span>{bestOf}</span>
        </Pill>
        <Pill theme={theme}>
          <span>Bonus Buy</span>
          <span style={{ opacity: 0.9 }}>{fmtMoney(buyCost)}</span>
        </Pill>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 24,
          marginBottom: 16,
        }}
      >
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 26, fontWeight: 400 }}>{playerA || "—"}</div>
          <div style={{ ...sub, fontSize: 12, marginTop: 4 }}>{sideA?.name || "—"}</div>
        </div>
        <div
          style={{
            background: pick(theme, "pillBg"),
            border: `1px solid ${pick(theme, "pillBorder")}`,
            color: pick(theme, "pillText"),
            borderRadius: pick(theme, "pillRadius"),
            padding: "6px 10px",
          }}
        >
          VS
        </div>
        <div>
          <div style={{ fontSize: 26, fontWeight: 400 }}>{playerB || "—"}</div>
          <div style={{ ...sub, fontSize: 12, marginTop: 4 }}>{sideB?.name || "—"}</div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {paysLeft.map((p, i) => {
              const v = toNum(p.amount ?? p);
              return (
                <BuyChip
                  key={`L-${i}`}
                  theme={theme}
                  value={fmtMoney(v)}
                  good={good(v)}
                  bad={bad(v)}
                />
              );
            })}
          </div>
          <SmallBox theme={theme} label="Subtotal" value={fmtMoney(leftSum)} />
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {paysRight.map((p, i) => {
              const v = toNum(p.amount ?? p);
              return (
                <BuyChip
                  key={`R-${i}`}
                  theme={theme}
                  value={fmtMoney(v)}
                  good={good(v)}
                  bad={bad(v)}
                />
              );
            })}
          </div>
          <SmallBox theme={theme} label="Subtotal" value={fmtMoney(rightSum)} />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
        <div
          style={{
            background: pick(theme, "totalBg"),
            border: `1px solid ${pick(theme, "totalBorder")}`,
            color: pick(theme, "totalText"),
            borderRadius: pick(theme, "totalRadius"),
            padding: "10px 16px",
            fontSize: 18,
            fontWeight: 400,
          }}
        >
          Total pago: {fmtMoney(totalPay)}
        </div>
      </div>
    </div>
  );
}
function ColorRow({ label, value, onChange }) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-40 text-xs opacity-70">{label}</span>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-10 rounded border border-white/10 bg-transparent"
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-9 rounded border border-white/10 bg-transparent px-2 text-sm"
      />
    </label>
  );
}
function SliderRow({ label, value, min = 0, max = 40, step = 1, unit = "px", onChange }) {
  return (
    <label className="grid grid-cols-[10rem_1fr_auto] items-center gap-3">
      <span className="text-xs opacity-70">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="text-xs opacity-70 w-12 text-right">{value + unit}</span>
    </label>
  );
}
function WidgetCustomizer({ theme, setTheme, onPreview }) {
  const set = (k, v) => setTheme((t) => ({ ...t, [k]: v }));
  return (
    <div className="grid md:grid-cols-2 gap-5">
      <div className="space-y-3">
        <ColorRow label="Texto principal" value={theme.textMain} onChange={(v) => set("textMain", v)} />
        <ColorRow label="Texto secundário" value={theme.textSub} onChange={(v) => set("textSub", v)} />
        <ColorRow label="Painel início" value={theme.panelBgStart} onChange={(v) => set("panelBgStart", v)} />
        <ColorRow label="Painel fim" value={theme.panelBgEnd} onChange={(v) => set("panelBgEnd", v)} />
        <ColorRow label="Borda painel" value={theme.panelBorder} onChange={(v) => set("panelBorder", v)} />
      </div>
      <div className="space-y-3">
        <ColorRow label="Pill bg" value={theme.pillBg} onChange={(v) => set("pillBg", v)} />
        <ColorRow label="Pill borda" value={theme.pillBorder} onChange={(v) => set("pillBorder", v)} />
        <ColorRow label="Pill texto" value={theme.pillText} onChange={(v) => set("pillText", v)} />
        <SliderRow label="Pill radius" value={theme.pillRadius} onChange={(v) => set("pillRadius", v)} />
      </div>
      <div className="space-y-3">
        <ColorRow label="Buy OK bg" value={theme.chipGoodBg} onChange={(v) => set("chipGoodBg", v)} />
        <ColorRow label="Buy OK texto" value={theme.chipGoodText} onChange={(v) => set("chipGoodText", v)} />
        <ColorRow label="Buy NOK bg" value={theme.chipBadBg} onChange={(v) => set("chipBadBg", v)} />
        <ColorRow label="Buy NOK texto" value={theme.chipBadText} onChange={(v) => set("chipBadText", v)} />
        <SliderRow label="Buy radius" value={theme.chipRadius} onChange={(v) => set("chipRadius", v)} />
      </div>
      <div className="space-y-3">
        <ColorRow label="Subtotal bg" value={theme.subBoxBg} onChange={(v) => set("subBoxBg", v)} />
        <ColorRow label="Subtotal borda" value={theme.subBoxBorder} onChange={(v) => set("subBoxBorder", v)} />
        <ColorRow label="Subtotal texto" value={theme.subBoxText} onChange={(v) => set("subBoxText", v)} />
        <SliderRow label="Subtotal radius" value={theme.subBoxRadius} onChange={(v) => set("subBoxRadius", v)} />
        <ColorRow label="Total bg" value={theme.totalBg} onChange={(v) => set("totalBg", v)} />
        <ColorRow label="Total borda" value={theme.totalBorder} onChange={(v) => set("totalBorder", v)} />
        <ColorRow label="Total texto" value={theme.totalText} onChange={(v) => set("totalText", v)} />
        <SliderRow label="Total radius" value={theme.totalRadius} onChange={(v) => set("totalRadius", v)} />
      </div>
      <div className="space-y-3 md:col-span-2">
        <label className="grid grid-cols-[10rem_1fr_auto] items-center gap-3">
          <span className="text-xs opacity-70">Font family</span>
          <input
            value={theme.fontFamily}
            onChange={(e) => set("fontFamily", e.target.value)}
            className="h-9 rounded border border-white/10 bg-transparent px-2 text-sm"
          />
          <span />
        </label>
        <SliderRow
          label="Font size base"
          value={theme.fontSize}
          min={12}
          max={22}
          onChange={(v) => set("fontSize", v)}
        />
        <div className="flex gap-2">
          <Button
            className="h-9"
            onClick={() => {
              localStorage.setItem("battleWidgetTheme", JSON.stringify(theme));
              onPreview && onPreview();
            }}
          >
            Guardar tema
          </Button>
          <Button
            className="h-9"
            variant="outline"
            onClick={() => {
              localStorage.removeItem("battleWidgetTheme");
              onPreview && onPreview();
              location.reload();
            }}
          >
            Restaurar padrão
          </Button>
        </div>
      </div>
    </div>
  );
}
function WidgetPanel({
  battleId,
  sideA,
  sideB,
  playerA,
  playerB,
  bestOf,
  buyCost,
  paysLeft,
  paysRight,
  totalPay,
}) {
  const [tab, setTab] = React.useState("preview");
  const [theme, setTheme] = React.useState(() => {
    try {
      return {
        ...DEFAULT_WIDGET_THEME,
        ...(JSON.parse(localStorage.getItem("battleWidgetTheme")) || {}),
      };
    } catch {
      return { ...DEFAULT_WIDGET_THEME };
    }
  });

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Button
          type="button"
          variant={tab === "preview" ? "default" : "outline"}
          className="h-9"
          onClick={() => setTab("preview")}
        >
          Preview
        </Button>
        <Button
          type="button"
          variant={tab === "customize" ? "default" : "outline"}
          className="h-9"
          onClick={() => setTab("customize")}
        >
          Customize
        </Button>
      </div>

      {tab === "preview" ? (
        <BattleWidget
          theme={theme}
          bestOf={bestOf}
          buyCost={buyCost}
          sideA={sideA}
          sideB={sideB}
          playerA={playerA}
          playerB={playerB}
          paysLeft={paysLeft}
          paysRight={paysRight}
          totalPay={totalPay}
        />
      ) : (
        <WidgetCustomizer theme={theme} setTheme={setTheme} onPreview={() => setTab("preview")} />
      )}
    </div>
  );
}

/* ───────────────────────── Página ───────────────────────── */
export default function BattleView() {
  const { isDark } = useTheme();

  // id a partir do hash: #/battles/123
  const [battleId, setBattleId] = React.useState(null);
  React.useEffect(function () {
    function read() {
      const h = String(window.location.hash || "");
      const parts = h.replace(/^#\//, "").split("/");
      const id = Number(parts[1] || parts[0]);
      setBattleId(Number.isFinite(id) ? id : null);
    }
    read();
    window.addEventListener("hashchange", read);
    return function () {
      window.removeEventListener("hashchange", read);
    };
  }, []);

  const [busy, setBusy] = React.useState(true);
  const [row, setRow] = React.useState(null); // battles
  const [err, setErr] = React.useState("");

  // settings
  const [bestOf, setBestOf] = React.useState(1);
  const [buyCost, setBuyCost] = React.useState(0);

  // entries
  const [sideA, setSideA] = React.useState(null); // {id,name,provider,thumbnail}
  const [sideB, setSideB] = React.useState(null);
  const [playerA, setPlayerA] = React.useState("");
  const [playerB, setPlayerB] = React.useState("");

  // payments
  const [pays, setPays] = React.useState([]); // battle_payments

  // historial resumido por slot
  const [histA, setHistA] = React.useState(null);
  const [histB, setHistB] = React.useState(null);

  const plannedBuys = Math.max(1, Number(bestOf) || 1) * 2; // 1 buy por lado por round
  const totalPay = (pays || []).reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalCost = Number(buyCost || 0) * plannedBuys;
  const profit = totalPay - totalCost;
  const profitTone = profit > 0 ? "positive" : profit < 0 ? "negative" : "neutral";

  const aPays = (pays || []).filter((r) => String(r.side || "").toUpperCase() === "L");
  const bPays = (pays || []).filter((r) => String(r.side || "").toUpperCase() === "R");

  const aStats = {
    count: aPays.length,
    total: aPays.reduce((s, r) => s + Number(r.amount || 0), 0),
    best: aPays.length ? Math.max(...aPays.map((r) => Number(r.amount || 0))) : 0,
    worst: aPays.length ? Math.min(...aPays.map((r) => Number(r.amount || 0))) : 0,
  };
  const bStats = {
    count: bPays.length,
    total: bPays.reduce((s, r) => s + Number(r.amount || 0), 0),
    best: bPays.length ? Math.max(...bPays.map((r) => Number(r.amount || 0))) : 0,
    worst: bPays.length ? Math.min(...bPays.map((r) => Number(r.amount || 0))) : 0,
  };

  const load = React.useCallback(async function (id) {
    if (!id) return;
    try {
      setBusy(true);
      setErr("");
      // battle
      const { data: battle, error } = await supabase
        .from("battles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      setRow(battle);
      setBestOf(Number(battle?.best_of) || 1);
      setBuyCost(Number(battle?.buy_cost) || 0);

      // entries
      const { data: es } = await supabase
        .from("battle_entries")
        .select("seed, slot_name, slot_id, player_name")
        .eq("battle_id", id);
      const A = (es || []).find((e) => String(e.seed).toUpperCase() === "A");
      const B = (es || []).find((e) => String(e.seed).toUpperCase() === "B");
      setSideA(A ? { id: A.slot_id ?? null, name: A.slot_name || "" } : null);
      setPlayerA(A?.player_name || "");
      setSideB(B ? { id: B.slot_id ?? null, name: B.slot_name || "" } : null);
      setPlayerB(B?.player_name || "");

      // payments
      const { data: ps } = await supabase
        .from("battle_payments")
        .select("*")
        .eq("battle_id", id)
        .order("buy_idx", { ascending: true });
      setPays(ps || []);

      // histórico das slots selecionadas (em batalhas anteriores)
      if (A?.slot_id || A?.slot_name) setHistA(await fetchSlotHistory(A));
      else setHistA(null);
      if (B?.slot_id || B?.slot_name) setHistB(await fetchSlotHistory(B));
      else setHistB(null);
    } catch (e) {
      setErr(e.message || "Failed to load battle");
      setRow(null);
      setPays([]);
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(() => {
    if (battleId) load(battleId);
  }, [battleId, load]);

  async function saveSettings() {
    if (!battleId) return;
    try {
      await supabase
        .from("battles")
        .update({ best_of: Number(bestOf) || 1, buy_cost: Number(buyCost) || 0 })
        .eq("id", battleId);
      await load(battleId);
    } catch (e) {
      alert(e.message || "Failed to save settings");
    }
  }

  async function saveSides() {
    if (!battleId) return;
    try {
      const rows = [];
      if (sideA?.name)
        rows.push({
          battle_id: battleId,
          seed: "A",
          player_name: playerA || null,
          slot_name: sideA.name,
          slot_id: sideA.id ?? null,
        });
      if (sideB?.name)
        rows.push({
          battle_id: battleId,
          seed: "B",
          player_name: playerB || null,
          slot_name: sideB.name,
          slot_id: sideB.id ?? null,
        });
      if (!rows.length) return;

      const { error } = await supabase
        .from("battle_entries")
        .upsert(rows, { onConflict: "battle_id,seed" });
      if (error) throw error;

      await load(battleId);
    } catch (e) {
      alert(e?.message || "Falha a guardar os lados");
    }
  }

  async function setBuy(side, idx, amount) {
    if (!battleId) return;
    const payload = {
      battle_id: battleId,
      round_idx: 0,
      match_idx: 0,
      side,
      buy_idx: idx,
      amount: Number(amount) || 0,
    };
    try {
      await supabase
        .from("battle_payments")
        .upsert([payload], { onConflict: "battle_id,round_idx,match_idx,side,buy_idx" });
      const { data: ps } = await supabase
        .from("battle_payments")
        .select("*")
        .eq("battle_id", battleId)
        .order("buy_idx", { ascending: true });
      setPays(ps || []);
    } catch (e) {
      alert(e.message || "Failed to save buy");
    }
  }

  async function fetchSlotHistory(slotEntry) {
    try {
      let q = supabase.from("battle_entries").select("battle_id, slot_id, slot_name");
      if (slotEntry?.slot_id) q = q.eq("slot_id", slotEntry.slot_id);
      else if (slotEntry?.slot_name) q = q.ilike("slot_name", `%${slotEntry.slot_name}%`);
      const { data: ents } = await q.limit(200);

      if (!ents?.length) {
        return { times: 0, total: 0, best: 0, worst: 0, last: "—" };
      }

      const battleIds = [...new Set(ents.map((e) => e.battle_id))];
      const { data: paysRows } = await supabase
        .from("battle_payments")
        .select("*")
        .in("battle_id", battleIds);

      const am = (paysRows || []).map((p) => Number(p.amount || 0));
      const total = am.reduce((a, b) => a + b, 0);
      const best = am.length ? Math.max(...am) : 0;
      const worst = am.length ? Math.min(...am) : 0;

      const { data: battles } = await supabase
        .from("battles")
        .select("id, created_at")
        .in("id", battleIds)
        .order("created_at", { ascending: false })
        .limit(1);

      const last = battles?.[0]?.created_at
        ? new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium" }).format(
            new Date(battles[0].created_at)
          )
        : "—";

      return { times: am.length, total, best, worst, last };
    } catch {
      return { times: 0, total: 0, best: 0, worst: 0, last: "—" };
    }
  }

  function BuysEditor({ side, stats, player }) {
    const isLeft = side === "L";
    const label = isLeft ? "Side A" : "Side B";
    const buys = (pays || []).filter((p) => String(p.side || "").toUpperCase() === side);

    const inputs = [];
    const maxN = Math.max(plannedBuys / 2, buys.length, 3);
    for (let i = 1; i <= maxN; i++) {
      const r = buys.find((x) => Number(x.buy_idx) === i);
      inputs.push(
        <div key={`${side}-${i}`} className="flex items-center gap-2">
          <div className="w-12 text-xs opacity-70">Buy {i}</div>
          <Input
            type="number"
            step="0.01"
            defaultValue={r ? r.amount : ""}
            onBlur={(e) => setBuy(side, i, e.target.value)}
            className="h-9 rounded-lg bg-zinc-900 border-white/10 text-white"
          />
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-white/10 p-3">
        <div className="mb-2 text-xs opacity-70">{label}</div>
        <div className="grid md:grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Slot</div>
            <div className="font-normal">{isLeft ? sideA?.name || "—" : sideB?.name || "—"}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Player</div>
            <div className="font-normal">{player || "—"}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Buys registados</div>
            <div className="font-normal">{stats.count}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Total pago</div>
            <div className="font-normal">{fmtMoney(stats.total)}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Best win</div>
            <div className="font-normal">{fmtMoney(stats.best)}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Worst payment</div>
            <div className="font-normal">{fmtMoney(stats.worst)}</div>
          </div>
        </div>
        <div className="mt-3 grid gap-2">{inputs}</div>
      </div>
    );
  }

  return (
    <section className="py-8 md:py-10">
      <div className="max-w-7xl mx-auto px-4">
        {/* header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl">Battle {row ? `#${row.id}` : ""}</h1>
            {row?.status ? (
              <span className="ml-2 text-xs rounded-lg border border-white/10 bg-white/5 px-2 py-0.5">
                {row.status}
              </span>
            ) : null}
          </div>
          <div className="text-sm opacity-70">
            {row?.created_at ? new Date(row.created_at).toLocaleDateString() : ""}
          </div>
        </div>

        {err ? (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {err}
          </div>
        ) : null}

        {/* grid  */}
        <div className="grid lg:grid-cols-[520px_1fr] gap-6">
          {/* LEFT: overview + stats + widget */}
          <div className="space-y-4">
            <AccentCard>
              {/* settings (editáveis) */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs opacity-70 mb-1">Best Of</div>
                  <select
                    value={bestOf}
                    onChange={(e) => setBestOf(e.target.value)}
                    className="h-11 w-full rounded-xl bg-zinc-900 border border-white/10 px-3 text-sm"
                  >
                    {[1, 3, 5, 7, 9].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-1">Buy cost</div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">€</span>
                    <Input
                      inputMode="decimal"
                      type="number"
                      step="0.01"
                      value={buyCost}
                      onChange={(e) => setBuyCost(e.target.value)}
                      className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white pl-7"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <Button onClick={saveSettings} className="h-10">
                  Save settings
                </Button>
              </div>
            </AccentCard>

            <AccentCard>
              <div className="grid grid-cols-3 gap-3">
                <Kpi icon={<Coins className="h-5 w-5" />} label="Total Pay" value={fmtMoney(totalPay)} />
                <Kpi icon={<Gamepad2 className="h-5 w-5" />} label="Score" value={aPays.length + bPays.length} />
                <Kpi
                  icon={<TrendingUp className="h-5 w-5" />}
                  label="Profit"
                  value={fmtMoney(profit)}
                  tone={profitTone}
                />
              </div>
            </AccentCard>

            {/* WIDGET PREVIEW + CUSTOMIZE */}
            <WidgetPanel
              battleId={battleId}
              sideA={sideA}
              sideB={sideB}
              playerA={playerA}
              playerB={playerB}
              bestOf={bestOf}
              buyCost={buyCost}
              paysLeft={aPays}
              paysRight={bPays}
              totalPay={totalPay}
            />
          </div>

          {/* RIGHT: seleção de lados + histórico + buys */}
          <div className="space-y-4">
            <AccentCard title="Battle">
              <div className="grid md:grid-cols-2 gap-4">
                {/* SIDE A */}
                <div>
                  <div className="text-xs opacity-70 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Side A
                  </div>
                  <div className="space-y-2">
                    <SlotsAutocomplete value={sideA} onSelect={(v) => setSideA(v)} placeholder="Add a Slot" />
                    <div>
                      <div className="text-xs opacity-70 mb-1">Player</div>
                      <Input
                        value={playerA}
                        onChange={(e) => setPlayerA(e.target.value)}
                        placeholder="Player name"
                        className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* SIDE B */}
                <div>
                  <div className="text-xs opacity-70 mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Side B
                  </div>
                  <div className="space-y-2">
                    <SlotsAutocomplete value={sideB} onSelect={(v) => setSideB(v)} placeholder="Add a Slot" />
                    <div>
                      <div className="text-xs opacity-70 mb-1">Player</div>
                      <Input
                        value={playerB}
                        onChange={(e) => setPlayerB(e.target.value)}
                        placeholder="Player name"
                        className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={saveSides} className="h-10">
                  Save sides
                </Button>
              </div>
            </AccentCard>

            {/* Histórico + buys editor */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Times</div>
                    <div className="font-normal">{histA?.times ?? 0}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Total</div>
                    <div className="font-normal">{fmtMoney(histA?.total ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Best</div>
                    <div className="font-normal">{fmtMoney(histA?.best ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Worst</div>
                    <div className="font-normal">{fmtMoney(histA?.worst ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2 col-span-2">
                    <div className="text-xs opacity-70">Last</div>
                    <div className="font-normal">{histA?.last ?? "—"}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Times</div>
                    <div className="font-normal">{histB?.times ?? 0}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Total</div>
                    <div className="font-normal">{fmtMoney(histB?.total ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Best</div>
                    <div className="font-normal">{fmtMoney(histB?.best ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Worst</div>
                    <div className="font-normal">{fmtMoney(histB?.worst ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2 col-span-2">
                    <div className="text-xs opacity-70">Last</div>
                    <div className="font-normal">{histB?.last ?? "—"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <BuysEditor side="L" stats={aStats} player={playerA} />
              <BuysEditor side="R" stats={bStats} player={playerB} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
