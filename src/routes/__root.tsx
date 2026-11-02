import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AppHeader } from "../components/AppHeader";
import { AppFooter } from "../components/AppFooter";
import { BottomNav } from "../components/BottomNav";
import { TaskBioProvider } from "../lib/trilha-store";
import { AuthProvider } from "../lib/auth-context";
import { SyncManager } from "../components/SyncManager";
import { Toaster } from "../components/ui/sonner";
import { ReminderManager } from "../components/ReminderManager";
import { PendingProfessionalInvites } from "../components/PendingProfessionalInvites";
import { PrivacyConsent } from "../components/PrivacyConsent";
import { ThemeProvider } from "../lib/theme-context";
import { ThemeOnboarding } from "../components/ThemeOnboarding";
import { ProductOnboarding } from "../components/ProductOnboarding";
import { ProductTelemetry } from "../components/ProductTelemetry";
import { StudyTimerProvider } from "../components/StudyTimerProvider";
import { HabitFreezeNotices } from "../components/HabitFreezeNotices";
import { NotificationPrompt } from "../components/NotificationPrompt";
import { NavigationProvider } from "../lib/navigation-context";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">PÃ¡gina nÃ£o encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A pÃ¡gina que vocÃª procura nÃ£o existe ou foi movida.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar para o inÃ­cio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: unknown; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Esta pÃ¡gina nÃ£o carregou
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado da nossa parte. VocÃª pode tentar de novo ou voltar para o inÃ­cio.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tentar de novo
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Voltar para o inÃ­cio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#1E4D3B" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { title: "TaskBio â€” OrganizaÃ§Ã£o de vida saudÃ¡vel" },
      { name: "description", content: "Organize rotina, atividades fÃ­sicas, alimentaÃ§Ã£o e progresso em um sÃ³ lugar." },
      { name: "author", content: "TaskBio" },
      { property: "og:title", content: "TaskBio â€” OrganizaÃ§Ã£o de vida saudÃ¡vel" },
      { property: "og:description", content: "Sua semana saudÃ¡vel em uma Ãºnica agenda." },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://taskbio.com.br/og.jpg" },
      { property: "og:image:secure_url", content: "https://taskbio.com.br/og.jpg" },
      { property: "og:image:type", content: "image/jpeg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "TaskBio â€” sua rotina, dia apÃ³s dia" },
      { property: "og:site_name", content: "TaskBio" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://taskbio.com.br/og.jpg" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@400;500;600;700&display=swap" },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/icons/apple-touch-icon-v3.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("trilha:theme");var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.documentElement;r.classList.toggle("dark",d);r.dataset.theme=d?"dark":"light";}catch(e){}',
          }}
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
      <AuthProvider>
        <TaskBioProvider>
          <StudyTimerProvider>
          <NavigationProvider>
          <div className="app-glow" />
          <AppHeader />
          <Outlet />
          <AppFooter />
          <BottomNav />
          <PrivacyConsent />
          <ThemeOnboarding />
          <ProductOnboarding />
          <SyncManager />
          <ProductTelemetry />
          <HabitFreezeNotices />
          <NotificationPrompt />
          <ReminderManager />
          <PendingProfessionalInvites />
          <Toaster position="top-center" richColors />
          </NavigationProvider>
          </StudyTimerProvider>
        </TaskBioProvider>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
