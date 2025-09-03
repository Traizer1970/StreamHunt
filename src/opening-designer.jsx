// src/pages/opening-designer.jsx
import React from "react";

/* ---------------- helpers ---------------- */
const LOCALE = "pt-PT";
const toInt = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : d;
};
const getHashQS = () => {
  const raw = (window.location.hash || "#").slice(1);
  const [, q] = raw.split("?");
  return new URLSearchParams(q || "");
};
const setHashQS = (mut) => {
  const raw = (window.location.hash || "#").slice(1);
  const [path] = raw.split("?");
  const qs = getHashQS();
  Object.entries(mut).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") qs.delete(k);
    else qs.set(k, String(v));
  });
  const next = `#${path}?${qs.toString()}`;
  if (next !== window.location.hash) {
    window.location.hash = next;
  } else {
    // força atualização local
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  }
};

/* map: estado interno <-> querystring do widget */
function readStateFromQS(qs) {
  return {
    visible: toInt(qs.get("visible") ?? 3, 3),
    listSide: (qs.get("infoside") || "left") === "right" ? "right" : "left",
    showBox: (qs.get("box") ?? "1") !== "0",
    showBW: (qs.get("showBW") ?? "1") !== "0",

    // NOVO: rolagem e velocidade
    autoScroll: (qs.get("scroll") ?? "0") === "1",
    speedSec: Math.min(180, Math.max(5, toInt(qs.get("speed") ?? 30, 30))),
  };
}

/* ---------------- UI atoms ---------------- */
function Toggle({ checked, onChange, label }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 14 }}>{label}</span>
      <span
        onClick={() => onChange(!checked)}
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          background: checked ? "#0ea5e9" : "rgba(255,255,255,.15)",
          position: "relative",
          cursor: "pointer",
          display: "inline-block",
        }}
        role="switch"
        aria-checked={checked}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 24 : 3,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: "#fff",
            transition: "left .15s ease",
          }}
        />
      </span>
    </label>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div
      style={{
        display: "inline-flex",
        background: "rgba(255,255,255,.08)",
        padding: 3,
        borderRadius: 10,
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              minWidth: 40,
              padding: "6px 10px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              background: active ? "#0ea5e9" : "transparent",
              color: active ? "#0b1020" : "#e5e7eb",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function OpeningDesigner() {
  const [state, setState] = React.useState(() => readStateFromQS(getHashQS()));

  React.useEffect(() => {
    const onHash = () => setState(readStateFromQS(getHashQS()));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const update = (patch) => {
    setState((s) => ({ ...s, ...patch }));
    const mut = {};
    if ("visible" in patch) mut.visible = patch.visible;
    if ("listSide" in patch) mut.infoside = patch.listSide === "right" ? "right" : "left";
    if ("showBox" in patch) mut.box = patch.showBox ? "1" : "0";
    if ("showBW" in patch) mut.showBW = patch.showBW ? "1" : "0";
    if ("autoScroll" in patch) mut.scroll = patch.autoScroll ? "1" : "0";
    if ("speedSec" in patch) mut.speed = patch.speedSec;
    setHashQS(mut);
  };

  return (
    <div style={{ padding: 12, color: "#e5e7eb", fontFamily: "'Rubik', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial" }}>
      {/* ÚNICO GRUPO: Layout (Opening) */}
      <div
        style={{
          background: "rgba(255,255,255,.06)",
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 12,
          padding: 16,
          maxWidth: 460,
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 12 }}>
          Layout (Opening)
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          {/* Cards visíveis */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 130, opacity: 0.85 }}>Cards visíveis</div>
            <Segmented
              value={state.visible}
              onChange={(v) => update({ visible: v })}
              options={[
                { value: 3, label: "3" },
                { value: 5, label: "5" },
                { value: 7, label: "7" },
                { value: 9, label: "9" },
              ]}
            />
          </div>

          {/* Lista lateral */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 130, opacity: 0.85 }}>Lista lateral</div>
            <Segmented
              value={state.listSide}
              onChange={(v) => update({ listSide: v })}
              options={[
                { value: "left", label: "Esquerda" },
                { value: "right", label: "Direita" },
              ]}
            />
          </div>

          {/* Caixa de fundo */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 130, opacity: 0.85 }}>Caixa de fundo</div>
            <Toggle
              checked={state.showBox}
              onChange={(v) => update({ showBox: v })}
              label=""
            />
          </div>

          {/* Best/Worst */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 130, opacity: 0.85 }}>Mostrar Best/Worst</div>
            <Toggle
              checked={state.showBW}
              onChange={(v) => update({ showBW: v })}
              label=""
            />
          </div>

          {/* NOVO: Rolagem automática nomes (lista esquerda) */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 130, opacity: 0.85 }}>Rolar nomes</div>
            <Toggle
              checked={state.autoScroll}
              onChange={(v) => update({ autoScroll: v })}
              label=""
            />
          </div>

          {/* NOVO: Velocidade da rolagem */}
          {state.autoScroll && (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ opacity: 0.85 }}>Velocidade</span>
                <b>{new Intl.NumberFormat(LOCALE).format(state.speedSec)}s</b>
              </div>
              <input
                type="range"
                min={5}
                max={180}
                step={1}
                value={state.speedSec}
                onChange={(e) => update({ speedSec: toInt(e.target.value, 30) })}
                style={{ width: "100%" }}
              />
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                Duração de um ciclo completo (mais alto = mais devagar).
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
