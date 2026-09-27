import { Link } from "@tanstack/react-router";

export function AppFooter() {
  return (
    <footer className="border-t border-line bg-card/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-steel sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="font-medium text-ink">Trilha · Organização de vida saudável</p>
        <nav aria-label="Informações sobre o Trilha" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link to="/sobre" className="hover:text-ink">Sobre</Link>
          <Link to="/contato" className="hover:text-ink">Contato</Link>
          <Link to="/privacidade" className="hover:text-ink">Privacidade</Link>
          <Link to="/termos" className="hover:text-ink">Termos de uso</Link>
        </nav>
      </div>
    </footer>
  );
}