// /src/hunt-detail.jsx
import React from "react";
import { useTheme, useAuth } from "@/contexts/auth-context";
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
  ExternalLink,
  Palette,
  Save,
  Wallet,
  Scale,
  Gift,
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

/* ───────────────────────── Fonte ───────────────────────── */
const RUBIK_STACK =
  `'Rubik', ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`;

/* ───────────────────────── i18n ───────────────────────── */
const DICT = {
  pt: {
    back: "Voltar",
    startRedeeming: "Start Redeeming!",
    addBonus: "Add Bonus!",
    betsize: "Betsize",
    date: "Data",
    random: "Random",
    bonus: "Bonus",
    payout: "Payout",
    multiplier: "Multiplier",
    actions: "Ações",
    delete: "Eliminar",
    edit: "Editar",
    close: "Fechar",
    saveContinue: "Guardar & seguinte",
    copySlot: "Copiar nome da slot",
    copied: "Copiado:",
    editBonus: "Editar bonus",
    chooseSlot: "Escolhe a slot *",
    superBonus: "Super bonus",
    betsizeReq: "Betsize *",
    cancel: "Cancelar",
    guardar: "Guardar",
    eliminarBonus: "Eliminar bonus",
    eliminarPerg:
      "Tens a certeza que queres eliminar este bonus? Esta ação não pode ser anulada.",
    confirmStartTitle: "Começar o Opening?",
    confirmStartBody:
      "Irás iniciar o redeeming das slots. Queres mesmo começar?",
    confirmYes: "Começar",
    confirmNo: "Cancelar",
    startCost: "Start",
    amountWon: "Amount won",
    kpiBE: "B/E",
    kpiBonus: "# Bonus",
    infoVertical: "Vertical infos (#/bet)",
    showHuntTitle: "Mostrar título do hunt",
    showCurrentSlot: "Mostrar slot atual",
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
    eliminarPerg:
      "Are you sure you want to delete this bonus? This cannot be undone.",
    confirmStartTitle: "Start Opening?",
    confirmStartBody:
      "You are about to begin redeeming the slots. Do you want to start?",
    confirmYes: "Start",
    confirmNo: "Cancel",
    startCost: "Start",
    amountWon: "Amount won",
    kpiBE: "B/E",
    kpiBonus: "# Bonus",
    infoVertical: "Vertical infos (#/bet)",
    showHuntTitle: "Show hunt title",
    showCurrentSlot: "Show current slot",
  },
};
function useLang() {
  const [lang, setLang] = React.useState(() => {
    try {
      const ls =
        (typeof localStorage !== "undefined" &&
          localStorage.getItem("lang")) ||
        "";
      const html =
        (typeof document !== "undefined" && document.documentElement.lang) ||
        "";
      const nav =
        (typeof navigator !== "undefined" && navigator.language) || "pt-PT";
      const pick = (ls || html || nav).toLowerCase().startsWith("pt")
        ? "pt"
        : "en";
      return pick;
    } catch {
      return "pt";
    }
  });
  const t = React.useCallback(
    (k) => (DICT[lang] && DICT[lang][k]) || DICT.en[k] || k,
    [lang]
  );
  return { lang, t, setLang };
}

/* ───────────────────────── utils ───────────────────────── */
const ORDER_COLS = ["order_index", "order", "position", "sort", "order_idx"];
const readOrderFromRow = (row) => {
  const raw = row?._raw || row || {};
  for (const c of ORDER_COLS) {
    const v = Number(raw[c]);
    if (Number.isFinite(v)) return v;
  }
  return null;
};

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
function fmtPlain(n, decimals = 2) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}
const toNum = (v) => {
  if (v == null || v === "") return 0;
  if (typeof v === "string") v = v.replace(",", ".");
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
function hexToRgba(hex, a = 1) {
  try {
    let h = String(hex || "").replace("#", "");
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255,
      g = (n >> 8) & 255,
      b = n & 255;
    return `rgba(${r},${g},${b},${a})`;
  } catch {
    return `rgba(232,121,249,${a})`;
  }
}
function anyToRgba(color, a = 1) {
  const v = String(color || "").trim();
  if (/^(rgba?|hsla?)\(/i.test(v)) return v;
  return hexToRgba(v, a);
}

/* Campo cor com swatch */
function ColorField({ label, value, onChange, placeholder = "#RRGGBB ou rgba()" }) {
  const css = String(value ?? "");
  return (
    <div>
      <div className="text-xs opacity-70 mb-1">{label}</div>
      <div className="relative">
        <div
          className="absolute left-2 top-1/2 -translate-y-1/2 h-5 w-8 rounded border border-white/20"
          style={{ background: css || "transparent" }}
        />
        <Input
          type="text"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-9 pl-12 rounded-xl bg-zinc-900 border-white/10 text-white placeholder:text-white/40"
        />
      </div>
    </div>
  );
}
function Section({ title, defaultOpen = true, right, children }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 max-w-full overflow-x-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 flex items-center justify-between"
      >
        <div className="text-sm font-medium">{title}</div>
        <div className="flex items-center gap-2">
          {right}
          <ChevronDown className={cn("h-4 w-4 transition", open ? "rotate-180" : "")} />
        </div>
      </button>
      {open && <div className="p-3 space-y-3">{children}</div>}
    </div>
  );
}

function LayoutPresetChip({ label, variant, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "w-full flex items-center gap-2 h-9 px-3 rounded-lg border transition truncate",
        active ? "border-white/30 bg-white/10 ring-1 ring-white/40" : "border-white/10 hover:bg-white/5"
      )}
    >
      {/* mini-preview */}
      <div className="h-4 w-8 rounded overflow-hidden bg-white/10 relative shrink-0">
        {variant === "Default" && (
          <div className="absolute inset-0 flex items-center justify-center gap-0.5">
            <span className="h-3 w-2 rounded bg-white/20" />
            <span className="h-3 w-2 rounded bg-white/40" />
            <span className="h-3 w-2 rounded bg-white/20" />
          </div>
        )}
        {variant === "Compact" && (
          <div className="absolute inset-0 grid grid-cols-2 gap-0.5 p-0.5">
            <span className="rounded bg-white/30" />
            <span className="rounded bg-white/20" />
            <span className="rounded bg-white/20" />
            <span className="rounded bg-white/30" />
          </div>
        )}
        {variant === "Bar" && (
          <div className="absolute inset-0">
            <div className="absolute left-0 right-0 top-0.5 mx-0.5 h-2.5 rounded bg-white/25" />
            <div className="absolute left-0 right-0 bottom-0.5 mx-1 h-0.5 rounded bg-white/70" />
          </div>
        )}
        {variant === "Minimal" && (
          <div className="absolute inset-0 flex items-center justify-center gap-0.5">
            <span className="h-2 w-2 rounded bg-white/20" />
            <span className="h-2 w-2 rounded bg-white/40" />
            <span className="h-2 w-2 rounded bg-white/20" />
          </div>
        )}
        {variant === "Head-to-Head" && (
          <div className="absolute inset-0 flex items-center justify-between px-0.5">
            <span className="h-3 w-3 rounded bg-white/25" />
            <span className="h-3 w-[1px] bg-white/50" />
            <span className="h-3 w-3 rounded bg-white/25" />
          </div>
        )}
      </div>
      <span className="text-sm truncate">{label}</span>
    </button>
  );
}


function Segmented({ value, onChange, options, className = "" }) {
  return (
    <div className={cn("inline-flex rounded-lg border border-white/10 bg-zinc-900 p-0.5", className)}>
      {options.map((o) => {
        const val = o.value ?? o;
        const label = o.label ?? o;
        const active = String(value) === String(val);
        return (
          <button
            key={val}
            type="button"
            onClick={() => onChange(val)}
            className={cn(
              "px-3 h-9 rounded-md text-sm transition",
              active ? "bg-white/10" : "text-white/70 hover:text-white"
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="text-xs opacity-70 mb-1">{label}</div>
      {children}
      {hint ? <div className="text-[11px] opacity-60 mt-1">{hint}</div> : null}
    </div>
  );
}

function PresetChip({ name, colors = [], onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 h-9 px-3 rounded-lg border transition truncate",
        active ? "border-white/30 bg-white/10" : "border-white/10 hover:bg-white/5"
      )}
      title={name}
    >
      <span
        className="h-4 w-8 rounded shrink-0"
        style={{ background: `linear-gradient(90deg, ${colors[0]} 0%, ${colors[1]} 100%)` }}
      />
      <span className="text-sm truncate">{name}</span>
    </button>
  );
}

/* ───────────────────────── db helpers ───────────────────────── */
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

async function persistOrder(slots) {
  const colCandidates = ["order_index", "order", "position", "sort", "order_idx"];
  for (let i = 0; i < slots.length; i++) {
    const rowId = slots[i].id;
    let ok = false;
    for (const col of colCandidates) {
      const r1 = await supabase.from("hunt_slots").update({ [col]: i + 1 }).eq("id", rowId);
      if (!r1.error) { ok = true; break; }
      const r2 = await supabase.from("hunt_slots").update({ [col]: i + 1 }).eq("ID", rowId);
      if (!r2.error) { ok = true; break; }
    }
    if (!ok) { /* ignora */ }
  }
}

/* ───────────────────────── Salvar/ler opções do overlay (DB + fallback) ───────────────────────── */
function useOverlaySettings({ type, huntNumberId, defaultValue }) {
  const { user } = useAuth();
  const [opts, setOpts] = React.useState(defaultValue);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [rowId, setRowId] = React.useState(null);

  const key = React.useMemo(
    () => `overlay:${type}:${huntNumberId == null ? "null" : String(huntNumberId)}`,
    [type, huntNumberId]
  );

  // helper: escolhe o campo certo vindo da BD
  const pickOpts = (row) =>
    row?.opts ?? row?.settings ?? row?.config ?? row?.data ?? row?.json ?? {};

  // helper: tenta gravar na primeira coluna que exista
  async function upsertToDb(value) {
    if (!user) return;

    const cols = ["opts", "settings", "config", "data", "json"];
    const base = {
      user_id: user.id,
      type,
      hunt_number_id: huntNumberId ?? null,
      updated_at: new Date().toISOString(),
    };

    // update
    if (rowId) {
      let last;
      for (const col of cols) {
        const { error } = await supabase
          .from("overlay_settings")
          .update({ ...base, [col]: value })
          .eq("id", rowId);
        if (!error) return;
        last = error; // tenta próxima coluna
      }
      throw last || new Error("Falha a atualizar overlay_settings.");
    }

    // insert (ou update se já existir)
    // tenta descobrir se já há row
    let q = supabase
      .from("overlay_settings")
      .select("id")
      .eq("user_id", user.id)
      .eq("type", type)
      .limit(1);
    if (huntNumberId == null) q = q.is("hunt_number_id", null);
    else                      q = q.eq("hunt_number_id", huntNumberId);

    const probe = await q.maybeSingle();
    const existingId = probe?.data?.id ?? null;

    if (existingId) {
      setRowId(existingId);
      return upsertToDb(value); // faz o update acima
    }

    // criar linha nova tentando as várias colunas
    let last;
    for (const col of cols) {
      const { data, error } = await supabase
        .from("overlay_settings")
        .insert({ ...base, [col]: value })
        .select("id")
        .single();
      if (!error && data?.id) { setRowId(data.id); return; }
      last = error;
    }
    throw last || new Error("Falha a inserir overlay_settings.");
  }

  // 0) carregar imediatamente do localStorage
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setOpts((o) => ({ ...o, ...JSON.parse(raw) }));
    } catch {}
  }, [key]);

  const debounced = useDebounced(opts, 400);

React.useEffect(() => {
  let alive = true;
  (async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user) { setLoading(false); return; }

      let q = supabase
        .from("overlay_settings")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", type)
        .limit(1);

      if (huntNumberId == null) q = q.is("hunt_number_id", null);
      else                      q = q.eq("hunt_number_id", huntNumberId);

      const { data, error } = await q.maybeSingle();
      if (!alive) return;
      if (error && error.code !== "PGRST116") throw error;

      if (data?.id) {
        setRowId(data.id);
        const merged = { ...defaultValue, ...pickOpts(data) }; // pickOpts vê opts/settings/config/...
        setOpts(merged);
        try { localStorage.setItem(key, JSON.stringify(merged)); } catch {}
      } else {
        setRowId(null);
      }
    } catch (e) {
      if (alive) setError(e);
      console.warn("[overlay_settings] load failed:", e?.message || e);
    } finally {
      if (alive) setLoading(false);
    }
  })();
  return () => { alive = false; };
}, [user?.id, type, huntNumberId, key, defaultValue]);


  // 2) gravar (local + BD)
  React.useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(debounced)); } catch {}
    (async () => {
      try { await upsertToDb(debounced); }
      catch (e) { console.warn("[overlay_settings] save failed:", e?.message || e); }
    })();
  }, [debounced, key, user?.id, type, huntNumberId, rowId]);

  return [opts, setOpts, { loading, error }];
}


