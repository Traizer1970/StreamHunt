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
  Palette,
  X,
  Save,
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

/* Tema por defeito (tudo customizável no Designer) */
const DEFAULT_THEME = {
  bgStart: "#0b1020",
  bgEnd: "#111827",

  // linhas/painéis
  panelBorder: "rgba(255,255,255,0.12)",
  panelBorderWidth: 1,

  // texto
  text: "#e5e7eb",
  subtext: "#9ca3af",
  accent: "#7dd3fc",

  // chips (buys)
  chipBg: "rgba(255,255,255,0.08)",
  chipBorder: "rgba(255,255,255,0.18)",
  chipBorderWidth: 1,
  chipRadius: 12,

  // badges (Best of / Bonus Buy)
  badgeBg: "rgba(255,255,255,0.08)",
  badgeBorder: "rgba(255,255,255,0.18)",
  badgeBorderWidth: 1,

  // total ribbon
  totalBg: "rgba(255,255,255,0.10)",
  totalBorder: "rgba(255,255,255,0.18)",
  totalBorderWidth: 1,

  // semantic
  pos: "#22c55e",
  neg: "#ef4444",
  vsBg: "rgba(99,102,241,0.35)",

  // layout / tipografia
  radius: 18,          // cantos das caixas principais
  pillRadius: 16,      // cantos das “pills” (Best of, Bonus, Total)
  fontFamily:
    "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji'",
  fontScale: 100,      // %
  fontWeight: 400,     // peso normal (sem bold)
  strongWeight: 500,   // peso “forte” (números, nomes) — pode pôr 400 para desativar

  showThumbs: true,
  shine: true,
  pulse: true,
};

/* presets rápidos */
const PRESETS = [
  { name: "Neon", t: { bgStart: "#0f0c29", bgEnd: "#302b63", accent: "#22d3ee", pos: "#10b981", neg: "#ef4444", vsBg: "rgba(34,211,238,0.35)" } },
  { name: "Sunset", t: { bgStart: "#1f0a26", bgEnd: "#3a0b2e", accent: "#fb7185", pos: "#f59e0b", neg: "#ef4444", vsBg: "rgba(251,113,133,0.35)" } },
  { name: "Emerald", t: { bgStart: "#06251f", bgEnd: "#0b3830", accent: "#34d399", pos: "#22c55e", neg: "#e11d48", vsBg: "rgba(52,211,153,0.28)" } },
  { name: "Magenta", t: { bgStart: "#1e0031", bgEnd: "#2b0b3f", accent: "#c084fc", pos: "#a7f3d0", neg: "#fb7185", vsBg: "rgba(192,132,252,0.35)" } },
  { name: "Carbon", t: { bgStart: "#0b0b0b", bgEnd: "#171717", accent: "#93c5fd", pos: "#86efac", neg: "#fca5a5", vsBg: "rgba(147,197,253,0.25)" } },
  { name: "Twilight", t: { bgStart: "#0b1b3a", bgEnd: "#112a46", accent: "#7dd3fc", pos: "#22c55e", neg: "#fb7185", vsBg: "rgba(125,211,252,0.30)" } },
];

/* theme storage */
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

/* enriquecer slot */
async function enrichSlotInfo(slot) {
  if (!slot) return slot;
  if (slot.thumbnail && slot.provider) return slot;
  try {
    let q = supabase.from("slots_catalog").select('id, "NAME", "PROVIDER", "THUMBNAIL"').limit(1);
    if (slot.id) q = q.eq("id", slot.id);
    else if (slot.name) q = q.ilike("NAME", `%${slot.name}%`);
    const { data } = await q.maybeSingle();
    if (data) return { id: data.id, name: data["NAME"], provider: data["PROVIDER"], thumbnail: data["THUMBNAIL"] };
  } catch {}
  return slot;
}

