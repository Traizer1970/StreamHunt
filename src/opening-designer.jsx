// src/pages/opening-designer.jsx
import React from "react";

/* router mínimo compatível com o resto do app */
function parseHash() {
  const raw = (window.location.hash || "#").slice(1);
  const [path, query] = raw.split("?");
  let parts = (path || "").split("/").filter(Boolean);
  if (parts[0] === "designer") parts = parts.slice(1);
  const type = parts[0] || "hunt"; // "opening" esperado aqui
  const qs = new URLSearchParams(query || "");
  return { type, qs };
}
function useHashRoute(){
  const [r,setR] = React.useState(parseHash());
  React.useEffect(()=>{
    const onHash=()=>setR(parseHash());
    window.addEventListener("hashchange",onHash);
    return ()=>window.removeEventListener("hashchange",onHash);
  },[]);
  return r;
}

/* ————————————————— Página ————————————————— */
export default function OpeningDesignerPage(){
  const { type } = useHashRoute();

  // GUARDA: se for Opening, mostra só o painel Layout (Opening)
  if (type === "opening") {
    return (
      <div style={{ padding: 16, fontFamily: "'Rubik', ui-sans-serif, system-ui" }}>
        <OpeningLayoutPanel/>
      </div>
    );
  }

  // Caso abras o designer para outro tipo, poderias renderizar os restantes
  // painéis. Aqui deixo só o aviso para não baralhar.
  return (
    <div style={{ padding: 16, color: "#e5e7eb", background: "#0b1020" }}>
      Designer genérico (hunt): implementar aqui os outros painéis se precisares.
    </div>
  );
}

/* ————————————————— Painel “Layout (Opening)” ————————————————— */
function OpeningLayoutPanel(){
  const row = { display:"grid", gridTemplateColumns:"1fr auto auto auto auto", gap: 8, alignItems:"center" };
  const box = { background:"rgba(17,24,39,.75)", border:"1px solid rgba(255,255,255,.12)", borderRadius:12, padding:12, color:"#e5e7eb" };
  const label = { fontSize:12, opacity:.85 };

  return (
    <div style={box}>
      <div style={{ fontWeight:700, marginBottom:12 }}>Layout (Opening)</div>

      <div style={{ display:"grid", gap:10 }}>
        <div style={row}>
          <span style={label}>Cards visíveis</span>
          <RadioGroup name="visible" items={[3,5,7,9]} defaultValue={9}/>
          <span style={{ width:8 }} />
          <span style={label}>Lista lateral</span>
          <RadioGroup name="lside" items={["Esquerda","Direita"]} values={["left","right"]} defaultValue={"right"} />
        </div>

        <div style={row}>
          <span style={label}>Caixa de fundo</span>
          <Toggle name="lbox" defaultChecked />
          <span />
          <span style={label}>Mostrar Best/Worst</span>
          <Toggle name="lbest" />
        </div>

        <div style={row}>
          <span style={label}>Lista auto-scroll</span>
          <Toggle name="lscroll" defaultChecked />
          <span />
          <span style={label}>Velocidade</span>
          <Input name="lspeed" placeholder="segundos" defaultValue={18} width={90}/>
        </div>

        <div style={row}>
          <span style={label}>Largura da lista</span>
          <Input name="lwidth" placeholder="px" defaultValue={232} width={90}/>
          <span />
          <span style={label}>Linhas visíveis</span>
          <Input name="lvisible" placeholder="#" defaultValue={9} width={90}/>
        </div>

        <Help />
      </div>
    </div>
  );
}

/* ————————————————— Controles simples ————————————————— */
function RadioGroup({ name, items, values, defaultValue }){
  return (
    <div style={{ display:"inline-flex", gap:6, background:"rgba(255,255,255,.06)", padding:4, borderRadius:999, border:"1px solid rgba(255,255,255,.12)" }}>
      {items.map((it,idx)=>{
        const val = values ? values[idx] : it;
        const is = String(defaultValue) === String(val);
        return (
          <label key={val} style={{ padding:"6px 10px", borderRadius:999, cursor:"pointer", background:is ? "rgba(255,255,255,.15)" : "transparent", fontSize:12 }}>
            <input type="radio" name={name} value={val} defaultChecked={is} style={{ display:"none" }}/>
            {it}
          </label>
        );
      })}
    </div>
  );
}
function Toggle({ name, defaultChecked }){
  return (
    <label style={{ display:"inline-flex", alignItems:"center", gap:8, cursor:"pointer" }}>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} />
    </label>
  );
}
function Input({ name, placeholder, defaultValue, width=120 }){
  return (
    <input
      name={name}
      placeholder={placeholder}
      defaultValue={defaultValue}
      style={{
        width, height:32, background:"rgba(255,255,255,.06)",
        border:"1px solid rgba(255,255,255,.12)", borderRadius:8,
        padding:"0 10px", color:"#e5e7eb"
      }}
    />
  );
}
function Help(){
  return (
    <div style={{ marginTop:10, fontSize:12, opacity:.8 }}>
      As opções acima escrevem/lem o URL (ex.: <code>#/overlay/opening/123?list=1&amp;lside=right...</code>).  
      O overlay do Opening já interpreta: <b>list</b>, <b>lside</b>, <b>lwidth</b>, <b>lvisible</b>, <b>lscroll</b>, <b>lspeed</b>, <b>lbox</b>, <b>lbest</b>.
    </div>
  );
}
