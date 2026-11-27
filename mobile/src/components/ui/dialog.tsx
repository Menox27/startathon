"use client";

import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;

export function DialogContent({ className, children, ...props }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="veil fixed inset-0 z-50 bg-slate-900/25 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          "sheet glass fixed z-50 grid max-w-md gap-4 overflow-y-auto p-6 max-sm:max-w-none [background:rgb(255_255_255/0.84)]",
          // Bottom sheet on phones (sits above the on-screen keyboard), centred card from sm up.
          "inset-x-0 bottom-[var(--kb-inset,0px)] max-h-[calc(var(--app-height,100dvh)-env(safe-area-inset-top)-1rem)] rounded-t-[28px] pb-[calc(1.5rem+var(--safe-bottom,env(safe-area-inset-bottom)))]",
          "sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[28px] sm:pb-6",
          className,
        )}
        {...props}
      >
        {/* grab handle: marks the phone sheet as one */}
        <span aria-hidden className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-foreground/15 sm:hidden" />
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 flex h-10 w-10 sm:h-8 sm:w-8 cursor-pointer items-center justify-center rounded-full bg-white/85 text-muted-foreground shadow-sm hover:bg-white hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" aria-label="Schließen">
          <XIcon className="h-4 w-4" />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn("text-sm text-muted-foreground", className)} {...props} />;
}