function useDebounced(value, delay = 250) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
function useLocalState(key, initial) {
  const [s, setS] = React.useState(() => {
    try {
      const str =
        typeof localStorage !== "undefined" && localStorage.getItem(key);
      return str ? { ...initial, ...JSON.parse(str) } : initial;
    } catch {
      return initial;
    }
  });
  React.useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(s));
    } catch {}
  }, [key, s]);
  return [s, setS];
}

/* ───────────────────────── Overlays — helpers & presets ───────────────────────── */
const PANEL_PRESETS = {
  Neon: ["#0b1020", "#111827"],
  Sunset: ["#3d0f3a", "#6a1047"],
  Emerald: ["#063a3a", "#0f5135"],
  Magenta: ["#3c114a", "#5f0d6f"],
  Carbon: ["#0a0a0a", "#1a1a1a"],
  Twilight: ["#0e2038", "#0f2f55"],
};
const KPI_COLOR_PRESETS = {
  glass:   { bg: "rgba(255,255,255,.10)", border: "rgba(255,255,255,.15)", text: "#ffffff" },
  slate:   { bg: "rgba(17,24,39,.70)",    border: "rgba(255,255,255,.12)", text: "#e5e7eb" },
  emerald: { bg: "rgba(16,185,129,.16)",  border: "rgba(16,185,129,.40)",  text: "#d1fae5" },
  amber:   { bg: "rgba(245,158,11,.16)",  border: "rgba(245,158,11,.40)",  text: "#fde68a" },
  rose:    { bg: "rgba(244,63,94,.17)",   border: "rgba(244,63,94,.40)",   text: "#fecdd3" },
  violet:  { bg: "rgba(139,92,246,.17)",  border: "rgba(139,92,246,.40)",  text: "#ddd6fe" },
  azure:   { bg: "rgba(59,130,246,.17)",  border: "rgba(59,130,246,.40)",  text: "#dbeafe" },
  neon:    { bg: hexToRgba("#22d3ee",.16),border: hexToRgba("#22d3ee",.45),text: "#cffafe" },
};
function getKpiColors(opts){
  const p = KPI_COLOR_PRESETS[String(opts.kpiColorPreset||"glass")] || KPI_COLOR_PRESETS.glass;
  return { bg: opts.kpiBg || p.bg, border: opts.kpiBorder || p.border, text: opts.kpiText || p.text };
}

const DEFAULT_HUNT_OVERLAY = {
  design: "cards",
  layout: "carousel",
  visible: 3,
  autoScroll: true,
  scrollDur: 30,
  showBox: true,
  kpiPos: "top",
  kpiDir: "row",
  kpiAlign: "center",
  kpiSide: "right",
  kpiGap: 8,
  kpiSideSpace: 18,
  kpiSize: 1.0,
  kpiShape: "box",
  kpiRound: 2,
  kpiShowLabels: true,
  kpiFont: 1.0,
  kpiAltIconMs: 1200,
  kpiAltValueMs: 1800,
  kpiAnim: "fade",
  kpiColorPreset: "glass",
  kpiBg: "",
  kpiBorder: "",
  kpiText: "",
  cardH: 160,
  nameStyle: "bar",
  betStyle: "inline",
  showIdx: true,
  showBet: true,
  showSuper: true,
  vInfo: false,
  infoPos: "left",
  superGlow: true,
  superGlowColor: "#e879f9",
  superGlowStrength: 0.6,
  superTagColor: "#e879f9",
  superTextColor: "#120614",
  panelBorder: "rgba(255,255,255,.12)",
  textColor:   "#e5e7eb",
  subtextColor:"#9ca3af",
  accentColor: "#fb7185",
  chipBg:      "rgba(255,255,255,.08)",
  panelBgStart: "#0b1020",
  panelBgEnd:   "#111827",
  pad: 16,
  align: "center",
  shine: true,
  pulse: true,
  thumbs: true,
  baseW: 560,
  baseH: 280,
};
const DEFAULT_OPENING_OVERLAY = {
  design: "default",
  pad: 16,
  align: "center",
  shine: true,
  pulse: true,
  baseW: 560,
  baseH: 320,
  showTitle: true,
  showCurrent: true,
  kpiFont: 1.0,
};

/* ───────────────────────── URLs ───────────────────────── */
function buildHuntOverlayUrl(base, huntNumberId, o) {
  const qs = new URLSearchParams();
  qs.set("design", "cards");
  qs.set("layout", String(o.layout || "carousel"));
  qs.set("visible", String(o.visible || 3));
  if (o.autoScroll) qs.set("scroll", "1");
  qs.set("speed", String(o.scrollDur || 30));
  qs.set("cardH", String(o.cardH || 140));
  qs.set("box", o.showBox ? "1" : "0");
  qs.set("name", String(o.nameStyle || "bar"));
  qs.set("bet", String(o.betStyle || "inline"));
  qs.set("showIdx", o.showIdx ? "1" : "0");
  qs.set("showBet", o.showBet ? "1" : "0");
  qs.set("showSuper", o.showSuper ? "1" : "0");
  if (o.vInfo) qs.set("vinfo", "1");
  qs.set("infoside", String(o.infoPos || "left"));
  qs.set("kpos", String(o.kpiPos || "top"));
  qs.set("kdir", String(o.kpiDir || "row"));
  qs.set("kalign", String(o.kpiAlign || "center"));
  qs.set("kside", String(o.kpiSide || "right"));
  qs.set("kgap", String(o.kpiGap ?? 8));
  qs.set("kspace", String(o.kpiSideSpace ?? 18));
  qs.set("ksize", String(o.kpiSize ?? 1));
  qs.set("kshape", String(o.kpiShape || "box"));
  qs.set("kround", String(o.kpiRound ?? 2));
  qs.set("klabels", o.kpiShowLabels ? "1" : "0");
  qs.set("kfont", String(o.kpiFont ?? 1));
  qs.set("kicon", String(o.kpiAltIconMs ?? 0));
  qs.set("kval",  String(o.kpiAltValueMs ?? 0));
  qs.set("kanim", String(o.kpiAnim || "fade"));
  qs.set("kcp",   String(o.kpiColorPreset || "glass"));
  if (o.kpiBg)     qs.set("kbg", String(o.kpiBg).replace("#",""));
  if (o.kpiBorder) qs.set("kbr", String(o.kpiBorder).replace("#",""));
  if (o.kpiText)   qs.set("ktx", String(o.kpiText).replace("#",""));
  if (o.superGlow === false) qs.set("sg", "0");
  if (o.superGlowColor) qs.set("sgc", String(o.superGlowColor).replace("#",""));
  if (o.superGlowStrength != null) qs.set("sgs", String(o.superGlowStrength));
  if (o.superTagColor) qs.set("stc", String(o.superTagColor).replace("#",""));
  if (o.panelBgStart) qs.set("bg1", String(o.panelBgStart).replace("#",""));
  if (o.panelBgEnd)   qs.set("bg2", String(o.panelBgEnd).replace("#",""));
  if (o.superTextColor) qs.set("stx", String(o.superTextColor).replace("#",""));
  qs.set("align", String(o.align || "center"));
  qs.set("pad", String(o.pad || 0));
  qs.set("bw", String(o.baseW || 560));
  qs.set("bh", String(o.baseH || 280));
  return `${base}#/overlay/hunt/${huntNumberId}?${qs.toString()}`;
}
function buildOpeningOverlayUrl(base, huntNumberId, opts) {
  const qs = new URLSearchParams();
  qs.set("design", "opening");
  if (opts.shine) qs.set("shine", "1");
  if (opts.pulse) qs.set("pulse", "1");
  qs.set("align", String(opts.align || "center"));
  qs.set("pad", String(opts.pad || 0));
  qs.set("bw", String(opts.baseW || 560));
  qs.set("bh", String(opts.baseH || 320));
  qs.set("title", opts.showTitle === false ? "0" : "1");
  qs.set("current", opts.showCurrent === false ? "0" : "1");
  return `${base}#/overlay/opening/${huntNumberId}?${qs.toString()}`;
}

