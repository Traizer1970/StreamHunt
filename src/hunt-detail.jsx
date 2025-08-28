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
    // overlays
    overlays: "Widget compacto",
    overlayHunt: "Overlay (Hunt)",
    overlayOpening: "Overlay (Opening)",
    preset: "Preset",
    padding: "Padding (px)",
    align: "Alinhamento",
    openDesigner: "Open Designer",
    copyUrl: "Copy URL",
    openLink: "Open overlay",
    center: "center",
    left: "left",
    right: "right",
    kpiStart: "Start",
    kpiBE: "B/E",
    kpiBonus: "# Bonus",
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
    overlays: "Compact widget",
    overlayHunt: "Overlay (Hunt)",
    overlayOpening: "Overlay (Opening)",
    preset: "Preset",
    padding: "Padding (px)",
    align: "Alignment",
    openDesigner: "Open Designer",
    copyUrl: "Copy URL",
    openLink: "Open overlay",
    center: "center",
    left: "left",
    right: "right",
    kpiStart: "Start",
    kpiBE: "B/E",
    kpiBonus: "# Bonus",
  },
};
function useLang() {
  const [lang, setLang] = React.useState(() => {
    const ls =
      (typeof localStorage !== "undefined" &&
        localStorage.getItem("lang")) ||
      "";
    const html =
      (typeof document !== "undefined" &&
        document.documentElement.lang) ||
      "";
    const nav =
      (typeof navigator !== "undefined" && navigator.language) ||
      "pt-PT";
    const pick = (ls || html || nav)
      .toLowerCase()
      .startsWith("pt")
      ? "pt"
      : "en";
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
const readOrderFromRow = (row) => {
  const raw = row?._raw || row || {};
  for (const c of ORDER_COLS) {
    const v = Number(raw[c]);
    if (Number.isFinite(v)) return v;
  }
  return null;
};

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

/* ───────────────────────── helpers ───────────────────────── */
async function updateSuperFlag(rowId, value) {
  const tryFns = [
    () =>
      supabase
        .from("hunt_slots")
        .update({ is_super: !!value })
        .eq("id", rowId),
    () =>
      supabase
        .from("hunt_slots")
        .update({ super: !!value })
        .eq("id", rowId),
    () =>
      supabase.from("hunt_slots").update({ is_super: !!value }).eq("ID", rowId),
    () =>
      supabase.from("hunt_slots").update({ super: !!value }).eq("ID", rowId),
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
  const colCandidates = [
    "order_index",
    "order",
    "position",
    "sort",
    "order_idx",
  ];
  for (let i = 0; i < slots.length; i++) {
    const rowId = slots[i].id;
    let ok = false;
    for (const col of colCandidates) {
      const r1 = await supabase
        .from("hunt_slots")
        .update({ [col]: i + 1 })
        .eq("id", rowId);
      if (!r1.error) {
        ok = true;
        break;
      }
      const r2 = await supabase
        .from("hunt_slots")
        .update({ [col]: i + 1 })
        .eq("ID", rowId);
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

/* ───────────────────────── Modais Auxiliares ───────────────────────── */
function ConfirmDialog({
  open,
  title,
  body,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-[520px] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl p-5">
          <div className="text-lg font-semibold mb-2">{title}</div>
          <div className="text-sm opacity-80 mb-5">{body}</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              {cancelText}
            </Button>
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
    return () => {
      active = false;
    };
  }, [open, dQuery]);

  const resetForm = () => {
    setQuery("");
    setResults([]);
    setSelected(null);
    setBetSize("");
    setIsSuper(false);
    setErr("");
  };
  const handleClose = () => {
    resetForm();
    onClose && onClose();
  };

  async function handleAdd() {
    try {
      setErr("");
      if (!selected) return setErr("Escolhe uma slot.");
      const bs = toNum(betSize);
      if (!Number.isFinite(bs) || bs <= 0)
        return setErr("Betsize inválida.");
      const payload = {
        slot_id: selected.id,
        bet_size: bs,
        super: isSuper,
      };
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
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92vw] max-w-[680px]">
        <div className="rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-lg font-semibold">Add bonus</div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-white/10 transition"
              aria-label="Fechar"
            >
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
                  <div className="px-3 py-3 text-sm opacity-60">
                    Sem resultados.
                  </div>
                )}
                {!busy &&
                  results.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelected(s)}
                      className="w-full text-left px-3 py-2.5 hover:bg-white/5 flex items-center gap-3"
                    >
                      {s.thumbnail ? (
                        <img
                          src={s.thumbnail}
                          alt=""
                          className="h-8 w-8 rounded object-cover bg-black/30"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded bg-white/10" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{s.name}</div>
                        <div className="text-xs opacity-70 truncate">
                          {s.provider}
                        </div>
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
                  <img
                    src={selected.thumbnail}
                    alt=""
                    className="h-12 w-12 rounded object-cover bg-black/30"
                  />
                ) : (
                  <div className="h-12 w-12 rounded bg-white/10" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{selected.name}</div>
                  <div className="text-xs opacity-70 truncate">
                    {selected.provider}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSelected(null);
                    setQuery("");
                    setResults([]);
                    setIsSuper(false);
                    setBetSize("");
                  }}
                  className="h-9"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Trocar
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-3 items-end">
                <div>
                  <div className="text-xs mb-1 opacity-70">
                    {t("betsizeReq")}
                  </div>
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

                  <Button
                    type="button"
                    onClick={handleAdd}
                    disabled={busy || !selected || !betSize}
                    className="h-11 px-5"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
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
    setIsSuper(
      row
        ? !!(
            row?.is_super ??
            row?.super ??
            row?._raw?.is_super ??
            row?._raw?.super
          )
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
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-3">
            {row?.thumbnail ? (
              <img
                src={row.thumbnail}
                alt=""
                className="h-10 w-10 rounded object-cover"
              />
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
                <Star
                  className={cn("h-4 w-4", isSuper ? "fill-fuchsia-400" : "")}
                />
                <span className="font-medium">Super bonus</span>
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button type="button" onClick={save} disabled={busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
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
          <div className="text-lg font-semibold mb-3">
            {t("eliminarBonus")}
          </div>
          <div className="flex items-center gap-3 mb-4">
            {slot?.thumbnail ? (
              <img
                src={slot.thumbnail}
                alt=""
                className="h-10 w-10 rounded object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{slot?.name}</div>
              <div className="text-xs opacity-70 truncate">
                {slot?.provider}
              </div>
            </div>
          </div>
          <div className="text-sm opacity-80 mb-5">{t("eliminarPerg")}</div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              {t("cancel")}
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={onConfirm}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("delete")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Overlays — helpers & previews ───────────────────────── */

// opções rápidas (guardadas só em memória/localStorage)
const DEFAULT_HUNT_OVERLAY = {
  design: "cards",

  // NOVO — controlo de apresentação
  cardMode: "grid",        // 'grid' | 'focus3'
  kpiStyle: "minimal",     // 'minimal' | 'pill'
  cardH: 140,              // altura em px no modo grid
  showIdx: true,
  showBet: true,

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
};

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

function buildHuntOverlayUrl(base, huntNumberId, opts) {
  const qs = new URLSearchParams();
  qs.set("design", "cards");
  qs.set("kpi", opts.kpiStyle === "minimal" ? "min" : "pill"); // estilo KPI
  qs.set("mode", opts.cardMode || "grid");                     // grid | focus3
  qs.set("showIdx", opts.showIdx ? "1" : "0");
  qs.set("showBet", opts.showBet ? "1" : "0");
  if (opts.thumbs) qs.set("thumbs", "1");
  if (opts.shine) qs.set("shine", "1");
  if (opts.pulse) qs.set("pulse", "1");
  qs.set("align", String(opts.align || "center"));
  qs.set("pad", String(opts.pad || 0));
  qs.set("bw", String(opts.baseW || 560));
  qs.set("bh", String(opts.baseH || 280));
  qs.set("cardH", String(opts.cardH || 140));
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
  return `${base}#/overlay/opening/${huntNumberId}?${qs.toString()}`;
}

/* Preview compacto estilo battle — AGORA com Focus 3 + KPI minimal */
function HuntOverlayPreview({ hunt, slots, opts }) {
  const { t } = useLang();

  const start = Number(hunt?.start_cost) || slots.reduce((a, s) => a + toNum(s.bet_size), 0);
  const won = slots.reduce((a, s) => a + toNum(s.payout), 0);
  const beLeft = Math.max(0, start - won);

  const baseW = Number(opts.baseW || 560);
  const baseH = Number(opts.baseH || 280);
  const pad   = Number(opts.pad || 0);

  const mode = opts.cardMode || "grid";        // 'grid' | 'focus3'
  const kpiStyle = opts.kpiStyle || "minimal"; // 'minimal' | 'pill'

  // pequenos “chips” minimalistas
  const Mini = ({ label, value }) => (
    <div
      className="px-2.5 py-1 rounded-md border text-[12px]"
      style={{ borderColor: "rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)" }}
      title={label}
    >
      <span className="opacity-70 mr-1">{label}:</span>
      <b className={numCls}>{value}</b>
    </div>
  );

  const Pill = ({ label, value }) => (
    <div
      className="px-3 py-1.5 rounded-full border text-[12px]"
      style={{ borderColor: "rgba(255,255,255,.15)", background: "rgba(255,255,255,.10)" }}
    >
      {label}: <b className={numCls}>{value}</b>
    </div>
  );

  function Card({ s, i, tall = false }) {
    const superB = getIsSuper(s);
    const showIdx = !!opts.showIdx;
    const showBet = !!opts.showBet;
    const h = tall ? Math.max(180, Math.round(baseH - 96 - pad)) : Math.max(80, Number(opts.cardH || 140));

    return (
      <div
        className="relative rounded-xl overflow-hidden border"
        style={{
          height: h,
          borderColor: superB ? "rgba(232,121,249,.55)" : "rgba(255,255,255,.10)",
          boxShadow: superB ? "0 0 0 3px rgba(232,121,249,.18), 0 14px 36px rgba(0,0,0,.45)" : "0 12px 28px rgba(0,0,0,.35)"
        }}
        title={s?.name}
      >
        {opts.shine && (
          <div
            className="absolute inset-y-0 left-0 w-1/3 pointer-events-none"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent)",
              animation: "sweep 4.8s linear infinite"
            }}
          />
        )}

        {s?.thumbnail ? (
          <img src={s.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
        ) : (
          <div className="absolute inset-0 bg-white/10" />
        )}

        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />

        {showIdx && (
          <div className="absolute left-1.5 top-1.5 z-10 text-[11px] font-bold px-1.5 py-0.5 rounded bg-black/70">
            #{i + 1}
          </div>
        )}
        {superB && (
          <div className="absolute right-1.5 top-1.5 z-10">
            <div className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide"
                 style={{ background: "rgba(232,121,249,.9)", color: "#120614", boxShadow: "0 0 22px rgba(232,121,249,.45)" }}>
              SUPER
            </div>
          </div>
        )}

        <div className="absolute left-2 right-2 bottom-2">
          <div
            className="px-2.5 py-1.5 rounded-lg border text-white shadow-[0_10px_30px_rgba(0,0,0,.45)] truncate"
            style={{ background: "rgba(0,0,0,.45)", borderColor: "rgba(255,255,255,.18)" }}
            title={s?.name || ""}
          >
            <div className="font-semibold leading-tight truncate">{s?.name || "—"}</div>
            {showBet && (
              <div className="mt-0.5 text-[11px] opacity-85 flex items-center gap-1">
                <span className="h-[6px] w-[6px] rounded-full bg-white/70" />
                {s?.bet_size != null ? fmtMoney(toNum(s.bet_size)) : "—"}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border overflow-hidden relative"
      style={{
        width: baseW,
        height: baseH,
        background: "linear-gradient(135deg, rgba(14,22,42,1) 0%, rgba(28,26,49,1) 100%)",
        borderColor: "rgba(255,255,255,.10)"
      }}
    >
      <style>{`
        @keyframes sweep { 0% { transform: translateX(-120%);} 100% { transform: translateX(120%);} }
      `}</style>

      {/* Topo KPIs */}
      <div className="px-3" style={{ paddingTop: 10, paddingBottom: 8 + pad }}>
        <div className="flex items-center justify-between gap-2 text-[12px]">
          <div className="px-3 py-1.5 rounded-full border border-white/15 bg-white/10">
            {hunt?.title || "Hunt"}
          </div>

          <div className="flex items-center gap-2">
            {kpiStyle === "minimal" ? (
              <>
                <Mini label={t("kpiStart")} value={fmtMoney(start)} />
                <Mini label={t("kpiBE")} value={fmtMoney(beLeft)} />
                <Mini label={t("kpiBonus")} value={String(slots.length)} />
              </>
            ) : (
              <>
                <Pill label={t("kpiStart")} value={fmtMoney(start)} />
                <Pill label={t("kpiBE")} value={fmtMoney(beLeft)} />
                <Pill label={t("kpiBonus")} value={String(slots.length)} />
              </>
            )}
          </div>
        </div>
      </div>

      {/* LISTAGEM */}
      {mode !== "focus3" ? (
        <div className="px-3" style={{ display: "grid", gridTemplateColumns: "repeat(8,minmax(0,1fr))", gap: 8 }}>
          {slots.slice(0, 16).map((s, i) => (
            <Card key={s.id} s={s} i={i} tall={false} />
          ))}
        </div>
      ) : (
        <div className="px-3" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
          {slots.slice(0, 3).map((s, i) => (
            <Card key={s.id} s={s} i={i} tall={true} />
          ))}
        </div>
      )}

      {/* P/L ao centro (discreto) */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-3">
        <div
          className="px-3 py-1.5 rounded-full border text-[12px] shadow-[0_10px_30px_rgba(0,0,0,.35)]"
          style={{ borderColor: "rgba(255,255,255,.18)", background: "rgba(255,255,255,.10)" }}
        >
          P/L:{" "}
          <b className={cn(numCls, won - start >= 0 ? "text-emerald-300" : "text-rose-300")}>
            {renderPL(won - start)}
          </b>
        </div>
      </div>
    </div>
  );
}

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
        background:
          "linear-gradient(135deg, rgba(15,16,33,1) 0%, rgba(24,16,40,1) 100%)",
      }}
    >
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <div className="px-3 py-1.5 rounded-full border border-white/15 bg-white/10 text-[12px]">
          {hunt?.title || "Hunt"} — Opening
        </div>
        <div className="px-3 py-1.5 rounded-full border border-white/15 bg-white/10 text-[12px]">
          {current ? current.name : "—"}
        </div>
      </div>

      <div
        className="px-3"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8,minmax(0,1fr))",
          gap: 8,
        }}
      >
        {slots.slice(0, 24).map((s, i) => (
          <div
            key={s.id}
            className="relative rounded-lg overflow-hidden border border-white/10"
            title={s.name}
          >
            <div className="absolute left-1 top-1 z-10 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/70">
              #{i + 1}
            </div>
            {s.thumbnail ? (
              <img
                src={s.thumbnail}
                alt=""
                className="h-14 w-full object-cover object-bottom"
              />
            ) : (
              <div className="h-14 w-full bg-white/10" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Designer({ open, onClose, opts, setOpts, title }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm">
      {/* Topbar */}
      <div className="absolute inset-x-0 top-0 h-14 px-4 flex items-center justify-between border-b border-white/10 bg-zinc-950/60">
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

      {/* Body: usar FLEX em vez de grid com colunas arbitrárias */}
      <div className="absolute inset-x-0 top-14 bottom-0 md:flex">
        {/* Sidebar */}
        <div className="border-r border-white/10 bg-zinc-950/70 overflow-auto w-full md:w-96">
          <div className="p-4 space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs opacity-70 mb-1">Canvas / OBS</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs opacity-70 mb-1">Base width</div>
                  <Input
                    type="number"
                    value={opts.baseW}
                    onChange={(e) =>
                      setOpts((o) => ({ ...o, baseW: Number(e.target.value) || 0 }))
                    }
                    className="h-9 bg-zinc-900 border-white/10 text-white"
                  />
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-1">Base height</div>
                  <Input
                    type="number"
                    value={opts.baseH}
                    onChange={(e) =>
                      setOpts((o) => ({ ...o, baseH: Number(e.target.value) || 0 }))
                    }
                    className="h-9 bg-zinc-900 border-white/10 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <div className="text-xs opacity-70 mb-1">Padding</div>
                  <Input
                    type="number"
                    value={opts.pad}
                    onChange={(e) =>
                      setOpts((o) => ({ ...o, pad: Number(e.target.value) || 0 }))
                    }
                    className="h-9 bg-zinc-900 border-white/10 text-white"
                  />
                </div>
                <div>
                  <div className="text-xs opacity-70 mb-1">Align</div>
                  <select
                    value={opts.align}
                    onChange={(e) =>
                      setOpts((o) => ({ ...o, align: e.target.value }))
                    }
                    className="h-9 rounded-xl bg-zinc-900 border-white/10 text-white px-3"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </div>
              </div>

              <div className="mt-3 text-xs opacity-70">Effects</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!opts.shine}
                    onChange={(e) =>
                      setOpts((o) => ({ ...o, shine: !!e.target.checked }))
                    }
                  />
                  Shine
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!opts.pulse}
                    onChange={(e) =>
                      setOpts((o) => ({ ...o, pulse: !!e.target.checked }))
                    }
                  />
                  Pulse
                </label>
              </div>
            </div>

            <div className="text-[11px] opacity-60">
              Dica: em OBS, usa sempre o mesmo <b>Width/Height</b> do browser
              source para evitar cortes.
            </div>
          </div>
        </div>

        {/* Preview / conteúdo da direita */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
            As opções são gravadas localmente (localStorage) para este
            navegador/conta.
          </div>
        </div>
      </div>
    </div>
  );
}

function OverlayCard({
  type, // "hunt" | "opening"
  hunt,
  slots,
  opts,
  setOpts,
}) {
  const { t } = useLang();
  const { profile } = React.useContext(AuthCtx) || {};
  const [open, setOpen] = React.useState(false);
  const [openDesigner, setOpenDesigner] = React.useState(false);

  const base = React.useMemo(
    () =>
      `${window.location.origin}${window.location.pathname}`.replace(
        /\/+$/,
        ""
      ),
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
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      alert("Não consegui copiar o URL.");
    }
  };
  const openOverlay = () => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03]">
      {/* Cabeçalho compacto (abre/fecha) */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 text-left flex items-center gap-2"
      >
        <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
        <div className="font-medium flex-1">
          {type === "hunt" ? t("overlayHunt") : t("overlayOpening")}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition",
            open ? "rotate-180 opacity-100" : "opacity-70"
          )}
        />
      </button>

      {/* Conteúdo */}
      {open && (
        <div className="px-3 pb-3 space-y-3">
          <div className="grid md:grid-cols-3 gap-2">
            <div>
              <div className="text-xs opacity-70 mb-1">{t("preset")}</div>
              <select
                value={opts.design}
                onChange={(e) =>
                  setOpts((o) => ({ ...o, design: e.target.value }))
                }
                className="h-9 w-full rounded-xl bg-zinc-900 border-white/10 text-white px-3"
              >
                {type === "hunt" ? (
                  <option value="cards">Cards (Start • B/E • #Bonus)</option>
                ) : (
                  <>
                    <option value="default">Default</option>
                    <option value="minimal">Minimal</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <div className="text-xs opacity-70 mb-1">{t("padding")}</div>
              <Input
                type="number"
                value={opts.pad}
                onChange={(e) =>
                  setOpts((o) => ({ ...o, pad: Number(e.target.value) || 0 }))
                }
                className="h-9 rounded-xl bg-zinc-900 border-white/10 text-white"
              />
            </div>
            <div>
              <div className="text-xs opacity-70 mb-1">{t("align")}</div>
              <select
                value={opts.align}
                onChange={(e) =>
                  setOpts((o) => ({ ...o, align: e.target.value }))
                }
                className="h-9 w-full rounded-xl bg-zinc-900 border-white/10 text-white px-3"
              >
                <option value="left">{t("left")}</option>
                <option value="center">{t("center")}</option>
                <option value="right">{t("right")}</option>
              </select>
            </div>
          </div>

          {/* NOVO — Controlo extra para Hunt */}
          {type === "hunt" && (
            <div className="grid md:grid-cols-3 gap-2">
              <div>
                <div className="text-xs opacity-70 mb-1">Cards</div>
                <select
                  value={opts.cardMode}
                  onChange={(e) => setOpts(o => ({ ...o, cardMode: e.target.value }))}
                  className="h-9 w-full rounded-xl bg-zinc-900 border-white/10 text-white px-3"
                >
                  <option value="grid">Grid (até 16)</option>
                  <option value="focus3">Focus 3 (grandes)</option>
                </select>
              </div>

              <div>
                <div className="text-xs opacity-70 mb-1">KPI style</div>
                <select
                  value={opts.kpiStyle}
                  onChange={(e) => setOpts(o => ({ ...o, kpiStyle: e.target.value }))}
                  className="h-9 w-full rounded-xl bg-zinc-900 border-white/10 text-white px-3"
                >
                  <option value="minimal">Minimal</option>
                  <option value="pill">Pills</option>
                </select>
              </div>

              <div>
                <div className="text-xs opacity-70 mb-1">Card height (px)</div>
                <Input
                  type="number"
                  value={opts.cardH}
                  onChange={(e) => setOpts(o => ({ ...o, cardH: Number(e.target.value) || 120 }))}
                  className="h-9 rounded-xl bg-zinc-900 border-white/10 text-white"
                />
                <div className="text-[11px] opacity-60 mt-1">
                  Usado no <b>grid</b>. No <b>Focus 3</b> a altura cresce automaticamente.
                </div>
              </div>

              <div className="col-span-3 grid grid-cols-2 gap-2 text-sm mt-1">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!opts.showIdx}
                    onChange={(e) => setOpts(o => ({ ...o, showIdx: !!e.target.checked }))}
                  />
                  Mostrar número (#)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!opts.showBet}
                    onChange={(e) => setOpts(o => ({ ...o, showBet: !!e.target.checked }))}
                  />
                  Mostrar bet no card
                </label>
              </div>
            </div>
          )}

          {/* URL + ações */}
          <div className="flex items-center gap-2">
            <Button type="button" className="h-9" onClick={copyUrl}>
              <CopyIcon className="h-4 w-4 mr-2" />
              {t("copyUrl")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9"
              onClick={openOverlay}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {t("openLink")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="h-9"
              onClick={() => setOpenDesigner(true)}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              {t("openDesigner")}
            </Button>
          </div>

          {/* Preview ao vivo */}
          <div className="overflow-auto">
            {type === "hunt" ? (
              <HuntOverlayPreview hunt={hunt} slots={slots} opts={opts} />
            ) : (
              <OpeningOverlayPreview hunt={hunt} slots={slots} opts={opts} />
            )}
          </div>

          <Designer
            open={openDesigner}
            onClose={() => setOpenDesigner(false)}
            opts={opts}
            setOpts={setOpts}
            title={`${type === "hunt" ? "Hunt" : "Opening"} — Designer`}
          />
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Redeem Drawer ───────────────────────── */
function RedeemDrawer({
  open,
  onClose,
  hunt,
  slots,
  onSaved /* baselineAtStart */,
}) {
  const { t } = useLang();
  const [idx, setIdx] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  // ESC fecha (fix)
  React.useEffect(() => {
    if (!open) return;
    const onEsc = (e) => e.key === "Escape" && askClose();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open]);

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

  React.useEffect(() => {
    const p = toNum(payout);
    const b = toNum(bet);
    if (Number.isFinite(p) && Number.isFinite(b) && b > 0) {
      setMultiplier((p / b).toFixed(2));
    }
  }, [payout, bet]);

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
  React.useEffect(
    () => () => {
      clearTimeout(hideTimer.current);
      clearTimeout(removeTimer.current);
    },
    []
  );

  const [confirmClose, setConfirmClose] = React.useState(false);
  function askClose() {
    setConfirmClose(true);
  }
  function closeNow() {
    setConfirmClose(false);
    onClose && onClose();
  }

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

  const sumPayoutsNow = slots.reduce((acc, it, i) => {
    return acc + (i === idx ? toNum(payout) : toNum(it.payout));
  }, 0);

  const startCost = toNum(hunt?.start_cost);
  const amountWonNow = sumPayoutsNow;
  const plNow = amountWonNow - startCost;

  const remaining = slots.slice(idx + 1);
  const sumRemainingBets = remaining.reduce(
    (a, it) => a + toNum(it.bet_size),
    0
  );
  const requiredNet = Math.max(0, startCost - amountWonNow);
  const avgRequiredX =
    sumRemainingBets > 0 ? requiredNet / sumRemainingBets : null;

  const processedMultipliers = slots
    .slice(0, idx + 1)
    .map((it, i) => {
      const b = toNum(i === idx ? bet : it.bet_size);
      const p = toNum(i === idx ? payout : it.payout);
      return b > 0 && Number.isFinite(p) ? p / b : null;
    })
    .filter((v) => v != null);

  const currAvgX = processedMultipliers.length
    ? processedMultipliers.reduce((a, v) => a + v, 0) /
      processedMultipliers.length
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
              ) : (
                "Sem slots"
              )}
            </div>
            <button
              type="button"
              onClick={askClose}
              className="p-2 rounded-lg hover:bg-white/10 transition"
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid md:grid-cols-6 gap-3 mb-5">
            {[
              [
                t("pl"),
                renderPL(plNow),
                plNow >= 0 ? "text-emerald-400" : "text-red-400",
              ],
              [t("amountWon"), fmtMoney(amountWonNow)],
              [t("startCost"), fmtMoney(startCost)],
              [
                t("avgReqX"),
                avgRequiredX != null ? avgRequiredX.toFixed(2) : t("none"),
              ],
              [t("currAvgX"), currAvgX != null ? currAvgX.toFixed(2) : t("none")],
              [
                t("cumulativeX"),
                cumulativeX != null ? `${cumulativeX.toFixed(2)}x` : t("none"),
              ],
            ].map(([label, value, color], i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] opacity-70">{label}</div>
                <div className={cn("font-semibold", numCls, color)}>{value}</div>
              </div>
            ))}
          </div>

          {s ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
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
                  <div className="text-xs opacity-70 truncate">
                    {s.provider}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    try {
                      navigator.clipboard.writeText(s.name || "");
                    } catch {}
                    showToast(`${t("copied")} ${s.name}`);
                  }}
                  className="h-9"
                  title={t("copySlot")}
                >
                  <CopyIcon className="h-4 w-4 mr-1" />
                  {t("copySlot")}
                </Button>
              </div>

              <div>
                <div className="text-xs mb-1 opacity-70">{t("payout")}</div>
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
                <div className="text-xs mb-1 opacity-70">{t("multiplier")}</div>
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
                <div className="text-xs mb-1 opacity-70">{t("betsizeReq")}</div>
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
            <div className="opacity-70 text-sm mb-6">
              Ainda sem slots neste hunt.
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mb-4">
            <Button type="button" variant="outline" onClick={askClose}>
              {t("close")}
            </Button>
            <Button type="button" onClick={handleSaveAndNext} disabled={!s || busy}>
              {busy ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ChevronRight className="h-4 w-4 mr-2" />
              )}
              {t("saveContinue")}
            </Button>
          </div>

          {slots.length > 0 && (
            <>
              <div className="grid grid-cols-8 gap-3">
                {slots
                  .slice(page * PER_PAGE, page * PER_PAGE + PER_PAGE)
                  .map((it, localIdx) => {
                    const i = page * PER_PAGE + localIdx;
                    const active = i === idx;
                    const superB = getIsSuper(it);
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={(e) => {
                          if (e.ctrlKey) {
                            try {
                              navigator.clipboard.writeText(it.name || "");
                            } catch {}
                            showToast(`${t("copied")} ${it.name}`);
                            return;
                          }
                          setIdx(i);
                        }}
                        className={cn(
                          "relative rounded-xl overflow-hidden border transition",
                          active
                            ? "border-emerald-400 ring-2 ring-emerald-400/20"
                            : "border-white/10 hover:border-white/20"
                        )}
                        title={t("copyHint")}
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
                          <img
                            src={it.thumbnail}
                            alt=""
                            className="h-20 w-full object-cover object-bottom"
                          />
                        ) : (
                          <div className="h-20 w-full bg-white/10" />
                        )}
                      </button>
                    );
                  })}
              </div>
              {pageCount > 1 && (
                <div className="mt-3 flex items-center justify-center gap-2 text-sm">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-3"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="opacity-70">
                    {page + 1} / {pageCount}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 px-3"
                    onClick={() =>
                      setPage((p) => Math.min(pageCount - 1, p + 1))
                    }
                    disabled={page === pageCount - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}

          {toastMsg && (
            <div
              className={cn(
                "pointer-events-none absolute right-4 bottom-4 transition-all",
                toastOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
              )}
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white shadow-lg backdrop-blur-sm">
                <Check className="h-3.5 w-3.5" />
                {toastMsg}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmClose}
        title={t("confirmCloseTitle")}
        body={t("confirmCloseBody")}
        confirmText={t("close")}
        cancelText={t("cancel")}
        onConfirm={closeNow}
        onCancel={() => setConfirmClose(false)}
      />
    </div>
  );
}

/* ───────────────────────── Página ───────────────────────── */
export default function HuntDetail({ numberId }) {
  const { isDark } = useTheme();
  const { t } = useLang();

  const [nId, setNId] = React.useState(() => {
    const m =
      (typeof location !== "undefined" && location.hash) ||
      "";
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

  // overlays – estados guardados localmente (compacto e não ocupa o ecrã todo)
  const [huntOpts, setHuntOpts] = useLocalState(
    "overlay.hunt.opts",
    DEFAULT_HUNT_OVERLAY
  );
  const [openingOpts, setOpeningOpts] = useLocalState(
    "overlay.opening.opts",
    DEFAULT_OPENING_OVERLAY
  );

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
        const c1 =
          raw.created_at ||
          raw.createdAt ||
          raw.timestamp ||
          r.created_at;
        return c1 ? new Date(c1).getTime() : 0;
      };
      arr.sort(
        (a, b) => (getTime(a) - getTime(b)) * sortBy.dir || a.id - b.id
      );
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
  function onDragStart(i) {
    dragIndex.current = i;
  }
  function onDragOver(e) {
    e.preventDefault();
  }
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

    try {
      await persistOrder(arr);
    } catch {}
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

  React.useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  const kpis = React.useMemo(() => {
    const startFromHunt = Number(hunt?.start_cost);
    const startFromSlots = slots.reduce(
      (a, s) => a + (toNum(s.bet_size) || 0),
      0
    );
    const start = Number.isFinite(startFromHunt) ? startFromHunt : startFromSlots;

    const amountWon = slots.reduce(
      (a, s) => a + (toNum(s.payout) || 0),
      0
    );
    const bonusCount = slots.length;
    const pl = amountWon - start;

    return { pl, amountWon, bonusCount, startCost: start };
  }, [hunt, slots]);

  function goBack() {
    window.location.hash = "#/hunts";
  }

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

      {/* KPIs topo — mais compacto */}
      <div className="grid md:grid-cols-4 gap-2 mb-3">
        {[
          [
            "Profit/Loss +/-",
            renderPL(kpis.pl),
            kpis.pl >= 0 ? "text-emerald-400" : "text-red-400",
          ],
          ["Bonus Count", String(kpis.bonusCount), ""],
          [t("startCost"), fmtMoney(kpis.startCost), ""],
          [t("amountWon"), fmtMoney(kpis.amountWon), ""],
        ].map(([label, value, color], i) => (
          <div
            key={i}
            className={cn(
              "rounded-xl border p-3",
              isDark
                ? "border-white/10 bg-white/5"
                : "border-zinc-200 bg-white"
            )}
          >
            <div
              className={cn(
                "text-[11px] leading-none mb-1",
                isDark ? "text-white/60" : "text-zinc-600"
              )}
            >
              {label}
            </div>
            <div className={cn("font-semibold", numCls, color)}>{value}</div>
          </div>
        ))}
      </div>

      {/* Ações rápidas */}
      <div className="grid md:grid-cols-4 gap-2 mb-3">
        <Button
          variant="outline"
          className="h-10"
          onClick={() =>
            setSortBy((s) => ({
              key: "betsize",
              dir: s.key === "betsize" ? -s.dir : -1,
            }))
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

      {/* Widget compacto (discreto) com 2 overlays */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 mb-4">
        <div className="text-sm font-medium mb-2">{t("overlays")}</div>
        <div className="grid lg:grid-cols-2 gap-3">
          <OverlayCard
            type="hunt"
            hunt={hunt}
            slots={sortedSlots}
            opts={huntOpts}
            setOpts={setHuntOpts}
          />
          <OverlayCard
            type="opening"
            hunt={hunt}
            slots={sortedSlots}
            opts={openingOpts}
            setOpts={setOpeningOpts}
          />
        </div>
      </div>

      {/* Tabela */}
      <div
        className={cn(
          "rounded-xl border overflow-hidden",
          isDark ? "border-white/10" : "border-zinc-200"
        )}
      >
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

        {errSlots && (
          <div className="px-4 py-3 text-sm text-red-400">{errSlots}</div>
        )}

        {sortedSlots.length === 0 && !errSlots && (
          <div className="px-4 py-6 text-sm opacity-70">
            Ainda sem slots neste hunt.
          </div>
        )}

        {sortedSlots.map((s, i) => {
          const isSuper = getIsSuper(s);
          return (
            <div
              key={s.id}
              className={cn(
                "grid grid-cols-12 items-center px-4 py-4 min-h-[56px] border-t",
                isDark ? "border-white/10" : "border-zinc-200",
                isSuper
                  ? "bg-fuchsia-500/5 border-l-4 border-l-fuchsia-400/70"
                  : ""
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
                  <img
                    src={s.thumbnail}
                    alt=""
                    className="h-8 w-8 rounded object-cover"
                  />
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
                  <div className="text-xs opacity-70 truncate">
                    {s.provider || "—"}
                  </div>
                </div>
              </div>

              {/* Colunas numéricas */}
              <div
                className={cn(
                  "col-span-1 text-center flex items-center justify-center",
                  numCls
                )}
              >
                {s.bet_size ?? "—"}
              </div>
              <div
                className={cn(
                  "col-span-2 text-center flex items-center justify-center",
                  numCls
                )}
              >
                {s.payout != null ? fmtMoney(s.payout) : "—"}
              </div>
              <div
                className={cn(
                  "col-span-1 text-center flex items-center justify-center",
                  numCls
                )}
              >
                {s.multiplier != null
                  ? Number(s.multiplier).toFixed(2)
                  : "—"}
              </div>

              {/* Ações */}
              <div className="col-span-1 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title={t("edit")}
                  className="h-7 w-7"
                  onClick={() => {
                    setEditRow(s);
                    setEditOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  title={t("delete")}
                  className="h-7 w-7 text-white"
                  onClick={() => {
                    setDelRow(s);
                    setDelOpen(true);
                  }}
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
