"use client";

export default function MarketplaceImportantNotice() {
  return (
    <section className="mx-auto mb-10 max-w-5xl rounded-3xl border border-amber-200 bg-amber-50 p-6 text-slate-800 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
        Aviso Importante
      </div>

      <div className="mt-4 grid gap-4 text-sm leading-7 text-slate-700">
        <p>
          O Auto Garage Show atua exclusivamente como uma plataforma de divulgacao de anuncios de
          veiculos, motos, lojas e classificados, nao participando das negociacoes, pagamentos,
          entregas ou transferencias realizadas entre compradores e vendedores.
        </p>

        <p>
          Dessa forma, nao nos responsabilizamos por quaisquer transacoes realizadas entre as
          partes.
        </p>

        <p>
          Reforcamos que a negociacao e feita diretamente com o proprietario do veiculo ou
          anunciante, sendo de total responsabilidade do comprador verificar todas as informacoes
          antes de concluir a compra.
        </p>

        <div>
          <div className="font-semibold text-slate-900">
            Antes de efetuar qualquer pagamento, recomendamos que o interessado:
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>verifique a procedencia do veiculo e do vendedor;</li>
            <li>consulte o CNPJ ou CPF do anunciante;</li>
            <li>confirme a regularidade da documentacao junto aos orgaos competentes;</li>
            <li>realize uma vistoria cautelar completa;</li>
            <li>evite pagamentos antecipados sem garantias de seguranca.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-amber-300 bg-white/70 p-4">
          <p className="font-semibold text-slate-900">
            Importante: A compra de um veiculo envolve um alto valor financeiro e deve ser tratada
            com responsabilidade.
          </p>
          <p className="mt-2">Compre com a razao, nao apenas com a emocao.</p>
          <p className="mt-2">Toda negociacao deve ser feita com cautela, analise e seguranca.</p>
        </div>
      </div>
    </section>
  );
}
