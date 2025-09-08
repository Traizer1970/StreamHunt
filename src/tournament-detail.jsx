// src/tournament-detail.jsx
import React from "react";
import { useTheme } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  GaugeCircle,
  Trophy,
  ChevronLeft,
  Medal,
  Search,
  Coins,
  Trash2,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

/* ────────────────────── utils ────────────────────── */
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
  return Number.isFinite(n) ? n : null;
};

// A, B, ..., Z, AA, AB, ...
const lettersFromIndex = (idx) => {
  let n = idx + 1;
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
};
const indexFromLetters = (s) => {
  let n = 0;
  for (const ch of String(s).toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

const BUY_CANDIDATES = ["buy", "buy_cost", "bonus_buy", "buy_in", "cost", "price"];
const PLAYER_CANDIDATES = ["player", "player_name", "name", "username"];
const SLOTNAME_CANDIDATES = ["slot_name", "slot"];
const SLOTID_CANDIDATES = ["slot_id", "slotid", "game_id", "slotId"];
const BUYS_CANDIDATES = ["buys", "bonus_buys", "tries", "num_buys"];

const uniq = (arr) => [...new Set(arr.filter((x) => x != null))];

const pickFirstKey = (keys, candidates) =>
  candidates.find((k) => keys.includes(k)) || null;

const detectColumnsFromRows = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return {};
  const keys = Object.keys(rows[0]);
  return {
    playerCol: pickFirstKey(keys, PLAYER_CANDIDATES),
    slotNameCol: pickFirstKey(keys, SLOTNAME_CANDIDATES),
    slotIdCol: pickFirstKey(keys, SLOTID_CANDIDATES),
    buyCol: pickFirstKey(keys, BUY_CANDIDATES),
    buysCol: pickFirstKey(keys, BUYS_CANDIDATES),
  };
};
const readBuy = (row) => {
  for (const k of BUY_CANDIDATES) {
    if (k in row && row[k] != null) {
      const v = toNum(row[k]);
      if (v != null) return v;
    }
  }
  return null;
};

function useDebounced(value, delay = 300) {
  const [v, setV] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}
function extractMissingColumn(msg) {
  if (!msg) return null;
  const a = msg?.match(/'([^']+)' column of 'tournament_entries'/i);
  if (a) return a[1];
  const b = msg?.match(/column "([^"]+)" of relation "tournament_entries" does not exist/i);
  if (b) return b[1];
  return null;
}
function pickChoices(detected, list, hasColFn) {
  const preferred = [];
  if (detected) preferred.push(detected);
  const known = list.filter(hasColFn);
  const out = uniq([...preferred, ...known]);
  return out.length ? out : list;
}

const ceilPow2 = (n) => {
  let p = 1;
  while (p < Math.max(1, n)) p <<= 1;
  return p;
};

// pequeno debounce para gravar na BD sem spammar
const debounce = (fn, ms = 450) => {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
};

/* labels PT */
const ROUND_LABELS = ["Round of 32", "Round of 16", "Quarter Finals", "Semi Finais", "Final"];
const labelsForTotalRounds = (total) => ROUND_LABELS.slice(ROUND_LABELS.length - total);
const roundTitle = (idx, total) => labelsForTotalRounds(total)[idx];

/* ───────────────────── limites BD ─────────────────────
  A tua BD tem um CHECK que aceita seeds até “H”.
  Se mudares o constraint no Supabase, altera isto também.
*/
const MAX_SEED_LETTER = "Z";

/* ───────────────────── Toast ───────────────────── */
function Toast({ show, kind, text }) {
  if (!show) return null;
  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[1000] opacity-100 translate-y-0 transition-all">
      <div
        className={[
          "flex items-center gap-2 rounded-xl px-3 py-2 shadow-xl border backdrop-blur",
          kind === "ok"
            ? "bg-emerald-600/15 border-emerald-400/30 text-emerald-200"
            : "bg-rose-600/15 border-rose-400/30 text-rose-200",
        ].join(" ")}
      >
        {kind === "ok" ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        <span className="text-sm">{text}</span>
      </div>
    </div>
  );
}

