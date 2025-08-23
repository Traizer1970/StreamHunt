import React, { useMemo } from "react";

/**
 * Rota: #/overlay/battle/:id
 * Ex.: https://teu-site/#/overlay/battle/1
 * 
 * Página limpa para usar no OBS (fundo transparente).
 * Substitui o conteúdo do <div> interno pelo teu widget real.
 */
export default function WidgetOverlay() {
  const battleId = useMemo(() => {
    const hash = (typeof window !== "undefined" ? window.location.hash : "") || "";
    // remove "#/" e separa
    const clean = hash.replace(/^#\//, "");
    const parts = clean.split("?")[0].split("/");
    // espera-se: ["overlay","battle",":id"]
    let id = parts[2] || "";

    // também aceita ?id=123
    try {
      const q = new URLSearchParams(hash.split("?")[1] || "");
      id = q.get("id") || id;
    } catch (_) {}

    return id;
  }, []);

  return (
    <div
      style={{
        background: "transparent",
        color: "#fff",
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily:
          'system-ui, -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      {/* TODO: Renderiza aqui o teu widget real usando o battleId */}
      <div
        style={{
          padding: "12px 16px",
          borderRadius: 12,
          background: "rgba(0,0,0,.5)",
          border: "1px solid rgba(255,255,255,.15)",
          backdropFilter: "blur(6px)",
        }}
      >
        Overlay ready — battle <strong>#{battleId || "?"}</strong>
      </div>
    </div>
  );
}
