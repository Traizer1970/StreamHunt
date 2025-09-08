// /src/lib/nav.js
const KEY = "routeStack@shs";

// guarda o hash atual numa pilha curta em sessionStorage
export function trackRoute() {
  try {
    const cur = location.hash || "#/";
    const raw = sessionStorage.getItem(KEY);
    const stack = raw ? JSON.parse(raw) : [];

    if (stack[stack.length - 1] !== cur) {
      stack.push(cur);
      if (stack.length > 30) stack.shift(); // limita tamanho
      sessionStorage.setItem(KEY, JSON.stringify(stack));
    }
  } catch {}
}

// volta para a rota anterior conhecida; se não houver, usa fallback
export function smartBack(fallback = "#/hunts") {
  try {
    const raw = sessionStorage.getItem(KEY);
    const stack = raw ? JSON.parse(raw) : [];
    const current = location.hash || "#/";

    // remove entradas iguais à rota atual (podem existir duplicadas)
    while (stack.length && stack[stack.length - 1] === current) stack.pop();

    // rota anterior válida
    let prev = stack.pop();

    // se vazio ou landing pública, usa fallback
    if (!prev || prev === "#/" || prev === "#") prev = fallback;

    // atualiza pilha e navega
    sessionStorage.setItem(KEY, JSON.stringify(stack));
    location.replace(prev);
  } catch {
    location.replace(fallback);
  }
}
