"use client";

import Link from "next/link";

type SectionKey = "veiculos" | "motos" | "servicos";

type Props = {
  current: SectionKey;
};

const items: Array<{ key: SectionKey; href: string; label: string }> = [
  { key: "veiculos", href: "/classificados", label: "Veiculos" },
  { key: "motos", href: "/motos", label: "Motos" },
  { key: "servicos", href: "/servicos", label: "Servicos" }
];

export default function MarketplaceSectionNav({ current }: Props) {
  return (
    <nav
      aria-label="Secoes do marketplace"
      className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3"
    >
      {items.map((item) => {
        const active = item.key === current;

        return (
          <Link
            key={item.key}
            href={item.href}
            className={
              active
                ? "rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
                : "rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-800"
            }
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