/* ───────────────────────── Hunt Overlay Preview ───────────────────────── */
function HuntOverlayPreview({ hunt, slots, opts }) {
  const start = Number(hunt?.start_cost) || slots.reduce((a, s) => a + toNum(s.bet_size), 0);
  const won   = slots.reduce((a, s) => a + toNum(s.payout), 0);
  const beLeft = Math.max(0, start - won);

  const baseW = Number(opts.baseW || 560);
  const baseH = Number(opts.baseH || 280);
  const showBox = opts.showBox !== false;

  const layout   = String(opts.layout || "carousel");
  const visible  = Math.max(1, Number(opts.visible || 3));
  const autoScroll = !!opts.autoScroll;
  const speedSec = Math.max(5, Math.min(180, Number(opts.scrollDur || 30)));
  const gapCards = layout === "grid" ? 8 : 12;

  const kpiPos   = String(opts.kpiPos || "top");
  const kpiDir   = String(opts.kpiDir || "row");
  const kpiAlign = String(opts.kpiAlign || "center");
  const kpiSide  = String(opts.kpiSide || "right");
  const kpiGap   = Number(opts.kpiGap ?? 8);
  const kpiSideSpace = Number(opts.kpiSideSpace ?? 18);
  const kpiSize  = Math.max(0.7, Math.min(1.6, Number(opts.kpiSize ?? 1)));
  const kpiShape = String(opts.kpiShape || "box");
  const kpiRound = Math.max(0, Math.min(2, Number(opts.kpiRound ?? 2)));
  const kpiShowLabels = !!opts.kpiShowLabels;
  const kpiFont = Math.max(0.6, Math.min(2, Number(opts.kpiFont ?? 1)));

  const kpiAltIconMs  = Math.max(0, Number(opts.kpiAltIconMs ?? 0));
  const kpiAltValueMs = Math.max(0, Number(opts.kpiAltValueMs ?? 0));
  const kpiAnim       = String(opts.kpiAnim || "fade");
  const kColors       = getKpiColors(opts);

  const formatPlainRound = (n) => fmtPlain(n, kpiRound);
  const items = [
    { key: "start",  label: "Start",  value: formatPlainRound(start),  Icon: Wallet },
    { key: "be",     label: "B/E",    value: formatPlainRound(beLeft), Icon: Scale  },
    { key: "bonus",  label: "# Bonus",value: String(slots.length),     Icon: Gift   },
  ];
  const wantAlt = kpiShape === "circle" && (kpiAltIconMs > 0 || kpiAltValueMs > 0);
  const [phase, setPhase] = React.useState(0);
  React.useEffect(() => {
    if (!wantAlt) return;
    let alive = true;
    let p = 0;
    setPhase(0);
    function tick() {
      const ms = p === 0 ? (kpiAltIconMs || 1000) : (kpiAltValueMs || 1000);
      const id = setTimeout(() => {
        if (!alive) return;
        p = p ? 0 : 1;
        setPhase(p);
        tick();
      }, ms);
      return () => clearTimeout(id);
    }
    const cancel = tick();
    return () => { alive = false; cancel && cancel(); };
  }, [wantAlt, kpiAltIconMs, kpiAltValueMs, kpiShape]);
  const showIcons = wantAlt ? phase === 0 : false;

  const pillH   = Math.round(28 * kpiSize);
  const boxH    = Math.round(32 * kpiSize);
  const circleD = Math.round(36 * kpiSize);
  const kpiH    = kpiShape === "circle" ? circleD : (kpiShape === "box" ? boxH : pillH);
  const estKpiW = kpiShape === "circle" ? circleD : Math.round(112 * kpiSize);
  const reserveSide = kpiPos === "side" ? estKpiW + kpiSideSpace + 6 : 0;

  const kStyle = {
    background: kColors.bg,
    borderColor: kColors.border,
    color: kColors.text,
    fontFamily: RUBIK_STACK,
  };
  const iconPxCircle = Math.max(12, Math.round(circleD * 0.56));
  const valueFontCircle = Math.max(10, Math.round(circleD * 0.36 * kpiFont));

  const cardHeight = Math.max(120, Number(opts.cardH || 140));

  function Card({ s, i, width }) {
    const superB = getIsSuper(s);
    const glowColor = opts.superGlowColor || "#e879f9";
    const glowAlpha = Math.max(0, Math.min(1, Number(opts.superGlowStrength ?? 0.6)));
    const borderCol = hexToRgba(glowColor, 0.45 + glowAlpha * 0.35);
    const shadowSoft = `0 0 ${18 + 30 * glowAlpha}px ${anyToRgba(glowColor, 0.35 * glowAlpha)}, 0 12px 28px rgba(0,0,0,.35)`;
    const captionIsBar = opts.nameStyle === "bar";
    const captionIsFloat = opts.nameStyle === "float";
    const showName = opts.nameStyle !== "hidden";
    const badgesVertical = !!opts.vInfo;
    const infoRight = String(opts.infoPos || "left") === "right";

    return (
      <div
        className="relative rounded-xl overflow-hidden border"
        style={{ height: cardHeight, width, borderColor: superB ? borderCol : "rgba(255,255,255,.10)", boxShadow: superB ? shadowSoft : "0 12px 28px rgba(0,0,0,.35)" }}
        title={s?.name}
      >
        {s?.thumbnail
          ? <img src={s.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
          : <div className="absolute inset-0 bg-white/10" />}

        {superB && opts.superGlow && (
          <>
            <div className="absolute -inset-1 rounded-xl pointer-events-none"
                 style={{ boxShadow: `0 0 ${22 + 40 * glowAlpha}px ${anyToRgba(glowColor, 0.5 * glowAlpha)}` }} />
            <div className="absolute inset-0 pointer-events-none"
                 style={{ background: `radial-gradient(60% 50% at 50% 40%, ${anyToRgba(glowColor, 0.28 * glowAlpha)} 0%, transparent 60%)` }} />
          </>
        )}

        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

        <div
          className={cn("absolute top-1.5 z-10", infoRight ? "right-1.5" : "left-1.5",
                        badgesVertical ? "flex flex-col items-start gap-1" : "flex items-center gap-1")}
          style={infoRight ? { alignItems: badgesVertical ? "flex-end" : "center", textAlign: "right" } : {}}
        >
          {opts.showIdx && <div className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-black/70">#{i + 1}</div>}
          {opts.showBet && (opts.betStyle === "chip" || !!opts.vInfo) && (
            <div className="text-[11px] font-semibold px-1.5 py-0.5 rounded bg-white/85 text-black/90 shadow">
              {fmtPlain(toNum(s.bet_size))}
            </div>
          )}
        </div>

        {opts.showSuper && superB && (
          <div className={cn("absolute top-1.5 z-10 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide",
                             infoRight ? "left-1.5" : "right-1.5")}
               style={{ background: anyToRgba(opts.superTagColor || "#e879f9", 0.95), color: opts.superTextColor || "#120614" }}>
            SUPER
          </div>
        )}

        {showName && captionIsBar && (
          <div className="absolute left-2 right-2 bottom-2">
            <div className="px-2.5 py-1.5 rounded-lg border text-white shadow-[0_10px_30px_rgba(0,0,0,.45)] truncate"
                 style={{ background: "rgba(0,0,0,.45)", borderColor: "rgba(255,255,255,.18)", fontFamily: RUBIK_STACK }}
                 title={s?.name || ""}>
              <div className="font-semibold leading-tight truncate">{s?.name || "—"}</div>
              {opts.betStyle === "inline" && !!opts.showBet && (
                <div className="mt-0.5 text-[11px] opacity-85 flex items-center gap-1">
                  <span className="h-[6px] w-[6px] rounded-full bg-white/70" />
                  {s?.bet_size != null ? fmtPlain(toNum(s.bet_size)) : "—"}
                </div>
              )}
            </div>
          </div>
        )}

        {showName && captionIsFloat && (
          <div className="absolute left-2 bottom-2 right-2 pointer-events-none" style={{ fontFamily: RUBIK_STACK }}>
            <div className="font-semibold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,.8)] truncate">{s?.name || "—"}</div>
            {opts.betStyle === "inline" && !!opts.showBet && (
              <div className="text-[11px] text-white/85 drop-shadow-[0_2px_6px_rgba(0,0,0,.8)]">
                {s?.bet_size != null ? fmtPlain(toNum(s.bet_size)) : "—"}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function KpiBadge({ shape, label, value, Icon }) {
    if (shape === "circle") {
      const circleD = Math.round(36 * (opts.kpiSize ?? 1));
      const iconPxCircle = Math.max(12, Math.round(circleD * 0.56));
      const valueFontCircle = Math.max(10, Math.round(circleD * 0.36 * (opts.kpiFont ?? 1)));
      return (
        <div
          className="rounded-full border shadow-lg grid place-items-center"
          style={{ width: circleD, height: circleD, lineHeight: 0, background: kColors.bg, borderColor: kColors.border, color: kColors.text, fontFamily: RUBIK_STACK }}
          title={label}
        >
          {showIcons ? (
            <Icon size={iconPxCircle} strokeWidth={2} className="block" />
          ) : (
            <span className={numCls} style={{ fontSize: valueFontCircle, lineHeight: 1, fontWeight: 700 }}>
              {value}
            </span>
          )}
        </div>
      );
    }
    const kpiH = (opts.kpiShape === "box" ? Math.round(32 * (opts.kpiSize ?? 1)) : Math.round(28 * (opts.kpiSize ?? 1)));
    return (
      <div
        className={cn("border px-3 inline-flex items-center", opts.kpiShape === "pill" ? "rounded-full" : "rounded-lg")}
        style={{ height: kpiH, gap: 6, background: kColors.bg, borderColor: kColors.border, color: kColors.text, fontFamily: RUBIK_STACK }}
      >
        {opts.kpiShowLabels !== false && (
          <span className="opacity-80 text-[12px]" style={{ lineHeight: 1 }}>{label}:</span>
        )}
        <b className={cn(numCls)} style={{ lineHeight: 1, fontWeight: 700, fontSize: Math.round(12 * (opts.kpiFont ?? 1)) }}>
          {value}
        </b>
      </div>
    );
  }

  function KPIsInline() {
    const j =
      opts.kpiAlign === "left" ? "justify-start" :
      opts.kpiAlign === "right" ? "justify-end" : "justify-center";
    const dir = opts.kpiDir === "column" ? "flex-col" : "flex-row items-center";
    return (
      <div className="px-3 py-2" style={{ fontFamily: RUBIK_STACK }}>
        <div className={cn("flex", dir, j)} style={{ gap: opts.kpiGap ?? 8 }}>
          {items.map(({ key, label, value, Icon }) => (
            <KpiBadge key={key} shape={opts.kpiShape} label={label} value={value} Icon={Icon} />
          ))}
        </div>
      </div>
    );
  }
  function KPIsSide() {
    const kpiGap = Number(opts.kpiGap ?? 8);
    const estKpiW = opts.kpiShape === "circle" ? Math.round(36 * (opts.kpiSize ?? 1)) : Math.round(112 * (opts.kpiSize ?? 1));
    const kpiSideSpace = Number(opts.kpiSideSpace ?? 18);
    return (
      <div
        className="absolute z-20"
        style={{
          top: "50%",
          transform: "translateY(-50%)",
          left:  opts.kpiSide === "left"  ? kpiSideSpace : undefined,
          right: opts.kpiSide === "right" ? kpiSideSpace : undefined,
          display: "flex",
          flexDirection: "column",
          gap: kpiGap,
          fontFamily: RUBIK_STACK,
        }}
      >
        {items.map(({ key, label, value, Icon }) => (
          <KpiBadge key={key} shape={opts.kpiShape} label={label} value={value} Icon={Icon} />
        ))}
      </div>
    );
  }

  const innerW = baseW;
  const visibleW = layout === "carousel"
    ? Math.max(140, Math.floor((innerW - 6 - (visible - 1) * (layout === "grid" ? 8 : 12)) / visible))
    : undefined;

  const bg1 = opts.panelBgStart || "#0b1020";
  const bg2 = opts.panelBgEnd || "#111827";

  return (
    <div
      className="rounded-xl overflow-hidden relative"
      style={{
        width: baseW,
        height: baseH,
        border: showBox ? `1px solid ${opts.panelBorder || "rgba(255,255,255,.10)"}` : "none",
        background: showBox ? `linear-gradient(135deg, ${bg1} 0%, ${bg2} 100%)` : "transparent",
        fontFamily: RUBIK_STACK,
      }}
    >
      {opts.kpiPos === "top" && <KPIsInline />}
      {opts.kpiPos === "side" && <KPIsSide />}

      {layout === "grid" ? (
        <div className="h-full px-3 relative flex items-center">
          {opts.kpiPos === "side" && opts.kpiSide === "left" && <div style={{ width: visibleW }} />}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8,minmax(0,1fr))", gap: 8 }} className="flex-1">
            {slots.slice(0, 16).map((s, i) => (
              <Card key={s.id} s={s} i={i} width="100%" />
            ))}
          </div>
          {opts.kpiPos === "side" && opts.kpiSide === "right" && <div style={{ width: visibleW }} />}
          {opts.kpiPos === "side" && <KPIsSide />}
        </div>
      ) : (
        <div className="h-full px-3 relative flex items-center">
          {opts.kpiPos === "side" && opts.kpiSide === "left" && <div style={{ width: visibleW }} />}
          <div className="overflow-hidden flex-1">
            <div
              className="flex"
              style={{
                gap: 12,
                width: "max-content",
                animation:
                  autoScroll && slots.length > visible
                    ? `marquee ${speedSec}s linear infinite`
                    : undefined,
              }}
            >
              {[...slots, ...slots].map((s, i) => (
                <Card key={`${s.id}-${i}`} s={s} i={i % slots.length} width={visibleW} tall />
              ))}
            </div>
          </div>
          {opts.kpiPos === "side" && opts.kpiSide === "right" && <div style={{ width: visibleW }} />}
          {opts.kpiPos === "side" && <KPIsSide />}
        </div>
      )}

      {opts.kpiPos === "bottom" && <KPIsInline />}
    </div>
  );
}

/* ───────────────────────── Opening Preview ───────────────────────── */
function OpeningOverlayPreview({ hunt, slots, opts }) {
  const current = slots[0] || null;
  const baseW = Number(opts.baseW || 560);
  const baseH = Number(opts.baseH || 320);

  return (
    <div
      className="rounded-xl border border-white/10 overflow-hidden relative"
      style={{
        width: baseW,
        height: baseH,
        background: "linear-gradient(135deg, rgba(15,16,33,1) 0%, rgba(24,16,40,1) 100%)",
        fontFamily: RUBIK_STACK,
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap');`}</style>
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        {opts.showTitle !== false ? (
          <div className="px-3 py-1.5 rounded-full border border-white/15 bg-white/10 text-[12px]">
            {hunt?.title || "Hunt"} — Opening
          </div>
        ) : <div />}
        {opts.showCurrent !== false ? (
          <div className="px-3 py-1.5 rounded-full border border-white/15 bg-white/10 text-[12px]">
            {current ? current.name : "—"}
          </div>
        ) : <div />}
      </div>

      <div className="px-3" style={{ display: "grid", gridTemplateColumns: "repeat(8,minmax(0,1fr))", gap: 8 }}>
        {slots.slice(0, 24).map((s, i) => (
          <div key={s.id} className="relative rounded-lg overflow-hidden border border-white/10" title={s.name}>
            <div className="absolute left-1 top-1 z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/70">#{i + 1}</div>
            {s.thumbnail ? (
              <img src={s.thumbnail} alt="" className="h-14 w-full object-cover object-bottom" />
            ) : (<div className="h-14 w-full bg-white/10" />)}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Designer ───────────────────────── */
function KpiPresetSwatches({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {Object.entries(KPI_COLOR_PRESETS).map(([key, preset]) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            title={key}                          // nome só em tooltip
            className={cn(
              "w-8 h-8 rounded-md border inline-flex items-center justify-center",
              active ? "ring-2 ring-white/70" : "opacity-80 hover:opacity-100"
            )}
            style={{ background: preset.bg, borderColor: preset.border }}
          >
            <span className="sr-only">{key}</span>
          </button>
        );
      })}
    </div>
  );
}

function Designer({ open, onClose, opts, setOpts, title, type, hunt, slots }) {
  if (!open) return null;

  function applyPanelPreset(name) {
    const [start, end] = PANEL_PRESETS[name] || PANEL_PRESETS.Neon;
    setOpts((o) => ({ ...o, panelBgStart: start, panelBgEnd: end }));
  }
  function applyLayoutPreset(name) {
    setOpts((o) => {
      const base = { ...o, layoutPreset: name };
      switch (name) {
        case "Compact":
          return { ...base, layout: "grid", visible: 4, cardH: 140, nameStyle: "float", betStyle: "chip", kpiPos: "top", showBox: true };
        case "Bar":
          return { ...base, layout: "carousel", visible: 3, cardH: 170, nameStyle: "bar", betStyle: "inline", kpiPos: "top", showBox: true };
        case "Minimal":
          return { ...base, layout: "carousel", visible: 4, cardH: 150, nameStyle: "hidden", betStyle: "chip", kpiPos: "hidden", showBox: false };
        case "Head-to-Head":
          return { ...base, layout: "carousel", visible: 2, cardH: 210, nameStyle: "bar", betStyle: "inline", kpiPos: "bottom", showBox: true };
        default:
          return { ...base, layout: "carousel", visible: 3, cardH: 160, nameStyle: "bar", betStyle: "inline", kpiPos: "top", showBox: true };
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm">
      {/* Topbar */}
      <div className="absolute inset-x-0 top-0 h-14 px-4 flex items-center justify-between border-b border-white/10 bg-zinc-950/60 text-white">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-white/80" />
          <div>{title}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button className="h-9" onClick={onClose}>
            <Save className="h-4 w-4 mr-2" />
            Save & Close
          </Button>
          <Button variant="outline" className="h-9" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="absolute inset-x-0 top-14 bottom-0 md:flex overflow-hidden">
{/* Sidebar (novo layout) */}
<div className="border-r border-white/10 bg-zinc-950/70 overflow-auto w-full md:w-[360px] lg:w-[420px] xl:w-[480px] text-white min-w-0">
  <div className="p-4 space-y-4">
    {/* CANVAS */}
    <Section
      title="Canvas / OBS"
      right={
        <Button
          variant="outline"
          className="h-8 px-2"
          onClick={() => setOpts(o => ({ ...o, baseW: 560, baseH: type === "hunt" ? 280 : 320, pad: 16, align: "center", shine: true, pulse: true }))}
        >
          Reset
        </Button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        <Field label="Base width">
          <Input
            type="number"
            value={opts.baseW}
            onChange={(e) => setOpts(o => ({ ...o, baseW: Number(e.target.value) || 0 }))}
            className="h-9 bg-zinc-900 border-white/10 text-white"
          />
        </Field>
        <Field label="Base height">
          <Input
            type="number"
            value={opts.baseH}
            onChange={(e) => setOpts(o => ({ ...o, baseH: Number(e.target.value) || 0 }))}
            className="h-9 bg-zinc-900 border-white/10 text-white"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        <Field label="Padding">
          <Input
            type="number"
            value={opts.pad}
            onChange={(e) => setOpts(o => ({ ...o, pad: Number(e.target.value) || 0 }))}
            className="h-9 bg-zinc-900 border-white/10 text-white"
          />
        </Field>
        <Field label="Align">
          <Segmented
            value={opts.align}
            onChange={(v) => setOpts(o => ({ ...o, align: v }))}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
              { value: "right", label: "Right" },
            ]}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!opts.shine} onChange={(e) => setOpts(o => ({ ...o, shine: !!e.target.checked }))} />
          Shine
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!opts.pulse} onChange={(e) => setOpts(o => ({ ...o, pulse: !!e.target.checked }))} />
          Pulse
        </label>
      </div>
      <div className="text-[11px] opacity-60">Dica: em OBS usa o mesmo Width/Height do browser source para evitar cortes.</div>
    </Section>

    {/* Presets rápidos (só hunt) */}
   {type === "hunt" && (
  <Section title="Layout presets">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
      {["Default", "Compact", "Bar", "Minimal", "Head-to-Head"].map((n) => (
        <LayoutPresetChip
          key={n}
          label={n === "Head-to-Head" ? "Head-to-Head (VS)" : n}
          variant={n}
          active={opts.layoutPreset === n}
          onClick={() => applyLayoutPreset(n)}
        />
      ))}
    </div>
  </Section>
)}


    {/* LAYOUT (hunt) */}
    {type === "hunt" && (
      <Section title="Cards & Carousel">
        <Field label="Layout">
          <Segmented
            value={opts.layout}
            onChange={(v) => setOpts(o => ({ ...o, layout: v }))}
            options={[
              { value: "carousel", label: "Rolante" },
              { value: "grid", label: "Grid" },
            ]}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
          <Field label="Card height (px)">
            <Input
              type="number"
              value={opts.cardH}
              onChange={(e) => setOpts(o => ({ ...o, cardH: Number(e.target.value) || 120 }))}
              className="h-9 bg-zinc-900 border-white/10 text-white"
            />
          </Field>
          {opts.layout === "carousel" && (
            <Field label="Visíveis">
              <Input
                type="number"
                value={opts.visible}
                onChange={(e) => setOpts(o => ({ ...o, visible: Math.max(1, Number(e.target.value) || 3) }))}
                className="h-9 bg-zinc-900 border-white/10 text-white"
              />
            </Field>
          )}
        </div>

        {opts.layout === "carousel" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!opts.autoScroll} onChange={(e) => setOpts(o => ({ ...o, autoScroll: !!e.target.checked }))} />
              Auto-scroll
            </label>
            <Field label="Velocidade (seg/loop)" hint="Menor = mais rápido">
              <Input
                type="number"
                value={opts.scrollDur}
                onChange={(e) => setOpts(o => ({ ...o, scrollDur: Math.max(5, Math.min(180, Number(e.target.value) || 30)) }))}
                className="h-9 bg-zinc-900 border-white/10 text-white"
              />
            </Field>
          </div>
        )}
      </Section>
    )}

    {/* LABELS & INFOS (hunt) */}
    {type === "hunt" && (
      <Section title="Labels & Infos">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
          <Field label="Nome">
            <Segmented
              value={opts.nameStyle}
              onChange={(v) => setOpts(o => ({ ...o, nameStyle: v }))}
              options={[{ value: "bar", label: "Barra" }, { value: "float", label: "Float" }, { value: "hidden", label: "Oculto" }]}
            />
          </Field>
          <Field label="Bet">
            <Segmented
              value={opts.betStyle}
              onChange={(v) => setOpts(o => ({ ...o, betStyle: v }))}
              options={[{ value: "inline", label: "Inline" }, { value: "chip", label: "Chip" }, { value: "none", label: "Oculto" }]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!opts.showIdx} onChange={(e)=>setOpts(o=>({...o,showIdx:!!e.target.checked}))}/> Mostrar #</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!opts.showSuper} onChange={(e)=>setOpts(o=>({...o,showSuper:!!e.target.checked}))}/> Selo SUPER</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!opts.showBox} onChange={(e)=>setOpts(o=>({...o,showBox:!!e.target.checked}))}/> Caixa de fundo</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!opts.vInfo} onChange={(e)=>setOpts(o=>({...o,vInfo:!!e.target.checked}))}/> Vertical infos</label>
        </div>

        <Field label="Posição das infos">
          <Segmented
            value={opts.infoPos}
            onChange={(v) => setOpts(o => ({ ...o, infoPos: v }))}
            options={[{ value: "left", label: "Left" }, { value: "right", label: "Right" }]}
          />
        </Field>
      </Section>
    )}

    {/* KPIs */}
    <Section
      title="KPIs (Start • B/E • #Bonus)"
      right={
        <Button
          variant="outline"
          className="h-8 px-2"
          onClick={() => setOpts(o => ({ ...o, kpiPos:"top", kpiDir:"row", kpiAlign:"center", kpiSide:"right", kpiGap:8, kpiSideSpace:18, kpiSize:1, kpiShape:"box", kpiRound:2, kpiShowLabels:true, kpiFont:1, kpiAltIconMs:1200, kpiAltValueMs:1800, kpiAnim:"fade", kpiColorPreset:"glass", kpiBg:"", kpiBorder:"", kpiText:"" }))}
        >
          Reset
        </Button>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        <Field label="Posição">
          <Segmented
            value={opts.kpiPos}
            onChange={(v) => setOpts(o => ({ ...o, kpiPos: v }))}
            options={[{value:"top",label:"Topo"},{value:"bottom",label:"Fundo"},{value:"side",label:"Lado"},{value:"hidden",label:"Ocultar"}]}
          />
        </Field>
        {(opts.kpiPos === "top" || opts.kpiPos === "bottom") && (
          <Field label="Orientação">
            <Segmented
              value={opts.kpiDir}
              onChange={(v) => setOpts(o => ({ ...o, kpiDir: v }))}
              options={[{value:"row",label:"Horizontal"},{value:"column",label:"Vertical"}]}
            />
          </Field>
        )}
      </div>

      {(opts.kpiPos === "top" || opts.kpiPos === "bottom") && (
        <Field label="Alinhamento">
          <Segmented
            value={opts.kpiAlign}
            onChange={(v) => setOpts(o => ({ ...o, kpiAlign: v }))}
            options={[{value:"left",label:"Esq."},{value:"center",label:"Centro"},{value:"right",label:"Dir."}]}
          />
        </Field>
      )}

      {opts.kpiPos === "side" && (
        <Field label="Lado">
          <Segmented
            value={opts.kpiSide}
            onChange={(v) => setOpts(o => ({ ...o, kpiSide: v }))}
            options={[{value:"left",label:"Esq."},{value:"right",label:"Dir."}]}
          />
        </Field>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        <Field label="KPI gap">
          <Input type="number" value={opts.kpiGap} onChange={(e)=>setOpts(o=>({...o,kpiGap:Number(e.target.value)||0}))} className="h-9 bg-zinc-900 border-white/10 text-white"/>
        </Field>
        <Field label="Side spacing" hint={opts.kpiPos !== "side" ? "Só em Posic. Lado" : ""}>
          <Input type="number" disabled={opts.kpiPos!=="side"} value={opts.kpiSideSpace} onChange={(e)=>setOpts(o=>({...o,kpiSideSpace:Number(e.target.value)||0}))} className="h-9 bg-zinc-900 border-white/10 text-white disabled:opacity-50"/>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        <Field label="Tamanho (0.7–1.6)">
          <input type="range" min={0.7} max={1.6} step={0.05} value={opts.kpiSize} onChange={(e)=>setOpts(o=>({...o,kpiSize:Number(e.target.value)}))} className="w-full"/>
        </Field>
        <Field label="Forma">
          <Segmented
            value={opts.kpiShape}
            onChange={(v) => setOpts(o => ({ ...o, kpiShape: v }))}
            options={[{value:"box",label:"Box"},{value:"pill",label:"Pill"},{value:"circle",label:"Circle"}]}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        <Field label="Arredondar valores">
          <Segmented
            value={String(opts.kpiRound)}
            onChange={(v) => setOpts(o => ({ ...o, kpiRound: Number(v) }))}
            options={[{value:"0",label:"0"},{value:"1",label:"0.0"},{value:"2",label:"0.00"}]}
          />
        </Field>
        <Field label="Font KPI (0.8–1.6)" hint="Só ajusta a letra">
          <input type="range" min={0.8} max={1.6} step={0.05} value={opts.kpiFont} onChange={(e)=>setOpts(o=>({...o,kpiFont:Number(e.target.value)}))} className="w-full"/>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        <Field label="Ícone (ms, círculo)">
          <Input type="number" value={opts.kpiAltIconMs} onChange={(e)=>setOpts(o=>({...o,kpiAltIconMs:Math.max(0,Number(e.target.value)||0)}))} className="h-9 bg-zinc-900 border-white/10 text-white"/>
        </Field>
        <Field label="Valor (ms, círculo)">
          <Input type="number" value={opts.kpiAltValueMs} onChange={(e)=>setOpts(o=>({...o,kpiAltValueMs:Math.max(0,Number(e.target.value)||0)}))} className="h-9 bg-zinc-900 border-white/10 text-white"/>
        </Field>
      </div>

      {/* Cores KPI */}
      <div className="mt-2">
  <div className="text-xs opacity-70 mb-1">KPI color preset</div>

  <KpiPresetSwatches
    value={opts.kpiColorPreset}
    onChange={(k) =>
      setOpts((o) => ({
        ...o,
        kpiColorPreset: k,
        // limpa overrides para o preset aparecer imediatamente:
        kpiBg: "",
        kpiBorder: "",
        kpiText: "",
      }))
    }
  />

  <div className="grid grid-cols-3 gap-2 mt-2">
    <div>
      <div className="text-xs opacity-70 mb-1">BG (override)</div>
      <Input
        type="text"
        placeholder="#RRGGBB or rgba()"
        value={opts.kpiBg ?? ""}
        onChange={(e) => setOpts((o) => ({ ...o, kpiBg: e.target.value }))}
        className="h-9 rounded-xl bg-zinc-900 border-white/10 text-white"
      />
    </div>
    <div>
      <div className="text-xs opacity-70 mb-1">Border (override)</div>
      <Input
        type="text"
        placeholder="#RRGGBB or rgba()"
        value={opts.kpiBorder ?? ""}
        onChange={(e) => setOpts((o) => ({ ...o, kpiBorder: e.target.value }))}
        className="h-9 rounded-xl bg-zinc-900 border-white/10 text-white"
      />
    </div>
    <div>
      <div className="text-xs opacity-70 mb-1">Text (override)</div>
      <Input
        type="text"
        placeholder="#RRGGBB"
        value={opts.kpiText ?? ""}
        onChange={(e) => setOpts((o) => ({ ...o, kpiText: e.target.value }))}
        className="h-9 rounded-xl bg-zinc-900 border-white/10 text-white"
      />
    </div>
  </div>

  <div className="text-[11px] opacity-60 mt-1">
    Tip: leave overrides empty to use the preset.
  </div>
</div>

    </Section>

    {/* CORES & EFEITOS */}
    <Section
      title="Cores & Efeitos"
      right={
        <Button
          variant="outline"
          className="h-8 px-2"
          onClick={() => setOpts(o => ({
            ...o,
            panelBorder:"rgba(255,255,255,.12)",
            textColor:"#e5e7eb",
            subtextColor:"#9ca3af",
            accentColor:"#fb7185",
            chipBg:"rgba(255,255,255,.08)"
          }))}
        >
          Reset
        </Button>
      }
    >
      {/* Presets de painel (gradiente) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        {Object.entries(PANEL_PRESETS).map(([name, [start, end]]) => (
          <PresetChip
            key={name}
            name={name}
            colors={[start, end]}
            onClick={() => applyPanelPreset(name)}
            active={opts.panelBgStart === start && opts.panelBgEnd === end}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        <Field label="Background start">
          <ColorField label="" value={opts.panelBgStart ?? ""} onChange={(v)=>setOpts(o=>({...o,panelBgStart:v}))}/>
        </Field>
        <Field label="Background end">
          <ColorField label="" value={opts.panelBgEnd ?? ""} onChange={(v)=>setOpts(o=>({...o,panelBgEnd:v}))}/>
        </Field>
      </div>

      <Field label="Panel/Line border">
        <ColorField label="" value={opts.panelBorder ?? ""} onChange={(v)=>setOpts(o=>({...o,panelBorder:v}))} placeholder="rgba(255,255,255,.12) ou #hex"/>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        <Field label="Text">
          <ColorField label="" value={opts.textColor ?? ""} onChange={(v)=>setOpts(o=>({...o,textColor:v}))}/>
        </Field>
        <Field label="Subtext">
          <ColorField label="" value={opts.subtextColor ?? ""} onChange={(v)=>setOpts(o=>({...o,subtextColor:v}))}/>
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
        <Field label="Accent">
          <ColorField label="" value={opts.accentColor ?? ""} onChange={(v)=>setOpts(o=>({...o,accentColor:v}))}/>
        </Field>
        <Field label="Chip bg">
          <ColorField label="" value={opts.chipBg ?? ""} onChange={(v)=>setOpts(o=>({...o,chipBg:v}))} placeholder="rgba(...) ou #hex"/>
        </Field>
      </div>

      {/* SUPER (só hunt) */}
      {type === "hunt" && (
        <>
          <div className="text-xs opacity-70 mt-2">Super bonus</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
            <Field label="Glow color">
              <ColorField label="" value={opts.superGlowColor ?? ""} onChange={(v)=>setOpts(o=>({...o,superGlowColor:v}))}/>
            </Field>
            <Field label="Glow strength">
              <input type="range" min={0} max={1} step={0.05} value={opts.superGlowStrength ?? 0.6} onChange={(e)=>setOpts(o=>({...o,superGlowStrength:Number(e.target.value)}))} className="w-full mt-2"/>
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 min-w-0">
            <Field label="Super tag bg">
              <ColorField label="" value={opts.superTagColor ?? ""} onChange={(v)=>setOpts(o=>({...o,superTagColor:v}))}/>
            </Field>
            <Field label="Super tag text">
              <ColorField label="" value={opts.superTextColor ?? ""} onChange={(v)=>setOpts(o=>({...o,superTextColor:v}))}/>
            </Field>
          </div>
        </>
      )}
    </Section>

    {/* OPENING header toggles (quando não é hunt) */}
    {type !== "hunt" && (
      <Section title="Header (Opening)">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={opts.showTitle !== false} onChange={(e)=>setOpts(o=>({...o,showTitle:!!e.target.checked}))}/>
          Mostrar título do hunt
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={opts.showCurrent !== false} onChange={(e)=>setOpts(o=>({...o,showCurrent:!!e.target.checked}))}/>
          Mostrar slot atual
        </label>
      </Section>
    )}
  </div>
</div>

        {/* Preview */}
        <div className="flex-1 p-6 overflow-auto min-w-0">
          {type === "hunt" ? (
            <HuntOverlayPreview hunt={hunt} slots={slots} opts={opts} />
          ) : (
            <OpeningOverlayPreview hunt={hunt} slots={slots} opts={opts} />
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── OverlayCard ───────────────────────── */
/* ───────────────────────── OverlayCard (sem Preset/Padding/Align) ───────────────────────── */
function OverlayCard({ type, hunt, slots, opts, setOpts }) {
  const [open, setOpen] = React.useState(true);
  const [openDesigner, setOpenDesigner] = React.useState(false);

  const base = React.useMemo(
    () =>
      `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, ""),
    []
  );

  const url = React.useMemo(() => {
    if (!hunt?.number_id) return "";
    return type === "hunt"
      ? buildHuntOverlayUrl(base, hunt.number_id, opts)
      : buildOpeningOverlayUrl(base, hunt.number_id, opts);
  }, [type, hunt?.number_id, base, opts]);

  const copyUrl = async () => {
    if (!url) return;
    try { await navigator.clipboard.writeText(url); }
    catch { alert("Não consegui copiar o URL."); }
  };

  const openOverlay = () => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03]">
      {/* Header colapsável */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 text-left flex items-center gap-2"
      >
        <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
        <div className="font-medium flex-1">
          {type === "hunt" ? "Overlay (Hunt)" : "Overlay (Opening)"}
        </div>
        <ChevronDown className={cn("h-4 w-4 transition", open ? "rotate-180" : "")} />
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3">
          {/* Apenas os botões */}
<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
   <Button type="button" className="h-9 w-full justify-center" onClick={copyUrl}>
              <CopyIcon className="h-4 w-4 mr-2" />
              Copy URL
            </Button>
            <Button type="button" variant="outline" className="h-9 w-full justify-center" onClick={openOverlay}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open overlay
            </Button>
            <Button type="button" variant="secondary" className="h-9 w-full justify-center" onClick={() => setOpenDesigner(true)}>
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Open Designer
            </Button>
          </div>

          {/* Preview */}
          <div className="overflow-auto">
            {type === "hunt" ? (
              <HuntOverlayPreview hunt={hunt} slots={slots} opts={opts} />
            ) : (
              <OpeningOverlayPreview hunt={hunt} slots={slots} opts={opts} />
            )}
          </div>

          {/* Designer */}
          <Designer
            open={openDesigner}
            onClose={() => setOpenDesigner(false)}
            opts={opts}
            setOpts={setOpts}
            title={`${type === "hunt" ? "Hunt" : "Opening"} — Designer`}
            type={type}
            hunt={hunt}
            slots={slots}
          />
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Redeem & CRUD (inalterado) ───────────────────────── */

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
      if (!dQuery.trim()) { setResults([]); return; }
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
    setQuery(""); setResults([]); setSelected(null); setBetSize(""); setIsSuper(false); setErr("");
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
            <button type="button" onClick={handleClose} className="p-2 rounded-lg hover:bg-white/10 transition" aria-label="Fechar">
              <X className="h-5 w-5" />
            </button>
          </div>

          {!selected ? (
            <div className="space-y-2">
              <div className="text-xs opacity-70">Escolhe a slot *</div>
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

              <div className="max-h-[320px] overflow-auto rounded-xl border border-white/10 bg-zinc-900">
                {busy && (
                  <div className="px-3 py-3 text-sm flex items-center gap-2 opacity-80">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    A pesquisar…
                  </div>
                )}
                {!busy && results.length === 0 && dQuery && (
                  <div className="px-3 py-3 text-sm opacity-60">Sem resultados.</div>
                )}
                {!busy && results.map((s) => (
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
              <div className="text-xs opacity-70">Escolhe a slot *</div>

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
                  type="button"
                  variant="outline"
                  onClick={() => { setSelected(null); setQuery(""); setResults([]); setIsSuper(false); setBetSize(""); }}
                  className="h-9"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Trocar
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-3 items-end">
                <div>
                  <div className="text-xs mb-1 opacity-70">Betsize *</div>
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
                    Super bonus
                  </button>

                  <Button type="button" onClick={handleAdd} disabled={busy || !selected || !betSize} className="h-11 px-5">
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

function EditBonusModal({ open, row, onClose, onSaved }) {
  const [bet, setBet] = React.useState("");
  const [isSuper, setIsSuper] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setBet(row ? row.bet_size ?? "" : "");
    setIsSuper(
      row
        ? !!(row?.is_super ?? row?.super ?? row?._raw?.is_super ?? row?._raw?.super)
        : false
    );
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
            <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition" aria-label="Fechar">
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
            <Button type="button" onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Guardar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
            {slot?.thumbnail ? <img src={slot.thumbnail} alt="" className="h-10 w-10 rounded object-cover" /> : null}
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

/* ───────────────────────── Página ───────────────────────── */
function OpeningModal({ open, onClose, huntNumberId, opts }) {
  if (!open || !huntNumberId) return null;

  const base = React.useMemo(
    () => `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, ""),
    []
  );
  const url = React.useMemo(
    () => buildOpeningOverlayUrl(base, huntNumberId, opts || {}),
    [base, huntNumberId, opts]
  );

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[96vw] max-w-[1120px]">
        <div className="rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">Opening</div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9"
                onClick={() => navigator.clipboard.writeText(url)}
              >
                <CopyIcon className="h-4 w-4 mr-2" />
                Copy URL
              </Button>
              <Button
                variant="outline"
                className="h-9"
                onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Pop-out
              </Button>
              <Button className="h-9" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Fechar
              </Button>
            </div>
          </div>

          {/* O iframe mostra o mesmo overlay que abrías noutra aba */}
          <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
            <iframe
              src={url}
              title="Opening overlay"
              className="w-full"
              style={{
                border: 0,
                height: "70vh",           // altura confortável no modal
                display: "block",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RedeemModal({ open, onClose, slots, onSaved }) {
  const [form, setForm] = React.useState({});
  const [saving, setSaving] = React.useState({});
  const [savingAll, setSavingAll] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const map = {};
    for (const s of slots) map[s.id] = s.payout ?? "";
    setForm(map);
  }, [open, slots]);

  const setVal = (id, v) => setForm((f) => ({ ...f, [id]: v }));

  async function saveOne(row) {
    try {
      setSaving((m) => ({ ...m, [row.id]: true }));
      const payout = toNum(form[row.id]);
      const bet = toNum(row.bet_size);
      const multiplier = bet > 0 ? payout / bet : null;
      await updateHuntSlot(row.id, { payout, multiplier });
      onSaved && onSaved();
    } catch (e) {
      alert(e.message || "Falha ao guardar.");
    } finally {
      setSaving((m) => {
        const { [row.id]: _, ...rest } = m;
        return rest;
      });
    }
  }

  async function saveAll() {
    try {
      setSavingAll(true);
      for (const s of slots) {
        const v = form[s.id];
        if (v === "" || String(v) === String(s.payout ?? "")) continue;
        const payout = toNum(v);
        const bet = toNum(s.bet_size);
        const multiplier = bet > 0 ? payout / bet : null;
        await updateHuntSlot(s.id, { payout, multiplier });
      }
      onSaved && onSaved();
    } catch (e) {
      alert(e.message || "Falha ao guardar.");
    } finally {
      setSavingAll(false);
    }
  }

  const fillPreset = (row, mul) => {
    const v = mul === 0 ? 0 : toNum(row.bet_size) * mul;
    setVal(row.id, String(v).replace(".", ",")); // aceita vírgula
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[96vw] max-w-[1100px]">
        <div className="rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl p-4 md:p-5">
          {/* Topbar */}
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">Opening — Earnings</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-9" onClick={onClose}>
                <X className="h-4 w-4 mr-2" />
                Fechar
              </Button>
              <Button className="h-9" onClick={saveAll} disabled={savingAll}>
                {savingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Guardar tudo
              </Button>
            </div>
          </div>

          {/* Tabela */}
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-12 px-3 py-2 text-xs font-semibold bg-white/[0.04]">
              <div className="col-span-6">Bónus</div>
              <div className="col-span-2 text-center">Bet</div>
              <div className="col-span-3 text-center">Earnings (€)</div>
              <div className="col-span-1 text-center">X</div>
            </div>

            <div className="max-h-[65vh] overflow-auto">
              {slots.map((row, i) => {
                const bet = toNum(row.bet_size);
                const payout = toNum(form[row.id]);
                const mult = bet > 0 && payout ? payout / bet : 0;

                return (
                  <div key={row.id} className="grid grid-cols-12 items-center px-3 py-2 border-t border-white/10">
                    <div className="col-span-6 flex items-center gap-3 min-w-0">
                      <div className="text-[11px] opacity-60 w-6">#{i + 1}</div>
                      {row.thumbnail ? (
                        <img src={row.thumbnail} alt="" className="h-8 w-8 rounded object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded bg-white/10" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium">{row.name}</div>
                        <div className="text-xs opacity-70 truncate">{row.provider}</div>
                      </div>
                    </div>

                    <div className={cn("col-span-2 text-center", numCls)}>{row.bet_size ?? "—"}</div>

                    <div className="col-span-3">
                      <div className="flex items-center gap-2">
                        <Input
                          value={form[row.id] ?? ""}
                          onChange={(e) => setVal(row.id, e.target.value)}
                          placeholder="0"
                          className="h-9 rounded-xl bg-zinc-900 border-white/10 text-white"
                          inputMode="decimal"
                        />
                        <Button
                          variant="secondary"
                          className="h-9"
                          onClick={() => saveOne(row)}
                          disabled={!!saving[row.id]}
                          title="Guardar linha"
                        >
                          {saving[row.id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[11px]">
                        <button className="px-2 py-0.5 rounded border border-white/10 hover:bg-white/10" onClick={() => fillPreset(row, 0)}>0</button>
                        <button className="px-2 py-0.5 rounded border border-white/10 hover:bg-white/10" onClick={() => fillPreset(row, 1)}>1x</button>
                        <button className="px-2 py-0.5 rounded border border-white/10 hover:bg-white/10" onClick={() => fillPreset(row, 2)}>2x</button>
                        <button className="px-2 py-0.5 rounded border border-white/10 hover:bg-white/10" onClick={() => fillPreset(row, 5)}>5x</button>
                        <button className="px-2 py-0.5 rounded border border-white/10 hover:bg-white/10" onClick={() => fillPreset(row, 10)}>10x</button>
                      </div>
                    </div>

                    <div className={cn("col-span-1 text-center", numCls)}>
                      {mult ? fmtPlain(mult, 2) + "x" : "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 text-[11px] opacity-60">
            Dica: podes escrever com vírgula ou ponto; o multiplicador é guardado automaticamente.
          </div>
        </div>
      </div>
    </div>
  );
}

function RedeemFlowModal({ open, onClose, hunt, slots, onSaved }) {
  const { t, lang } = useLang();
  const pageSize = 16;

  // índice inicial = 1ª slot sem payout (ou 0)
const firstIdx = React.useMemo(() => {
  const i = slots.findIndex((s) => s.payout == null);
  return i === -1 ? 0 : i;
}, [slots]);


// RedeemFlowModal
const [idx, setIdx] = React.useState(0);
const [page, setPage] = React.useState(0); // ← ADICIONAR

  const row = slots[idx] || null;

  // Campos texto (aceitam vírgula/ponto)
  const [payoutTxt, setPayoutTxt] = React.useState("");
  const [multTxt, setMultTxt] = React.useState("");
  const [betTxt, setBetTxt] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [tip, setTip] = React.useState(null);
  const tipTimer = React.useRef(null);

  const showTip = React.useCallback((msg) => {
  setTip({ text: msg, ts: Date.now() });
  if (tipTimer.current) clearTimeout(tipTimer.current);
  tipTimer.current = setTimeout(() => setTip(null), 1400);
}, []);

React.useEffect(() => {
  return () => { if (tipTimer.current) clearTimeout(tipTimer.current); };
}, []);
  // 🔵 estilo do destaque da slot atual
  const currentGlow = {
    boxShadow:
      "0 0 0 2px rgba(56,189,248,.9), 0 0 24px rgba(56,189,248,.55)",
    borderColor: "rgba(56,189,248,.85)",
  };
React.useEffect(() => {
  if (open) {
    setIdx(firstIdx);
    setPage(Math.floor(firstIdx / pageSize));
  }
}, [open, firstIdx]);

  // Quando muda a slot ativa, inicializa campos
  React.useEffect(() => {
    if (!row) return;
    const bet = row.bet_size ?? "";
    const payout = row.payout ?? "";
    const mult =
      toNum(bet) > 0 && payout !== "" ? toNum(payout) / toNum(bet) : "";
    setBetTxt(String(bet ?? ""));
    setPayoutTxt(payout === "" ? "" : String(payout).replace(".", ","));
    setMultTxt(mult === "" ? "" : String(mult).replace(".", ","));
  }, [row?.id]);

  // Sync inputs
  const onChangeBet = (v) => {
    setBetTxt(v);
    const b = toNum(v),
      m = toNum(multTxt);
    if (b > 0 && multTxt !== "")
      setPayoutTxt(String(b * m).replace(".", ","));
  };
  const onChangePayout = (v) => {
    setPayoutTxt(v);
    const b = toNum(betTxt),
      p = toNum(v);
    if (b > 0 && v !== "") setMultTxt(String(p / b).replace(".", ","));
  };
  const onChangeMult = (v) => {
    setMultTxt(v);
    const b = toNum(betTxt),
      m = toNum(v);
    if (b > 0 && v !== "") setPayoutTxt(String(b * m).replace(".", ","));
  };

  // KPIs (iguais ao layout antigo)
  const totals = React.useMemo(() => {
    const startFromHunt = Number(hunt?.start_cost);
    const totalBetAll = slots.reduce((a, s) => a + toNum(s.bet_size), 0);
    const startCost = Number.isFinite(startFromHunt)
      ? startFromHunt
      : totalBetAll;

    const amountWon = slots.reduce((a, s) => a + toNum(s.payout), 0);
    const openedBet = slots
      .filter((s) => s.payout != null)
      .reduce((a, s) => a + toNum(s.bet_size), 0);
    const remainingBet = Math.max(0, totalBetAll - openedBet);

    const pl = amountWon - startCost;
    const avgRequiredX =
      remainingBet > 0 ? Math.max(0, startCost - amountWon) / remainingBet : 0;
    const currentAvgX = openedBet > 0 ? amountWon / openedBet : 0;
    const cumulativeX = totalBetAll > 0 ? amountWon / totalBetAll : 0;

    return {
      startCost,
      amountWon,
      pl,
      avgRequiredX,
      currentAvgX,
      cumulativeX,
      totalBetAll,
    };
  }, [hunt?.start_cost, slots]);

  // Guardar esta slot
  async function saveCurrent(goNext = false) {
    if (!row) return;
    try {
      setBusy(true);
      const bet = betTxt === "" ? null : toNum(betTxt);
      const payout = payoutTxt === "" ? null : toNum(payoutTxt);
      const mult =
        bet != null && bet > 0 && payout != null ? payout / bet : null;

      await updateHuntSlot(row.id, { bet_size: bet, payout, multiplier: mult });
      onSaved && onSaved();

      if (goNext) {
  const next = Math.min(idx + 1, slots.length - 1); // sempre a seguinte
  setIdx(next);
  setPage(Math.floor(next / pageSize)); // garante que a página acompanha
}

    } catch (e) {
      alert(e.message || "Falha ao guardar.");
    } finally {
      setBusy(false);
    }
  }

  // Copiar nome (com alerta)
const copySlotName = async (name = row?.name) => {
  if (!name) return;
  try { await navigator.clipboard.writeText(name); } catch {}
  showTip(`${t("copied")} ${name}`);
};


  // Ctrl+clique na imagem da slot ativa
  const onActiveThumbClick = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      copySlotName(row?.name);
    }
  };

  // Paginação (16 por página)
const pages = Math.max(1, Math.ceil(slots.length / pageSize));
const view = slots.slice(page * pageSize, page * pageSize + pageSize);
const gotoCard = (iAbs) => {
  const next = Math.max(0, Math.min(slots.length - 1, iAbs));
  setIdx(next);
  setPage(Math.floor(next / pageSize));
};

React.useEffect(() => {
  setPage(p => {
    const must = Math.floor(idx / pageSize);
    return p === must ? p : must;
  });
}, [idx]);


  // Ctrl+clique numa miniatura = copiar; clique normal = navegar
const onTileClick = (e, s, iAbs) => {
  if (e.ctrlKey) { e.preventDefault(); e.stopPropagation(); copySlotName(s?.name); }
  else { gotoCard(iAbs); }
};

  const currentBadge = lang === "pt" ? "ATUAL" : "CURRENT";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[96vw] max-w-[1200px]">
        <div className="relative rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl p-4 md:p-5">
          {/* TIP: aparece no canto sup. direito do modal */}
{tip && (
  <div key={tip.ts} className="pointer-events-none absolute right-4 top-4 z-50">
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-zinc-900/80 backdrop-blur text-sm shadow-xl"
      style={{ animation: "tipFade 1400ms ease-out forwards" }}
    >
      <CopyIcon className="h-4 w-4 opacity-80" />
      <span className="opacity-90">{tip.text}</span>
    </div>
  </div>
)}
<style>{`
@keyframes tipFade {
  0%   { opacity: 0; transform: translateY(-6px); }
  15%  { opacity: 1; transform: translateY(0); }
  85%  { opacity: 1; }
  100% { opacity: 0; transform: translateY(-6px); }
}
`}</style>

          {/* Header */}
          <div className="flex items-center justify-between mb-3">
  <div className="text-lg font-semibold">
    {row?.name || "—"} ({idx + 1}/{slots.length})
  </div>
  <button className="p-2 rounded-lg hover:bg-white/10" onClick={onClose} aria-label={t("close")}>
    <X className="h-5 w-5" />
  </button>
</div>

          {/* KPIs */}
          <div className="grid md:grid-cols-6 gap-2 mb-3">
            {[
              ["P/L", fmtMoney(totals.pl), totals.pl < 0 ? "text-red-300" : "text-emerald-300"],
              [t("amountWon"), fmtMoney(totals.amountWon)],
              [t("startCost"), fmtMoney(totals.startCost)],
              ["Avg. Required X", fmtPlain(totals.avgRequiredX, 2)],
              ["Current Avg. X", fmtPlain(totals.currentAvgX, 2)],
              ["Cumulative X", fmtPlain(totals.cumulativeX, 2) + "x"],
            ].map(([label, value, color], i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <div className="text-[11px] leading-none mb-1 text-white/70">{label}</div>
                <div className={cn("font-semibold", "tabular-nums whitespace-nowrap", color)}>{value}</div>
              </div>
            ))}
          </div>

          {/* Slot ativa */}
          {row && (
            <div className="rounded-xl border border-white/10 bg-zinc-900 p-3 mb-3">
              <div className="flex items-center gap-3">
                {row.thumbnail ? (
                  <img
                    src={row.thumbnail}
                    alt=""
                    className="h-12 w-12 rounded object-cover cursor-pointer"
                    onClick={onActiveThumbClick}
                    title="Ctrl + Clique copia o nome"
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-white/10" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{row.name}</div>
                  <div className="text-xs opacity-70 truncate">{row.provider}</div>
                </div>
                <Button variant="outline" className="h-9" onClick={() => copySlotName(row?.name)}>
                  <CopyIcon className="h-4 w-4 mr-2" />
                  {t("copySlot")}
                </Button>
              </div>

              {/* Inputs */}
              <div className="grid md:grid-cols-3 gap-3 mt-3">
                <div>
                  <div className="text-xs opacity-70 mb-1">Payout</div>
<Input
  value={payoutTxt}
  onChange={(e) => onChangePayout(e.target.value)}
  inputMode="decimal"
  placeholder="0"
  className="h-11 rounded-xl bg-zinc-800 border-white/10 text-white pl-4 pr-3"
/>            </div>
                <div>
                  <div className="text-xs opacity-70 mb-1">Multiplier</div>
                  <Input
  value={multTxt}
  onChange={(e) => onChangeMult(e.target.value)}
  inputMode="decimal"
  placeholder="0"
  className="h-11 rounded-xl bg-zinc-800 border-white/10 text-white pl-4 pr-3"
/>
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-1">{t("betsizeReq")}</div>
<Input
  value={betTxt}
  onChange={(e) => onChangeBet(e.target.value)}
  inputMode="decimal"
  placeholder="0"
  className="h-11 rounded-xl bg-zinc-800 border-white/10 text-white pl-4 pr-3"
/>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-end gap-2">
                <Button variant="outline" className="h-9" onClick={onClose}>
                  {t("close")}
                </Button>
                <Button className="h-9" onClick={() => saveCurrent(true)} disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  {t("saveContinue")}
                </Button>
              </div>
            </div>
          )}

          {/* Grelha + paginação */}
          <div className="rounded-xl border border-white/10 bg-zinc-900 p-3">
            <div className="grid grid-cols-8 gap-2">
              {view.map((s, i) => {
                const iAbs = page * pageSize + i;
                const selected = iAbs === idx;
                const isSuper = getIsSuper(s);
                return (
                  <button
                    key={s.id}
                    onClick={(e) => onTileClick(e, s, iAbs)}
                    className={cn(
                      "relative rounded-lg overflow-hidden border text-left",
                      selected ? "border-white/60" : "border-white/10 hover:border-white/25"
                    )}
                    style={selected ? currentGlow : undefined}
                    title={s.name}
                  >
                    <div className="absolute left-1 top-1 z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/70">
                      #{iAbs + 1}
                    </div>

                    {isSuper && (
                      <div className="absolute right-1 top-1 z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-fuchsia-500/90 text-black">
                        SUPER
                      </div>
                    )}

                    {selected && (
                      <div className="absolute inset-x-0 bottom-1 z-10 flex justify-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-400 text-black shadow">
                          {currentBadge}
                        </span>
                      </div>
                    )}

                    {s.thumbnail ? (
                      <img
                        src={s.thumbnail}
                        alt=""
                        className="h-16 w-full object-cover object-bottom"
                        title="Ctrl + Clique copia o nome"
                      />
                    ) : (
                      <div className="h-16 w-full bg-white/10" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-center gap-2">
<Button
  variant="outline"
  className="h-9"
  onClick={() => setPage(p => Math.max(0, p - 1))}
  disabled={page === 0}
>
  <ChevronLeft className="h-4 w-4" />
</Button>
              <div className="text-sm opacity-80">
                {page + 1} / {pages}
              </div>
           <Button
  variant="outline"
  className="h-9"
  onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
  disabled={page + 1 >= pages}
>
  <ChevronRight className="h-4 w-4" />
</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



export default function HuntDetail({ numberId }) {
  const { isDark } = useTheme();
  const { t } = useLang();

  const [nId, setNId] = React.useState(() => {
    const m = (typeof location !== "undefined" && location.hash) || "";
    const mm = m.match(/#\/hunts\/(\d+)/i);
    return Number(numberId ?? (mm && mm[1])) || 0;
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


  const [redeemFlowOpen, setRedeemFlowOpen] = React.useState(false);
  const [redeemOpen, setRedeemOpen] = React.useState(false);
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
  const [page, setPage] = React.useState(0);


  const [huntOpts, setHuntOpts] = useOverlaySettings({
    type: "hunt",
    huntNumberId: nId,
    defaultValue: DEFAULT_HUNT_OVERLAY,
  });
  const [openingOpts, setOpeningOpts] = useOverlaySettings({
    type: "opening",
    huntNumberId: nId,
    defaultValue: DEFAULT_OPENING_OVERLAY,
  });

  // STOP (persistido no localStorage)
const [stopBox, setStopBox] = useLocalState(`hunt:${nId}:stop`, { value: 0 });


  const sortedSlots = React.useMemo(() => {
    const arr = [...slots];
    if (sortBy.key === "order") return arr;

    if (sortBy.key === "betsize") {
      arr.sort(
        (a, b) =>
          (toNum(a.bet_size) - toNum(b.bet_size)) * sortBy.dir ||
          a.name.localeCompare(b.name)
      );
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

    arr.forEach((row, idx) => {
      row._raw = { ...(row._raw || {}) };
      for (const c of ORDER_COLS) row._raw[c] = idx + 1;
    });

    setSlots(arr);
    dragIndex.current = null;

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

const kpis = React.useMemo(() => {
  const startFromHunt  = Number(hunt?.start_cost);
  const startFromSlots = slots.reduce((a, s) => a + (toNum(s.bet_size) || 0), 0);
  const start = Number.isFinite(startFromHunt) ? startFromHunt : startFromSlots;

  const amountWon  = slots.reduce((a, s) => a + (toNum(s.payout) || 0), 0);
  const bonusCount = slots.length;

  return { amountWon, bonusCount, startCost: start };
}, [hunt, slots]);

// Objetivo = Start - Stop (se Stop > 0), senão = Start
const goalToWin = React.useMemo(() => {
  const start = Number(kpis.startCost) || 0;
  const stop  = toNum(stopBox.value);
  return stop > 0 ? Math.max(0, start - stop) : start;
}, [kpis.startCost, stopBox.value]);

// Quanto falta para o objetivo
const leftToGoal = React.useMemo(() => {
  return Math.max(0, goalToWin - (Number(kpis.amountWon) || 0));
}, [goalToWin, kpis.amountWon]);

// Soma das bets dos bónus ainda por abrir (assumo payout == null)
const remainingBet = React.useMemo(() => {
  return slots
    .filter(s => s.payout == null)
    .reduce((a, s) => a + toNum(s.bet_size), 0);
}, [slots]);

// X médio necessário por bonus
const beX = React.useMemo(() => {
  return remainingBet > 0 ? leftToGoal / remainingBet : 0;
}, [leftToGoal, remainingBet]);


const beLeft = React.useMemo(() => {
  const stop = toNum(stopBox.value);
  const target = stop > 0 ? stop : kpis.startCost; // usa STOP se > 0, senão Start
  return Math.max(0, target - kpis.amountWon);
}, [stopBox.value, kpis.startCost, kpis.amountWon]);


  function goBack() { window.location.hash = "#/hunts"; }

  const [confirmStart, setConfirmStart] = React.useState(false);
  const openStart = () => setConfirmStart(true);
 // vai para o ecrã de Opening/Redeem depois de confirmares
const confirmStartYes = React.useCallback(() => {
  setConfirmStart(false);
  setRedeemFlowOpen(true); // <- abre o modal
}, []);

  if (busy) return <div className="max-w-7xl mx-auto px-4 py-10 text-sm opacity-70">A carregar…</div>;
  if (!hunt) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-4">
          <Button variant="outline" onClick={goBack}>
            <IconBack className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
        <div className="text-sm opacity-70">Hunt não encontrado.</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6" style={{ fontFamily: RUBIK_STACK }}>
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={goBack}>
            <IconBack className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-xl font-semibold">{hunt.title}</h1>
        </div>
      </div>

      {/* KPIs topo da página */}
      <div className="grid md:grid-cols-5 gap-2 mb-3">
        {[
          ["Bonus Count", String(kpis.bonusCount), ""],
          [t("startCost"), fmtMoney(kpis.startCost), ""],
          [t("amountWon"), fmtMoney(kpis.amountWon), ""],
        ].map(([label, value, color], i) => (
          <div key={i} className={cn("rounded-xl border p-3", isDark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white")}>
            <div className={cn("text-[11px] leading-none mb-1", isDark ? "text-white/60" : "text-zinc-600")}>{label}</div>
            <div className={cn("font-semibold", numCls, color)}>{value}</div>
          </div>
        ))}
        {/* [ADICIONAR] B/E (usa STOP se definido) */}
<div className={cn("rounded-xl border p-3", isDark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white")}>
  <div className={cn("text-[11px] leading-none mb-1", isDark ? "text-white/60" : "text-zinc-600")}>
    {t("kpiBE")} (X)
  </div>
  <div className={cn("font-semibold", numCls)}>{fmtPlain(beX, 2)}x</div>
  <div className={cn("text-[11px] mt-0.5", isDark ? "text-white/50" : "text-zinc-500")}>
    faltam {fmtMoney(leftToGoal)}
  </div>
</div>

{/* [ADICIONAR] STOP (editável, por defeito 0) */}
<div className={cn("rounded-xl border p-3", isDark ? "border-white/10 bg-white/5" : "border-zinc-200 bg-white")}>
  <div className={cn("text-[11px] leading-none mb-1", isDark ? "text-white/60" : "text-zinc-600")}>Stop</div>
  <Input
    type="text"
    inputMode="decimal"
    placeholder="0"
    value={String(stopBox.value ?? "")}
    onChange={(e) => setStopBox((s) => ({ ...s, value: e.target.value }))}
    className={cn(
      "h-8 rounded-lg",
      isDark ? "bg-zinc-900 border-white/10 text-white" : "bg-white border-zinc-300 text-zinc-900"
    )}
  />
</div>

      </div>

      {/* Ações rápidas */}
      <div className="grid md:grid-cols-4 gap-2 mb-3">
        <Button
          variant="outline"
          className="h-10"
          onClick={() => setSortBy((s) => ({ key: "betsize", dir: s.key === "betsize" ? -s.dir : -1 }))}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          {t("betsize")}
        </Button>
        <Button
          variant="outline"
          className="h-10"
          onClick={() => setSortBy((s) => ({ key: "date", dir: s.key === "date" ? -s.dir : -1 }))}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {t("date")}
        </Button>
        <Button variant="outline" className="h-10" onClick={() => setSortBy({ key: "random", dir: 1 })}>
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

      {/* Widget overlays */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 mb-4">
        <div className="text-sm font-medium mb-2">Compact widget</div>
        <div className="grid lg:grid-cols-2 gap-3">
          <OverlayCard type="hunt" hunt={hunt} slots={sortedSlots} opts={huntOpts} setOpts={setHuntOpts} />
          <OverlayCard type="opening" hunt={hunt} slots={sortedSlots} opts={openingOpts} setOpts={setOpeningOpts} />
        </div>
      </div>

      {/* Tabela */}
      <div className={cn("rounded-xl border overflow-hidden", isDark ? "border-white/10" : "border-zinc-200")}>
        <div className={cn("grid grid-cols-12 items-center px-4 py-3 text-xs font-semibold", isDark ? "bg-white/[0.04]" : "bg-zinc-50")}>
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

              <div className={cn("col-span-1 text-center flex items-center justify-center", numCls)}>
                {s.bet_size ?? "—"}
              </div>
              <div className={cn("col-span-2 text-center flex items-center justify-center", numCls)}>
                {s.payout != null ? fmtMoney(s.payout) : "—"}
              </div>
              <div className={cn("col-span-1 text-center flex items-center justify-center", numCls)}>
                {s.multiplier != null ? Number(s.multiplier).toFixed(2) : "—"}
              </div>

              <div className="col-span-1 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Editar"
                  className="h-7 w-7"
                  onClick={() => { setEditRow(s); setEditOpen(true); }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  title="Eliminar"
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
        Jogue com responsabilidade. 18+. Template UI.
      </div>

      {/* Modais */}
      <AddBonusModal
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        numberId={hunt.number_id}
        onAdded={refreshSlots}
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

<RedeemFlowModal
  open={redeemFlowOpen}
  onClose={() => setRedeemFlowOpen(false)}
  hunt={hunt}
  slots={sortedSlots}
  onSaved={refreshSlots}
/>




      {/* Início do Redeem (apenas confirmação) */}
      {confirmStart && (
        <div className="fixed inset-0 z-[95]">
          <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmStart(false)} />
          <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-[520px] -translate-x-1/2 -translate-y-1/2">
            <div className="rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl p-5">
              <div className="text-lg font-semibold mb-2">Começar o Opening?</div>
              <div className="text-sm opacity-80 mb-5">
                Irás iniciar o redeeming das slots. Queres mesmo começar?
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmStart(false)}>Cancelar</Button>
                <Button onClick={confirmStartYes}>Começar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
