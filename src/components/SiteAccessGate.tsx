import type { ReactNode } from "react";

import { cookies } from "next/headers";

import SitePrelaunchScreen from "@/components/SitePrelaunchScreen";
import { getUserFromAuthToken } from "@/lib/auth-middleware";
import { AUTH_COOKIE_NAME } from "@/lib/auth-token";

type Props = {
  children: ReactNode;
};

export default async function SiteAccessGate({ children }: Props) {
  const token = cookies().get(AUTH_COOKIE_NAME)?.value ?? null;
  const user = await getUserFromAuthToken(token);

  if (!user) {
    return <SitePrelaunchScreen />;
  }

  return <>{children}</>;
}
