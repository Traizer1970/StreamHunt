// /src/hunt-detail.jsx
import React from "react";
import { useTheme, AuthCtx } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft as IconBack,
  Play,
  Shuffle,
  Calendar as CalendarIcon,
  SlidersHorizontal,
  Plus,
  X,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Copy as CopyIcon,
  Star,
  Pencil,
  Trash2,
  Check,
  ExternalLink,
  Palette,
  Save,
} from "lucide-react";

import { getHuntByNumberId } from "@/lib/hunts";
import {
  listHuntSlots,
  searchCatalogSlots,
  addHuntSlot,
  updateHuntSlot,
  deleteHuntSlot,
} from "@/lib/slots";
import { supabase } from "@/lib/supabase";
import { cn as _cn } from "@/lib/utils";

const cn = (...c) => (_cn ? _cn(...c) : c.filter(Boolean).join(" "));

/* ───────────────────────── i18n ───────────────────────── */
const DICT = {
  pt: {
    back: "Voltar",
    startRedeeming: "Start Redeeming!",
    addBonus: "Add Bonus!",
    betsize: "Betsize",
    date: "Date",
    random: "Random",
    bonus: "Bonus",
    payout: "Payout",
    multiplier: "Multiplier",
    actions: "Ações",
    delete: "Eliminar",
    edit: "Editar",
    close: "Fechar",
    saveContinue: "Save & continue",
    copySlot: "Copy slot name",
    copied: "Copiado:",
    editBonus: "Editar bonus",
    chooseSlot: "Choose slot *",
    superBonus: "Super bonus",
    betsizeReq: "Betsize *",
    cancel: "Cancelar",
    guardar: "Guardar",
    eliminarBonus: "Eliminar bonus",
    eliminarPerg: "Tens a certeza que queres eliminar este bonus? Esta ação não pode ser anulada.",
    confirmStartTitle: "Começar o Opening?",
    confirmStartBody:
      "Irás iniciar o redeeming das slots. Queres mesmo começar?",
    confirmYes: "Começar",
    confirmNo: "Cancelar",
    confirmCloseTitle: "Sair do Opening?",
    confirmCloseBody:
      "Tens alterações ou progresso nesta sessão. Queres mesmo fechar?",
    pl: "P/L",
    amountWon: "Amount won",
    startCost: "Start cost",
    avgReqX: "Avg. Required X",
    currAvgX: "Current Avg. X",
    cumulativeX: "Cumulative X",
    none: "—",
    copyHint: "Clique para selecionar • Ctrl+Clique para copiar o nome",
    playResponsibly: "Jogue com responsabilidade. 18+. Template UI.",
    widget: "Widget",
    openDesigner: "Open Designer",
    openOverlay: "Open overlay",
    copyUrl: "Copy URL",
    kpiWon: "Amount won",
    kpiStart: "Start cost",
    kpiPL: "P/L",
    bonusCount: "Bonus Count",
    hunt: "Hunt",
  },
  en: {
    back: "Back",
    startRedeeming: "Start Redeeming!",
    addBonus: "Add Bonus!",
    betsize: "Betsize",
    date: "Date",
    random: "Random",
    bonus: "Bonus",
    payout: "Payout",
    multiplier: "Multiplier",
    actions: "Actions",
    delete: "Delete",
    edit: "Edit",
    close: "Close",
    saveContinue: "Save & continue",
    copySlot: "Copy slot name",
    copied: "Copied:",
    editBonus: "Edit bonus",
    chooseSlot: "Choose slot *",
    superBonus: "Super bonus",
    betsizeReq: "Betsize *",
    cancel: "Cancel",
    guardar: "Save",
    eliminarBonus: "Delete bonus",
    eliminarPerg: "Are you sure you want to delete this bonus? This cannot be undone.",
    confirmStartTitle: "Start Opening?",
    confirmStartBody:
      "You are about to begin redeeming the slots. Do you want to start?",
    confirmYes: "Start",
    confirmNo: "Cancel",
    confirmCloseTitle: "Exit Opening?",
    confirmCloseBody:
      "You have progress in this session. Are you sure you want to close?",
    pl: "P/L",
    amountWon: "Amount won",
    startCost: "Start cost",
    avgReqX: "Avg. Required X",
    currAvgX: "Current Avg. X",
    cumulativeX: "Cumulative X",
    none: "—",
    copyHint: "Click to select • Ctrl+Click to copy name",
    playResponsibly: "Play responsibly. 18+. Template UI.",
    widget: "Widget",
    openDesigner: "Open Designer",
    openOverlay: "Open overlay",
    copyUrl: "Copy URL",
    kpiWon: "Amount won",
    kpiStart: "Start cost",
    kpiPL: "P/L",
    bonusCount: "Bonus Count",
    hunt: "Hunt",
  },
};
function useLang() {
  const [lang, setLang] = React.useState(() => {
    const ls = (typeof localStorage !== "undefined" && localStorage.getItem("lang")) || "";
    const html = (typeof document !== "undefined" && document.documentElement.lang) || "";
    const nav = (typeof navigator !== "undefined" && navigator.language) || "pt-PT";
    const pick = (ls || html || nav).toLowerCase().startsWith("pt") ? "pt" : "en";
    return pick;
  });
  const t = React.useCallback(
    (k) => (DICT[lang] && DICT[lang][k]) || DICT.en[k] || k,
    [lang]
  );
  return { lang, t, setLang };
}
// ── colunas possíveis para a ordem no DB
const ORDER_COLS = ["order_index", "order", "position", "sort", "order_idx"];

function readOrderFromRow(row) {
  const raw = row?._raw || row || {};
  for (const c of ORDER_COLS) {
    const v = Number(raw[c]);
    if (Number.isFinite(v)) return v;
  }
  return null;
}

