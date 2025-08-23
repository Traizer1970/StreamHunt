// /src/tournaments.jsx
import React from "react";
import { useTheme } from "@/contexts/auth-context";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Trash2,
  Trophy,
  Eye,
  Crown,
} from "lucide-react";

/* ───────────────────────── i18n ───────────────────────── */
const DICT = {
  en: {
    title: "Tournaments",
    add: "Add",
    edit: "Edit",
    delete: "Delete",
    confirm: "Confirm",
    cancel: "Cancel",
    save: "Save",
    searchPh: "Search by title...",
    empty: "No tournaments yet.",
    name: "Title",
    actions: "Actions",
    open: "Open",
    insights: "Insights",
    topSlots: "Top Slots (all-time)",
    topPlayer: "Top Player (wins)",
    lastWinner: "Last tournament winner",
    player: "Player",
    slot: "Slot",
    wins: "wins",
    totalPrize: "Total prize won",
    lastPrize: "Last prize won",
    prizes: "Prizes",
    no: "No.",
  },
  pt: {},
};
const t = (k) => DICT.en[k] || k;

/* ───────────────────────── utils ───────────────────────── */
const cn = (...c) => c.filter(Boolean).join(" ");
const LOCALE = "pt-PT";
const CURRENCY = "EUR";
const numCls = "tabular-nums whitespace-nowrap";
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
const ceilPow2 = (n) => {
  let p = 1;
  while (p < Math.max(1, n)) p <<= 1;
  return p;
};
const lettersFromIndex = (idx) => {
  let n = idx + 1,
    s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
};
const indexFromLetters = (s) => {
  let n = 0;
  for (const ch of String(s).toUpperCase())
    n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};
function useDebounced(v, delay = 300) {
  const [s, setS] = React.useState(v);
  React.useEffect(() => {
    const id = setTimeout(() => setS(v), delay);
    return () => clearTimeout(id);
  }, [v, delay]);
  return s;
}
const SortIcon = ({ dir }) =>
  dir === "asc" ? (
    <ChevronUp className="ml-1 h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="ml-1 h-3.5 w-3.5" />
  );

/* avatar placeholder */
function Avatar({ name }) {
  const initials = String(name || "?")
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 text-white grid place-items-center text-[11px] font-extrabold shadow ring-2 ring-black/20">
      {initials || "?"}
    </div>
  );
}

/* ───────────────────────── Accent cards/boxes (azul) ───────────────────────── */
function AccentCard({ title, children, className }) {
  const { isDark } = useTheme();
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden",
        isDark ? "bg-white/5 border border-white/10" : "bg-white border border-zinc-200",
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-sky-500/70 shadow-[0_0_12px_2px_rgba(56,189,248,0.35)]" />
      {title && <div className="px-4 pt-4 pb-1 text-xs opacity-80">{title}</div>}
      <div className="px-4 pb-4">{children}</div>
    </div>
  );
}
function AccentBox({ children, className }) {
  const { isDark } = useTheme();
  return (
    <div
      className={cn(
        "relative rounded-xl",
        isDark ? "bg-white/5 border border-white/10" : "bg-white border border-zinc-200",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[inherit] overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-sky-500/70 shadow-[0_0_12px_2px_rgba(56,189,248,0.35)]" />
      </div>
      {children}
    </div>
  );
}

/* ───────────────────────── Recharts ───────────────────────── */
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
const BAR_COLORS = ["#6366F1", "#22C55E", "#F59E0B"];

function NiceTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/95 text-white px-3 py-2 shadow-2xl">
      <div className="text-xs opacity-70">{t("slot")}</div>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-1 text-xs">
        <span className="opacity-70">{t("wins")}:</span>{" "}
        <span className="font-semibold">{p.value}</span>
      </div>
    </div>
  );
}

