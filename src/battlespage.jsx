import React, { useMemo, useState } from "react";

// --- UI ---
const Card = ({ title, children, className }) => (
  <div className={["rounded-2xl bg-white/5 ring-1 ring-white/10", className || ""].join(" ")}>
    {title ? (
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-white/90">{title}</h3>
      </div>
    ) : null}
    <div className="p-4">{children}</div>
  </div>
);

const Badge = ({ children, tone }) => {
  const t = tone || "zinc";
  const cls =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium " +
    (t === "zinc"
      ? "bg-white/8 text-zinc-200 ring-1 ring-white/10"
      : t === "cyan"
      ? "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-500/30"
      : t === "violet"
      ? "bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/30"
      : t === "emerald"
      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30"
      : "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30");
  return <span className={cls}>{children}</span>;
};

const IconBtn = ({ label, onClick, tone }) => {
  const t = tone || "zinc";
  const cls =
    "inline-flex h-9 w-9 items-center justify-center rounded-xl ring-1 transition " +
    (t === "zinc"
      ? "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10"
      : t === "cyan"
      ? "bg-cyan-500/15 text-cyan-300 ring-cyan-500/30 hover:bg-cyan-500/20"
      : "bg-rose-500/15 text-rose-300 ring-rose-500/30 hover:bg-rose-500/20");
  return (
    <button onClick={onClick} className={cls} aria-label={label} title={label}>
      {label === "View" && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 5c-7 0-11 7-11 7s4 7 11 7 11-7 11-7-4-7-11-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
        </svg>
      )}
      {label === "Edit" && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-.92l9.06-9.06.92.92L5.92 20.08zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
        </svg>
      )}
      {label === "Delete" && (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 7h12l-1 14H7L6 7zm9-3 1 2H8l1-2h6z" />
        </svg>
      )}
    </button>
  );
};

const BarChart = ({ data }) => {
  const max = Math.max(1, ...data.map(function (d) { return d.value; }));
  return (
    <div className="grid grid-cols-[40px_1fr] gap-2">
      <div className="flex flex-col justify-between text-xs text-white/60">
        {[0,1,2,3,4].map(function (_, i) {
          return <div key={i}>{Math.round((max / 4) * (4 - i))}</div>;
        })}
      </div>
      <div className="relative h-48">
        {[0,1,2,3,4].map(function (_, i) {
          return (
            <div key={i} className="absolute inset-x-0" style={{ top: (i * 25) + "%" }}>
              <div className="h-px w-full bg-white/10" />
            </div>
          );
        })}
        <div className="flex h-full items-end justify-center gap-6">
          {data.map(function (d) {
            return (
              <div key={d.label} className="flex w-24 flex-col items-center">
                <div className="w-16 rounded-t-md bg-indigo-500/70" style={{ height: (d.value / max) * 90 + "%" }} />
                <div className="mt-2 truncate text-xs text-white/80" title={d.label}>{d.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default function BattlesPage() {
  const [query, setQuery] = useState("");
  const currency = "€";

  const topSlots = [{ label: "Le Bandit", value: 1 }];

  const topPlayer = { name: "zzleandro", wins: 1, totalPrize: 30, lastPrize: 30 };
  const lastWinner = { player: "zzleandro", slot: "Le Bandit" };

  const battles = [
    { id: 1, title: "Teste", mode: "Bonus Buy", prizes: [30, 20, 10], status: "Finished" },
    { id: 2, title: "testar", mode: "Bonus Buy", prizes: [25, 15, 0], status: "Live" },
  ];

  const filtered = useMemo(function () {
    return battles.filter(function (b) {
      return b.title.toLowerCase().includes(query.toLowerCase());
    });
  }, [query]);

  const topInitial = topPlayer.name && topPlayer.name.length ? topPlayer.name[0].toUpperCase() : "P";
  const lastInitial = lastWinner.player && lastWinner.player.length ? lastWinner.player[0].toUpperCase() : "P";

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">

        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Battles</h1>
          <div className="flex items-center gap-2">
            <div className="relative">
              <svg className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-60" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14"/></svg>
              <input value={query} onChange={function(e){ setQuery(e.target.value); }} placeholder="Search by title..." className="h-10 w-64 rounded-xl bg-white/5 pl-9 pr-3 text-sm placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none" />
            </div>
            <button className="h-10 rounded-xl bg-cyan-500 px-4 text-sm font-medium text-slate-950 hover:bg-cyan-400">+ Add</button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-12 lg:col-span-8">
            <div className="mb-3 text-sm font-semibold text-white/80">Insights</div>
            <div className="rounded-2xl bg-black/30 p-4 ring-1 ring-white/10">
              <div className="mb-3 text-sm text-white/70">Top Slots (all-time)</div>
              <BarChart data={topSlots} />
            </div>
          </Card>

          <div className="col-span-12 space-y-4 lg:col-span-4">
            <Card title="Top Player (wins)">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-cyan-500 text-slate-950">{topInitial}</div>
                <div className="grid gap-1">
                  <div className="text-lg font-semibold">{topPlayer.name}</div>
                  <div className="text-xs text-white/60">{topPlayer.wins} wins</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge tone="violet">Total prize won {currency}{topPlayer.totalPrize.toFixed(2)}</Badge>
                    <Badge tone="emerald">Last prize won {currency}{topPlayer.lastPrize.toFixed(2)}</Badge>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Last battle winner">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-cyan-500 text-slate-950">{lastInitial}</div>
                <div>
                  <div className="text-sm"><span className="text-white/60">Player:</span> {lastWinner.player}</div>
                  <div className="text-sm"><span className="text-white/60">Slot:</span> {lastWinner.slot}</div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-5">
          <div className="rounded-2xl ring-1 ring-white/10">
            <div className="flex items-center justify-between rounded-t-2xl bg-white/5 px-4 py-3 text-sm text-white/70">
              <div>No. ^</div>
              <div className="grid flex-1 grid-cols-[2fr_1fr_1fr_1fr_140px] gap-2 px-2">
                <div>Title</div>
                <div>Mode</div>
                <div>Prizes</div>
                <div>Status</div>
                <div className="text-right pr-2">Actions</div>
              </div>
            </div>
            <div className="divide-y divide-white/10 bg-white/0">
              {filtered.map(function (b, idx) {
                return (
                  <div key={b.id} className="flex items-center px-4 py-3 hover:bg-white/5">
                    <div className="w-12 text-sm text-white/80">{idx + 1}</div>
                    <div className="grid flex-1 grid-cols-[2fr_1fr_1fr_1fr_140px] items-center gap-2 px-2">
                      <div className="truncate text-white">{b.title}</div>
                      <div className="text-white/80">{b.mode}</div>
                      <div className="flex flex-wrap gap-2">
                        {b.prizes.map(function (p, i) {
                          return <Badge key={i} tone="violet">🏅 {currency}{p.toFixed(2)}</Badge>;
                        })}
                      </div>
                      <div>
                        <Badge tone={b.status === "Live" ? "emerald" : (b.status === "Finished" ? "zinc" : "cyan")}>{b.status}</Badge>
                      </div>
                      <div className="flex items-center justify-end gap-2 pr-2">
                        <IconBtn label="View" />
                        <IconBtn label="Edit" />
                        <IconBtn label="Delete" tone="rose" />
                      </div>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-white/60">No battles found…</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