/* ───────────────────────── números/formatters ───────────────────────── */
const LOCALE = "pt-PT";
const CURRENCY = "EUR";
const numCls = "tabular-nums whitespace-nowrap";
function fmtMoney(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
function renderPL(value) {
  const n = Number(value) || 0;
  const sign = n >= 0 ? "" : "-";
  return `€${sign}${Math.abs(n).toLocaleString(LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
// aceita vírgulas decimais e valores vazios
const toNum = (v) => {
  if (v == null || v === "") return 0;
  if (typeof v === "string") v = v.replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* ───────────────────────── Widget: tema/opções ───────────────────────── */
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
  mode: "default", // "default" | "free" (para futuro)
  positions: {},
};
const DEFAULT_OPTS = {
  layoutKind: "horizontal", // 'horizontal' | 'vertical'
  totalJustify: "center",
  totalLabelMode: "label+value",
  totalLabelText: "P/L",

  kpiLayout: "grid", // 'grid' | 'row'
  showKpiStart: true,
  showKpiWon: true,
  showKpiPL: true,
  showBonusCount: true,

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
/* Presets de cores */
const PRESETS = [
  { name: "Neon",    t: { bgStart: "#0f0c29", bgEnd: "#302b63", accent: "#22d3ee", pos: "#10b981", neg: "#ef4444", vsBg: "rgba(34,211,238,0.35)" } },
  { name: "Sunset",  t: { bgStart: "#1f0a26", bgEnd: "#3a0b2e", accent: "#fb7185", pos: "#f59e0b", neg: "#ef4444", vsBg: "rgba(251,113,133,0.35)" } },
  { name: "Emerald", t: { bgStart: "#06251f", bgEnd: "#0b3830", accent: "#34d399", pos: "#22c55e", neg: "#e11d48", vsBg: "rgba(52,211,153,0.28)" } },
  { name: "Magenta", t: { bgStart: "#1e0031", bgEnd: "#2b0b3f", accent: "#c084fc", pos: "#a7f3d0", neg: "#fb7185", vsBg: "rgba(192,132,252,0.35)" } },
  { name: "Carbon",  t: { bgStart: "#0b0b0b", bgEnd: "#171717", accent: "#93c5fd", pos: "#86efac", neg: "#fca5a5", vsBg: "rgba(147,197,253,0.25)" } },
  { name: "Twilight",t: { bgStart: "#0b1b3a", bgEnd: "#112a46", accent: "#7dd3fc", pos: "#22c55e", neg: "#fb7185", vsBg: "rgba(125,211,252,0.30)" } },
];
/* Presets de tamanho */
const SIZE_PRESETS = [
  { name: "Small",       dir: "h", o: { baseW: 880,  baseH: 360, pad: 20, align: "center" }, theme: { fontScale: 95 } },
  { name: "Default",     dir: "h", o: { baseW: 1100, baseH: 420, pad: 24, align: "center" }, theme: { fontScale: 100 } },
  { name: "Wide Bar",    dir: "h", o: { baseW: 1400, baseH: 360, pad: 20, align: "center" }, theme: { fontScale: 98, pillRadius: 14 } },
  { name: "XL",          dir: "h", o: { baseW: 1500, baseH: 520, pad: 28, align: "center" }, theme: { fontScale: 108 } },
  { name: "Vertical • Compact", dir: "v", o: { baseW: 440, baseH: 640, pad: 16, align: "center" }, theme: { fontScale: 96 } },
  { name: "Vertical • Sidebar", dir: "v", o: { baseW: 480, baseH: 720, pad: 18, align: "center" }, theme: { fontScale: 96 } },
  { name: "Vertical • Tall",    dir: "v", o: { baseW: 560, baseH: 860, pad: 20, align: "center" }, theme: { fontScale: 98 } },
];

/* ---- URL builder para o overlay do Hunt ---- */
function buildOverlayUrl(base, token, opts, huntNumberId) {
  const o = (opts && opts.overlay) || {};
  const qs = new URLSearchParams();
  if (huntNumberId) qs.set("id", String(huntNumberId));
  if (typeof o.baseW === "number") qs.set("bw", String(o.baseW));
  if (typeof o.baseH === "number") qs.set("bh", String(o.baseH));
  if (typeof o.pad === "number")   qs.set("pad", String(o.pad));
  if (o.align) qs.set("align", String(o.align));
  if (o.mode === "fixed") {
    qs.set("pinsize", "1");
    if (o.width)  qs.set("w", String(o.width));
    if (o.height) qs.set("h", String(o.height));
  }
  qs.set("dir", opts?.layoutKind === "vertical" ? "v" : "h");
  const q = qs.toString();
  return `${base}#/overlay/hunt/${token}${q ? `?${q}` : ""}`;
}

/* ----------------------------- DB helpers ----------------------------- */
async function dbLoadWidgetSettings(huntNumberId) {
  const { data } = await supabase
    .from("hunt_widget_settings")
    .select("theme, layout, options")
    .eq("hunt_number_id", huntNumberId)
    .maybeSingle();
  return {
    theme: data?.theme || null,
    layout: data?.layout || null,
    options: data?.options || null,
  };
}
async function dbSaveWidgetSettings(huntNumberId, theme, layout, options) {
  await supabase.from("hunt_widget_settings").upsert([
    { hunt_number_id: huntNumberId, theme, layout, options },
  ]);
}

/* ───────────────────────── helpers existentes ───────────────────────── */
async function updateSuperFlag(rowId, value) {
  const tryFns = [
    () => supabase.from("hunt_slots").update({ is_super: !!value }).eq("id", rowId),
    () => supabase.from("hunt_slots").update({ super: !!value }).eq("id", rowId),
    () => supabase.from("hunt_slots").update({ is_super: !!value }).eq("ID", rowId),
    () => supabase.from("hunt_slots").update({ super: !!value }).eq("ID", rowId),
  ];
  let last;
  for (const fn of tryFns) {
    const out = await fn();
    if (!out.error) return;
    last = out.error;
  }
  throw last || new Error("Falha a atualizar o estado Super.");
}
const getIsSuper = (s) =>
  !!(s?.is_super ?? s?.super ?? s?._raw?.is_super ?? s?._raw?.super);

/* tentar persistir order_index (com fallbacks de coluna/ID) */
async function persistOrder(slots) {
  const colCandidates = ["order_index", "order", "position", "sort", "order_idx"];
  for (let i = 0; i < slots.length; i++) {
    const rowId = slots[i].id;
    let ok = false;
    for (const col of colCandidates) {
      const r1 = await supabase.from("hunt_slots").update({ [col]: i + 1 }).eq("id", rowId);
      if (!r1.error) {
        ok = true;
        break;
      }
      const r2 = await supabase.from("hunt_slots").update({ [col]: i + 1 }).eq("ID", rowId);
      if (!r2.error) {
        ok = true;
        break;
      }
    }
    if (!ok) {
      // se não houver nenhuma coluna, ignoramos silenciosamente
    }
  }
}

/* debounce genérico */
function useDebounced(value, delay = 250) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

/* ───────────────── UI ───────────────── */
function AccentCard({ title, children, className }) {
  const { isDark } = useTheme();
  return (
    <div className={cn("relative rounded-xl", isDark ? "bg-white/5 border border-white/10" : "bg-white border border-zinc-200", className)}>
      {title && <div className="px-4 pt-4 pb-1 text-xs opacity-80">{title}</div>}
      <div className="px-4 pt-4 pb-4">{children}</div>
    </div>
  );
}

/* ───────── ColorField (reutilizado) ───────── */
function ColorField({ label, value, onChange }) {
  const swatchRef = React.useRef(null);
  const [open, setOpen] = React.useState(false);
  const [anchor, setAnchor] = React.useState({ left: 0, top: 0 });
  const [tempHex, setTempHex] = React.useState("#ffffff");
  const [textValue, setTextValue] = React.useState(value || "");

  React.useEffect(() => setTextValue(value || ""), [value]);

  const toHex = React.useCallback((v) => {
    if (!v) return "#ffffff";
    v = String(v).trim();
    if (v.startsWith("#")) {
      if (v.length === 4) {
        const r = v[1], g = v[2], b = v[3];
        return `#${r}${r}${g}${g}${b}${b}`;
      }
      return v.slice(0, 7);
    }
    const m = v.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (m) {
      const clamp = (n) => Math.max(0, Math.min(255, n | 0));
      const [r, g, b] = [clamp(+m[1]), clamp(+m[2]), clamp(+m[3])];
      return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 6);
    }
    return "#ffffff";
  }, []);

  const openPicker = () => {
    const rect = swatchRef.current?.getBoundingClientRect();
    const panelW = 260, panelH = 220, pad = 8;
    let left = rect?.left ?? 0;
    let top = rect ? rect.bottom + pad : 0;
    left = Math.max(pad, Math.min(window.innerWidth - panelW - pad, left));
    top = Math.max(pad, Math.min(window.innerHeight - panelH - pad, top));
    setAnchor({ left, top });
    setTempHex(toHex(textValue || value));
    setOpen(true);
  };

  const applyAndClose = () => {
    onChange?.(tempHex);
    setTextValue(tempHex);
    setOpen(false);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="text-xs opacity-70 mb-1">{label}</div>
      <div className="flex items-center gap-3">
        <button
          ref={swatchRef}
          type="button"
          onClick={openPicker}
          className="h-9 w-9 rounded-lg border border-white/10 shadow-inner"
          style={{ background: textValue || value || "#ffffff" }}
          title="Pick color"
        />
        <Input
          value={textValue}
          onChange={(e) => {
            setTextValue(e.target.value);
            onChange?.(e.target.value);
          }}
          className="h-9 bg-zinc-900 border-white/10 text-white"
        />
      </div>

      {open && (
        <div className="fixed inset-0 z-[9999]" onMouseDown={() => setOpen(false)}>
          <div
            onMouseDown={(e) => e.stopPropagation()}
            className="rounded-xl border border-white/10 bg-zinc-900/95 p-3 shadow-2xl"
            style={{ position: "fixed", left: anchor.left, top: anchor.top, width: 260, height: 220, backdropFilter: "blur(6px)" }}
          >
            <div className="text-xs opacity-70 mb-2">Pick a color</div>
            <input
              type="color"
              value={tempHex}
              onChange={(e) => setTempHex(e.target.value)}
              className="block w-full h-40 rounded-lg border border-white/10 p-0 cursor-pointer bg-transparent"
            />
            <div className="mt-2 flex items-center gap-2">
              <Input value={tempHex} onChange={(e) => setTempHex(e.target.value)} className="h-9 bg-zinc-800 border-white/10 text-white" />
              <Button type="button" className="h-9" onClick={applyAndClose}>OK</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────── Preview do Widget (Hunt) ───────── */
function HuntWidgetPreview({
  theme,
  opts,
  huntTitle,
  numberId,
  bonusCount,
  kpiStart,
  kpiWon,
  kpiPL,
  slots = [],
}) {
  const baseW = Number(opts?.overlay?.baseW) || 1100;
  const baseH = Number(opts?.overlay?.baseH) || 420;
  const isVertical = opts?.layoutKind === "vertical";

  const TotalBadge = ({ value, labelMode = "label+value", labelText = "P/L" }) => {
    const showOnlyValue = labelMode === "value";
    const txt = showOnlyValue ? renderPL(value) : (labelText ? `${labelText}: ${renderPL(value)}` : renderPL(value));
    return (
      <div
        className="px-4 py-2 shadow-[0_10px_30px_rgba(0,0,0,.35)]"
        style={{
          background: theme.totalBg,
          border: `${theme.totalBorderWidth}px solid ${theme.totalBorder}`,
          borderRadius: theme.pillRadius,
          color: value >= 0 ? theme.pos : theme.neg,
          fontWeight: theme.strongWeight,
        }}
      >
        {txt}
      </div>
    );
  };

  const KPI = ({ label, value }) => (
    <div
      className="rounded-xl p-3"
      style={{
        background: theme.chipBg,
        border: `${theme.chipBorderWidth}px solid ${theme.chipBorder}`,
        color: theme.text,
        fontWeight: theme.strongWeight,
      }}
    >
      <div className="text-[11px]" style={{ color: theme.subtext, fontWeight: theme.fontWeight }}>
        {label}
      </div>
      <div className={numCls}>{value}</div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes sweep { 0% { transform: translateX(-120%);} 100% { transform: translateX(120%);} }
        @keyframes vsPulse { 0%{ transform:scale(1); opacity:1 } 50%{ transform:scale(1.04); opacity:.92 } 100%{ transform:scale(1); opacity:1 } }
      `}</style>
      <div
        className="relative overflow-hidden"
        style={{
          width: baseW,
          height: baseH,
          padding: isVertical ? 18 : 24,
          background: `linear-gradient(135deg, ${theme.bgStart}, ${theme.bgEnd})`,
          border: `${theme.panelBorderWidth}px solid ${theme.panelBorder}`,
          borderRadius: theme.radius,
          color: theme.text,
          fontFamily: theme.fontFamily,
          fontSize: `${theme.fontScale}%`,
          isolation: "isolate",
          contain: "paint",
        }}
      >
        {theme.shine && (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            style={{ animation: "sweep 4.8s linear infinite" }}
          />
        )}

        {/* HEADER */}
        <div className={cn("flex items-center", isVertical ? "justify-center gap-2" : "justify-between gap-2")}>
          <div
            className="px-3 py-1.5"
            style={{
              background: theme.badgeBg,
              border: `${theme.badgeBorderWidth}px solid ${theme.badgeBorder}`,
              borderRadius: theme.pillRadius,
              color: theme.text,
              fontWeight: theme.strongWeight,
            }}
          >
            {huntTitle || "—"}
            {numberId ? <span style={{ marginLeft: 8, color: theme.accent, fontWeight: theme.strongWeight }}>#{numberId}</span> : null}
          </div>
          {!isVertical && (
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
              <span>Bonus</span>
              <span style={{ marginLeft: 6, color: theme.accent, fontWeight: theme.strongWeight }}>{bonusCount}</span>
            </div>
          )}
        </div>

        {/* KPIs */}
        {opts.kpiLayout === "grid" ? (
          <div className={cn(isVertical ? "mt-3 grid grid-cols-1 gap-3" : "mt-5 grid grid-cols-3 gap-4")}>
            {opts.showKpiStart && <KPI label="Start" value={fmtMoney(kpiStart)} />}
            {opts.showKpiWon && <KPI label="Won" value={fmtMoney(kpiWon)} />}
            {opts.showKpiPL && <KPI label="P/L" value={renderPL(kpiPL)} />}
          </div>
        ) : (
          <div className={cn("mt-5 flex gap-3", isVertical ? "flex-col" : "flex-row")}>
            {opts.showKpiStart && <KPI label="Start" value={fmtMoney(kpiStart)} />}
            {opts.showKpiWon && <KPI label="Won" value={fmtMoney(kpiWon)} />}
            {opts.showKpiPL && <KPI label="P/L" value={renderPL(kpiPL)} />}
          </div>
        )}

        {/* THUMBS */}
        {theme.showThumbs && slots.length > 0 && (
          <div className={cn(isVertical ? "mt-4 grid grid-cols-6 gap-2" : "mt-6 grid grid-cols-10 gap-2")}>
            {slots.slice(0, isVertical ? 12 : 20).map((s, i) => {
              const superB = getIsSuper(s);
              return (
                <div key={s.id || i} className="relative rounded-lg overflow-hidden border border-white/10">
                  {superB && (
                    <div className="absolute right-1 top-1 z-10 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-fuchsia-600/80">
                      SUPER
                    </div>
                  )}
                  {s.thumbnail ? (
                    <img src={s.thumbnail} alt="" className="h-12 w-full object-cover object-bottom" />
                  ) : (
                    <div className="h-12 w-full bg-white/10" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TOTAL / P/L */}
        <div
          className={cn(
            "mt-6 flex",
            opts?.totalJustify === "left" ? "justify-start" : opts?.totalJustify === "right" ? "justify-end" : "justify-center"
          )}
        >
          <TotalBadge value={kpiPL} labelMode={opts.totalLabelMode} labelText={opts.totalLabelText} />
        </div>
      </div>
    </>
  );
}

/* ───────── Designer ───────── */
function HuntWidgetDesigner({ open, onClose, numberId, theme, setTheme, layout, setLayout, opts, setOpts, previewProps, persist }) {
  const { t } = useLang();
  if (!open) return null;

  const applySizePreset = (p) => {
    setOpts((o)=>({ ...o, layoutKind: p.dir==="v" ? "vertical" : "horizontal", overlay: { ...o.overlay, ...p.o } }));
    if (p.theme) setTheme((t)=>({ ...t, ...p.theme }));
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-x-0 top-0 h-14 px-4 flex items-center justify-between border-b border-white/10 bg-zinc-950/60">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-white/80" />
          <div>Widget Designer</div>
          <div className="text-xs opacity-60">{t("hunt")} #{numberId}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => { persist(); onClose(); }} className="h-9">
            <Save className="h-4 w-4 mr-2" />
            Save & Close
          </Button>
          <Button variant="outline" onClick={onClose} className="h-9">
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>

      <div className="absolute inset-x-0 top-14 bottom-0 grid xl:grid-cols-[520px_1fr]">
        {/* Controls */}
        <div className="border-r border-white/10 bg-zinc-950/70 overflow-auto">
          <div className="p-4 space-y-4">
            {/* Orientation */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs opacity-70 mb-2">Orientation</div>
              <div className="flex items-center gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" checked={opts.layoutKind === "horizontal"}
                         onChange={() => setOpts(o => ({...o, layoutKind: "horizontal"}))} />
                  Horizontal
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" checked={opts.layoutKind === "vertical"}
                         onChange={() => setOpts(o => ({...o, layoutKind: "vertical"}))} />
                  Vertical
                </label>
              </div>
            </div>

            {/* Size presets */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs opacity-70 mb-2">Size presets</div>
              <div className="grid grid-cols-2 gap-2">
                {SIZE_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={()=>applySizePreset(p)}
                    className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:ring-2 hover:ring-sky-400">
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Color presets */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs opacity-70 mb-2">Color presets</div>
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

            {/* Colors */}
            <div className="grid grid-cols-1 gap-4">
              {[
                ["Background start", "bgStart"],
                ["Background end", "bgEnd"],
                ["Panel/Line border", "panelBorder"],
                ["Text", "text"],
                ["Subtext", "subtext"],
                ["Accent", "accent"],
                ["Chip bg", "chipBg"],
                ["Chip border", "chipBorder"],
                ["OK (green)", "pos"],
                ["NOK (red)", "neg"],
                ["Badge bg", "badgeBg"],
                ["Badge border", "badgeBorder"],
                ["Total bg", "totalBg"],
                ["Total border", "totalBorder"],
                ["Highlight bg", "vsBg"],
              ].map(([lbl, key]) => (
                <ColorField key={key} label={lbl} value={theme[key]} onChange={(v) => setTheme((t) => ({ ...t, [key]: v }))} />
              ))}
            </div>

            {/* Layout / Typography */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
              <div className="text-xs opacity-70 mb-1">Layout</div>

              {[
                ["Panel border width", "panelBorderWidth", 0, 4],
                ["Badge border width", "badgeBorderWidth", 0, 4],
                ["Total border width", "totalBorderWidth", 0, 4],
                ["Chip border width", "chipBorderWidth", 0, 4],
              ].map(([lbl, key, min, max]) => (
                <div key={key}>
                  <label className="block text-sm">{lbl}: {theme[key]}px</label>
                  <input type="range" min={min} max={max} step={1} value={theme[key]} onChange={(e) => setTheme((t) => ({ ...t, [key]: Number(e.target.value) }))} className="w-full" />
                </div>
              ))}

              {[
                ["Border radius (boxes)", "radius", 8, 28],
                ["Pill radius", "pillRadius", 8, 30],
                ["Chip radius", "chipRadius", 8, 20],
                ["Font size", "fontScale", 80, 130],
                ["Font weight (normal)", "fontWeight", 300, 700],
                ["Font weight (strong)", "strongWeight", 300, 800],
              ].map(([lbl, key, min, max]) => (
                <div key={key}>
                  <label className="block text-sm">{lbl}: {theme[key]}{key==="fontScale"?"%":"px"}</label>
                  <input type="range" min={min} max={max} step={key.includes("Weight")?50:1} value={theme[key]} onChange={(e) => setTheme((t) => ({ ...t, [key]: Number(e.target.value) }))} className="w-full" />
                </div>
              ))}

              <label className="block text-sm">Font family</label>
              <Input value={theme.fontFamily} onChange={(e) => setTheme((t) => ({ ...t, fontFamily: e.target.value }))} className="h-9 bg-zinc-900 border-white/10 text-white" />
            </div>

            {/* KPIs & Content */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
              <div className="text-xs opacity-70 mb-1">KPIs</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={opts.showKpiStart} onChange={(e)=>setOpts(o=>({...o, showKpiStart:e.target.checked}))} />
                  Start
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={opts.showKpiWon} onChange={(e)=>setOpts(o=>({...o, showKpiWon:e.target.checked}))} />
                  Won
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={opts.showKpiPL} onChange={(e)=>setOpts(o=>({...o, showKpiPL:e.target.checked}))} />
                  P/L
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={opts.showBonusCount} onChange={(e)=>setOpts(o=>({...o, showBonusCount:e.target.checked}))} />
                  Bonus count badge
                </label>
              </div>

              <div className="text-xs opacity-70 mt-2">KPI layout</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {["grid","row"].map(v=>(
                  <label key={v} className="flex items-center gap-2">
                    <input type="radio" checked={opts.kpiLayout===v} onChange={()=>setOpts(o=>({...o, kpiLayout:v}))}/>
                    {v}
                  </label>
                ))}
              </div>

              <div className="text-xs opacity-70 mt-2">P/L label</div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={opts.totalLabelMode==="label+value"} onChange={()=>setOpts(o=>({...o, totalLabelMode:"label+value"}))}/>
                  Label + Value
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={opts.totalLabelMode==="value"} onChange={()=>setOpts(o=>({...o, totalLabelMode:"value"}))}/>
                  Value only
                </label>
              </div>
              <Input value={opts.totalLabelText} onChange={(e)=>setOpts(o=>({...o, totalLabelText:e.target.value}))} className="h-9 bg-zinc-900 border-white/10 text-white" placeholder="Label text (ex.: P/L)" />

              <div className="text-xs opacity-70 mt-2">Total alignment</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                {["left","center","right"].map(v=>(
                  <label key={v} className="flex items-center gap-2">
                    <input type="radio" checked={opts.totalJustify===v} onChange={()=>setOpts(o=>({...o, totalJustify:v}))}/>
                    {v[0].toUpperCase()+v.slice(1)}
                  </label>
                ))}
              </div>

              <div className="text-xs opacity-70 mt-2">Aparência</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={theme.showThumbs} onChange={(e)=>setTheme(t=>({...t, showThumbs:e.target.checked}))}/>
                  Mostrar thumbs
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={theme.shine} onChange={(e)=>setTheme(t=>({...t, shine:e.target.checked}))}/>
                  Shine
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={theme.pulse} onChange={(e)=>setTheme(t=>({...t, pulse:e.target.checked}))}/>
                  Pulse
                </label>
              </div>
            </div>

            {/* Canvas / OBS */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-3">
              <div className="text-xs opacity-70 mb-1">Canvas / OBS</div>

              <div className="flex items-center gap-3">
                <div className="text-sm w-36">Output</div>
                <label className="text-sm flex items-center gap-1">
                  <input type="radio" checked={opts.overlay.mode === "auto"} onChange={() => setOpts(o => ({ ...o, overlay: { ...o.overlay, mode: "auto" } }))} />
                  Auto-fit
                </label>
                <label className="text-sm flex items-center gap-1">
                  <input type="radio" checked={opts.overlay.mode === "fixed"} onChange={() => setOpts(o => ({ ...o, overlay: { ...o.overlay, mode: "fixed" } }))} />
                  Fixed (px)
                </label>
              </div>

              {opts.overlay.mode === "fixed" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs opacity-70 mb-1">Width (px)</div>
                    <Input type="number" value={opts.overlay.width} onChange={(e) => setOpts(o => ({ ...o, overlay: { ...o.overlay, width: Number(e.target.value) || 0 } }))} className="h-9 bg-zinc-900 border-white/10 text-white" />
                  </div>
                  <div>
                    <div className="text-xs opacity-70 mb-1">Height (px)</div>
                    <Input type="number" value={opts.overlay.height} onChange={(e) => setOpts(o => ({ ...o, overlay: { ...o.overlay, height: Number(e.target.value) || 0 } }))} className="h-9 bg-zinc-900 border-white/10 text-white" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs opacity-70 mb-1">Panel base width</div>
                  <Input type="number" value={opts.overlay.baseW} onChange={(e) => setOpts(o => ({ ...o, overlay: { ...o.overlay, baseW: Number(e.target.value) || 0 } }))} className="h-9 bg-zinc-900 border-white/10 text-white" />
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-1">Panel base height</div>
                  <Input type="number" value={opts.overlay.baseH} onChange={(e) => setOpts(o => ({ ...o, overlay: { ...o.overlay, baseH: Number(e.target.value) || 0 } }))} className="h-9 bg-zinc-900 border-white/10 text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs opacity-70 mb-1">Padding (px)</div>
                  <Input type="number" value={opts.overlay.pad} onChange={(e) => setOpts(o => ({ ...o, overlay: { ...o.overlay, pad: Number(e.target.value) || 0 } }))} className="h-9 bg-zinc-900 border-white/10 text-white" />
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-1">Vertical align</div>
                  <select value={opts.overlay.align} onChange={(e) => setOpts(o => ({ ...o, overlay: { ...o.overlay, align: e.target.value } }))} className="h-9 rounded-xl bg-zinc-900 border-white/10 text-white px-3">
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
              </div>

              <div className="text-[11px] opacity-70">
                Em <b>Fixed</b>, usa o mesmo Width/Height no “Browser Source” do OBS. O overlay faz letterbox e nunca corta conteúdo.
              </div>
            </div>

            {/* Save */}
            <div className="flex gap-2 sticky bottom-3">
              <Button onClick={persist} className="h-10">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setTheme({ ...DEFAULT_THEME });
                  setLayout({ ...DEFAULT_LAYOUT, mode: layout.mode });
                  setOpts({ ...DEFAULT_OPTS });
                }}
                className="h-10"
              >
                Restore defaults
              </Button>
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="p-6 overflow-auto">
          <HuntWidgetPreview theme={theme} opts={opts} {...previewProps} />
        </div>
      </div>
    </div>
  );
}

/* ───────── Widget Card ───────── */
function HuntWidgetCard({
  numberId,
  huntTitle,
  bonusCount,
  kpiStart,
  kpiWon,
  kpiPL,
  slots,
}) {
  const { profile } = React.useContext(AuthCtx) || {};
  const [theme, setTheme] = React.useState(DEFAULT_THEME);
  const [layout, setLayout] = React.useState(DEFAULT_LAYOUT);
  const [opts, setOpts] = React.useState(DEFAULT_OPTS);
  const [openDesigner, setOpenDesigner] = React.useState(false);
  const { t } = useLang();

  const overlayUrl = React.useMemo(() => {
    const base = `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, "");
    const token = profile?.public_token || profile?.widget_token || profile?.id || "";
    if (!token || !numberId) return "";
    return buildOverlayUrl(base, token, opts, numberId);
  }, [profile?.public_token, profile?.widget_token, profile?.id, opts, numberId]);

  const openOverlay = () => { if (overlayUrl) window.open(overlayUrl, "_blank", "noopener,noreferrer"); };
  const copyOverlayUrl = async () => {
    if (!overlayUrl) return;
    try { await navigator.clipboard.writeText(overlayUrl); } catch { alert("Não consegui copiar o URL."); }
  };

  const previewProps = { huntTitle, numberId, bonusCount, kpiStart, kpiWon, kpiPL, slots };

  React.useEffect(() => {
    (async () => {
      if (!numberId) return;
      const { theme: t, layout: l, options: o } = await dbLoadWidgetSettings(numberId);
      if (t) setTheme({ ...DEFAULT_THEME, ...t });
      if (l) setLayout({ ...DEFAULT_LAYOUT, ...l });
      if (o) setOpts({ ...DEFAULT_OPTS, ...o, overlay: { ...DEFAULT_OPTS.overlay, ...(o.overlay || {}) } });
    })();
  }, [numberId]);

  const persist = React.useCallback(async () => {
    if (!numberId) return;
    await dbSaveWidgetSettings(numberId, theme, layout, opts);
  }, [numberId, theme, layout, opts]);

  return (
    <>
      <AccentCard title={t("widget")}>
        <div className="mb-3 grid grid-cols-3 gap-2">
          <Button type="button" onClick={copyOverlayUrl} disabled={!overlayUrl} className="h-9 w-full justify-center">
            <CopyIcon className="h-4 w-4 mr-2" />
            {t("copyUrl")}
          </Button>
          <Button type="button" variant="outline" className="h-9 w-full justify-center" disabled={!overlayUrl} onClick={openOverlay}>
            <ExternalLink className="h-4 w-4 mr-2" />
            {t("openOverlay")}
          </Button>
          <Button type="button" variant="secondary" className="h-9 w-full justify-center" onClick={() => setOpenDesigner(true)}>
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            {t("openDesigner")}
          </Button>
        </div>

        <div className="overflow-auto">
          <HuntWidgetPreview theme={theme} opts={opts} {...previewProps} />
        </div>

        <div className="mt-3 flex justify-end">
          <Button onClick={persist} className="h-9">
            <Save className="h-4 w-4 mr-2" />
            Save settings
          </Button>
        </div>
      </AccentCard>

      <HuntWidgetDesigner
        open={openDesigner}
        onClose={() => setOpenDesigner(false)}
        numberId={numberId}
        theme={theme}
        setTheme={setTheme}
        layout={layout}
        setLayout={setLayout}
        opts={opts}
        setOpts={setOpts}
        previewProps={previewProps}
        persist={persist}
      />
    </>
  );
}

/* ───────────────────────── Modais Auxiliares ───────────────────────── */
function ConfirmDialog({ open, title, body, confirmText, cancelText, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-[520px] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl p-5">
          <div className="text-lg font-semibold mb-2">{title}</div>
          <div className="text-sm opacity-80 mb-5">{body}</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>{cancelText}</Button>
            <Button onClick={onConfirm}>{confirmText}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Add Bonus ───────────────────────── */
function AddBonusModal({ open, onClose, numberId, onAdded }) {
  const { t } = useLang();
  const [query, setQuery] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [results, setResults] = React.useState([]);
  const [selected, setSelected] = React.useState(null);
  const [betSize, setBetSize] = React.useState("");
  const [isSuper, setIsSuper] = React.useState(false);
  const [err, setErr] = React.useState("");
  const dQuery = useDebounced(query, 300);

  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!open) return;
      if (!dQuery.trim()) {
        setResults([]);
        return;
      }
      try {
        setBusy(true);
        const { slots } = await searchCatalogSlots(dQuery, { limit: 20 });
        if (active) setResults(slots);
      } catch (e) {
        if (active) setErr(e.message || "Falha na pesquisa.");
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => { active = false; };
  }, [open, dQuery]);

  const resetForm = () => {
    setQuery(""); setResults([]); setSelected(null);
    setBetSize(""); setIsSuper(false); setErr("");
  };
  const handleClose = () => { resetForm(); onClose && onClose(); };

  async function handleAdd() {
    try {
      setErr("");
      if (!selected) return setErr("Escolhe uma slot.");
      const bs = toNum(betSize);
      if (!Number.isFinite(bs) || bs <= 0) return setErr("Betsize inválida.");
      const payload = { slot_id: selected.id, bet_size: bs, super: isSuper };
      setBusy(true);
      await addHuntSlot(numberId, payload);
      onAdded && onAdded();
      handleClose();
    } catch (e) {
      setErr(e.message || "Falha ao adicionar bonus.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-[680px]">
        <div className="rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">Add bonus</div>
            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-white/10 transition" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>

          {!selected ? (
            <div className="space-y-2">
              <div className="text-xs opacity-70">{t("chooseSlot")}</div>
              <div className="relative">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Escreve o nome…"
                  className="pl-8 h-11 rounded-xl bg-zinc-900 border-white/10 text-white placeholder:text-white/40"
                  autoFocus
                />
                <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60" />
              </div>

              <div className="max-h[320px] max-h-[320px] overflow-auto rounded-xl border border-white/10 bg-zinc-900">
                {busy && (
                  <div className="px-3 py-3 text-sm flex items-center gap-2 opacity-80">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A pesquisar…
                  </div>
                )}
                {!busy && results.length === 0 && dQuery && (
                  <div className="px-3 py-3 text-sm opacity-60">Sem resultados.</div>
                )}
                {!busy &&
                  results.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className="w-full text-left px-3 py-2.5 hover:bg-white/5 flex items-center gap-3"
                    >
                      {s.thumbnail ? (
                        <img src={s.thumbnail} alt="" className="h-8 w-8 rounded object-cover bg-black/30" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-white/10" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{s.name}</div>
                        <div className="text-xs opacity-70 truncate">{s.provider}</div>
                      </div>
                      <ChevronDown className="h-4 w-4 opacity-60" />
                    </button>
                  ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs opacity-70">{t("chooseSlot")}</div>

              <div className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-zinc-900">
                {selected.thumbnail ? (
                  <img src={selected.thumbnail} alt="" className="h-12 w-12 rounded object-cover bg-black/30" />
                ) : (
                  <div className="h-12 w-12 rounded bg-white/10" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{selected.name}</div>
                  <div className="text-xs opacity-70 truncate">{selected.provider}</div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelected(null); setQuery(""); setResults([]);
                    setIsSuper(false); setBetSize("");
                  }}
                  className="h-9"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Trocar
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-3 items-end">
                <div>
                  <div className="text-xs mb-1 opacity-70">{t("betsizeReq")}</div>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={betSize}
                    onChange={(e) => setBetSize(e.target.value)}
                    placeholder="ex.: 2,00"
                    className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white placeholder:text-white/40 pl-4"
                  />
                </div>

                <div className="flex items-end justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsSuper((v) => !v)}
                    className={cn(
                      "h-11 px-4 rounded-xl border text-sm font-medium transition inline-flex items-center gap-2",
                      isSuper
                        ? "bg-fuchsia-600/20 border-fuchsia-500 text-fuchsia-200"
                        : "bg-zinc-900 border-white/10 text-white/70 hover:text-white"
                    )}
                    title="Marcar como Super bonus"
                  >
                    <Star className="h-4 w-4" />
                    {t("superBonus")}
                  </button>

                  <Button onClick={handleAdd} disabled={busy || !selected || !betSize} className="h-11 px-5">
                    {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>
          )}

          {err && <div className="mt-3 text-sm text-red-400">{err}</div>}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Edit Bonus ───────────────────────── */
function EditBonusModal({ open, row, onClose, onSaved }) {
  const [bet, setBet] = React.useState("");
  const [isSuper, setIsSuper] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setBet(row ? row.bet_size ?? "" : "");
    setIsSuper(row ? !!(row?.is_super ?? row?.super ?? row?._raw?.is_super ?? row?._raw?.super) : false);
  }, [row]);

  if (!open || !row) return null;

  async function save() {
    try {
      setBusy(true);
      const n = bet === "" ? null : toNum(bet);
      await updateHuntSlot(row.id, { bet_size: n });
      await updateSuperFlag(row.id, isSuper);
      onSaved && onSaved();
      onClose && onClose();
    } catch (e) {
      alert(e.message || "Falha ao guardar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[75]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-[540px]">
        <div className="rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">Editar bonus</div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-3">
            {row?.thumbnail ? (
              <img src={row.thumbnail} alt="" className="h-10 w-10 rounded object-cover" />
            ) : null}
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{row?.name}</div>
              <div className="text-xs opacity-70 truncate">{row?.provider}</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 items-end">
            <div>
              <div className="text-xs mb-1 opacity-70">Betsize</div>
              <Input
                type="text"
                inputMode="decimal"
                value={bet ?? ""}
                onChange={(e) => setBet(e.target.value)}
                placeholder="ex.: 2,00"
                className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white placeholder:text-white/40 pl-4"
              />
            </div>

            <div>
              <div className="text-xs mb-1 opacity-0 select-none">.</div>
              <button
                type="button"
                onClick={() => setIsSuper((v) => !v)}
                className={cn(
                  "w-full h-11 rounded-xl border inline-flex items-center justify-center gap-2 transition",
                  isSuper
                    ? "border-fuchsia-400 bg-fuchsia-500/10 text-fuchsia-200 hover:bg-fuchsia-500/20"
                    : "border-white/10 text-white/70 hover:bg-white/10"
                )}
              >
                <Star className={cn("h-4 w-4", isSuper ? "fill-fuchsia-400" : "")} />
                <span className="font-medium">Super bonus</span>
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Confirm Delete ───────────────────────── */
function ConfirmDeleteModal({ open, slot, onCancel, onConfirm }) {
  const { t } = useLang();
  if (!open || !slot) return null;
  return (
    <div className="fixed inset-0 z-[76]">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-[520px]">
        <div className="rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl p-5">
          <div className="text-lg font-semibold mb-3">{t("eliminarBonus")}</div>
          <div className="flex items-center gap-3 mb-4">
            {slot?.thumbnail ? (
              <img src={slot.thumbnail} alt="" className="h-10 w-10 rounded object-cover" />
            ) : null}
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{slot?.name}</div>
              <div className="text-xs opacity-70 truncate">{slot?.provider}</div>
            </div>
          </div>
          <div className="text-sm opacity-80 mb-5">{t("eliminarPerg")}</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>{t("cancel")}</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={onConfirm}>
              <Trash2 className="h-4 w-4 mr-2" />
              {t("delete")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Redeem Drawer ───────────────────────── */
function RedeemDrawer({ open, onClose, hunt, slots, onSaved /* baselineAtStart */ }) {
  const { t } = useLang();
  const [idx, setIdx] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  // paginação thumbs: 24 por página
  const PER_PAGE = 24;
  const [page, setPage] = React.useState(0);
  React.useEffect(() => setPage(Math.floor(idx / PER_PAGE)), [idx]);
  const pageCount = Math.ceil(slots.length / PER_PAGE);

  const s = slots[idx] || null;
  const isSuper = React.useMemo(() => getIsSuper(s), [s]);

  const [payout, setPayout] = React.useState("");
  const [multiplier, setMultiplier] = React.useState("");
  const [bet, setBet] = React.useState("");

  React.useEffect(() => {
    if (!s) return;
    setPayout(s.payout ?? "");
    setMultiplier(s.multiplier ?? "");
    setBet(s.bet_size ?? "");
  }, [idx, s]);

  // recalcula multiplier aceitando vírgulas
  React.useEffect(() => {
    const p = toNum(payout);
    const b = toNum(bet);
    if (Number.isFinite(p) && Number.isFinite(b) && b > 0) {
      setMultiplier((p / b).toFixed(2));
    }
  }, [payout, bet]);

  // toast suave (fade)
  const [toastMsg, setToastMsg] = React.useState("");
  const [toastOpen, setToastOpen] = React.useState(false);
  const hideTimer = React.useRef(null);
  const removeTimer = React.useRef(null);
  const showToast = React.useCallback((msg) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (removeTimer.current) clearTimeout(removeTimer.current);
    setToastMsg(msg);
    setToastOpen(true);
    hideTimer.current = setTimeout(() => {
      setToastOpen(false);
      removeTimer.current = setTimeout(() => setToastMsg(""), 320);
    }, 1200);
  }, []);
  React.useEffect(() => () => {
    clearTimeout(hideTimer.current);
    clearTimeout(removeTimer.current);
  }, []);

  const [confirmClose, setConfirmClose] = React.useState(false);
  function askClose() { setConfirmClose(true); }
  function closeNow() { setConfirmClose(false); onClose && onClose(); }

  async function handleSaveAndNext() {
    if (!s) return;
    try {
      setBusy(true);
      const numOrNull = (v) => {
        if (v === "" || v == null) return null;
        const n = toNum(v);
        return Number.isFinite(n) ? n : null;
      };
      const patch = {
        payout: numOrNull(payout),
        multiplier: numOrNull(multiplier),
        bet_size: numOrNull(bet),
      };
      await updateHuntSlot(s.id, patch);
      onSaved && onSaved();

      if (idx < slots.length - 1) setIdx((i) => i + 1);
      else closeNow();
    } catch (e) {
      alert(e.message || "Falha ao guardar.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  /* KPIs (REAIS) para o redeem — somam todos os payouts, incluindo o atual */
  const sumPayoutsNow = slots.reduce((acc, it, i) => {
    return acc + (i === idx ? toNum(payout) : toNum(it.payout));
  }, 0);

  const startCost = toNum(hunt?.start_cost);
  const amountWonNow = sumPayoutsNow;
  const plNow = amountWonNow - startCost;

  // média necessária nas restantes para chegar ao startCost
  const remaining = slots.slice(idx + 1);
  const sumRemainingBets = remaining.reduce((a, it) => a + toNum(it.bet_size), 0);
  const requiredNet = Math.max(0, startCost - amountWonNow);
  const avgRequiredX = sumRemainingBets > 0 ? (requiredNet / sumRemainingBets) : null;

  // current avg X / cumulative X considerando as já processadas + a atual (se tiver números)
  const processedMultipliers = slots.slice(0, idx + 1).map((it, i) => {
    const b = toNum(i === idx ? bet : it.bet_size);
    const p = toNum(i === idx ? payout : it.payout);
    return b > 0 && Number.isFinite(p) ? p / b : null;
  }).filter((v) => v != null);

  const currAvgX = processedMultipliers.length
    ? processedMultipliers.reduce((a, v) => a + v, 0) / processedMultipliers.length
    : null;
  const cumulativeX = processedMultipliers.length
    ? processedMultipliers.reduce((a, v) => a + v, 0)
    : null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/70" onClick={askClose} />
      <div className="absolute left-1/2 top-1/2 w-[96vw] max-w-6xl -translate-x-1/2 -translate-y-1/2">
        <div className="relative rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold">
              Start Redeeming —{" "}
              {s ? (
                <span className="opacity-90">
                  {s.name}{" "}
                  <span className="opacity-60">
                    ({idx + 1}/{slots.length})
                  </span>
                </span>
              ) : ("Sem slots")}
            </div>
            <button onClick={askClose} className="p-2 rounded-lg hover:bg-white/10 transition" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-6 gap-3 mb-5">
            {[
              [DICT.pt.pl, renderPL(plNow), plNow >= 0 ? "text-emerald-400" : "text-red-400"],
              [DICT.pt.amountWon, fmtMoney(amountWonNow)],
              [DICT.pt.startCost, fmtMoney(startCost)],
              [DICT.pt.avgReqX, avgRequiredX != null ? avgRequiredX.toFixed(2) : DICT.pt.none],
              [DICT.pt.currAvgX, currAvgX != null ? currAvgX.toFixed(2) : DICT.pt.none],
              [DICT.pt.cumulativeX, cumulativeX != null ? `${cumulativeX.toFixed(2)}x` : DICT.pt.none],
            ].map(([label, value, color], i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] opacity-70">{label}</div>
                <div className={cn("font-semibold", numCls, color)}>{value}</div>
              </div>
            ))}
          </div>

          {s ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {/* header card com estilo SUPER */}
              <div
                className={cn(
                  "md:col-span-3 flex items-center gap-3 p-3 rounded-xl border",
                  isSuper
                    ? "bg-fuchsia-500/10 border-fuchsia-400/40 ring-1 ring-fuchsia-400/20"
                    : "bg-white/5 border-white/10"
                )}
              >
                {s.thumbnail ? (
                  <img
                    src={s.thumbnail}
                    alt=""
                    className={cn(
                      "h-14 w-14 rounded object-cover object-bottom bg-black/30",
                      isSuper && "ring-2 ring-fuchsia-400/60"
                    )}
                  />
                ) : (
                  <div className="h-14 w-14 rounded bg-white/10" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate flex items-center gap-2">
                    <span className="truncate">{s.name}</span>
                    {isSuper && (
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/40 inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-fuchsia-300" />
                        Super
                      </span>
                    )}
                  </div>
                  <div className="text-xs opacity-70 truncate">{s.provider}</div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    try { navigator.clipboard.writeText(s.name || ""); } catch {}
                    // show toast below:
                  }}
                  className="h-9"
                  title={DICT.pt.copySlot}
                >
                  <CopyIcon className="h-4 w-4 mr-1" />
                  {DICT.pt.copySlot}
                </Button>
              </div>

              <div>
                <div className="text-xs mb-1 opacity-70">{DICT.pt.payout}</div>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={payout ?? ""}
                  onChange={(e) => setPayout(e.target.value)}
                  placeholder="ex.: 125,00"
                  className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white placeholder:text-white/40 pl-3"
                />
              </div>
              <div>
                <div className="text-xs mb-1 opacity-70">{DICT.pt.multiplier}</div>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={multiplier ?? ""}
                  onChange={(e) => setMultiplier(e.target.value)}
                  placeholder="ex.: 127,00"
                  className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white placeholder:text-white/40 pl-3"
                />
              </div>
              <div>
                <div className="text-xs mb-1 opacity-70">{DICT.pt.betsizeReq}</div>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={bet ?? ""}
                  onChange={(e) => setBet(e.target.value)}
                  placeholder="ex.: 2"
                  className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white placeholder:text-white/40 pl-3"
                />
              </div>
            </div>
          ) : (
            <div className="opacity-70 text-sm mb-6">Ainda sem slots neste hunt.</div>
          )}

          <div className="flex items-center justify-end gap-2 mb-4">
            <Button variant="outline" onClick={askClose}>
              {DICT.pt.close}
            </Button>
            <Button onClick={handleSaveAndNext} disabled={!s || busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ChevronRight className="h-4 w-4 mr-2" />}
              {DICT.pt.saveContinue}
            </Button>
          </div>

          {/* Galeria paginada */}
          {slots.length > 0 && (
            <>
              <div className="grid grid-cols-8 gap-3">
                {slots.slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE).map((it, localIdx) => {
                  const i = page * PER_PAGE + localIdx;
                  const active = i === idx;
                  const superB = getIsSuper(it);
                  return (
                    <button
                      key={it.id}
                      onClick={() => setIdx(i)}
                      className={cn(
                        "relative rounded-xl overflow-hidden border transition",
                        active ? "border-emerald-400 ring-2 ring-emerald-400/20" : "border-white/10 hover:border-white/20"
                      )}
                      title={DICT.pt.copyHint}
                    >
                      <div className="absolute left-1 top-1 z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/70">
                        #{i + 1}
                      </div>
                      {superB && (
                        <div className="absolute right-1 top-1 z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-fuchsia-600/80">
                          SUPER
                        </div>
                      )}
                      {it.thumbnail ? (
                        <img src={it.thumbnail} alt="" className="h-20 w-full object-cover object-bottom" />
                      ) : (
                        <div className="h-20 w-full bg-white/10" />
                      )}
                    </button>
                  );
                })}
              </div>
              {pageCount > 1 && (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                  <Button variant="outline" className="h-8 px-3" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="opacity-70">{page + 1} / {pageCount}</div>
                  <Button variant="outline" className="h-8 px-3" onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page === pageCount - 1}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Página ───────────────────────── */
export default function HuntDetail({ numberId }) {
  const { isDark } = useTheme();
  const { t } = useLang();

  const [nId, setNId] = React.useState(() => {
    const m = (typeof location !== "undefined" && location.hash || "").match(/#\/hunts\/(\d+)/i);
    return Number(numberId ?? (m && m[1])) || 0;
  });
  React.useEffect(() => {
    const onHash = () => {
      const m = (location.hash || "").match(/#\/hunts\/(\d+)/i);
      const v = Number(numberId ?? (m && m[1])) || 0;
      setNId(v);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [numberId]);

  const [busy, setBusy] = React.useState(true);
  const [hunt, setHunt] = React.useState(null);
  const [slots, setSlots] = React.useState([]);
  const [errSlots, setErrSlots] = React.useState("");

  const [openAdd, setOpenAdd] = React.useState(false);

  const [editRow, setEditRow] = React.useState(null);
  const [editOpen, setEditOpen] = React.useState(false);

  const [delOpen, setDelOpen] = React.useState(false);
  const [delRow, setDelRow] = React.useState(null);

  const [sortBy, setSortBy] = React.useState({ key: "order", dir: 1 });

  const sortedSlots = React.useMemo(() => {
    const arr = [...slots];

    if (sortBy.key === "order") {
      return arr;
    }

    if (sortBy.key === "betsize") {
      arr.sort((a, b) => (toNum(a.bet_size) - toNum(b.bet_size)) * sortBy.dir || a.name.localeCompare(b.name));
      return arr;
    }

    if (sortBy.key === "date") {
      const getTime = (r) => {
        const raw = r?._raw || {};
        const c1 = raw.created_at || raw.createdAt || raw.timestamp || r.created_at;
        return c1 ? new Date(c1).getTime() : 0;
      };
      arr.sort((a, b) => (getTime(a) - getTime(b)) * sortBy.dir || a.id - b.id);
      return arr;
    }

    if (sortBy.key === "random") {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    return arr;
  }, [slots, sortBy]);

  // drag & drop
  const dragIndex = React.useRef(null);
  function onDragStart(i) { dragIndex.current = i; }
  function onDragOver(e) { e.preventDefault(); }
  async function onDrop(i) {
    const from = dragIndex.current;
    if (from == null || from === i) return;

    const arr = [...sortedSlots];
    const [moved] = arr.splice(from, 1);
    arr.splice(i, 0, moved);

    // Atualiza os índices locais
    arr.forEach((row, idx) => {
      row._raw = { ...(row._raw || {}) };
      for (const c of ORDER_COLS) row._raw[c] = idx + 1;
    });

    setSlots(arr);
    dragIndex.current = null;

    // Persistir no DB
    try { await persistOrder(arr); } catch {}
  }

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        setBusy(true);
        const { hunt } = await getHuntByNumberId(nId);
        if (active) setHunt(hunt || null);
      } catch {
        if (active) setHunt(null);
      } finally {
        if (active) setBusy(false);
      }
    })();
    return () => (active = false);
  }, [nId]);

  const refreshSlots = React.useCallback(async () => {
    if (!nId) return;
    try {
      setErrSlots("");
      const { slots: apiSlots } = await listHuntSlots({ numberId: nId });
      let list = apiSlots || [];

      // ordenar pela coluna de ordem que existir no DB
      const haveOrder = list.some((s) => readOrderFromRow(s) != null);
      if (haveOrder) {
        list = [...list].sort((a, b) => {
          const aa = readOrderFromRow(a);
          const bb = readOrderFromRow(b);
          const A = Number.isFinite(aa) ? aa : Number.MAX_SAFE_INTEGER;
          const B = Number.isFinite(bb) ? bb : Number.MAX_SAFE_INTEGER;
          return A - B || a.id - b.id;
        });
      }

      setSlots(list);
      setSortBy((s) => (s.key === "order" ? s : { key: "order", dir: 1 }));
    } catch {
      setSlots([]);
      setErrSlots("Falha a carregar as slots deste hunt.");
    }
  }, [nId]);

  React.useEffect(() => { refreshSlots(); }, [refreshSlots]);

  // KPIs reais (a partir das slots)
  const kpis = React.useMemo(() => {
    const startFromHunt = Number(hunt?.start_cost);
    const startFromSlots = slots.reduce((a, s) => a + (toNum(s.bet_size) || 0), 0);
    const start = Number.isFinite(startFromHunt) ? startFromHunt : startFromSlots;

    const amountWon = slots.reduce((a, s) => a + (toNum(s.payout) || 0), 0);
    const bonusCount = slots.length;
    const pl = amountWon - start;

    return { pl, amountWon, bonusCount, startCost: start };
  }, [hunt, slots]);

  function goBack() {
    window.location.hash = "#/hunts";
  }

  // abrir redeem
  const [openRedeem, setOpenRedeem] = React.useState(false);
  const [baselineAtStart, setBaselineAtStart] = React.useState(0);
  const [confirmStart, setConfirmStart] = React.useState(false);

  const openStart = () => setConfirmStart(true);
  const confirmStartYes = () => {
    setConfirmStart(false);
    const base = slots.reduce((a, s) => a + (toNum(s.payout) || 0), 0);
    setBaselineAtStart(base);
    setOpenRedeem(true);
  };

  if (busy) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 text-sm opacity-70">
        A carregar…
      </div>
    );
  }
  if (!hunt) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-4">
          <Button variant="outline" onClick={goBack}>
            <IconBack className="mr-2 h-4 w-4" />
            {t("back")}
          </Button>
        </div>
        <div className="text-sm opacity-70">Hunt não encontrado.</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={goBack}>
            <IconBack className="mr-2 h-4 w-4" />
            {t("back")}
          </Button>
          <h1 className="text-xl font-semibold">{hunt.title}</h1>
        </div>
      </div>

      {/* KPIs topo */}
      <div className="grid md:grid-cols-4 gap-3 mb-3">
        {[
          ["Profit/Loss +/-", renderPL(kpis.pl), kpis.pl >= 0 ? "text-emerald-400" : "text-red-400"],
          [t("bonusCount"), String(kpis.bonusCount), ""],
          [t("startCost"), fmtMoney(kpis.startCost), ""],
          [t("amountWon"), fmtMoney(kpis.amountWon), ""],
        ].map(([label, value, color], i) => (
          <div
            key={i}
            className={cn("rounded-xl border p-4", isDark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white")}
          >
            <div className={cn("text-xs", isDark ? "text-white/60" : "text-zinc-600")}>{label}</div>
            <div className={cn("font-semibold text-lg", numCls, color)}>{value}</div>
          </div>
        ))}
      </div>

      {/* Ações rápidas */}
      <div className="grid md:grid-cols-4 gap-3 mb-4">
        <Button
          variant="outline"
          className="h-10"
          onClick={() =>
            setSortBy((s) => ({ key: "betsize", dir: s.key === "betsize" ? -s.dir : -1 }))
          }
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          {t("betsize")}
        </Button>
        <Button
          variant="outline"
          className="h-10"
          onClick={() =>
            setSortBy((s) => ({ key: "date", dir: s.key === "date" ? -s.dir : -1 }))
          }
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {t("date")}
        </Button>
        <Button
          variant="outline"
          className="h-10"
          onClick={() => setSortBy({ key: "random", dir: 1 })}
        >
          <Shuffle className="mr-2 h-4 w-4" />
          {t("random")}
        </Button>

        <div className="flex items-center justify-end">
          <Button className="h-10" onClick={openStart}>
            <Play className="mr-2 h-4 w-4" />
            {t("startRedeeming")}
          </Button>
          <div className="w-2" />
          <Button variant="outline" onClick={() => setOpenAdd(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("addBonus")}
          </Button>
        </div>
      </div>

      {/* Widget Card (Preview + Designer + Overlay URL) */}
      <HuntWidgetCard
        numberId={hunt.number_id}
        huntTitle={hunt.title}
        bonusCount={kpis.bonusCount}
        kpiStart={kpis.startCost}
        kpiWon={kpis.amountWon}
        kpiPL={kpis.pl}
        slots={sortedSlots}
      />

      {/* Tabela */}
      <div className={cn("rounded-xl border overflow-hidden mt-4", isDark ? "border-white/10" : "border-zinc-200")}>
        {/* Header */}
        <div
          className={cn(
            "grid grid-cols-12 items-center px-4 py-3 text-xs font-semibold",
            isDark ? "bg-white/[0.04]" : "bg-zinc-50"
          )}
        >
          <div className="col-span-7">{t("bonus")}</div>
          <div className="col-span-1 text-center">{t("betsize")}</div>
          <div className="col-span-2 text-center">{t("payout")}</div>
          <div className="col-span-1 text-center">{t("multiplier")}</div>
          <div className="col-span-1 text-right">{t("actions")}</div>
        </div>

        {errSlots && <div className="px-4 py-3 text-sm text-red-400">{errSlots}</div>}

        {sortedSlots.length === 0 && !errSlots && (
          <div className="px-4 py-6 text-sm opacity-70">Ainda sem slots neste hunt.</div>
        )}

        {sortedSlots.map((s, i) => {
          const isSuper = getIsSuper(s);
          return (
            <div
              key={s.id}
              className={cn(
                "grid grid-cols-12 items-center px-4 py-4 min-h-[56px] border-t",
                isDark ? "border-white/10" : "border-zinc-200",
                isSuper ? "bg-fuchsia-500/5 border-l-4 border-l-fuchsia-400/70" : ""
              )}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(i)}
            >
              {/* BONUS */}
              <div className="col-span-7 flex items-center gap-3 min-w-0">
                <div className="text-[11px] opacity-60 w-6">#{i + 1}</div>
                {s.thumbnail ? (
                  <img src={s.thumbnail} alt="" className="h-8 w-8 rounded object-cover" />
                ) : (
                  <div className="h-8 w-8 rounded bg-white/10" />
                )}
                <div className="min-w-0">
                  <div className="truncate font-medium flex items-center gap-2">
                    <span className="truncate">{s.name}</span>
                    {isSuper && (
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/40 inline-flex items-center gap-1">
                        <Star className="h-3 w-3 fill-fuchsia-300" />
                        Super
                      </span>
                    )}
                  </div>
                  <div className="text-xs opacity-70 truncate">{s.provider || "—"}</div>
                </div>
              </div>

              {/* Colunas numéricas */}
              <div className={cn("col-span-1 text-center flex items-center justify-center", numCls)}>
                {s.bet_size ?? "—"}
              </div>
              <div className={cn("col-span-2 text-center flex items-center justify-center", numCls)}>
                {s.payout != null ? fmtMoney(s.payout) : "—"}
              </div>
              <div className={cn("col-span-1 text-center flex items-center justify-center", numCls)}>
                {s.multiplier != null ? Number(s.multiplier).toFixed(2) : "—"}
              </div>

              {/* Ações */}
              <div className="col-span-1 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  title={t("edit")}
                  className="h-7 w-7"
                  onClick={() => { setEditRow(s); setEditOpen(true); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  variant="destructive"
                  size="icon"
                  title={t("delete")}
                  className="h-7 w-7 text-white"
                  onClick={() => { setDelRow(s); setDelOpen(true); }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-[11px] mt-8 opacity-60 text-center">
        {t("playResponsibly")}
      </div>

      {/* Modais */}
      <AddBonusModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        numberId={hunt.number_id}
        onAdded={refreshSlots}
      />

      <RedeemDrawer
        open={openRedeem}
        onClose={() => setOpenRedeem(false)}
        hunt={hunt}
        slots={sortedSlots}
        onSaved={refreshSlots}
        baselineAtStart={baselineAtStart}
      />

      <EditBonusModal
        open={editOpen}
        row={editRow}
        onClose={() => setEditOpen(false)}
        onSaved={refreshSlots}
      />

      <ConfirmDeleteModal
        open={delOpen}
        slot={delRow}
        onCancel={() => setDelOpen(false)}
        onConfirm={async () => {
          try {
            await deleteHuntSlot(delRow.id);
            setDelOpen(false);
            setDelRow(null);
            await refreshSlots();
          } catch (e) {
            alert(e.message || "Falha ao eliminar.");
          }
        }}
      />

      {/* Confirmar início do redeem */}
      <ConfirmDialog
        open={confirmStart}
        title={t("confirmStartTitle")}
        body={t("confirmStartBody")}
        confirmText={t("confirmYes")}
        cancelText={t("confirmNo")}
        onConfirm={confirmStartYes}
        onCancel={() => setConfirmStart(false)}
      />
    </div>
  );
}
