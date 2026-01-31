"use client";

import { useState } from "react";

import Notice from "@/components/Notice";

type MockPaymentProps = {
  amountLabel: string;
  onPaid?: () => void;
};

export default function MockPayment({ amountLabel, onPaid }: MockPaymentProps) {
  const [paid, setPaid] = useState(false);

  return (
    <div className="grid gap-4">
      {paid ? (
        <Notice title="Pagamento aprovado" variant="success">
          Protótipo: pagamento simulado. No sistema final, o destaque será ativado automaticamente após confirmação do Mercado Pago e expirará automaticamente.
        </Notice>
      ) : (
        <Notice title="Mercado Pago (planejado)" variant="info">
          Você pagará {amountLabel} para ativar o destaque.
        </Notice>
      )}

      <button
        type="button"
        onClick={() => {
          setPaid(true);
          onPaid?.();
        }}
        className="inline-flex h-11 items-center justify-center rounded-md bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700"
      >
        Pagar com Mercado Pago (mock)
      </button>
    </div>
  );
}
