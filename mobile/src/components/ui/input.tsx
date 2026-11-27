import { cn } from "@/lib/utils";

const field =
  "w-full rounded-xl border border-border bg-white/70 px-3 text-sm placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50 max-sm:text-base"; // 16px on phones keeps iOS from zooming on focus

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(field, "h-9 max-sm:h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-16 py-2", className)} {...props} />;
}

export function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(field, "h-9 max-sm:h-10", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("flex flex-col gap-1.5 text-sm font-medium", className)} {...props} />;
}