/* ─────────────────── small UI pieces ─────────────────── */
function SeedChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "h-8 px-3 rounded-full grid place-items-center text-xs font-bold transition",
        active
          ? "bg-indigo-500 text-white shadow ring-2 ring-indigo-400/40"
          : "bg-white/5 text-white/80 border border-white/10 hover:bg-white/10",
      ].join(" ")}
      title={`Seed ${label}`}
      type="button"
    >
      {label}
    </button>
  );
}
function SeedChipsAdd({ list, value, onSelect, onAdd, canAdd = true }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {list.map((s) => (
        <SeedChip key={`seedchip-${s}`} label={s} active={s === value} onClick={() => onSelect(s)} />
      ))}
      <button
        onClick={() => canAdd && onAdd()}
        disabled={!canAdd}
        className={[
          "h-8 w-8 rounded-full grid place-items-center border",
          canAdd
            ? "border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
            : "border-white/10 bg-white/5 opacity-40 cursor-not-allowed",
        ].join(" ")}
        title={canAdd ? "Adicionar seed" : "Limite de seeds atingido"}
        type="button"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function PaymentField({ value, onChange, onClear }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 h-8">
      <span className="text-[11px] opacity-70">€</span>
      <input
        inputMode="decimal"
        className="bg-transparent outline-none text-xs w-20 placeholder-white/40"
        placeholder="Pago (€)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value ? (
        <button onClick={onClear} className="text-white/50 hover:text-white/80" type="button">
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/* ─────────────────── Slot search ─────────────────── */
function SlotsAutocomplete({ value, onSelect, placeholder = "ex.: Le King" }) {
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

  React.useEffect(() => {
    setQuery(currentValueName);
  }, [currentValueName]);

  const commitFreeText = React.useCallback(() => {
    const q = (query || "").trim();
    const cur = (currentValueName || "").trim();
    if (!q || q === cur) {
      setOpen(false);
      return;
    }
    onSelect({ id: null, name: q });
    setOpen(false);
  }, [onSelect, query, currentValueName]);

  React.useEffect(() => {
    const onDoc = (e) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) {
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
    const run = async () => {
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
    };
    run();
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
          className={[
            "absolute z-40 mt-2 w-full rounded-xl overflow-hidden border",
            isDark
              ? "bg-zinc-950/95 border-white/10 shadow-2xl"
              : "bg-white border-zinc-200 shadow-xl",
          ].join(" ")}
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
                      <img
                        src={it["THUMBNAIL"]}
                        alt=""
                        className="h-6 w-6 rounded object-contain"
                      />
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

/* ─────────────────── Seed row (lista esquerda) ─────────────────── */
function SeedRow({ seed, entry, onClick, onDelete }) {
  return (
    <div className="group grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 overflow-hidden">
      <div className="h-7 w-7 rounded-full bg-indigo-500 text-white grid place-items-center text-[10px] font-extrabold">
        {seed}
      </div>

      <button className="flex items-center gap-3 text-left min-w-0" onClick={onClick} type="button">
        {entry?.thumbnail ? (
          <div className="h-9 w-9 rounded overflow-hidden grid place-items-center flex-none">
            <img src={entry.thumbnail} alt="" className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="h-9 w-9 rounded bg-white/10 flex-none" />
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{entry?.player_name || "—"}</div>
          <div className="text-[11px] opacity-70 truncate">{entry?.slot_name || "—"}</div>
          {entry?.buy_cost != null && (
            <div className="mt-1 text-[11px] opacity-70 flex items-center gap-1">
              <Coins className="h-3.5 w-3.5" />
              {fmtMoney(entry.buy_cost)}
            </div>
          )}
        </div>
      </button>

      <div className="flex items-center gap-2">
        <button
          className="opacity-60 hover:opacity-100 text-rose-300"
          title="Eliminar seed"
          type="button"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ───────────────── bracket helpers ───────────────── */
const DEFAULT_BUYS = 3;

function multiplier(totalPay, buy, buysCount) {
  const p = toNum(totalPay);
  const b = toNum(buy);
  if (p == null || b == null || b === 0) return null;
  const denom = b * Math.max(1, Number(buysCount || 1));
  if (!Number.isFinite(denom) || denom === 0) return null;
  return (p / denom).toFixed(2);
}

/* ───────────────── battle UI ───────────────── */
function BattleSide({
  side,            // "L" | "R"
  seedLabel,
  entry,
  values = [],
  setValueAt,
  clearAt,
  isWinner,        // true | false | null
  multText,        // string | null
  totalEur,        // number | null
  badgeGreen,      // boolean | null
  neutral = false, // força neutro quando ninguém jogou
}) {
  const base =
    "relative rounded-2xl border p-5 pt-8 pb-12 transition bg-white/5 overflow-visible";

  const variant = neutral
    ? "ring-0 border-white/10"
    : isWinner === true
    ? "ring-2 ring-emerald-400/60 border-white/10"
    : isWinner === false
    ? "ring-2 ring-rose-400/60 border-white/10"
    : "ring-0 border-white/10";

  const loserOpacity = !neutral && isWinner === false ? " opacity-60" : "";

  const padByThumb = side === "R" ? "pr-[88px]" : "pl-[88px]";
  const row =
    side === "R"
      ? `flex flex-row-reverse items-stretch gap-5 ${padByThumb}`
      : `flex items-stretch gap-5 ${padByThumb}`;
  const textAlign = side === "R" ? "text-right" : "text-left";
  const just = side === "R" ? "justify-end" : "justify-start";

  const badgeClass =
    badgeGreen === null
      ? "bg-sky-500/15 border-sky-400/40 text-sky-200"
      : badgeGreen
      ? "bg-emerald-600/20 border-emerald-400/50 text-emerald-200"
      : "bg-rose-600/20 border-rose-400/50 text-rose-200";

  return (
    <div className={`${base} ${variant}${loserOpacity}`}>
      {seedLabel ? (
        <div
          className={[
            "absolute -top-2 h-7 w-7 rounded-full bg-indigo-500 text-white grid place-items-center text-[11px] font-extrabold shadow ring-2 ring-black/20",
            side === "R" ? "-right-2" : "-left-2",
          ].join(" ")}
          title={`Seed ${seedLabel}`}
        >
          {seedLabel}
        </div>
      ) : null}

      {entry?.thumbnail && (
        <div className={`absolute top-4 ${side === "R" ? "right-4" : "left-4"} z-10`} aria-hidden="true">
          <div className="h-16 w-16 rounded-lg overflow-hidden shadow-md">
            <img src={entry.thumbnail} alt="" className="h-full w-full object-cover object-bottom" />
          </div>
        </div>
      )}

      <div className={row}>
        <div className={`min-w-0 flex-1 ${textAlign}`}>
          <div className="text-sm font-semibold truncate">{entry?.player_name || "—"}</div>
          <div className="text-[11px] opacity-70 truncate">{entry?.slot_name || "—"}</div>

          <div className={`mt-4 flex flex-wrap items-center gap-3 ${just}`}>
            {Array.from({ length: Math.max(1, values.length || 1) }).map((_, i) => (
              <PaymentField
                key={`pay-${side}-${i}`}
                value={values[i] ?? ""}
                onChange={(v) => setValueAt(i, v)}
                onClear={() => clearAt(i)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-5">
        <span className={`px-2 py-1 rounded-lg text-[11px] font-semibold border ${badgeClass}`}>
          × {multText ?? "0"}
        </span>
      </div>
      <div className="absolute bottom-3 right-5">
        <span className={`px-2 py-1 rounded-lg text-[11px] font-semibold border ${badgeClass}`}>
          {totalEur != null ? fmtMoney(totalEur) : fmtMoney(0)}
        </span>
      </div>
    </div>
  );
}

function MatchRow({ roundIndex, matchIndex, match, payments, setPay, buysForSeed }) {
  const baseKey = `R${roundIndex}M${matchIndex}`;

  const nL = Math.max(1, buysForSeed[match.leftSeed] || 3);
  const nR = Math.max(1, buysForSeed[match.rightSeed] || 3);

  const keysL = Array.from({ length: nL }, (_, i) => `${baseKey}-L-B${i + 1}`);
  const keysR = Array.from({ length: nR }, (_, i) => `${baseKey}-R-B${i + 1}`);

  const paysL = keysL.map((k) => payments[k] ?? "");
  const paysR = keysR.map((k) => payments[k] ?? "");

  const toSum = (arr) => arr.reduce((a, v) => a + (toNum(v) || 0), 0);
  const sumL = toSum(paysL);
  const sumR = toSum(paysR);

  const filled = (arr, expected) => arr.length === expected && arr.every((v) => toNum(v) != null);
  const filledL = filled(paysL, nL);
  const filledR = filled(paysR, nR);
  const bothReady = filledL && filledR;

  let winner = null;
  if (bothReady) {
    if (sumL > sumR) winner = "L";
    else if (sumR > sumL) winner = "R";
  }

  const parseMoney = (v) => {
    if (v == null) return null;
    const s = String(v).replace(/[^\d.,-]/g, "").replace(",", ".");
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };

  const buyL = parseMoney(match.left?.buy_cost);
  const buyR = parseMoney(match.right?.buy_cost);

  const baseBetL = buyL != null ? buyL / 100 : null;
  const baseBetR = buyR != null ? buyR / 100 : null;

  const multL = baseBetL != null && sumL > 0 ? sumL / baseBetL : null;
  const multR = baseBetR != null && sumR > 0 ? sumR / baseBetR : null;

  const multTextL = multL != null ? Math.floor(multL).toString() : null;
  const multTextR = multR != null ? Math.floor(multR).toString() : null;

  const hasAnyL = paysL.some((v) => (toNum(v) || 0) > 0);
  const hasAnyR = paysR.some((v) => (toNum(v) || 0) > 0);
  const neutralL = !hasAnyL;
  const neutralR = !hasAnyR;

  const spendL = buyL != null ? buyL * nL : null;
  const spendR = buyR != null ? buyR * nR : null;
  const greenL = hasAnyL ? (multL != null && multL >= 300) || (spendL != null && sumL >= spendL) : null;
  const greenR = hasAnyR ? (multR != null && multR >= 300) || (spendR != null && sumR >= spendR) : null;

  const title = `${match.leftSeed || "—"} × ${match.rightSeed || "—"}`;

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold opacity-70">{title}</div>
      <div className="grid grid-cols-2 gap-6">
        <BattleSide
          side="L"
          seedLabel={match.leftSeed}
          entry={match.left}
          values={paysL}
          setValueAt={(i, v) => setPay(keysL[i], v)}
          clearAt={(i) => setPay(keysL[i], "")}
          isWinner={bothReady ? winner === "L" : null}
          multText={multTextL}
          totalEur={sumL}
          badgeGreen={greenL}
          neutral={neutralL}
        />
        <BattleSide
          side="R"
          seedLabel={match.rightSeed}
          entry={match.right}
          values={paysR}
          setValueAt={(i, v) => setPay(keysR[i], v)}
          clearAt={(i) => setPay(keysR[i], "")}
          isWinner={bothReady ? winner === "R" : null}
          multText={multTextR}
          totalEur={sumR}
          badgeGreen={greenR}
          neutral={neutralR}
        />
      </div>
    </div>
  );
}

/* ───────────────────── Página ───────────────────── */
export default function TournamentDetail({ tournamentId }) {
  const { isDark } = useTheme();

  // toast
  const [toast, setToast] = React.useState({ show: false, kind: "ok", text: "" });
  const toastTimer = React.useRef(null);
  const showToast = React.useCallback((text, kind = "ok", ms = 2200) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ show: true, kind, text });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, show: false })), ms);
  }, []);
  React.useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  const [busy, setBusy] = React.useState(true);
  const [err, setErr] = React.useState("");
  const [tor, setTor] = React.useState(null);

  const [entries, setEntries] = React.useState([]);
  const [cols, setCols] = React.useState({
    playerCol: null,
    slotNameCol: null,
    slotIdCol: null,
    buyCol: null,
    buysCol: null,
  });
  const [knownCols, setKnownCols] = React.useState(new Set());
  const hasCol = React.useCallback((c) => !!c && knownCols.has(c), [knownCols]);

  // seeds “fantasma”
  const [ghostSeeds, setGhostSeeds] = React.useState([]);
  const [seed, setSeed] = React.useState("A");

  // nº bonus buys por seed
  const [buysForSeed, setBuysForSeed] = React.useState({});
  const setBuys = (s, n) =>
    setBuysForSeed((m) => ({ ...m, [s]: Math.max(1, Math.min(3, Number(n) || 1)) }));

  // form
  const [playerName, setPlayerName] = React.useState("");
  const [slot, setSlot] = React.useState({ id: null, name: "" });
  const [buyCost, setBuyCost] = React.useState("");

  // stats
  const [statsLoading, setStatsLoading] = React.useState(false);
  const [slotStats, setSlotStats] = React.useState(null);

  // payments
  const [payments, setPayments] = React.useState({});

  // persistência de pagamentos (debounced)
  const persistPayment = React.useRef(
    debounce(async ({ round, match, side, buy }, rawValue) => {
      const amount = toNum(rawValue);
      try {
        const { error } = await supabase.from("tournament_payments").upsert({
          tournament_id: tournamentId,
          round_idx: round,
          match_idx: match,
          side,
          buy_idx: buy,
          amount,
        });
        if (error) console.warn("persistPayment:", error.message);
      } catch (e) {
        console.warn("persistPayment:", e?.message || e);
      }
    })
  ).current;

  // setPay + gravação
  const setPay = React.useCallback(
    (key, v) => {
      setPayments((p) => ({ ...p, [key]: v }));
      const m = key.match(/^R(\d+)M(\d+)-(L|R)-B(\d+)$/);
      if (m) {
        persistPayment(
          { round: Number(m[1]), match: Number(m[2]), side: m[3], buy: Number(m[4]) },
          v
        );
      }
    },
    [persistPayment]
  );

  // map por seed
  const bySeed = React.useMemo(() => {
    const m = {};
    for (const e of entries) m[e.seed] = e;
    return m;
  }, [entries]);

  // lista seeds (BD + fantasma)
  const seedList = React.useMemo(() => {
    const arr = uniq([...entries.map((e) => e.seed), ...ghostSeeds]).sort(
      (a, b) => indexFromLetters(a) - indexFromLetters(b)
    );
    return arr.length ? arr : ["A"];
  }, [entries, ghostSeeds]);

  // pode adicionar mais seeds? (de acordo com o limite da BD)
  const canAddMoreSeeds = React.useMemo(() => {
    const nextIdx = seedList.length
      ? Math.max(...seedList.map((s) => indexFromLetters(s))) + 1
      : 0;
    return nextIdx <= indexFromLetters(MAX_SEED_LETTER);
  }, [seedList]);

  // corrige seleção quando lista muda
  React.useEffect(() => {
    if (seedList.length && !seedList.includes(seed)) setSeed(seedList[0]);
  }, [seedList, seed]);

  // enriquecer entradas com thumbs/provider
  const enrichEntries = React.useCallback(async (rows) => {
    const byId = new Map();
    const byName = new Map();
    const out = [];
    for (const r of rows) {
      let thumb = null;
      let provider = null;
      let nm = null;

      if (r.slot_id != null) {
        if (byId.has(r.slot_id)) ({ thumb, provider, nm } = byId.get(r.slot_id));
        else {
          const { data } = await supabase
            .from("slots_catalog")
            .select('id, "NAME", "PROVIDER", "THUMBNAIL"')
            .eq("id", r.slot_id)
            .maybeSingle();
          if (data) {
            thumb = data["THUMBNAIL"] || null;
            provider = data["PROVIDER"] || null;
            nm = data["NAME"] || null;
            byId.set(r.slot_id, { thumb, provider, nm });
          }
        }
      } else if (r.slot_name) {
        const key = r.slot_name.toLowerCase();
        if (byName.has(key)) ({ thumb, provider, nm } = byName.get(key));
        else {
          const { data } = await supabase
            .from("slots_catalog")
            .select('id, "NAME", "PROVIDER", "THUMBNAIL"')
            .ilike("NAME", `%${r.slot_name}%`)
            .order("NAME", { ascending: true })
            .limit(1)
            .maybeSingle();
          if (data) {
            thumb = data["THUMBNAIL"] || null;
            provider = data["PROVIDER"] || null;
            nm = data["NAME"] || null;
            byName.set(key, { thumb, provider, nm });
          }
        }
      }

      out.push({
        ...r,
        slot_name: r.slot_name || nm || "",
        slot_provider: provider || null,
        thumbnail: thumb || null,
      });
    }
    return out;
  }, []);

  const load = React.useCallback(async () => {
    try {
      setBusy(true);
      setErr("");
      const { data: tData, error: e1 } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .maybeSingle();
      if (e1) throw e1;
      setTor(tData || null);

      const { data: ent, error: e2 } = await supabase
        .from("tournament_entries")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("seed", { ascending: true });
      if (e2) throw e2;

      let sample = [];
      try {
        const { data: s } = await supabase.from("tournament_entries").select("*").limit(1);
        sample = s || [];
      } catch {
        sample = [];
      }
      const keysEnt = ent?.[0] ? Object.keys(ent[0]) : [];
      const keysSample = sample?.[0] ? Object.keys(sample[0]) : [];
      setKnownCols(new Set([...keysEnt, ...keysSample]));

      let detected = detectColumnsFromRows(ent || []);
      if (
        (!detected.playerCol || !detected.slotNameCol || !detected.slotIdCol || !detected.buyCol) &&
        sample?.length
      ) {
        const d2 = detectColumnsFromRows(sample || []);
        detected = { ...detected, ...Object.fromEntries(Object.entries(d2).filter(([, v]) => v)) };
      }
      setCols((c) => ({ ...c, ...detected }));

      // ler e enriquecer
      const base = (ent || []).map((r) => ({
        id: r.id,
        seed: r.seed,
        player_name:
          (detected.playerCol ? r[detected.playerCol] : undefined) ??
          r.player_name ??
          r.player ??
          r.name ??
          r.username ??
          "",
        slot_name:
          (detected.slotNameCol ? r[detected.slotNameCol] : undefined) ??
          r.slot_name ??
          r.slot ??
          "",
        slot_id:
          (detected.slotIdCol ? r[detected.slotIdCol] : undefined) ??
          r.slot_id ??
          r.slotid ??
          r.game_id ??
          null,
        buy_cost: readBuy(r),
        buys_val:
          detected.buysCol && r[detected.buysCol] != null
            ? Math.max(1, Math.min(3, Number(r[detected.buysCol]) || 1))
            : null,
      }));

      const rich = await enrichEntries(base);
      setEntries(rich);

      // sincronizar nº buys por seed
      setBuysForSeed((old) => {
        const next = { ...old };
        for (const row of rich) {
          if (row.seed && row.buys_val != null) next[row.seed] = row.buys_val;
        }
        return next;
      });

      // pagamentos
      const { data: payRows } = await supabase
        .from("tournament_payments")
        .select("*")
        .eq("tournament_id", tournamentId);
      if (Array.isArray(payRows)) {
        const map = {};
        for (const r of payRows) {
          const k = `R${r.round_idx}M${r.match_idx}-${r.side}-B${r.buy_idx}`;
          map[k] = r.amount != null ? String(r.amount) : "";
        }
        setPayments(map);
      }
    } catch (e) {
      setErr(e?.message || "Falha ao carregar.");
      setEntries([]);
    } finally {
      setBusy(false);
    }
  }, [tournamentId, enrichEntries]);

  React.useEffect(() => {
    load();
  }, [load]);

  // stats da slot selecionada
  React.useEffect(() => {
    const run = async () => {
      setSlotStats(null);
      if (!slot?.id && !slot?.name) return;

      const idCol = hasCol(cols.slotIdCol) ? cols.slotIdCol : SLOTID_CANDIDATES.find(hasCol) || null;
      const nameCol =
        hasCol(cols.slotNameCol) ? cols.slotNameCol : SLOTNAME_CANDIDATES.find(hasCol) || null;
      if (!idCol && !nameCol) return;

      setStatsLoading(true);
      try {
        const ownerId =
          tor?.user_id ?? tor?.owner_id ?? tor?.created_by ?? tor?.profile_id ?? null;

        let q = supabase
          .from("tournament_entries")
          .select(
            `*, tournaments:tournament_id (id, title, user_id, owner_id, created_by, start_at, created_at)`
          );

        if (slot?.id && idCol) q = q.eq(idCol, slot.id);
        if (slot?.name && nameCol) q = q.ilike(nameCol, `%${slot.name}%`);

        let rows = [];
        try {
          let qq = q;
          if (ownerId != null) {
            qq = qq.or(
              `tournaments.user_id.eq.${ownerId},tournaments.owner_id.eq.${ownerId},tournaments.created_by.eq.${ownerId},tournaments.profile_id.eq.${ownerId}`
            );
          }
          const { data, error } = await qq.limit(400).order("created_at", { ascending: false });
          if (error) throw error;
          rows = data || [];
        } catch {
          const { data } = await q.limit(400).order("created_at", { ascending: false });
          rows = data || [];
        }

        const buys = rows.map(readBuy).filter((n) => Number.isFinite(n));
        const count = rows.length;
        const avg = buys.length ? buys.reduce((a, b) => a + b, 0) / buys.length : null;
        const min = buys.length ? Math.min(...buys) : null;
        const max = buys.length ? Math.max(...buys) : null;
        const last = rows[0]?.tournaments?.start_at || rows[0]?.created_at || null;
        const lastNice = last
          ? new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium" }).format(new Date(last))
          : null;

        setSlotStats({ count, avgBuy: avg, minBuy: min, maxBuy: max, lastPlayed: lastNice });
      } catch {
        setSlotStats(null);
      } finally {
        setStatsLoading(false);
      }
    };
    run();
  }, [slot?.id, slot?.name, tor, cols.slotIdCol, cols.slotNameCol, hasCol]);

  /* ---------- save / delete ---------- */

  // Guardar/atualizar entrada — faz UPDATE se a seed existir, INSERT se não existir.
  const saveEntry = async () => {
    // bloqueia salvar se a seed atual for > MAX_SEED_LETTER (evita erro do CHECK)
    if (indexFromLetters(seed) > indexFromLetters(MAX_SEED_LETTER)) {
      showToast(`Limite de seeds (${MAX_SEED_LETTER}) configurado na base de dados.`, "err");
      return;
    }

    const playerChoices = pickChoices(cols.playerCol, PLAYER_CANDIDATES, hasCol);
    const slotNameChoices = pickChoices(cols.slotNameCol, SLOTNAME_CANDIDATES, hasCol);
    const slotIdChoices = pickChoices(cols.slotIdCol, SLOTID_CANDIDATES, hasCol);
    const buyChoices = pickChoices(cols.buyCol, BUY_CANDIDATES, hasCol).concat([null]);
    const buysChoices = pickChoices(cols.buysCol, BUYS_CANDIDATES, hasCol).concat([null]);

    const existing = entries.find((e) => e.seed === seed) || null;

    const writeWithCols = async (mapping) => {
      const ownerId =
        tor?.created_by ?? tor?.user_id ?? tor?.owner_id ?? tor?.profile_id ?? null;
      if (!ownerId) throw new Error("Não foi possível determinar o user_id do torneio.");

      const payload = {
        tournament_id: tournamentId,
        user_id: ownerId,
        seed,
      };
      if (mapping.playerCol) payload[mapping.playerCol] = playerName || null;
      if (mapping.slotNameCol) payload[mapping.slotNameCol] = slot?.name || null;
      if (mapping.slotIdCol) payload[mapping.slotIdCol] = slot?.id ?? null;
      if (mapping.buyCol) payload[mapping.buyCol] = buyCost === "" ? null : toNum(buyCost);
      if (mapping.buysCol) payload[mapping.buysCol] = Math.max(1, Math.min(3, buysForSeed[seed] || 1));

      if (existing?.id) {
        const { error } = await supabase
          .from("tournament_entries")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tournament_entries").insert(payload);
        if (error) throw error;
      }
    };

    let combos = [];
    for (const p of playerChoices)
      for (const sn of slotNameChoices)
        for (const si of slotIdChoices)
          for (const b of buyChoices)
            for (const bu of buysChoices) combos.push({ p, sn, si, b, bu });

    let saved = false;
    let lastErr = null;

    while (combos.length && !saved) {
      const { p, sn, si, b, bu } = combos.shift();
      try {
        await writeWithCols({
          playerCol: p,
          slotNameCol: sn,
          slotIdCol: si,
          buyCol: b,
          buysCol: bu,
        });
        saved = true;
      } catch (e) {
        lastErr = e;
        const missing = extractMissingColumn(e?.message || e?.details || "");
        if (missing) {
          combos = combos.filter(
            (c) =>
              c.p !== missing &&
              c.sn !== missing &&
              c.si !== missing &&
              c.b !== missing &&
              c.bu !== missing
          );
        }
      }
    }

    if (!saved) {
      showToast(lastErr?.message || "Não foi possível guardar.", "err");
      return;
    }

    setGhostSeeds((g) => g.filter((s) => s !== seed));
    await load();
    showToast(existing ? "Entrada atualizada!" : "Entrada guardada!");
    setPlayerName("");
    setSlot({ id: null, name: "" });
    setBuyCost("");
  };

  const deleteEntry = async (seedToDelete) => {
    const existsInDB = entries.some((e) => e.seed === seedToDelete);
    try {
      if (existsInDB) {
        await supabase
          .from("tournament_entries")
          .delete()
          .eq("tournament_id", tournamentId)
          .eq("seed", seedToDelete);
        await load();
      }
      setGhostSeeds((g) => g.filter((s) => s !== seedToDelete));
      setBuysForSeed((m) => {
        const n = { ...m };
        delete n[seedToDelete];
        return n;
      });
      showToast(`Seed ${seedToDelete} eliminada.`);
    } catch (e) {
      showToast(e?.message || "Falha ao eliminar.", "err");
    }
  };

  // adicionar seed “fantasma”
  const addSeed = React.useCallback(() => {
    const all = seedList;
    const nextIdx = all.length
      ? Math.max(...all.map((s) => indexFromLetters(s))) + 1
      : 0;

    if (nextIdx > indexFromLetters(MAX_SEED_LETTER)) {
      // bloqueia para evitar o erro do CHECK
      showToast(`Limite de seeds (${MAX_SEED_LETTER}) configurado na base de dados.`, "err");
      return;
    }

    const next = lettersFromIndex(nextIdx);
    setGhostSeeds((g) => uniq([...g, next]));
    setSeed(next);
    setBuys(next, 3);
  }, [seedList]);

  /* ───────────── bracket (build) ───────────── */
  const rounds = React.useMemo(() => {
    const list = Array.isArray(seedList) ? seedList : [];
    const n = list.length;
    const p = Math.max(2, ceilPow2(n));
    const totalRounds = Math.log2(p);

    const filled = [...list];
    while (filled.length < p) filled.push(null);

    const r = [];
    const r1 = [];
    for (let i = 0; i < p; i += 2) {
      const sL = filled[i];
      const sR = filled[i + 1];
      r1.push({
        leftSeed: sL,
        rightSeed: sR,
        left: sL ? bySeed[sL] || null : null,
        right: sR ? bySeed[sR] || null : null,
      });
    }
    r.push(r1);

    for (let k = 1; k < totalRounds; k++) {
      const prev = r[k - 1];
      const next = Array.from({ length: Math.ceil(prev.length / 2) }, () => ({
        leftSeed: null,
        rightSeed: null,
        left: null,
        right: null,
      }));
      r.push(next);
    }

    // Propagar vencedor quando ambos preenchidos
    for (let ridx = 0; ridx < r.length - 1; ridx++) {
      const cur = r[ridx];
      const nxt = r[ridx + 1];
      for (let midx = 0; midx < cur.length; midx++) {
        const m = cur[midx];
        const baseK = `R${ridx}M${midx}`;
        const nL = Math.max(1, buysForSeed[m.leftSeed] || DEFAULT_BUYS);
        const nR = Math.max(1, buysForSeed[m.rightSeed] || DEFAULT_BUYS);
        const paysL = Array.from({ length: nL }, (_, i) => toNum(payments[`${baseK}-L-B${i + 1}`]));
        const paysR = Array.from({ length: nR }, (_, i) => toNum(payments[`${baseK}-R-B${i + 1}`]));
        const filledL = paysL.length === nL && paysL.every((v) => v != null);
        const filledR = paysR.length === nR && paysR.every((v) => v != null);
        if (!(filledL && filledR)) continue;
        const sumL = paysL.reduce((a, v) => a + (v || 0), 0);
        const sumR = paysR.reduce((a, v) => a + (v || 0), 0);
        const w = sumL > sumR ? "L" : sumR > sumL ? "R" : null;
        const target = nxt[Math.floor(midx / 2)];
        if (w === "L" && m.left) {
          target[midx % 2 === 0 ? "left" : "right"] = m.left;
          target[midx % 2 === 0 ? "leftSeed" : "rightSeed"] = m.leftSeed;
        } else if (w === "R" && m.right) {
          target[midx % 2 === 0 ? "left" : "right"] = m.right;
          target[midx % 2 === 0 ? "leftSeed" : "rightSeed"] = m.rightSeed;
        }
      }
    }

    return r;
  }, [seedList, bySeed, payments, buysForSeed]);

  const totalRounds = rounds.length || 1;
  const tabs = labelsForTotalRounds(totalRounds);
  const [activeTab, setActiveTab] = React.useState(0);
  React.useEffect(() => setActiveTab(0), [tabs.length]);

  /* ───────────────────────── render ───────────────────────── */
  const totalEntries = entries.length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Toast show={toast.show} kind={toast.kind} text={toast.text} />

      {/* topo */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/40 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => (window.location.hash = "#/tournaments")}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5" /> {tor?.title || "Torneio"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
          </div>
        </div>
      </div>

      {/* mini cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 mb-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs opacity-70">Entrys</div>
          <div className="text-lg font-semibold">{totalEntries}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs opacity-70">Seeds</div>
          <div className="text-lg font-semibold">{seedList.length}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs opacity-70">Rounds</div>
          <div className="text-lg font-semibold">{totalRounds}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="text-xs opacity-70">Prize pool</div>
          <div className="text-lg font-semibold">
            {tor?.prize_pool != null ? fmtMoney(tor.prize_pool) : "—"}
          </div>
        </div>
      </div>

      <div className="grid xl:grid-cols-[460px_1fr] gap-6">
        {/* esquerda: lista de seeds  -> sem sticky/overflow: página é que rola */}
        <div className="space-y-4">
          <Card className={isDark ? "border-white/10 bg-white/5" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <GaugeCircle className="h-4 w-4" /> Seeds
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <SeedChipsAdd
                list={seedList}
                value={seed}
                onSelect={setSeed}
                onAdd={addSeed}
                canAdd={canAddMoreSeeds}
              />
              <div className="h-2" />
              {/* lista sem max-height nem overflow interno */}
              <div className="space-y-2">
                {seedList.map((s) => (
                  <SeedRow
                    key={`seedrow-${s}`}
                    seed={s}
                    entry={bySeed[s]}
                    onClick={() => {
                      setSeed(s);
                      const e = bySeed[s];
                      if (e) {
                        setSlot({
                          id: e.slot_id ?? null,
                          name: e.slot_name ?? "",
                          thumbnail: e.thumbnail ?? null,
                          provider: e.slot_provider ?? null,
                        });
                        setPlayerName(e.player_name || "");
                        setBuyCost(e.buy_cost ?? "");
                      }
                    }}
                    onDelete={() => deleteEntry(s)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* direita: formulário + bracket */}
        <div className="space-y-6">
          {/* Form + Preview */}
          <Card className={isDark ? "border-white/10 bg-white/5" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Add / Edit Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-12 gap-6">
                {/* form */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="grid lg:grid-cols-12 gap-4 items-end">
                    <div className="lg:col-span-6">
                      <div className="text-xs opacity-70 mb-1">Active Seed</div>
                      <SeedChip label={seed} active onClick={() => {}} />
                    </div>
                    <div className="lg:col-span-6">
                      <div className="text-xs opacity-70 mb-1">Bonus Buys</div>
                      <div className="flex gap-2 items-center">
                        {[1, 2, 3].map((n) => (
                          <button
                            key={`bb-${n}`}
                            type="button"
                            onClick={() => setBuys(seed, n)}
                            className={[
                              "h-8 w-8 rounded grid place-items-center text-xs font-bold",
                              (buysForSeed[seed] || DEFAULT_BUYS) === n
                                ? "bg-indigo-500 text-white"
                                : "bg-white/5 text-white/70 hover:bg-white/10 border border-white/10",
                            ].join(" ")}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="lg:col-span-6">
                      <div className="text-xs opacity-70 mb-1">Player Name</div>
                      <Input
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="ex.: Alex"
                        className="h-11 rounded-xl bg-zinc-900/60 border-white/10 text-white pl-4 focus-visible:ring-1 focus-visible:ring-sky-400 placeholder:text-white/40"
                      />
                    </div>

                    <div className="lg:col-span-6">
                      <div className="text-xs opacity-70 mb-1">Bonus Buy (€)</div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/60">€</span>
                        <Input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={buyCost}
                          onChange={(e) => setBuyCost(e.target.value)}
                          placeholder="ex.: 40"
                          className="h-11 rounded-xl bg-zinc-900/60 border-white/10 text-white pl-7 focus-visible:ring-1 focus-visible:ring-sky-400 placeholder:text-white/40"
                        />
                      </div>
                    </div>

                    <div className="lg:col-span-12">
                      <div className="text-xs opacity-70 mb-1">Slot</div>
                      <SlotsAutocomplete value={slot} onSelect={(s) => setSlot(s)} />
                      {slot?.name && (
                        <div className="mt-1 text-[11px] opacity-70">
                          Selected: <span className="font-medium">{slot.name}</span>
                          {slot.provider ? <span> • {slot.provider}</span> : null}
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-12">
                      <div className="flex items-center gap-2">
                        <Button className="h-11 rounded-xl" onClick={saveEntry}>
                          Save
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 rounded-xl"
                          onClick={() => {
                            setPlayerName("");
                            setSlot({ id: null, name: "" });
                            setBuyCost("");
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* preview slot */}
                <div className="lg:col-span-5">
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    {!slot?.name ? (
                      <div className="text-sm opacity-70">
                        Choose a slot to see the preview and statistics.
                      </div>
                    ) : (
                      <div className="flex gap-4">
                        {slot.thumbnail ? (
                          <div className="h-16 w-16 rounded-lg overflow-hidden grid place-items-center">
                            <img src={slot.thumbnail} alt="" className="h-full w-full object-contain" />
                          </div>
                        ) : (
                          <div className="h-16 w-16 rounded bg-white/10" />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-base font-semibold truncate">{slot.name}</div>
                          <div className="text-xs opacity-70 truncate">{slot.provider || "—"}</div>
                          {statsLoading ? (
                            <div className="mt-3 text-xs opacity-70">A carregar estatísticas…</div>
                          ) : slotStats ? (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {[
                                ["Times", slotStats.count],
                                ["Avg.", slotStats.avgBuy != null ? fmtMoney(slotStats.avgBuy) : "—"],
                                ["Min", slotStats.minBuy != null ? fmtMoney(slotStats.minBuy) : "—"],
                                ["Max", slotStats.maxBuy != null ? fmtMoney(slotStats.maxBuy) : "—"],
                                ["Last", slotStats.lastPlayed || "—"],
                              ].map(([k, v]) => (
                                <div
                                  key={k}
                                  className="px-2 py-1 rounded-lg text-xs border border-white/10 bg-white/5"
                                >
                                  <span className="opacity-70">{k}:</span>{" "}
                                  <span className="font-semibold">{v}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="mt-3 text-xs opacity-70">Sem histórico.</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bracket */}
          <Card className={isDark ? "border-white/10 bg-white/5" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Medal className="h-4 w-4" /> Bracket
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-2">
                {tabs.map((lab, i) => (
                  <button
                    key={`tab-${lab}`}
                    onClick={() => setActiveTab(i)}
                    className={[
                      "px-3 py-1.5 rounded-lg text-sm border transition",
                      activeTab === i
                        ? "bg-indigo-500/20 border-indigo-400/40 text-indigo-200"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
                    ].join(" ")}
                    type="button"
                  >
                    {lab}
                  </button>
                ))}
              </div>

              {rounds[activeTab] && (
                <div className="space-y-5">
                  <div className="text-xs font-semibold opacity-70 mb-1">
                    {roundTitle(activeTab, totalRounds)}
                  </div>
                  {rounds[activeTab].map((m, mi) => (
                    <MatchRow
                      key={`r${activeTab}-m${mi}`}
                      roundIndex={activeTab}
                      matchIndex={mi}
                      match={m}
                      payments={payments}
                      setPay={setPay}
                      buysForSeed={buysForSeed}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {busy && <div className="mt-4 text-sm opacity-70">A carregar…</div>}
          {err && !busy && <div className="mt-4 text-sm text-rose-400">{err}</div>}
        </div>
      </div>
    </div>
  );
}
