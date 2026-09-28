import { recordPublicEvent, type PublicPath } from "@/lib/public-metrics";

const ADS_ACTIVE = false;

export function AdSlot({ page, slot }: { page: PublicPath; slot: "home-inline" | "about-inline" | "contact-inline" }) {
  if (!ADS_ACTIVE) return null;
  return <aside aria-label="Publicidade" className="mx-auto my-10 w-full max-w-3xl border-y border-line py-3">
    <p className="mb-2 text-center text-[10px] uppercase text-steel">Publicidade</p>
    <a href="#anuncio" onClick={() => void recordPublicEvent(page, "ad_click", slot)} className="grid min-h-24 place-items-center bg-mist text-xs text-steel sm:min-h-28">Espaço publicitário</a>
  </aside>;
}