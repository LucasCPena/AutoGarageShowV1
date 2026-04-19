"use client";

import { cn } from "@/lib/cn";

type Props = {
  className?: string;
};

export default function MarketplaceImportantNotice({ className }: Props) {
  return (
    <section
      className={cn(
        "mx-auto max-w-5xl rounded-3xl border border-amber-200 bg-amber-50 p-6 text-slate-800 shadow-sm",
        className
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
        Aviso Importante
      </div>

      <div className="mt-4 grid gap-4 text-sm leading-7 text-slate-700">
        <p>
          O Auto Garage Show atua exclusivamente como uma plataforma de divulgação de anúncios de
          veículos, motos, lojas e classificados, não participando das negociações, pagamentos,
          entregas ou transferências realizadas entre compradores e vendedores.
        </p>

        <p>
          Dessa forma, não nos responsabilizamos por quaisquer transações realizadas entre as
          partes.
        </p>

        <p>
          Reforçamos que a negociação é feita diretamente com o proprietário do veículo ou
          anunciante, sendo de total responsabilidade do comprador verificar todas as informações
          antes de concluir a compra.
        </p>

        <div>
          <div className="font-semibold text-slate-900">
            Antes de efetuar qualquer pagamento, recomendamos que o interessado:
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>verifique a procedência do veículo e do vendedor;</li>
            <li>consulte o CNPJ ou CPF do anunciante;</li>
            <li>confirme a regularidade da documentação junto aos órgãos competentes;</li>
            <li>realize uma vistoria cautelar completa;</li>
            <li>evite pagamentos antecipados sem garantias de segurança.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-amber-300 bg-white/70 p-4">
          <p className="font-semibold text-slate-900">
            Importante: A compra de um veículo envolve um alto valor financeiro e deve ser tratada
            com responsabilidade.
          </p>
          <p className="mt-2">Compre com a razão, não apenas com a emoção.</p>
          <p className="mt-2">Toda negociação deve ser feita com cautela, análise e segurança.</p>
        </div>
      </div>
    </section>
  );
}
