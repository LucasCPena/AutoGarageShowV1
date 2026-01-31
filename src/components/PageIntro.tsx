import type { ReactNode } from "react";

import Container from "@/components/Container";
import { cn } from "@/lib/cn";

type PageIntroProps = {
  title: string;
  subtitle?: string;
  children?: ReactNode;
  className?: string;
};

export default function PageIntro({
  title,
  subtitle,
  children,
  className
}: PageIntroProps) {
  return (
    <section className={cn("border-b border-slate-200 bg-white", className)}>
      <Container className="py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
            ) : null}
          </div>

          {children ? <div className="flex flex-wrap gap-3">{children}</div> : null}
        </div>
      </Container>
    </section>
  );
}
