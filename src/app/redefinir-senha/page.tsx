import type { Metadata } from "next";

import Container from "@/components/Container";
import Notice from "@/components/Notice";
import PageIntro from "@/components/PageIntro";
import PasswordResetForm from "@/components/PasswordResetForm";

export const metadata: Metadata = {
  title: "Redefinir senha",
  description: "Crie uma nova senha para a sua conta."
};

type Props = {
  searchParams?: {
    token?: string;
  };
};

export default function ResetPasswordPage({ searchParams }: Props) {
  const token = typeof searchParams?.token === "string" ? searchParams.token.trim() : "";

  return (
    <>
      <PageIntro
        title="Redefinir senha"
        subtitle="Use o link de recuperacao para cadastrar uma nova senha com seguranca."
      />

      <Container className="py-10">
        {token ? (
          <PasswordResetForm token={token} />
        ) : (
          <div className="mx-auto max-w-xl">
            <Notice title="Token ausente" variant="warning">
              O link de recuperacao esta incompleto. Solicite uma nova recuperacao de senha.
            </Notice>
          </div>
        )}
      </Container>
    </>
  );
}
