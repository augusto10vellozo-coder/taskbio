import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { MODULES, isModuleOn, type ModuleId } from "@/lib/modules";
import { useTaskBio } from "@/lib/trilha-store";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  context: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

/** Single reusable empty state: icon, title, one context line, one primary action, optional text link. */
export function EmptyState({ icon: Icon, title, context, actionLabel, onAction, secondaryLabel, onSecondary }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-80 flex-col items-center py-12 text-center">
      <Icon className="size-10 text-steel" strokeWidth={1.5} aria-hidden />
      <h2 className="mt-4 truncate text-[17px] font-semibold text-ink">{title}</h2>
      <p className="mt-2 line-clamp-2 text-sm leading-6 text-steel">{context}</p>
      <Button className="mt-5 h-11 rounded-xl bg-accent px-5 text-accent-foreground shadow-none hover:bg-accent/90" onClick={onAction}>{actionLabel}</Button>
      {secondaryLabel && onSecondary && (
        <button type="button" className="mt-3 min-h-11 text-[13px] text-steel underline-offset-4 hover:underline" onClick={onSecondary}>{secondaryLabel}</button>
      )}
    </div>
  );
}

/** Shows the "module disabled" empty state when the user turned the module off; otherwise renders the module. */
export function ModuleGate({ id, children }: { id: ModuleId; children: ReactNode }) {
  const { modules, setModule } = useTaskBio();
  const mod = MODULES.find((m) => m.id === id);
  if (!mod || isModuleOn(modules, id)) return <>{children}</>;
  return (
    <EmptyState
      icon={mod.icon}
      title={`${mod.label} está desativado`}
      context="Ative este módulo para voltar a usar."
      actionLabel={`Ativar ${mod.label.toLocaleLowerCase("pt-BR")}`}
      onAction={() => setModule(id, true)}
    />
  );
}
