import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

/**
 * Pill-shaped toast — inherits all colours from CSS variables.
 * Click or swipe (top / left / right) to dismiss.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-center"
      offset={20}
      gap={8}
      duration={4000}
      swipeDirections={["top", "left", "right"]}
      toastOptions={{
        classNames: {
          toast: [
            "group toast",
            /* Pill */
            "!rounded-full",
            /* Fixed width — keeps centering stable */
            "!w-[260px]",
            "!px-5 !py-3",
            "!text-[14px] !font-semibold !leading-tight !whitespace-nowrap",
            /* Inherit site colours */
            "group-[.toaster]:bg-background",
            "group-[.toaster]:text-foreground",
            "group-[.toaster]:border-border",
            "group-[.toaster]:shadow-[0_8px_28px_-6px_oklch(0.3_0.06_195_/_0.28),_0_2px_8px_-2px_oklch(0.3_0.06_195_/_0.14)]",
            /* Dismiss on click */
            "cursor-pointer select-none",
          ].join(" "),
          description: "group-[.toast]:text-muted-foreground group-[.toast]:!text-[12.5px]",
          actionButton:  "group-[.toast]:bg-primary  group-[.toast]:text-primary-foreground",
          cancelButton:  "group-[.toast]:bg-muted    group-[.toast]:text-muted-foreground",
          icon:          "!w-[16px] !h-[16px]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
