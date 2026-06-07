import { createContext, useContext, useState, type ReactNode } from "react";
import type { Lang } from "../i18n/translations";

interface LangCtx { lang: Lang; setLang: (l: Lang) => void; }

const LangContext = createContext<LangCtx>({ lang: "ru", setLang: () => {} });

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Lang>(() => {
    const s = localStorage.getItem("lang") as Lang | null;
    return s && ["ru", "kz", "en"].includes(s) ? s : "ru";
  });

  const handleSet = (l: Lang) => { setLang(l); localStorage.setItem("lang", l); };

  return <LangContext.Provider value={{ lang, setLang: handleSet }}>{children}</LangContext.Provider>;
};

export const useLang = () => useContext(LangContext);