/* ───────────────────────── Confirm ───────────────────────── */
function Confirm({
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

/* ───────────────────────── Create/Edit Modal ───────────────────────── */
function UpsertTournamentModal({ open, initial, onClose, onSaved }) {
  const [busy, setBusy] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState("scheduled");

  // prizes by position
  const [p1, setP1] = React.useState("");
  theP2: 0;
  const [p2, setP2] = React.useState("");
  const [p3, setP3] = React.useState("");
  const total = (toNum(p1) || 0) + (toNum(p2) || 0) + (toNum(p3) || 0);

  React.useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? initial?.name ?? "");
    setDescription(initial?.description ?? "");
    setStatus(initial?.status ?? "scheduled");
    // load prizes for edit
    (async () => {
      if (initial?.id) {
        const { data } = await supabase
          .from("tournament_prizes")
          .select("position,amount")
          .eq("tournament_id", initial.id);
        const map = new Map(
          (data || []).map((r) => [Number(r.position), Number(r.amount) || 0])
        );
        setP1(map.get(1) ?? "");
        setP2(map.get(2) ?? "");
        setP3(map.get(3) ?? "");
      } else {
        setP1("");
        setP2("");
        setP3("");
      }
    })();
  }, [open, initial?.id, initial?.title, initial?.name, initial?.description, initial?.status]);

  if (!open) return null;

  async function save() {
    try {
      setBusy(true);
      // 1) create / update tournament
      const payload = {
        title: title || null,
        description: description || null,
        status: status || null,
        prize_pool: total || null, // auto
      };

      let id = initial?.id ?? null;
      if (id) {
        const { error } = await supabase
          .from("tournaments")
          .update(payload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("tournaments")
          .insert([payload])
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }

      // 2) upsert prizes 1..3
      const rows = [
        { tournament_id: id, position: 1, amount: toNum(p1) || 0 },
        { tournament_id: id, position: 2, amount: toNum(p2) || 0 },
        { tournament_id: id, position: 3, amount: toNum(p3) || 0 },
      ];
      const { error: e2 } = await supabase
        .from("tournament_prizes")
        .upsert(rows, { onConflict: "tournament_id,position" });
      if (e2) throw e2;

      onSaved && onSaved();
      onClose && onClose();
    } catch (e) {
      alert(e.message || "Failed to save.");
    } finally {
      setBusy(false);
    }
  }

  const titleText = initial?.id ? "Edit tournament" : "New tournament";

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-[720px] -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-2xl border border-white/10 bg-zinc-950 text-white shadow-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-lg font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5" /> {titleText}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <div className="text-[11px] font-semibold tracking-wide opacity-60 mb-2">
                DETAILS
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <div className="text-xs opacity-70 mb-1">Title</div>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Summer Cup"
                    className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white"
                  />
                </div>

                <div>
                  <div className="text-xs opacity-70 mb-1">Status</div>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="h-11 w-full rounded-xl bg-zinc-900 border border-white/10 px-3 text-sm"
                  >
                    <option value="scheduled">scheduled</option>
                    <option value="running">running</option>
                    <option value="finished">finished</option>
                    <option value="canceled">canceled</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <div className="text-[11px] font-semibold tracking-wide opacity-60 mb-2">
                    PRIZES BY POSITION
                  </div>
                  <div className="grid md:grid-cols-3 gap-3">
                    <div>
                      <div className="text-xs opacity-70 mb-1">1st place</div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                          €
                        </span>
                        <Input
                          inputMode="decimal"
                          type="number"
                          step="0.01"
                          value={p1}
                          onChange={(e) => setP1(e.target.value)}
                          placeholder="e.g., 80"
                          className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white pl-7"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs opacity-70 mb-1">2nd place</div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                          €
                        </span>
                        <Input
                          inputMode="decimal"
                          type="number"
                          step="0.01"
                          value={p2}
                          onChange={(e) => setP2(e.target.value)}
                          placeholder="e.g., 30"
                          className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white pl-7"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-xs opacity-70 mb-1">3rd place</div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                          €
                        </span>
                        <Input
                          inputMode="decimal"
                          type="number"
                          step="0.01"
                          value={p3}
                          onChange={(e) => setP3(e.target.value)}
                          placeholder="e.g., 13"
                          className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white pl-7"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="text-xs opacity-70 mb-1">Prize pool (auto)</div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">
                        €
                      </span>
                      <Input
                        readOnly
                        value={String(total).replace(".", ",")}
                        className="h-11 rounded-xl bg-zinc-900 border-white/10 text-white pl-7"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <div className="text-xs opacity-70 mb-1">Description</div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl bg-zinc-900 border border-white/10 px-3 py-2 text-sm"
                    placeholder="Notes / rules…"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t("save")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Bracket winner helpers ───────────────────────── */
function computeTournamentWinner(entries, paymentsRows) {
  if (!Array.isArray(entries) || entries.length < 2) return null;

  const bySeed = {};
  entries.forEach((e) => {
    if (e?.seed) bySeed[e.seed] = e;
  });

  const seedList = [...Object.keys(bySeed)].sort(
    (a, b) => indexFromLetters(a) - indexFromLetters(b)
  );

  const p = Math.max(2, ceilPow2(seedList.length));
  const filled = [...seedList];
  while (filled.length < p) filled.push(null);

  const payMap = {};
  for (const r of paymentsRows || []) {
    const k = `R${r.round_idx}M${r.match_idx}-${(r.side || "")
      .toUpperCase()}-B${r.buy_idx}`;
    payMap[k] = Number(r.amount) || 0;
  }
  const sumSide = (r, m, side, buys = 3) => {
    let s = 0;
    for (let i = 1; i <= Math.max(1, buys); i++)
      s += Number(payMap[`R${r}M${m}-${side}-B${i}`] || 0);
    return s;
  };

  const rounds = [];
  const r0 = [];
  for (let i = 0; i < p; i += 2) {
    const Ls = filled[i];
    const Rs = filled[i + 1];
    r0.push({
      leftSeed: Ls,
      rightSeed: Rs,
      left: Ls ? bySeed[Ls] : null,
      right: Rs ? bySeed[Rs] : null,
    });
  }
  rounds.push(r0);

  const totalRounds = Math.log2(p);
  for (let r = 0; r < totalRounds - 1; r++) {
    const cur = rounds[r];
    const next = Array.from({ length: Math.ceil(cur.length / 2) }, () => ({
      left: null,
      right: null,
      leftSeed: null,
      rightSeed: null,
    }));
    for (let m = 0; m < cur.length; m++) {
      const match = cur[m];
      const sumL = sumSide(r, m, "L");
      const sumR = sumSide(r, m, "R");
      const w = sumL > sumR ? "L" : sumR > sumL ? "R" : null;
      const target = next[Math.floor(m / 2)];
      if (w === "L" && match.left) {
        if (m % 2 === 0) {
          target.left = match.left;
          target.leftSeed = match.leftSeed;
        } else {
          target.right = match.left;
          target.rightSeed = match.leftSeed;
        }
      } else if (w === "R" && match.right) {
        if (m % 2 === 0) {
          target.left = match.right;
          target.rightSeed = match.rightSeed;
        } else {
          target.right = match.right;
          target.rightSeed = match.rightSeed;
        }
      }
    }
    rounds.push(next);
  }

  const finalRound = rounds[rounds.length - 1];
  const finalMatch = finalRound?.[0];
  if (!finalMatch) return null;

  const lastR = rounds.length - 1;
  const finalSumL = sumSide(lastR, 0, "L");
  const finalSumR = sumSide(lastR, 0, "R");
  return finalSumL > finalSumR ? finalMatch.left : finalMatch.right;
}

/* ───────────────────────── Página ───────────────────────── */
export default function TournamentsPage() {
  const { isDark } = useTheme();

  const [busy, setBusy] = React.useState(true);
  const [rows, setRows] = React.useState([]);
  const [err, setErr] = React.useState("");

  const [search, setSearch] = React.useState("");
  const dSearch = useDebounced(search, 300);

  const [sort, setSort] = React.useState({ key: "no", dir: "asc" }); // asc/desc
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editRow, setEditRow] = React.useState(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [rowToDelete, setRowToDelete] = React.useState(null);

  // prizes map: tournament_id -> {1,2,3}
  const [prizesMap, setPrizesMap] = React.useState(new Map());

  // insights
  const [chartData, setChartData] = React.useState([]); // [{name, wins}]
  const [topPlayer, setTopPlayer] = React.useState({
    name: "",
    wins: 0,
    totalPrize: 0,
    lastPrize: 0,
  });
  const [lastWinner, setLastWinner] = React.useState({ player: "", slot: "" });

  const load = React.useCallback(async () => {
    try {
      setBusy(true);
      setErr("");
      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .limit(500);
      if (error) throw error;

      const ordered = [...(data || [])].sort((a, b) => {
        const da = new Date(a?.created_at || a?.starts_at || 0).getTime();
        const db = new Date(b?.created_at || b?.starts_at || 0).getTime();
        return db - da;
      });
      setRows(ordered);

      // fetch prizes for table + insights
      const ids = ordered.map((t) => t.id);
      if (ids.length) {
        const { data: pr } = await supabase
          .from("tournament_prizes")
          .select("tournament_id, position, amount")
          .in("tournament_id", ids);
        const m = new Map();
        for (const r of pr || []) {
          const cur = m.get(r.tournament_id) || { 1: null, 2: null, 3: null };
          cur[Number(r.position)] = Number(r.amount) || 0;
          m.set(r.tournament_id, cur);
        }
        setPrizesMap(m);
      } else {
        setPrizesMap(new Map());
      }

      await computeInsights(ordered);
    } catch (e) {
      setRows([]);
      setErr(e.message || "Failed to load tournaments.");
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // Mapa No. por torneio (1..N por ordem de criação)
  const userNoById = React.useMemo(() => {
    const arr = [...rows].sort(
      (a, b) =>
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime()
    );
    const m = new Map();
    arr.forEach((r, i) => m.set(r.id, i + 1));
    return m;
  }, [rows]);

  async function computeInsights(tournaments) {
    try {
      if (!tournaments?.length) {
        setChartData([]);
        setTopPlayer({ name: "", wins: 0, totalPrize: 0, lastPrize: 0 });
        setLastWinner({ player: "", slot: "" });
        return;
      }
      const ids = tournaments.map((t) => t.id);
      const { data: entries } = await supabase
        .from("tournament_entries")
        .select("*")
        .in("tournament_id", ids)
        .limit(5000);
      const { data: pays } = await supabase
        .from("tournament_payments")
        .select("*")
        .in("tournament_id", ids)
        .limit(10000);
      const { data: prizeRows } = await supabase
        .from("tournament_prizes")
        .select("tournament_id, position, amount")
        .in("tournament_id", ids);

      const byTournamentEntries = new Map();
      for (const r of entries || []) {
        const arr = byTournamentEntries.get(r.tournament_id) || [];
        arr.push({
          seed: r.seed,
          player_name: r.player ?? r.player_name ?? "",
          slot_name: r.slot_name ?? "",
        });
        byTournamentEntries.set(r.tournament_id, arr);
      }
      const byTournamentPays = new Map();
      for (const p of pays || []) {
        const arr = byTournamentPays.get(p.tournament_id) || [];
        arr.push(p);
        byTournamentPays.set(p.tournament_id, arr);
      }

      const winners = [];
      for (const t of tournaments) {
        const w = computeTournamentWinner(
          byTournamentEntries.get(t.id) || [],
          byTournamentPays.get(t.id) || []
        );
        if (w)
          winners.push({
            tournament_id: t.id,
            player: w.player_name || "",
            slot: w.slot_name || "",
          });
      }

      const slotCount = new Map();
      for (const w of winners)
        slotCount.set(w.slot, (slotCount.get(w.slot) || 0) + 1);
      const topSlots = [...slotCount.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, wins]) => ({ name: name || "—", wins }));
      setChartData(topSlots);

      const playerCount = new Map();
      for (const w of winners)
        playerCount.set(w.player, (playerCount.get(w.player) || 0) + 1);
      const topP = [...playerCount.entries()].sort((a, b) => b[1] - a[1])[0];
      const topPlayerName = topP?.[0] || "";
      const topPlayerWins = topP?.[1] || 0;

      const prizeByTournament = new Map();
      for (const r of prizeRows || [])
        if (Number(r.position) === 1)
          prizeByTournament.set(r.tournament_id, Number(r.amount) || 0);
      for (const t of tournaments)
        if (!prizeByTournament.has(t.id)) {
          const v = Number(t.prize_pool);
          if (Number.isFinite(v)) prizeByTournament.set(t.id, v);
        }

      let totalPrize = 0;
      for (const w of winners)
        if (w.player === topPlayerName)
          totalPrize += prizeByTournament.get(w.tournament_id) || 0;

      let last = null;
      for (const t of tournaments) {
        const w = winners.find((x) => x.tournament_id === t.id);
        if (w) {
          last = { ...w, prize: prizeByTournament.get(t.id) || 0 };
          break;
        }
      }

      setTopPlayer({
        name: topPlayerName,
        wins: topPlayerWins,
        totalPrize,
        lastPrize:
          last?.player === topPlayerName ? last?.prize || 0 : 0,
      });
      setLastWinner({ player: last?.player || "", slot: last?.slot || "" });
    } catch {
      setChartData([]);
      setTopPlayer({ name: "", wins: 0, totalPrize: 0, lastPrize: 0 });
      setLastWinner({ player: "", slot: "" });
    }
  }

  const filtered = React.useMemo(() => {
    const needle = dSearch.trim().toLowerCase();
    let arr = [...rows];
    if (needle) {
      arr = arr.filter((r) =>
        String(r.title || r.name || "").toLowerCase().includes(needle)
      );
    }
    const get = (r, k) => {
      if (k === "no") return userNoById.get(r.id) || 0;
      if (k === "title") return String(r.title || r.name || "");
      return 0;
    };
    arr.sort((a, b) => {
      const A = get(a, sort.key);
      const B = get(b, sort.key);
      const bothNum = typeof A === "number" && typeof B === "number";
      if (bothNum) return sort.dir === "asc" ? A - B : B - A;
      return sort.dir === "asc"
        ? String(A).localeCompare(String(B))
        : String(B).localeCompare(String(A));
    });
    return arr;
  }, [rows, dSearch, sort, userNoById]);

  function toggleSort(key) {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  function askDelete(row) {
    setRowToDelete(row);
    setConfirmOpen(true);
  }
  async function confirmDelete() {
    if (!rowToDelete) return;
    try {
      const { error } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", rowToDelete.id);
      if (error) throw error;
      setConfirmOpen(false);
      setRowToDelete(null);
      await load();
    } catch (e) {
      alert(e.message || "Failed to delete.");
    }
  }

  const PrizeBadge = ({ kind, value }) => {
    const label = kind === 1 ? "🥇" : kind === 2 ? "🥈" : "🥉";
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs">
        <span>{label}</span>
        <span className="font-semibold">
          {value != null ? fmtMoney(value) : "—"}
        </span>
      </span>
    );
  };

  return (
    <section className="py-8 md:py-10">
      <div className="max-w-7xl mx-auto px-4">
        {/* Topbar */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            <h1 className="text-xl font-semibold">{t("title")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("searchPh")}
                className="pl-8 h-10 rounded-xl bg-zinc-900 border-white/10 text-white placeholder:text-white/40"
              />
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-white/60" />
            </div>
            <Button
              onClick={() => {
                setEditRow(null);
                setModalOpen(true);
              }}
              className="h-10"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("add")}
            </Button>
          </div>
        </div>

        {/* Insights (accent azul) */}
        <AccentCard title={t("insights")} className="mb-6">
          <div className="grid lg:grid-cols-[1fr_360px] gap-4">
            {/* chart */}
            <div className="rounded-xl border border-white/10 p-3">
              <div className="text-sm opacity-70 mb-2">{t("topSlots")}</div>
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fill: "currentColor" }} />
                    <YAxis tick={{ fill: "currentColor" }} allowDecimals={false} />
                    <Tooltip content={<NiceTooltip />} />
                    <Bar dataKey="wins" radius={[6, 6, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={BAR_COLORS[i % BAR_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* right cards */}
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 p-4">
                <div className="text-sm opacity-70 mb-2">{t("topPlayer")}</div>
                {topPlayer.name ? (
                  <div className="flex items-center gap-3">
                    <Avatar name={topPlayer.name} />
                    <div className="min-w-0">
                      <div className="text-xl font-semibold truncate">
                        {topPlayer.name}
                      </div>
                      <div className="text-sm opacity-80">
                        {topPlayer.wins} {t("wins")}
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                          <div className="opacity-70">{t("totalPrize")}</div>
                          <div className="font-semibold">
                            {fmtMoney(topPlayer.totalPrize)}
                          </div>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1">
                          <div className="opacity-70">{t("lastPrize")}</div>
                          <div className="font-semibold">
                            {fmtMoney(topPlayer.lastPrize)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm opacity-60">—</div>
                )}
              </div>

              <div className="rounded-xl border border-white/10 p-4">
                <div className="text-sm opacity-70 mb-2">{t("lastWinner")}</div>
                <div className="text-sm">
                  <span className="opacity-70">{t("player")}: </span>
                  <span className="font-medium">{lastWinner.player || "—"}</span>
                </div>
                <div className="text-sm">
                  <span className="opacity-70">{t("slot")}: </span>
                  <span className="font-medium">{lastWinner.slot || "—"}</span>
                </div>
              </div>
            </div>
          </div>
        </AccentCard>

        {/* Table (accent azul + No. à esquerda) */}
        <AccentBox>
          <div
            className={cn(
              "grid grid-cols-12 px-3 py-2 text-[12px] font-semibold",
              isDark ? "bg-white/[0.06]" : "bg-zinc-50"
            )}
          >
            <button
              onClick={() => toggleSort("no")}
              className="col-span-1 text-left flex items-center"
            >
              {t("no")} {sort.key === "no" && <SortIcon dir={sort.dir} />}
            </button>
            <button
              onClick={() => toggleSort("title")}
              className="col-span-7 text-left flex items-center"
            >
              {t("name")} {sort.key === "title" && <SortIcon dir={sort.dir} />}
            </button>
            <div className="col-span-2 text-center">{t("prizes")}</div>
            <div className="col-span-2 text-right">{t("actions")}</div>
          </div>

          {busy && (
            <div className="px-4 py-6 text-sm opacity-70 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          )}

          {err && !busy && (
            <div className="px-4 py-3 text-sm text-red-400">{err}</div>
          )}
          {!busy && filtered.length === 0 && !err && (
            <div className="px-4 py-6 text-sm opacity-70">{t("empty")}</div>
          )}

          {!busy && filtered.length > 0 && (
            <div className="divide-y divide-white/10">
              {filtered.map((r) => {
                const title = r.title || r.name || "—";
                const prizes = prizesMap.get(r.id) || { 1: null, 2: null, 3: null };
                const no = userNoById.get(r.id) ?? "—";

                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-12 items-center px-3 py-3 hover:bg-white/[0.06] transition-colors"
                  >
                    {/* No. */}
                    <div className="col-span-1">{no}</div>

                    {/* Title + description */}
                    <div className="col-span-7 min-w-0">
                      <div className="font-medium truncate">{title}</div>
                      <div className="text-xs opacity-70 truncate">
                        {r.description || ""}
                      </div>
                    </div>

                    {/* Prizes */}
                    <div
                      className={cn(
                        "col-span-2 flex items-center justify-center gap-2",
                        numCls
                      )}
                    >
                      <PrizeBadge kind={1} value={prizes[1]} />
                      <PrizeBadge kind={2} value={prizes[2]} />
                      <PrizeBadge kind={3} value={prizes[3]} />
                    </div>

                    {/* Actions */}
                    <div className="col-span-2">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          title={t("open")}
                          onClick={() => {
                            window.location.hash = `#/tournaments/${r.id}`;
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          title={t("edit")}
                          onClick={() => {
                            setEditRow(r);
                            setModalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="h-8 w-8 text-white"
                          title={t("delete")}
                          onClick={() => askDelete(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </AccentBox>

        {/* Modals */}
        <UpsertTournamentModal
          open={modalOpen}
          initial={editRow}
          onClose={() => setModalOpen(false)}
          onSaved={load}
        />
        <Confirm
          open={confirmOpen}
          title={t("delete")}
          body="Are you sure you want to delete this tournament? This cannot be undone."
          confirmText={t("confirm")}
          cancelText={t("cancel")}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmOpen(false)}
        />
      </div>
    </section>
  );
}
