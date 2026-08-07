import { Link } from "@tanstack/react-router";
import Stethoscope from "lucide-react/dist/esm/icons/stethoscope";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/60 bg-background">
      <div className="mx-auto max-w-lg px-4 py-10 flex flex-col items-center text-center gap-6">

        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Stethoscope className="h-5 w-5" />
          </span>
          <span className="font-display text-base font-bold">دليل العيادات</span>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-[260px]">
            دليل عيادات مجاني يساعدك تلاقي الدكتور الصح بالعلامة المميزة من غير خرايط.
          </p>
        </div>

        {/* Divider */}
        <div className="w-full border-t border-border/40" />

        {/* Links row */}
        <div className="flex flex-wrap justify-center items-center gap-5 text-sm font-semibold text-muted-foreground">
          <Link to="/about" className="hover:text-foreground transition-colors">
            عن المشروع والسياسة
          </Link>
          <a
            href="https://wa.me/201028551063?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D9%88%D8%AF%20%D8%A7%D9%84%D8%A5%D8%A8%D9%84%D8%A7%D8%BA%20%D8%B9%D9%86%20%D9%85%D8%B9%D9%84%D9%88%D9%85%D8%A9%20%D8%AE%D8%A7%D8%B7%D8%A6%D8%A9%20%D8%A3%D9%88%20%D9%86%D8%A7%D9%82%D8%B5%D8%A9%20%D9%81%D9%8A%20%D8%A7%D9%84%D9%85%D9%88%D9%82%D8%B9"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary/60 px-3.5 py-1.5 text-xs font-bold text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <span>⚠️</span>
            الإبلاغ عن معلومة خاطئة
          </a>
        </div>

        {/* Copyright */}
        <p className="text-xs text-muted-foreground font-medium">
          © {new Date().getFullYear()} دليل العيادات. جميع الحقوق محفوظة.
        </p>
        <p className="text-xs text-muted-foreground -mt-4" dir="ltr">
          Developed by{" "}
          <a
            href="https://wa.me/201028551063?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D9%85%D8%B9%D8%B1%D9%81%D8%A9%20%D8%AA%D9%81%D8%A7%D8%B5%D9%8A%D9%84%20%D8%A5%D9%86%D8%B4%D8%A7%D8%A1%20%D9%85%D9%88%D9%82%D8%B9%20%D8%AE%D8%A7%D8%B5%20%D8%A8%D9%8A"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent transition-all duration-300 hover:scale-105 hover:opacity-80"
          >
            Omar Sayed
          </a>
        </p>

      </div>
    </footer>
  );
}
