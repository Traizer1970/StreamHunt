// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

// Idioma inicial: tenta localStorage -> <html lang> -> navegador
function detectLang() {
  try {
    const ls = localStorage.getItem("lang");
    if (ls) return ls;
  } catch {}
  if (typeof document !== "undefined") {
    const html = document.documentElement.lang;
    if (html) return html.toLowerCase().startsWith("pt") ? "pt" : "en";
  }
  if (typeof navigator !== "undefined") {
    return navigator.language.toLowerCase().startsWith("pt") ? "pt" : "en";
  }
  return "pt";
}

// Recursos mínimos (só o essencial para evitar crash e dar arrays no premium)
const resources = {
  pt: {
    translation: {
      nav: { home: "Início", widgets: "Widgets", games: "Jogos", premium: "Premium" },
      common: { free: "Grátis" },
      theme: { toLight: "Tema claro", toDark: "Tema escuro" },
      auth: {
        welcome: "Bem-vindo!",
        loginOk: "Login efetuado com sucesso.",
        createdTitle: "Conta criada",
        error: "Erro",
        genericError: "Ocorreu um erro.",
        validating: "A validar o link...",
        pleaseWait: "Um momento por favor.",
        redirecting: "A redirecionar..."
      },
      home: {
        headline: "O teu estúdio para hunts e widgets",
        sub: "Controla hunts, mostra estatísticas e monetiza o stream.",
        ctaStart: "Começar",
        ctaWidgets: "Ver widgets",
        overlayTitle: "Widgets em segundos",
        overlayDesc: "Cola no OBS e já está.",
        includedTitle: "Incluído",
        includedSub: "Tudo o que precisas para correr hunts e mostrar resultados.",
        perks: {},
        features: {}
      },
      widgets: {
        title: "Widgets",
        sub: "Cole no OBS",
        list: {
          amountWon: { title: "Montante ganho", desc: "—" },
          averageBet: { title: "Aposta média", desc: "—" },
          avgBonusCost: { title: "Custo médio do bónus", desc: "—" },
          currentMulti: { title: "Multiplicador atual", desc: "—" },
          bestPayout: { title: "Maior payout", desc: "—" },
          simpleList: { title: "Lista simples", desc: "—" },
          remaining: { title: "Por abrir", desc: "—" },
          progress: { title: "Progresso", desc: "—" },
        }
      },
      games: {
        title: "Jogos",
        sub: "Mini-games para stream",
        list: {
          deal: { title: "deal", desc: "—" },
          wheel: { title: "wheel", desc: "—" },
          cards: { title: "cards", desc: "—" }
        }
      },
      premium: {
        title: "Planos",
        sub: "Escolhe o teu plano",
        free: "Grátis",
        freeDesc: "Para começar",
        freeBtn: "Ficar no grátis",
        pro: "Pro",
        proDesc: "Tudo incluído",
        price: "€9/mês",
        proBtn: "Assinar Pro",
        recommended: "Recomendado",
        topSeller: "Top seller",
        exclusive: "Exclusivo",
        custom: "Personalizado",
        customDesc: "Para equipas e integrações",
        customPrice: "Contactar",
        customBtn: "Falar connosco",
        // Estes arrays evitam crash no t(..., { returnObjects: true })
        features: [
          "Widgets base incluídos",
          "Integrações simples",
          "Sem limites de hunts",
          "Atualizações automáticas",
          "Temas avançados",
          "Widgets premium",
          "Exportação de dados",
          "Suporte prioritário"
        ],
        customFeatures: [
          "Integrações a pedido",
          "Branding personalizado",
          "Endpoints/API dedicados",
          "Suporte para equipas"
        ]
      }
    }
  },
  en: {
    translation: {
      nav: { home: "Home", widgets: "Widgets", games: "Games", premium: "Premium" },
      common: { free: "Free" },
      premium: {
        features: [
          "Base widgets included",
          "Simple integrations",
          "No hunt limits",
          "Automatic updates",
          "Advanced themes",
          "Premium widgets",
          "Data export",
          "Priority support"
        ],
        customFeatures: [
          "Custom integrations",
          "Custom branding",
          "Dedicated endpoints/API",
          "Team support"
        ]
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectLang(),
    fallbackLng: "pt",
    interpolation: { escapeValue: false }
  });

// Persistência e <html lang="..">
i18n.on("languageChanged", (lng) => {
  try { localStorage.setItem("lang", lng); } catch {}
  if (typeof document !== "undefined") {
    document.documentElement.lang = lng || "pt";
  }
});

export default i18n;
