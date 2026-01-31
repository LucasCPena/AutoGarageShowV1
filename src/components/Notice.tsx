"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

type NoticeVariant = "info" | "warning" | "success";

type NoticeProps = {
  title: string;
  children: ReactNode;
  variant?: NoticeVariant;
  className?: string;
};

const variantClasses: Record<NoticeVariant, string> = {
  info: "border-slate-200 bg-slate-50 text-slate-700",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900"
};

export default function Notice({
  title,
  children,
  variant = "info",
  className
}: NoticeProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        variantClasses[variant],
        className
      )}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}
