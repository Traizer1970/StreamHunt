// src/components/ui/TopNavLogged.jsx
import React from "react";
import { Lock, ChevronDown } from "lucide-react";
import { useTheme, useAuth } from "@/contexts/auth-context";

const cn = (...cls) => cls.filter(Boolean).join(" ");

export default function TopNavLogged({ current, onSelect }) {
  const { isDark } = useTheme();
  const { profile } = useAuth();

  const plan = String(profile?.plan || "Free").toLowerCase();
  const isPro = plan === "pro" || plan === "premium" || plan === "plus";
  const isCustom = plan === "custom" || plan === "valek" || plan === "cig_pais" || plan === "mossdiboss";
  const hasProAccess = isPro || isCustom;

  // Itens que exigem plano Pro/Custom
  const premiumOnly = new Set(["now", "tournaments", "battles", "stats", "spinners","requests"]);

  // === DROPDOWN: Widgets ===
const widgetsGroup = {
  id: "widgetsGroup",
  label: "Widgets",
  children: [
    { id: "widgets",   label: "Streaming Widgets" },
    { id: "wSettings", label: "Widget Settings" },
    { id: "wThemes",   label: "Widget Themes" },
    { id: "now",       label: "Now Playing" },   // Premium/Custom (já está na lista premiumOnly)
    { id: "stats",     label: "Statistics" },    // Premium/Custom (já está na lista premiumOnly)
  ],
};

  // === DROPDOWN: Hunts (o que pediste) ===
  const huntsGroup = {
    id: "huntsGroup",
    label: "Hunts",
    children: [
      { id: "hunts",      label: "Bonus Hunts" },        // livre
      { id: "requests",   label: "Slot requests" },      // livre
      { id: "tournaments",label: "Tournaments" },        // premium
      { id: "battles",    label: "Bonus Buy Battles" },  // premium
    ],
  };

  const items = [
    { id: "dashboard", label: "Dashboard" },
    huntsGroup,                                 // <— novo grupo
    widgetsGroup,                                // grupo widgets
    { id: "about",     label: "About & Upgrades" },
  ];

  const [openGroup, setOpenGroup] = React.useState(null);
  const closeAll = () => setOpenGroup(null);

  // Fechar dropdown ao clicar fora / ESC
  const ref = React.useRef(null);
  React.useEffect(() => {
    const onDown = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) closeAll();
    };
    const onEsc = (e) => e.key === "Escape" && closeAll();
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onEsc);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onEsc);
    };
  }, []);

  const handleClick = (id, locked) => {
    if (locked) {
      window.location.hash = "premium"; // empurra para a página de upgrade
      return;
    }
    closeAll();
    onSelect?.(id);
  };

  const Btn = ({ active, locked, children, onClick, className }) => (
    <button
      onClick={onClick}
      className={cn(
        "px-3 py-2 text-sm rounded-xl transition font-medium inline-flex items-center gap-1.5",
        locked
          ? (isDark
              ? "text-white/40 bg-white/5 hover:bg-white/10"
              : "text-zinc-400 bg-zinc-100 hover:bg-zinc-200")
          : active
            ? (isDark ? "bg-blue-500 text-black shadow"
                      : "bg-blue-600 text-white shadow")
            : (isDark ? "text-white/80 hover:bg-white/5 hover:text-white"
                      : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900"),
        className
      )}
    >
      {children}
    </button>
  );

  // Render
  return (
    <nav ref={ref} className="flex items-center justify-center gap-2 relative">
      {items.map((it) => {
        // Grupos com dropdown
        if ("children" in it) {
          const anyActive = it.children.some((c) => c.id === current);
          const isOpen = openGroup === it.id;

          return (
            <div key={it.id} className="relative">
              <Btn
                active={anyActive}
                locked={false}
                onClick={() => setOpenGroup((o) => (o === it.id ? null : it.id))}
              >
                <span>{it.label}</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
              </Btn>

              {isOpen && (
                <div
                  className={cn(
                    "absolute left-0 mt-2 min-w-[220px] rounded-xl border z-50 overflow-hidden",
                    isDark ? "bg-zinc-900 border-white/10 shadow-2xl" : "bg-white border-zinc-200 shadow-xl"
                  )}
                >
                  {it.children.map((ch) => {
                    const childLocked = premiumOnly.has(ch.id) && !hasProAccess;
                    return (
                      <button
                        key={ch.id}
                        onClick={() => handleClick(ch.id, childLocked)}
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm inline-flex items-center gap-2",
                          isDark ? "hover:bg-white/5 text-white/80" : "hover:bg-zinc-100 text-zinc-700",
                          current === ch.id &&
                            (isDark ? "bg-white/10 text-white" : "bg-zinc-100 text-zinc-900"),
                          childLocked && (isDark ? "opacity-80" : "opacity-80")
                        )}
                      >
                        {childLocked && <Lock className="h-3.5 w-3.5 opacity-80" />}
                        <span>{ch.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // Botões simples fora de grupos
        const locked = premiumOnly.has(it.id) && !hasProAccess;
        const active = current === it.id;

        return (
          <Btn
            key={it.id}
            active={active}
            locked={locked}
            onClick={() => handleClick(it.id, locked)}
          >
            {locked && <Lock className="h-3.5 w-3.5 opacity-80" />}
            <span>{it.label}</span>
          </Btn>
        );
      })}
    </nav>
  );
}
