import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { Suspense, lazy, useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
// Lazy-load Toaster so the sonner bundle doesn't block the main thread
const Toaster = lazy(() =>
  import("@/components/ui/sonner").then((m) => ({ default: m.Toaster }))
);

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="text-8xl font-extrabold text-muted-foreground/20 select-none">404</p>
      <h1 className="mt-4 text-2xl font-extrabold text-foreground">الصفحة مش موجودة</h1>
      <p className="mt-2 text-base text-muted-foreground max-w-xs">
        الصفحة اللي بتدور عليها مش موجودة أو اتنقلت.
      </p>
      <div className="mt-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground shadow-md transition-opacity hover:opacity-90"
        >
          روح للرئيسية
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <p className="text-6xl font-extrabold text-destructive/20 select-none">!</p>
      <h1 className="mt-2 text-2xl font-extrabold text-foreground">الصفحة دي مفتحتش</h1>
      <p className="mt-2 text-base text-muted-foreground max-w-xs">
        حصلت مشكلة عندنا. جرّب تحدّث الصفحة أو ارجع للرئيسية.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3.5 text-base font-bold text-primary-foreground shadow-md transition-opacity hover:opacity-90"
        >
          جرّب تاني
        </button>
        <a
          href="/"
          className="inline-flex items-center justify-center rounded-full border-2 border-input bg-background px-6 py-3.5 text-base font-bold text-foreground transition-colors hover:bg-secondary"
        >
          روح للرئيسية
        </a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "دليل العيادات — دكاترة وعيادات قريب منك" },
      {
        name: "description",
        content:
          "دور على أقرب عيادة بالتخصص، بالعنوان والعلامة المميزة ومواعيد الشغل والتليفون. وتقدر تضيف عيادة ناقصة.",
      },
      { property: "og:title", content: "دليل العيادات — دكاترة وعيادات قريب منك" },
      {
        property: "og:description",
        content: "عيادات بالتخصصات، العنوان والعلامة المميزة والمواعيد والتليفون.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://nearby-health-mu.vercel.app/img.png" },
      { property: "og:image:secure_url", content: "https://nearby-health-mu.vercel.app/img.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://nearby-health-mu.vercel.app/img.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      // Google Fonts — preconnect first so DNS + TLS handshake happen in parallel
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="ar-EG" dir="rtl">
      <head>
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
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--muted-foreground))_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.02]"></div>
        <div className="absolute top-[-10%] right-[-5%] h-[500px] w-[500px] rounded-full bg-primary/5 blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-5%] h-[500px] w-[500px] rounded-full bg-secondary/5 blur-[120px]"></div>
      </div>
      
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Suspense fallback={null}>
        <Toaster position="top-center" />
      </Suspense>
    </QueryClientProvider>
  );
}
