import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { adminExists, bootstrapAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "دخول الإدارة" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminAuth,
});

function AdminAuth() {
  const navigate = useNavigate();
  const checkAdmin = useServerFn(adminExists);
  const createAdmin = useServerFn(bootstrapAdmin);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // `adminExists` is a TanStack Start server function — there is no server to
  // answer it inside the Capacitor app, so it's only called on the web build.
  // The admin account is created once from the website; inside the app we
  // always go straight to the normal (fully client-side Supabase) sign-in form.
  const isNative = Capacitor.isNativePlatform();
  const existing = useQuery({
    queryKey: ["admin-exists"],
    queryFn: () => checkAdmin({}),
    enabled: !isNative,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const signIn = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    onSuccess: () => navigate({ to: "/dashboard", replace: true }),
    onError: () => toast.error("الإيميل أو الباسورد غلط."),
  });

  const setup = useMutation({
    mutationFn: async () => {
      await createAdmin({ data: { email, password } });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إنشاء حساب الإدارة.");
      navigate({ to: "/dashboard", replace: true });
    },
    onError: () => toast.error("مقدرناش نعمل حساب الإدارة."),
  });

  const isSetup = !isNative && existing.data?.exists === false;
  const pending = signIn.isPending || setup.isPending;

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <main className="w-full max-w-sm">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <h1 className="mt-4 text-xl font-extrabold">
            {isSetup ? "إنشاء حساب الإدارة" : "دخول الإدارة"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSetup
              ? "الخطوة دي بتحصل مرة واحدة بس. بعد كده مش هينفع تتسجل حسابات تانية."
              : "الدليل ليه حساب إدارة واحد بس، والتسجيل العام مقفول."}
          </p>

          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (isSetup) setup.mutate();
              else signIn.mutate();
            }}
          >
            <div>
              <Label htmlFor="admin-email" className="text-xs font-semibold">
                الإيميل
              </Label>
              <Input
                id="admin-email"
                type="email"
                autoComplete="username"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 h-11 rounded-xl text-start"
                required
              />
            </div>
            <div>
              <Label htmlFor="admin-password" className="text-xs font-semibold">
                الباسورد
              </Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete={isSetup ? "new-password" : "current-password"}
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-11 rounded-xl text-start"
                minLength={8}
                required
              />
            </div>
            <Button type="submit" size="lg" className="h-12 w-full rounded-xl" disabled={pending}>
              {pending ? "استنى لحظة…" : isSetup ? "اعمل حساب الإدارة" : "دخول"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
