import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTimeArabic(dateString: string | null | undefined): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "منذ لحظات";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "منذ يوم";
  if (diffInDays === 2) return "منذ يومين";
  if (diffInDays < 7) return `منذ ${diffInDays} أيام`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    if (weeks === 1) return "منذ أسبوع";
    if (weeks === 2) return "منذ أسبوعين";
    return `منذ ${weeks} أسابيع`;
  }
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths === 1) return "منذ شهر";
  if (diffInMonths === 2) return "منذ شهرين";
  if (diffInMonths < 12) return `منذ ${diffInMonths} أشهر`;
  const diffInYears = Math.floor(diffInDays / 365);
  if (diffInYears === 1) return "منذ سنة";
  if (diffInYears === 2) return "منذ سنتين";
  return `منذ ${diffInYears} سنوات`;
}
