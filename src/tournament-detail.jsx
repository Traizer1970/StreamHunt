// /src/tournament-detail.jsx
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
  const n = Number(String(v).replace(",", "."));
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

/* labels PT */
const ROUND_LABELS = ["16-avos", "Oitavos", "Quartos", "Semi-finais", "Final"];
const labelsForTotalRounds = (total) => ROUND_LABELS.slice(ROUND_LABELS.length - total);
const roundTitle = (idx, total) => labelsForTotalRounds(total)[idx];

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
        "h-8 w-8 rounded-full grid place-items-center text-xs font-bold transition",
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
function SeedChipsAdd({ list, value, onSelect, onAdd }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {list.map((s) => (
        <SeedChip key={`seedchip-${s}`} label={s} active={s === value} onClick={() => onSelect(s)} />
      ))}
      <button
        onClick={onAdd}
        className="h-8 w-8 rounded-full grid place-items-center border border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
        title="Adicionar seed"
        type="button"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

function PaymentField({ value, onChange, onClear }) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1">
      <span className="text-[11px] opacity-70">€</span>
      <input
        inputMode="decimal"
        className="bg-transparent outline-none text-xs w-24 placeholder-white/40"
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
function SlotsAutocomplete({ value, onSelect, placeholder = "Slot / Jogo" }) {
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
                        className="h-6 w-6 rounded object-cover"
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

/* ─────────────────── tiny display card (seed) ─────────────────── */
function BuysToggle({ value = 1, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-1">
      {[1, 2, 3].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={[
            "h-6 w-6 text-xs font-bold rounded grid place-items-center",
            n === value ? "bg-indigo-500 text-white" : "text-white/70 hover:bg-white/10",
          ].join(" ")}
          title={`${n} bonus buy(s)`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function SeedCard({ seed, entry, buys, onChangeBuys, onClick, onDelete }) {
  return (
    <div
      className="relative rounded-xl border border-white/10 bg-zinc-950/60 p-3 hover:bg-white/5 transition cursor-pointer"
      onClick={onClick}
    >
      <div className="absolute -left-2 -top-2 h-6 w-6 rounded-full bg-indigo-500 shadow ring-2 ring-black/20 text-white grid place-items-center text-[10px] font-extrabold">
        {seed}
      </div>

      <div className="pl-1 flex items-center gap-3">
        {entry?.thumbnail ? (
          <img
            src={entry.thumbnail}
            alt=""
            className="h-10 w-10 rounded object-cover flex-none"
            loading="lazy"
          />
        ) : (
          <div className="h-10 w-10 rounded bg-white/10 flex-none" />
        )}

        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{entry?.player_name || "—"}</div>
          <div className="text-[11px] opacity-70 truncate">{entry?.slot_name || "—"}</div>
          <div className="mt-1 flex items-center gap-2">
            {entry?.buy_cost != null && (
              <div className="text-[11px] opacity-70 flex items-center gap-1">
                <Coins className="h-3.5 w-3.5" />
                {fmtMoney(entry.buy_cost)}
              </div>
            )}
            <BuysToggle value={buys || 1} onChange={onChangeBuys} />
          </div>
        </div>

        <button
          className="text-white/50 hover:text-rose-300"
          title="Eliminar seed"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ───────────────── bracket helpers ───────────────── */
const bothNumbers = (a, b) => toNum(a) != null && toNum(b) != null;
function winnerSide(leftPay, rightPay) {
  if (!bothNumbers(leftPay, rightPay)) return null;
  const L = toNum(leftPay);
  const R = toNum(rightPay);
  if (L > R) return "L";
  if (R > L) return "R";
  return null;
}
function multiplier(pay, buy, buysCount = 1) {
  const p = toNum(pay);
  const b = toNum(buy);
  if (p == null || b == null || b === 0) return null;
  const denom = b * Math.max(1, Number(buysCount || 1));
  if (!Number.isFinite(denom) || denom === 0) return null;
  return (p / denom).toFixed(2);
}

/* ───────────────── battle UI ───────────────── */
function BattleSide({
  side,           // "L" | "R"
  seedLabel,      // A/B/...
  entry,
  payValue,
  onPayChange,
  onClear,
  isWinner,       // true/false/null
  showMult,       // "12.50" | null
}) {
  const bothColored = isWinner !== null; // só pinta quando existe vencedor
  const base = "relative rounded-2xl border p-4 transition";
  const color =
    bothColored && isWinner === true
      ? "bg-emerald-600/12 border-emerald-400/40"
      : bothColored && isWinner === false
      ? "bg-rose-600/12 border-rose-400/30"
      : "bg-white/5 border-white/10";

  const row = side === "R" ? "flex flex-row-reverse items-center gap-4" : "flex items-center gap-4";
  const textAlign = side === "R" ? "text-right" : "text-left";
  const just = side === "R" ? "justify-end" : "justify-start";

  return (
    <div className={`${base} ${color}`}>
      {/* badge da seed, uniforme nos dois lados */}
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

      <div className={row}>
        {/* thumb SEM corte */}
        <div className="h-14 w-14 rounded bg-white/10 overflow-hidden flex-none grid place-items-center">
          {entry?.thumbnail ? (
            <img src={entry.thumbnail} alt="" className="h-full w-full object-contain" />
          ) : (
            <div className="h-14 w-14" />
          )}
        </div>

        <div className={`min-w-0 flex-1 ${textAlign}`}>
          <div className="text-sm font-semibold truncate">{entry?.player_name || "—"}</div>
          <div className="text-[11px] opacity-70 truncate">{entry?.slot_name || "—"}</div>

          <div className={`mt-3 flex items-center gap-2 ${just}`}>
            <PaymentField value={payValue} onChange={onPayChange} onClear={onClear} />
            {showMult && (
              <span className="px-2 py-1 rounded-lg text-[11px] font-semibold border bg-sky-500/15 border-sky-400/40 text-sky-200">
                × {showMult}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchRow({
  roundIndex,
  matchIndex,
  match,
  payments,
  setPay,
  buysForSeed,
}) {
  const keyL = `R${roundIndex}M${matchIndex}-L`;
  const keyR = `R${roundIndex}M${matchIndex}-R`;
  const payL = payments[keyL] ?? "";
  const payR = payments[keyR] ?? "";

  const both = bothNumbers(payL, payR);
  const w = winnerSide(payL, payR);

  const multL = multiplier(payL, match.left?.buy_cost, buysForSeed[match.leftSeed] || 1);
  const multR = multiplier(payR, match.right?.buy_cost, buysForSeed[match.rightSeed] || 1);

  const title = `${match.leftSeed || "—"} × ${match.rightSeed || "—"}`;

  return (
    <div className="space-y-2">
      <div className="text-xs font-semibold opacity-70">{title}</div>
      <div className="grid grid-cols-2 gap-4">
        <BattleSide
          side="L"
          seedLabel={match.leftSeed}
          entry={match.left}
          payValue={payL}
          onPayChange={(v) => setPay(keyL, v)}
          onClear={() => setPay(keyL, "")}
          isWinner={both ? w === "L" : null}
          showMult={multL}
        />
        <BattleSide
          side="R"
          seedLabel={match.rightSeed}
          entry={match.right}
          payValue={payR}
          onPayChange={(v) => setPay(keyR, v)}
          onClear={() => setPay(keyR, "")}
          isWinner={both ? w === "R" : null}
          showMult={multR}
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

  // seeds locais “fantasma”
  const [ghostSeeds, setGhostSeeds] = React.useState([]);
  const [seed, setSeed] = React.useState("A");

  // por seed: número de bonus buys (1–3)
  const [buysForSeed, setBuysForSeed] = React.useState({});
  const setBuys = (s, n) =>
    setBuysForSeed((m) => {
      const next = { ...m, [s]: Math.max(1, Math.min(3, Number(n) || 1)) };
      return next;
    });

  // form
  const [playerName, setPlayerName] = React.useState("");
  const [slot, setSlot] = React.useState({ id: null, name: "" });
  const [buyCost, setBuyCost] = React.useState("");

  // stats
  const [statsLoading, setStatsLoading] = React.useState(false);
  const [slotStats, setSlotStats] = React.useState(null);

  // payments
  const [payments, setPayments] = React.useState({});
  const setPay = (key, v) => setPayments((p) => ({ ...p, [key]: v }));

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

  // corrige seleção quando lista muda
  React.useEffect(() => {
    if (seedList.length && !seedList.includes(seed)) setSeed(seedList[0]);
  }, [seedList, seed]);

  // enriquecer entradas
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

      // ler possíveis 'buys' da BD
      const base = (ent || []).map((r) => ({
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

      // sincronia inicial buysForSeed
      setBuysForSeed((old) => {
        const next = { ...old };
        for (const row of rich) {
          if (row.seed && row.buys_val != null) next[row.seed] = row.buys_val;
        }
        return next;
      });
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
  async function tryUpsertWithCols(mapping) {
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

    const targets = ["tournament_id,seed", "tournament_id,user_id"];
    let lastErr = null;
    for (const onConflict of targets) {
      try {
        const { error } = await supabase.from("tournament_entries").upsert(payload, { onConflict });
        if (error) throw error;
        return;
      } catch (e) {
        lastErr = e;
        const msg = String(e?.message || e?.details || "");
        if (!/no unique|there is no unique/i.test(msg)) throw e;
      }
    }
    throw lastErr || new Error("Falha no upsert.");
  }

  const saveEntry = async () => {
    const playerChoices = pickChoices(cols.playerCol, PLAYER_CANDIDATES, hasCol);
    const slotNameChoices = pickChoices(cols.slotNameCol, SLOTNAME_CANDIDATES, hasCol);
    const slotIdChoices = pickChoices(cols.slotIdCol, SLOTID_CANDIDATES, hasCol);
    const buyChoices = pickChoices(cols.buyCol, BUY_CANDIDATES, hasCol).concat([null]);
    const buysChoices = pickChoices(cols.buysCol, BUYS_CANDIDATES, hasCol).concat([null]);

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
        await tryUpsertWithCols({
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
            (c) => c.p !== missing && c.sn !== missing && c.si !== missing && c.b !== missing && c.bu !== missing
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
    showToast("Entrada guardada!");
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
    const next = lettersFromIndex(nextIdx);
    setGhostSeeds((g) => uniq([...g, next]));
    setSeed(next);
    setBuys(next, 1);
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

    // propagação visual (apenas quando há vencedor)
    for (let ridx = 0; ridx < r.length - 1; ridx++) {
      const cur = r[ridx];
      const nxt = r[ridx + 1];
      for (let midx = 0; midx < cur.length; midx++) {
        const m = cur[midx];
        const keyL = `R${ridx}M${midx}-L`;
        const keyR = `R${ridx}M${midx}-R`;
        const payL = payments[keyL];
        const payR = payments[keyR];
        const w = winnerSide(payL, payR);
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
  }, [seedList, bySeed, payments]);

  const totalRounds = rounds.length || 1;
  const tabs = labelsForTotalRounds(totalRounds);
  const [activeTab, setActiveTab] = React.useState(0);
  React.useEffect(() => setActiveTab(0), [tabs.length]);

  /* ───────────────────────── render ───────────────────────── */
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Toast show={toast.show} kind={toast.kind} text={toast.text} />

      {/* topo */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => (window.location.hash = "#/tournaments")}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Trophy className="h-5 w-5" /> {tor?.title || "Tournament"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold rounded-full px-2 py-0.5 border ${
              (tor?.status || "scheduled") === "running"
                ? "border-emerald-400/50 text-emerald-300"
                : (tor?.status || "scheduled") === "finished"
                ? "border-blue-400/50 text-blue-300"
                : (tor?.status || "scheduled") === "canceled"
                ? "border-rose-400/50 text-rose-300"
                : "border-white/20 text-white/70"
            }`}
          >
            {tor?.status || "scheduled"}
          </span>
          <span className="text-sm font-semibold">
            {tor?.prize_pool != null ? fmtMoney(tor.prize_pool) : ""}
          </span>
        </div>
      </div>

      {/* Form + Preview */}
      <Card className={isDark ? "border-white/10 bg-white/5" : ""}>
        <CardHeader>
          <CardTitle>Adicionar / editar entrada</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-12 gap-6">
            {/* ESQUERDA: form */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid lg:grid-cols-12 gap-4 items-end">
                <div className="lg:col-span-12">
                  <div className="text-xs opacity-70 mb-1">Seed</div>
                  <SeedChipsAdd list={seedList} value={seed} onSelect={setSeed} onAdd={addSeed} />
                </div>

                <div className="lg:col-span-6">
                  <div className="text-xs opacity-70 mb-1">Nome do player</div>
                  <Input
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="ex.: Alex"
                    className="h-11 rounded-xl bg-zinc-900/60 border-white/10 text-white pl-4 focus-visible:ring-1 focus-visible:ring-sky-400 placeholder:text-white/40"
                  />
                </div>

                <div className="lg:col-span-6">
                  <div className="text-xs opacity-70 mb-1">
                    Bonus buy (€){!cols.buyCol ? " • (coluna de buy não detetada)" : ""}
                  </div>
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
                  <div className="text-xs opacity-70 mb-1">Slot / Jogo</div>
                  <SlotsAutocomplete value={slot} onSelect={(s) => setSlot(s)} />
                  {slot?.name && (
                    <div className="mt-1 text-[11px] opacity-70">
                      Selecionado: <span className="font-medium">{slot.name}</span>
                      {slot.provider ? <span> • {slot.provider}</span> : null}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-12">
                  <Button className="h-11 rounded-xl" onClick={saveEntry}>
                    Guardar entrada
                  </Button>
                </div>
              </div>
            </div>

            {/* DIREITA: preview slot */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                {!slot?.name ? (
                  <div className="text-sm opacity-70">
                    Escolhe uma slot para ver a preview e as estatísticas.
                  </div>
                ) : (
                  <div className="flex gap-4">
                    {slot.thumbnail ? (
                      <img src={slot.thumbnail} alt="" className="h-16 w-16 rounded object-cover" />
                    ) : (
                      <div className="h-16 w-16 rounded bg-white/10" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-base font-semibold truncate">{slot.name}</div>
                      <div className="text-xs opacity-70 truncate">{slot.provider || "—"}</div>
                      {statsLoading ? (
                        <div className="mt-2 text-xs opacity-70">A carregar estatísticas…</div>
                      ) : slotStats ? (
                        <div className="mt-2 flex flex-wrap gap-2">
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
                        <div className="mt-2 text-xs opacity-70">Sem histórico.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seeds */}
      <div className="h-5" />
      <Card className={isDark ? "border-white/10 bg-white/5" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GaugeCircle className="h-4 w-4" /> Seeds
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {seedList.map((s) => (
              <SeedCard
                key={`seedcard-${s}`}
                seed={s}
                entry={bySeed[s]}
                buys={buysForSeed[s] || 1}
                onChangeBuys={(n) => setBuys(s, n)}
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
                  }
                }}
                onDelete={() => deleteEntry(s)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bracket por fase (abas) */}
      <div className="h-5" />
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
            <div className="space-y-4">
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
  );
}
