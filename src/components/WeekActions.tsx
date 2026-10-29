import { useState } from "react";
import { Copy, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function WeekActions({ onDuplicateDay, onDuplicateWeek, onClear, empty }: {
  onDuplicateDay: () => void;
  onDuplicateWeek: () => void;
  onClear: () => void;
  empty: boolean;
}) {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8 shrink-0 text-steel" aria-label="Opções da semana" title="Opções da semana"><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onDuplicateDay}><Copy />Duplicar dia anterior</DropdownMenuItem>
        <DropdownMenuItem onSelect={onDuplicateWeek}><Copy />Duplicar semana inteira</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={empty} onSelect={() => setStep(1)} className="text-destructive"><Trash2 />Limpar semana</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <AlertDialog open={step !== 0} onOpenChange={(open) => { if (!open) setStep(0); }}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] sm:max-w-lg rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle>{step === 2 ? "Confirmar exclusão da semana?" : "Limpar semana?"}</AlertDialogTitle>
          <AlertDialogDescription>Isso apaga todos os itens da semana. Esta ação não pode ser desfeita</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <Button autoFocus onClick={() => setStep(0)}>Cancelar</Button>
          {step === 1
            ? <Button variant="outline" onClick={() => setStep(2)}>Continuar</Button>
            : <Button variant="outline" className="text-destructive border-destructive" onClick={() => { onClear(); setStep(0); }}>Limpar definitivamente</Button>}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>;
}