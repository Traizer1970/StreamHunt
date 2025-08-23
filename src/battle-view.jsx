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
  Copy,
  ExternalLink,
  SlidersHorizontal,
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

/* Tema por defeito do widget (customizável) */
const DEFAULT_THEME = {
  bgStart: "#0b1020",
  bgEnd: "#111827",
  panelBg: "rgba(255,255,255,0.06)",
  panelBorder: "rgba(255,255,255,0.12)",
  text: "#e5e7eb",
  subtext: "#9ca3af",
  accent: "#60a5fa",
  chipBg: "rgba(255,255,255,0.08)",
  chipBorder: "rgba(255,255,255,0.18)",
  pos: "#34d399",
  neg: "#f87171",
  vsBg: "rgba(99,102,241,0.35)",
  radius: 18,
  showThumbs: true,
  shine: true,
  pulse: true,
};

/* helpers: tema em localStorage (sem BD) */
const THEME_KEY = (id) => `battle_theme_${id}`;
const loadTheme = (battleId) => {
  try {
    const raw = localStorage.getItem(THEME_KEY(battleId));
    return raw ? { ...DEFAULT_THEME, ...JSON.parse(raw) } : { ...DEFAULT_THEME };
  } catch {
    return { ...DEFAULT_THEME };
  }
};
const saveTheme = (battleId, theme) => {
  try {
    localStorage.setItem(THEME_KEY(battleId), JSON.stringify(theme));
  } catch {}
};

/* Enriquecer um objeto {id,name} com provider/thumbnail da slots_catalog */
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
    if (data) {
      return {
        id: data.id,
        name: data["NAME"],
        provider: data["PROVIDER"],
        thumbnail: data["THUMBNAIL"],
      };
    }
  } catch {
    /* ignore */
  }
  return slot;
}

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
        <div className={cn("text-lg font-semibold", toneCls)}>{value}</div>
      </div>
    </div>
  );
}

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