/* ───────────────── UI blocks ───────────────── */
function AccentCard({ title, children, className }) {
  const { isDark } = useTheme();
  return (
    <div className={cn("relative rounded-xl", isDark ? "bg-white/5 border border-white/10" : "bg-white border border-zinc-200", className)}>
      <div className="absolute inset-x-0 top-0 h-[2px] bg-sky-500/70 shadow-[0_0_12px_2px_rgba(56,189,248,0.35)]" />
      {title && <div className="px-4 pt-4 pb-1 text-xs opacity-80">{title}</div>}
      <div className="px-4 pt-5 pb-4">{children}</div>
    </div>
  );
}
function Kpi({ icon, label, value, tone = "neutral" }) {
  const toneCls = tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-rose-400" : "text-white";
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
function useDebounced(v, delay) {
  const [s, setS] = React.useState(v);
  React.useEffect(() => {
    const id = setTimeout(() => setS(v), delay || 300);
    return () => clearTimeout(id);
  }, [v, delay]);
  return s;
}

/* ───────────────── SlotsAutocomplete ───────────────── */
function SlotsAutocomplete({ value, onSelect, placeholder = "Add a Slot" }) {
  const { isDark } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState(typeof value === "object" && value !== null ? value.name ?? "" : typeof value === "string" ? value : "");
  const [items, setItems] = React.useState([]);
  const [errorMsg, setErrorMsg] = React.useState("");
  const boxRef = React.useRef(null);
  const dQuery = useDebounced(query, 250);

  const currentValueName = React.useMemo(
    () => (typeof value === "object" && value !== null ? value.name ?? "" : typeof value === "string" ? value : ""),
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
            <div className="px-3 py-2 text-sm opacity-70">Sem resultados. Escreve o nome e clica fora para usar o texto.</div>
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

/* ───────── Preview Panel (clean, com controle de bordas/raio/tipografia) ───────── */
function WidgetPreviewPanel({
  theme,
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
      title={ok ? "Cobre o buy" : "Abaixo do buy"}
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

  return (
    <>
      <style>{`
        @keyframes sweep { 0% { transform: translateX(-120%);} 100% { transform: translateX(120%);} }
        @keyframes pop { 0% { transform: scale(.96); opacity: 0;} 100% { transform: scale(1); opacity: 1;} }
        @keyframes glow { 0% { box-shadow: 0 0 0 rgba(0,0,0,0);} 100% { box-shadow: 0 15px 40px rgba(0,0,0,.45);} }
      `}</style>

      <div
        className="relative overflow-hidden p-5 sm:p-6"
        style={{
          background: `linear-gradient(135deg, ${theme.bgStart}, ${theme.bgEnd})`,
          border: `${theme.panelBorderWidth}px solid ${theme.panelBorder}`,
          borderRadius: theme.radius,
          color: theme.text,
          fontFamily: theme.fontFamily,
          fontSize: `${theme.fontScale}%`,
          animation: "glow .3s ease-out both",
        }}
      >
        {theme.shine && (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{ animation: "sweep 4.8s linear infinite" }}
          />
        )}

        {/* Badges clean com controle de espessura/raio/tipografia */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
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
              <span>Bonus Buy</span>
              <span style={{ marginLeft: 8, color: theme.accent, fontWeight: theme.strongWeight }}>
                {fmtMoney(buyCost)}
              </span>
            </div>
          </div>
        </div>

        {/* Players */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] items-center gap-5">
          <div className="flex items-center justify-end gap-3">
            <div className="min-w-0 text-right">
              <div
                className="truncate"
                style={{ fontSize: "22px", color: theme.text, fontWeight: theme.strongWeight }}
              >
                {playerA || "—"}
              </div>
              <div className="text-[12px] truncate" style={{ color: theme.subtext, fontWeight: theme.fontWeight }}>
                {sideA?.name || "—"}
              </div>
            </div>
            {theme.showThumbs && (
              <div
                className="h-14 w-14 overflow-hidden ring-1 bg-white/5"
                style={{ borderColor: theme.panelBorder, borderRadius: theme.radius }}
              >
                {sideA?.thumbnail ? <img src={sideA.thumbnail} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full" />}
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
                {sideB?.thumbnail ? <img src={sideB.thumbnail} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full" />}
              </div>
            )}
            <div className="min-w-0 text-left">
              <div
                className="truncate"
                style={{ fontSize: "22px", color: theme.text, fontWeight: theme.strongWeight }}
              >
                {playerB || "—"}
              </div>
              <div className="text-[12px] truncate" style={{ color: theme.subtext, fontWeight: theme.fontWeight }}>
                {sideB?.name || "—"}
              </div>
            </div>
          </div>
        </div>

        {/* Chips + subtotais (em boxes) */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="flex flex-wrap">
              {aPays.map((p, i) => (
                <Chip key={`a-${i}`} amount={p.amount} ok={Number(p.amount || 0) >= Number(buyCost || 0)} i={i} />
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
              <span style={{ color: theme.text, fontWeight: theme.strongWeight }}>
                {fmtMoney(aTotal)}
              </span>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap">
              {bPays.map((p, i) => (
                <Chip key={`b-${i}`} amount={p.amount} ok={Number(p.amount || 0) >= Number(buyCost || 0)} i={i} />
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
              <span style={{ color: theme.text, fontWeight: theme.strongWeight }}>
                {fmtMoney(bTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* Total Pay clean com controle de borda/raio */}
        <div className="mt-6 flex justify-center">
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
            Total pago: {fmtMoney(totalPay)}
          </div>
        </div>
      </div>
    </>
  );
}

/* ───────── Color field (com color picker nativo) ───────── */
function ColorField({ label, value, onChange }) {
  const ref = React.useRef(null);
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs opacity-70 mb-1">{label}</div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => ref.current?.click()} className="h-9 w-9 rounded-lg border border-white/10 shadow-inner" style={{ background: value }} />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 bg-zinc-900 border-white/10 text-white" />
        <input ref={ref} type="color" value={value.startsWith("#") ? value : "#ffffff"} onChange={(e) => onChange(e.target.value)} className="sr-only" />
      </div>
    </div>
  );
}

/* ───────── Designer (overlay com mais controlos) ───────── */
function WidgetDesigner({ open, onClose, battleId, theme, setTheme, previewProps }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-x-0 top-0 h-14 px-4 flex items-center justify-between border-b border-white/10 bg-zinc-950/60">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-white/80" />
          <div>Widget Designer</div>
          <div className="text-xs opacity-60">Battle #{battleId}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { saveTheme(battleId, theme); onClose(); }} className="h-9">
            <Save className="h-4 w-4 mr-2" />
            Guardar & Fechar
          </Button>
          <Button variant="outline" onClick={onClose} className="h-9">
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </div>

      <div className="absolute inset-x-0 top-14 bottom-0 grid lg:grid-cols-[480px_1fr]">
        <div className="border-r border-white/10 bg-zinc-950/70 overflow-auto">
          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs opacity-70 mb-2">Presets</div>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setTheme((t) => ({ ...t, ...p.t }))}
                    className="rounded-lg overflow-hidden border border-white/10 hover:ring-2 hover:ring-sky-400 transition"
                    title={p.name}
                  >
                    <div className="h-10" style={{ background: `linear-gradient(135deg, ${p.t.bgStart || theme.bgStart}, ${p.t.bgEnd || theme.bgEnd})` }} />
                    <div className="px-2 py-1 text-[11px] opacity-80">{p.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cores */}
            <div className="grid grid-cols-1 gap-4">
              <ColorField label="Background start" value={theme.bgStart} onChange={(v) => setTheme((t) => ({ ...t, bgStart: v }))} />
              <ColorField label="Background end" value={theme.bgEnd} onChange={(v) => setTheme((t) => ({ ...t, bgEnd: v }))} />
              <ColorField label="Panel/Line border" value={theme.panelBorder} onChange={(v) => setTheme((t) => ({ ...t, panelBorder: v }))} />
              <ColorField label="Text" value={theme.text} onChange={(v) => setTheme((t) => ({ ...t, text: v }))} />
              <ColorField label="Subtext" value={theme.subtext} onChange={(v) => setTheme((t) => ({ ...t, subtext: v }))} />
              <ColorField label="Accent" value={theme.accent} onChange={(v) => setTheme((t) => ({ ...t, accent: v }))} />
              <ColorField label="Chip bg" value={theme.chipBg} onChange={(v) => setTheme((t) => ({ ...t, chipBg: v }))} />
              <ColorField label="Chip border" value={theme.chipBorder} onChange={(v) => setTheme((t) => ({ ...t, chipBorder: v }))} />
              <ColorField label="OK (verde)" value={theme.pos} onChange={(v) => setTheme((t) => ({ ...t, pos: v }))} />
              <ColorField label="NOK (vermelho)" value={theme.neg} onChange={(v) => setTheme((t) => ({ ...t, neg: v }))} />
              <ColorField label="Badge bg" value={theme.badgeBg} onChange={(v) => setTheme((t) => ({ ...t, badgeBg: v }))} />
              <ColorField label="Badge border" value={theme.badgeBorder} onChange={(v) => setTheme((t) => ({ ...t, badgeBorder: v }))} />
              <ColorField label="Total bg" value={theme.totalBg} onChange={(v) => setTheme((t) => ({ ...t, totalBg: v }))} />
              <ColorField label="Total border" value={theme.totalBorder} onChange={(v) => setTheme((t) => ({ ...t, totalBorder: v }))} />
              <ColorField label="VS bg" value={theme.vsBg} onChange={(v) => setTheme((t) => ({ ...t, vsBg: v }))} />
            </div>

            {/* Layout / Tipografia */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
              <div className="text-xs opacity-70 mb-1">Layout</div>

              <label className="block text-sm">Panel border width: {theme.panelBorderWidth}px</label>
              <input type="range" min={0} max={4} step={1} value={theme.panelBorderWidth} onChange={(e) => setTheme((t) => ({ ...t, panelBorderWidth: Number(e.target.value) }))} className="w-full" />

              <label className="block text-sm">Badge border width: {theme.badgeBorderWidth}px</label>
              <input type="range" min={0} max={4} step={1} value={theme.badgeBorderWidth} onChange={(e) => setTheme((t) => ({ ...t, badgeBorderWidth: Number(e.target.value) }))} className="w-full" />

              <label className="block text-sm">Total border width: {theme.totalBorderWidth}px</label>
              <input type="range" min={0} max={4} step={1} value={theme.totalBorderWidth} onChange={(e) => setTheme((t) => ({ ...t, totalBorderWidth: Number(e.target.value) }))} className="w-full" />

              <label className="block text-sm">Chip border width: {theme.chipBorderWidth}px</label>
              <input type="range" min={0} max={4} step={1} value={theme.chipBorderWidth} onChange={(e) => setTheme((t) => ({ ...t, chipBorderWidth: Number(e.target.value) }))} className="w-full" />

              <label className="block text-sm">Border radius (caixas): {theme.radius}px</label>
              <input type="range" min={8} max={28} step={1} value={theme.radius} onChange={(e) => setTheme((t) => ({ ...t, radius: Number(e.target.value) }))} className="w-full" />

              <label className="block text-sm">Pill radius (Best/Bonus/Total): {theme.pillRadius}px</label>
              <input type="range" min={8} max={30} step={1} value={theme.pillRadius} onChange={(e) => setTheme((t) => ({ ...t, pillRadius: Number(e.target.value) }))} className="w-full" />

              <label className="block text-sm">Chip radius: {theme.chipRadius}px</label>
              <input type="range" min={8} max={20} step={1} value={theme.chipRadius} onChange={(e) => setTheme((t) => ({ ...t, chipRadius: Number(e.target.value) }))} className="w-full" />

              <label className="block text-sm">Font size: {theme.fontScale}%</label>
              <input type="range" min={80} max={130} step={1} value={theme.fontScale} onChange={(e) => setTheme((t) => ({ ...t, fontScale: Number(e.target.value) }))} className="w-full" />

              <label className="block text-sm">Font family</label>
              <Input value={theme.fontFamily} onChange={(e) => setTheme((t) => ({ ...t, fontFamily: e.target.value }))} className="h-9 bg-zinc-900 border-white/10 text-white" />

              <label className="block text-sm">Font weight (normal): {theme.fontWeight}</label>
              <input type="range" min={300} max={700} step={50} value={theme.fontWeight} onChange={(e) => setTheme((t) => ({ ...t, fontWeight: Number(e.target.value) }))} className="w-full" />

              <label className="block text-sm">Font weight (forte): {theme.strongWeight}</label>
              <input type="range" min={300} max={800} step={50} value={theme.strongWeight} onChange={(e) => setTheme((t) => ({ ...t, strongWeight: Number(e.target.value) }))} className="w-full" />

              {[
                ["showThumbs", "Show thumbnails"],
                ["shine", "Shine sweep"],
                ["pulse", "VS/Chips pulse"],
              ].map(([k, label]) => (
                <label key={k} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={!!theme[k]} onChange={(e) => setTheme((t) => ({ ...t, [k]: e.target.checked }))} />
                  {label}
                </label>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={() => saveTheme(battleId, theme)} className="h-10">
                <Save className="h-4 w-4 mr-2" />
                Guardar
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
            </div>
          </div>
        </div>

        <div className="p-6 overflow-auto">
          <WidgetPreviewPanel theme={theme} {...previewProps} />
        </div>
      </div>
    </div>
  );
}

/* ───────── Widget Card (Preview + Designer) ───────── */
function WidgetCard({ battleId, sideA, sideB, playerA, playerB, bestOf, buyCost, totalPay, aPays = [], bPays = [] }) {
  const [theme, setTheme] = React.useState(() => loadTheme(battleId));
  React.useEffect(() => setTheme(loadTheme(battleId)), [battleId]);
  const [openDesigner, setOpenDesigner] = React.useState(false);
  const url = `${window.location.origin}/#/widget/battle/${battleId}`;

  const previewProps = { bestOf, buyCost, totalPay, sideA, sideB, playerA, playerB, aPays, bPays };

  return (
    <>
      <AccentCard title="Widget">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm opacity-80">Preview</div>
          <div className="flex items-center gap-2">
            <Button type="button" onClick={() => navigator.clipboard.writeText(url)} className="h-9">
              <Copy className="h-4 w-4 mr-2" />
              Copiar URL
            </Button>
            <Button type="button" variant="outline" className="h-9" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir overlay
            </Button>
            <Button type="button" variant="secondary" className="h-9" onClick={() => setOpenDesigner(true)}>
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Abrir Designer
            </Button>
          </div>
        </div>

        <WidgetPreviewPanel theme={theme} {...previewProps} />
      </AccentCard>

      <WidgetDesigner open={openDesigner} onClose={() => setOpenDesigner(false)} battleId={battleId} theme={theme} setTheme={setTheme} previewProps={previewProps} />
    </>
  );
}

/* ───────────────────────── Página ───────────────────────── */
export default function BattleView() {
  const { isDark } = useTheme();

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
  const [row, setRow] = React.useState(null);
  const [err, setErr] = React.useState("");

  const [bestOf, setBestOf] = React.useState(1);
  const [buyCost, setBuyCost] = React.useState(0);

  const [sideA, setSideA] = React.useState(null);
  const [sideB, setSideB] = React.useState(null);
  const [playerA, setPlayerA] = React.useState("");
  const [playerB, setPlayerB] = React.useState("");

  const [pays, setPays] = React.useState([]);

  const [histA, setHistA] = React.useState(null);
  const [histB, setHistB] = React.useState(null);

  const plannedBuys = Math.max(1, Number(bestOf) || 1) * 2;
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

      const { data: battle, error } = await supabase.from("battles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      setRow(battle);
      setBestOf(Number(battle?.best_of) || 1);
      setBuyCost(Number(battle?.buy_cost) || 0);

      const { data: es } = await supabase.from("battle_entries").select("seed, slot_name, slot_id, player_name").eq("battle_id", id);

      const A = (es || []).find((e) => String(e.seed).toUpperCase() === "A");
      const B = (es || []).find((e) => String(e.seed).toUpperCase() === "B");

      let aBase = A ? { id: A.slot_id ?? null, name: A.slot_name || "" } : null;
      let bBase = B ? { id: B.slot_id ?? null, name: B.slot_name || "" } : null;
      if (aBase) aBase = await enrichSlotInfo(aBase);
      if (bBase) bBase = await enrichSlotInfo(bBase);

      setSideA(aBase);
      setPlayerA(A?.player_name || "");
      setSideB(bBase);
      setPlayerB(B?.player_name || "");

      const { data: ps } = await supabase.from("battle_payments").select("*").eq("battle_id", id).order("buy_idx", { ascending: true });
      setPays(ps || []);

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
      await supabase.from("battles").update({ best_of: Number(bestOf) || 1, buy_cost: Number(buyCost) || 0 }).eq("id", battleId);
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
        rows.push({ battle_id: battleId, seed: "A", player_name: playerA || null, slot_name: sideA.name, slot_id: sideA.id ?? null });
      if (sideB?.name)
        rows.push({ battle_id: battleId, seed: "B", player_name: playerB || null, slot_name: sideB.name, slot_id: sideB.id ?? null });
      if (!rows.length) return;

      const { error } = await supabase.from("battle_entries").upsert(rows, { onConflict: "battle_id,seed" });
      if (error) throw error;

      await load(battleId);
    } catch (e) {
      alert(e?.message || "Falha a guardar os lados");
    }
  }

  async function setBuy(side, idx, amount) {
    if (!battleId) return;
    const payload = { battle_id: battleId, round_idx: 0, match_idx: 0, side, buy_idx: idx, amount: Number(amount) || 0 };
    try {
      await supabase.from("battle_payments").upsert([payload], { onConflict: "battle_id,round_idx,match_idx,side,buy_idx" });
      const { data: ps } = await supabase.from("battle_payments").select("*").eq("battle_id", battleId).order("buy_idx", { ascending: true });
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
      if (!ents?.length) return { times: 0, total: 0, best: 0, worst: 0, last: "—" };

      const battleIds = [...new Set(ents.map((e) => e.battle_id))];
      const { data: paysRows } = await supabase.from("battle_payments").select("*").in("battle_id", battleIds);
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
        ? new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium" }).format(new Date(battles[0].created_at))
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
            <div>{isLeft ? sideA?.name || "—" : sideB?.name || "—"}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Player</div>
            <div>{player || "—"}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Buys registados</div>
            <div>{stats.count}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Total pago</div>
            <div>{fmtMoney(stats.total)}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Best win</div>
            <div>{fmtMoney(stats.best)}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-2">
            <div className="text-xs opacity-70">Worst payment</div>
            <div>{fmtMoney(stats.worst)}</div>
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
            {row?.status ? <span className="ml-2 text-xs rounded-lg border border-white/10 bg-white/5 px-2 py-0.5">{row.status}</span> : null}
          </div>
          <div className="text-sm opacity-70">{row?.created_at ? new Date(row.created_at).toLocaleDateString() : ""}</div>
        </div>

        {err ? <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{err}</div> : null}

        {/* grid */}
        <div className="grid lg:grid-cols-[520px_1fr] gap-6">
          {/* LEFT: overview + stats + widget */}
          <div className="space-y-4">
            <AccentCard>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs opacity-70 mb-1">Best Of</div>
                  <select value={bestOf} onChange={(e) => setBestOf(e.target.value)} className="h-11 w-full rounded-xl bg-zinc-900 border border-white/10 px-3 text-sm">
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
                    <Input inputMode="decimal" type="number" step="0.01" value={buyCost} onChange={(e) => setBuyCost(e.target.value)} className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white pl-7" />
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
                <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Profit" value={fmtMoney(profit)} tone={profitTone} />
              </div>
            </AccentCard>

            <WidgetCard
              battleId={battleId}
              sideA={sideA}
              sideB={sideB}
              playerA={playerA}
              playerB={playerB}
              bestOf={bestOf}
              buyCost={buyCost}
              totalPay={totalPay}
              aPays={aPays}
              bPays={bPays}
            />
          </div>

          {/* RIGHT: sides + histórico + buys */}
          <div className="space-y-4">
            <AccentCard title="Battle">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs opacity-70 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Side A
                  </div>
                  <div className="space-y-2">
                    <SlotsAutocomplete value={sideA} onSelect={(v) => setSideA(v)} placeholder="Add a Slot" />
                    <div>
                      <div className="text-xs opacity-70 mb-1">Player</div>
                      <Input value={playerA} onChange={(e) => setPlayerA(e.target.value)} placeholder="Player name" className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white" />
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs opacity-70 mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" /> Side B
                  </div>
                  <div className="space-y-2">
                    <SlotsAutocomplete value={sideB} onSelect={(v) => setSideB(v)} placeholder="Add a Slot" />
                    <div>
                      <div className="text-xs opacity-70 mb-1">Player</div>
                      <Input value={playerB} onChange={(e) => setPlayerB(e.target.value)} placeholder="Player name" className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white" />
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

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Times</div>
                    <div>{histA?.times ?? 0}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Total</div>
                    <div>{fmtMoney(histA?.total ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Best</div>
                    <div>{fmtMoney(histA?.best ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Worst</div>
                    <div>{fmtMoney(histA?.worst ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2 col-span-2">
                    <div className="text-xs opacity-70">Last</div>
                    <div>{histA?.last ?? "—"}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Times</div>
                    <div>{histB?.times ?? 0}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Total</div>
                    <div>{fmtMoney(histB?.total ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Best</div>
                    <div>{fmtMoney(histB?.best ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="text-xs opacity-70">Worst</div>
                    <div>{fmtMoney(histB?.worst ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 p-2 col-span-2">
                    <div className="text-xs opacity-70">Last</div>
                    <div>{histB?.last ?? "—"}</div>
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
