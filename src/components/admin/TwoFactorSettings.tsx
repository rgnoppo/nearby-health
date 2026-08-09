import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export function TwoFactorSettings() {
  const queryClient = useQueryClient();
  const [otp, setOtp] = useState("");

  const factorsQuery = useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      return data;
    },
  });

  const totpFactor = factorsQuery.data?.totp?.[0] || factorsQuery.data?.all?.find(f => (f as any).factor_type === 'totp' && f.status === 'verified');

  const enroll = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (error) throw error;
      return data;
    },
    onError: () => toast.error("حصل مشكلة في تجهيز المصادقة الثنائية."),
  });

  const verify = useMutation({
    mutationFn: async (code: string) => {
      if (!enroll.data) throw new Error("No enrollment data");
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: enroll.data.id,
      });
      if (challengeError) throw challengeError;
      
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: enroll.data.id,
        challengeId: challengeData.id,
        code,
      });
      if (verifyError) throw verifyError;
    },
    onSuccess: () => {
      toast.success("تم تفعيل المصادقة الثنائية بنجاح.");
      setOtp("");
      enroll.reset();
      queryClient.invalidateQueries({ queryKey: ["mfa-factors"] });
    },
    onError: () => toast.error("الكود غلط. جرب تاني."),
  });

  const unenroll = useMutation({
    mutationFn: async (factorId: string) => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("تم إلغاء المصادقة الثنائية.");
      queryClient.invalidateQueries({ queryKey: ["mfa-factors"] });
    },
    onError: () => toast.error("مقدرناش نلغي المصادقة الثنائية."),
  });

  if (factorsQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">بيحمّل إعدادات الحماية…</p>;
  }

  if (totpFactor) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <h2 className="text-sm font-bold">المصادقة الثنائية (2FA) مفعلة</h2>
        <p className="text-xs text-muted-foreground">حسابك محمي بخطوة إضافية عند تسجيل الدخول.</p>
        <Button
          variant="destructive"
          onClick={() => {
            if (confirm("متأكد إنك عايز تلغي المصادقة الثنائية؟")) {
              unenroll.mutate(totpFactor.id);
            }
          }}
          disabled={unenroll.isPending}
        >
          {unenroll.isPending ? "بيتم الإلغاء..." : "إلغاء المصادقة الثنائية"}
        </Button>
      </div>
    );
  }

  if (enroll.data) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card">
        <h2 className="text-sm font-bold">تفعيل المصادقة الثنائية</h2>
        <p className="text-xs text-muted-foreground">
          استخدم تطبيق Google Authenticator أو Authy لمسح الكود ده.
        </p>
        <div className="flex justify-center bg-white p-4 rounded-xl">
          <img src={enroll.data.totp.qr_code} alt="QR Code" className="h-48 w-48" />
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold text-center text-muted-foreground">
            أو دخل الكود السري ده يدوياً: <span className="font-mono">{enroll.data.totp.secret}</span>
          </p>
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (otp.length === 6) verify.mutate(otp);
          }}
        >
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="كود التأكيد (6 أرقام)"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="h-11 rounded-xl text-center font-mono tracking-widest"
            required
          />
          <Button type="submit" className="h-11 shrink-0 rounded-xl" disabled={verify.isPending || otp.length !== 6}>
            {verify.isPending ? "لحظة..." : "تأكيد وتفعيل"}
          </Button>
        </form>
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            enroll.reset();
            setOtp("");
          }}
        >
          إلغاء
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-card">
      <h2 className="text-sm font-bold">المصادقة الثنائية (2FA)</h2>
      <p className="text-xs text-muted-foreground">
        ضيف طبقة حماية إضافية لحساب الإدارة.
      </p>
      <Button
        onClick={() => enroll.mutate()}
        disabled={enroll.isPending}
      >
        {enroll.isPending ? "تجهيز..." : "إعداد المصادقة الثنائية"}
      </Button>
    </div>
  );
}
