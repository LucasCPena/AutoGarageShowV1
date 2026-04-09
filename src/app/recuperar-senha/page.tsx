import type { Metadata } from "next";

import Container from "@/components/Container";
import PageIntro from "@/components/PageIntro";
import PasswordRecoveryRequestForm from "@/components/PasswordRecoveryRequestForm";

export const metadata: Metadata = {
  title: "Recuperar senha",
  description: "Solicite um link para redefinir a senha da sua conta."
};

export default function RecoverPasswordPage() {
  return (
    <>
      <PageIntro
        title="Recuperar senha"
        subtitle="Solicite um link de redefinicao para voltar a acessar a sua conta."
      />

      <Container className="py-10">
        <PasswordRecoveryRequestForm />
      </Container>
    </>
  );
}
