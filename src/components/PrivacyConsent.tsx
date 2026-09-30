import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { PUBLIC_PATHS, PRIVACY_EVENT, readPrivacyChoice, recordPublicEvent, savePrivacyChoice, type PublicPath } from "@/lib/public-metrics";

export function PrivacyConsent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [choice, setChoice] = useState(() => readPrivacyChoice());
  const [open, setOpen] = useState(false);
  const isPublic = PUBLIC_PATHS.includes(pathname as PublicPath);

  const choose = (analytics: boolean) => {
    const nextChoice = { analytics, version: 1 } as const;
    setChoice(nextChoice);
    setOpen(false);
    savePrivacyChoice(analytics);
  };

  useEffect(() => {
    const sync = () => setChoice(readPrivacyChoice());
    window.addEventListener(PRIVACY_EVENT, sync);
    return () => window.removeEventListener(PRIVACY_EVENT, sync);
  }, []);

  useEffect(() => {
    if (isPublic && choice?.analytics) void recordPublicEvent(pathname as PublicPath, "page_view");
  }, [choice?.analytics, isPublic, pathname]);

  if (!isPublic || (choice && !open)) return null;
  return <aside role="dialog" aria-label="Escolhas de privacidade" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-lg bg-card p-4 shadow-xl ring-1 ring-line sm:flex sm:items-center sm:gap-5 sm:p-5">
    <div className="min-w-0 flex-1"><p className="font-display text-base font-semibold">Sua privacidade, sua escolha</p><p className="mt-1 text-xs leading-5 text-steel">Métricas opcionais e anônimas ajudam a entender visitas e anúncios. Não registramos identidade, e-mail ou dados de saúde. <Link to="/privacidade" className="font-medium text-brand-deep underline">Saiba mais</Link>.</p></div>
    <div className="mt-3 flex shrink-0 flex-wrap gap-2 sm:mt-0"><Button size="sm" variant="outline" onClick={() => choose(false)}>Recusar</Button><Button size="sm" onClick={() => choose(true)}>Aceitar métricas</Button></div>
  </aside>;
}

export function PrivacySettingsButton() {
  return <Button variant="link" size="sm" className="h-auto p-0 text-steel" onClick={() => {
    localStorage.removeItem("trilha:privacy-choice");
    window.dispatchEvent(new CustomEvent(PRIVACY_EVENT));
  }}>Escolhas de privacidade</Button>;
}