/* ───────────────────────── Widget Preview + Customize ───────────────────────── */
function WidgetCard({
  battleId,
  sideA,
  sideB,
  playerA,
  playerB,
  bestOf,
  buyCost,
  totalPay,
  profit,
  aPays = [],
  bPays = [],
}) {
  const [tab, setTab] = React.useState("preview"); // 'preview' | 'customize'
  const [theme, setTheme] = React.useState(() => loadTheme(battleId));
  React.useEffect(() => setTheme(loadTheme(battleId)), [battleId]);

  const url = `${window.location.origin}/#/widget/battle/${battleId}`;
  const profitColor = profit > 0 ? theme.pos : profit < 0 ? theme.neg : theme.accent;

  const chip = (v, i) => (
    <span
      key={i}
      className="inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold mr-1 mb-1"
      style={{
        background: theme.chipBg,
        border: `1px solid ${theme.chipBorder}`,
        color: theme.text,
        animation: theme.pulse ? `pop .16s ease-out both` : "none",
        animationDelay: `${i * 45}ms`,
      }}
    >
      {fmtMoney(Number(v?.amount || 0))}
    </span>
  );

  return (
    <AccentCard title="Widget">
      {/* tabs header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setTab("preview")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm border",
              tab === "preview"
                ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-200"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
            )}
          >
            Preview
          </button>
          <button
            onClick={() => setTab("customize")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm border inline-flex items-center gap-2",
              tab === "customize"
                ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-200"
                : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
            )}
          >
            <SlidersHorizontal className="h-4 w-4" /> Customize
          </button>
        </div>

        {/* actions */}
        {tab === "preview" && (
          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => navigator.clipboard.writeText(url)}
              className="h-9"
              title="Copiar URL para o OBS (Browser Source)"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar URL
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
              title="Abrir overlay numa nova janela"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir overlay
            </Button>
          </div>
        )}
      </div>

      {tab === "preview" ? (
        <>
          {/* Keyframes (inline para não depender de CSS global) */}
          <style>{`
            @keyframes sweep { 0% { transform: translateX(-120%);} 100% { transform: translateX(120%);} }
            @keyframes pop { 0% { transform: scale(.96); opacity: 0;} 100% { transform: scale(1); opacity: 1;} }
            @keyframes glow { 0% { box-shadow: 0 0 0 rgba(0,0,0,0);} 100% { box-shadow: 0 15px 40px rgba(0,0,0,.45);} }
          `}</style>

          <div
            className="relative rounded-xl overflow-hidden p-4"
            style={{
              background: `linear-gradient(135deg, ${theme.bgStart}, ${theme.bgEnd})`,
              border: `1px solid ${theme.panelBorder}`,
              borderRadius: theme.radius,
              color: theme.text,
              animation: "glow .3s ease-out both",
            }}
          >
            {/* shine */}
            {theme.shine && (
              <div
                className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                style={{ animation: "sweep 4.8s linear infinite" }}
              />
            )}

            {/* header */}
            <div className="flex items-center justify-between text-xs" style={{ color: theme.subtext }}>
              <div>
                Best of {bestOf} • Buy <span style={{ color: theme.text }}>{fmtMoney(buyCost)}</span>
              </div>
              <div className="font-semibold" style={{ color: profitColor }}>
                Profit: {fmtMoney(profit)}
              </div>
            </div>

            {/* players row */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-4">
              {/* LEFT */}
              <div className="flex items-center justify-end gap-3">
                <div className="min-w-0 text-right">
                  <div className="text-xl font-extrabold truncate" style={{ color: theme.text }}>
                    {playerA || "—"}
                  </div>
                  <div className="text-[12px] truncate" style={{ color: theme.subtext }}>
                    {sideA?.name || "—"}
                  </div>
                </div>
                {theme.showThumbs && (
                  <div
                    className="h-14 w-14 rounded-xl overflow-hidden ring-1 bg-white/5"
                    style={{ borderColor: theme.panelBorder }}
                  >
                    {sideA?.thumbnail ? (
                      <img src={sideA.thumbnail} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                  </div>
                )}
              </div>

              {/* VS */}
              <div className="flex justify-center">
                <div
                  className={cn(
                    "px-3 py-1 rounded-lg text-xs font-bold",
                    theme.pulse ? "animate-pulse" : ""
                  )}
                  style={{ background: theme.vsBg, border: `1px solid ${theme.panelBorder}` }}
                >
                  VS
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex items-center gap-3">
                {theme.showThumbs && (
                  <div
                    className="h-14 w-14 rounded-xl overflow-hidden ring-1 bg-white/5"
                    style={{ borderColor: theme.panelBorder }}
                  >
                    {sideB?.thumbnail ? (
                      <img src={sideB.thumbnail} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full" />
                    )}
                  </div>
                )}
                <div className="min-w-0 text-left">
                  <div className="text-xl font-extrabold truncate" style={{ color: theme.text }}>
                    {playerB || "—"}
                  </div>
                  <div className="text-[12px] truncate" style={{ color: theme.subtext }}>
                    {sideB?.name || "—"}
                  </div>
                </div>
              </div>
            </div>

            {/* buys */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-[12px] mb-1" style={{ color: theme.subtext }}>
                  Buys (Side A)
                </div>
                <div className="flex flex-wrap">{aPays.map(chip)}</div>
              </div>
              <div>
                <div className="text-[12px] mb-1" style={{ color: theme.subtext }}>
                  Buys (Side B)
                </div>
                <div className="flex flex-wrap">{bPays.map(chip)}</div>
              </div>
            </div>

            {/* total */}
            <div className="mt-4 text-xs" style={{ color: theme.subtext }}>
              Total: <span className="font-semibold" style={{ color: theme.text }}>
                {fmtMoney(totalPay)}
              </span>
            </div>
          </div>
        </>
      ) : (
        /* CUSTOMIZE TAB */
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* cores */}
            {[
              ["bgStart", "Background start"],
              ["bgEnd", "Background end"],
              ["panelBg", "Panel bg (chips)"],
              ["panelBorder", "Panel border"],
              ["text", "Text"],
              ["subtext", "Subtext"],
              ["accent", "Accent"],
              ["chipBg", "Chip bg"],
              ["chipBorder", "Chip border"],
              ["pos", "Profit +"],
              ["neg", "Profit −"],
              ["vsBg", "VS bg"],
            ].map(([key, label]) => (
              <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs opacity-70 mb-1">{label}</div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={theme[key]}
                    onChange={(e) => setTheme((t) => ({ ...t, [key]: e.target.value }))}
                    className="h-9 w-12 rounded"
                    style={{ background: "#111827", border: "1px solid rgba(255,255,255,.12)" }}
                  />
                  <Input
                    value={theme[key]}
                    onChange={(e) => setTheme((t) => ({ ...t, [key]: e.target.value }))}
                    className="h-9 bg-zinc-900 border-white/10 text-white"
                  />
                </div>
              </div>
            ))}

            {/* radius */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs opacity-70 mb-1">Border radius</div>
              <input
                type="range"
                min={8}
                max={28}
                step={1}
                value={theme.radius}
                onChange={(e) => setTheme((t) => ({ ...t, radius: Number(e.target.value) }))}
                className="w-full"
              />
              <div className="text-xs mt-1 opacity-70">{theme.radius}px</div>
            </div>

            {/* toggles */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs opacity-70 mb-2">Toggles</div>
              {[
                ["showThumbs", "Show thumbnails"],
                ["shine", "Shine sweep"],
                ["pulse", "VS/Chips pulse"],
              ].map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm mb-1">
                  <input
                    type="checkbox"
                    checked={!!theme[k]}
                    onChange={(e) => setTheme((t) => ({ ...t, [k]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                saveTheme(battleId, theme);
              }}
              className="h-10"
            >
              Guardar tema
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const base = { ...DEFAULT_THEME };
                setTheme(base);
                saveTheme(battleId, base);
              }}
              className="h-10"
            >
              Restaurar padrão
            </Button>
            <Button
              variant="secondary"
              onClick={() => setTab("preview")}
              className="h-10"
            >
              Ver preview
            </Button>
          </div>
        </div>
      )}
    </AccentCard>
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

      // enriquecer thumbs/provider
      let aBase = A ? { id: A.slot_id ?? null, name: A.slot_name || "" } : null;
      let bBase = B ? { id: B.slot_id ?? null, name: B.slot_name || "" } : null;
      if (aBase) aBase = await enrichSlotInfo(aBase);
      if (bBase) bBase = await enrichSlotInfo(bBase);

      setSideA(aBase);
      setPlayerA(A?.player_name || "");
      setSideB(bBase);
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

  // upsert entries (requer UNIQUE(battle_id,seed))
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

  // histórico por slot (em batalhas anteriores)
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
            <div className="font-medium">{isLeft ? sideA?.name || "—" : sideB?.name || "—"}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Player</div>
            <div className="font-medium">{player || "—"}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Buys registados</div>
            <div className="font-semibold">{stats.count}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Total pago</div>
            <div className="font-semibold">{fmtMoney(stats.total)}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Best win</div>
            <div className="font-semibold">{fmtMoney(stats.best)}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Worst payment</div>
            <div className="font-semibold">{fmtMoney(stats.worst)}</div>
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
            <h1 className="text-2xl font-semibold">Battle {row ? `#${row.id}` : ""}</h1>
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
              {/* settings */}
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

            {/* WIDGET (Preview + Customize) */}
            <WidgetCard
              battleId={battleId}
              sideA={sideA}
              sideB={sideB}
              playerA={playerA}
              playerB={playerB}
              bestOf={bestOf}
              buyCost={buyCost}
              totalPay={totalPay}
              profit={profit}
              aPays={aPays}
              bPays={bPays}
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
                    <SlotsAutocomplete
                      value={sideA}
                      onSelect={(v) => setSideA(v)}
                      placeholder="Add a Slot"
                    />
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
                    <SlotsAutocomplete
                      value={sideB}
                      onSelect={(v) => setSideB(v)}
                      placeholder="Add a Slot"
                    />
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
                    <div className="font-semibold">{histA?.times ?? 0}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Total</div>
                    <div className="font-semibold">{fmtMoney(histA?.total ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Best</div>
                    <div className="font-semibold">{fmtMoney(histA?.best ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Worst</div>
                    <div className="font-semibold">{fmtMoney(histA?.worst ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2 col-span-2">
                    <div className="text-xs opacity-70">Last</div>
                    <div className="font-semibold">{histA?.last ?? "—"}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Times</div>
                    <div className="font-semibold">{histB?.times ?? 0}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Total</div>
                    <div className="font-semibold">{fmtMoney(histB?.total ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Best</div>
                    <div className="font-semibold">{fmtMoney(histB?.best ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Worst</div>
                    <div className="font-semibold">{fmtMoney(histB?.worst ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2 col-span-2">
                    <div className="text-xs opacity-70">Last</div>
                    <div className="font-semibold">{histB?.last ?? "—"}</div>
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
