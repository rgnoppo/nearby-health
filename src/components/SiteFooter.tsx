import { Link } from "@tanstack/react-router";
import Stethoscope from "lucide-react/dist/esm/icons/stethoscope";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border/60 bg-background">
      <div className="mx-auto max-w-lg px-4 py-8">
        {/* Brand row */}
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Stethoscope className="h-4 w-4" />
          </span>
          <span className="font-display text-base font-bold">دليل العيادات</span>
        </div>

        <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xs">
          دليل عيادات مجاني يساعدك تلاقي الدكتور الصح بالعلامة المميزة من غير خرايط.
        </p>

        {/* Links */}
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-muted-foreground">
          <Link to="/" className="hover:text-foreground transition-colors">
            الرئيسية
          </Link>
          <Link to="/suggest" className="hover:text-foreground transition-colors">
            ضيف عيادة
          </Link>
          <a
            href="https://wa.me/201028551063?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D9%88%D8%AF%20%D8%A7%D9%84%D8%A5%D8%A8%D9%84%D8%A7%D8%BA%20%D8%B9%D9%86%20%D9%85%D8%B9%D9%84%D9%88%D9%85%D8%A9%20%D8%AE%D8%A7%D8%B7%D8%A6%D8%A9%20%D8%A3%D9%88%20%D9%86%D8%A7%D9%82%D8%B5%D8%A9%20%D9%81%D9%8A%20%D8%A7%D9%84%D9%85%D9%88%D9%82%D8%B9"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            الإبلاغ عن مشكلة
          </a>
        </div>

        {/* Copyright */}
        <div className="mt-6 flex flex-col gap-4">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} دليل العيادات.
          </p>

          <div className="w-full pt-4 border-t border-border/40 text-center">
            <p className="text-xs text-muted-foreground" dir="ltr">
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
        </div>
      </div>
    </footer>
  );
}
