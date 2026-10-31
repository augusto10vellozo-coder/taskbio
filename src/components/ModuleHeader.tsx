export function ModuleHeader({ title }: { title: string }) {
  return (
    <div className="pt-6 pb-4" data-module-header>
      <h1 className="min-w-0 break-words font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
    </div>
  );
}
