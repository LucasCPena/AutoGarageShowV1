import type { ReactNode } from "react";

import { cookies } from "next/headers";

import SitePrelaunchScreen from "@/components/SitePrelaunchScreen";
import { getUserFromAuthToken } from "@/lib/auth-middleware";
import { AUTH_COOKIE_NAME } from "@/lib/auth-token";
import { hasPublicListingPageAccess } from "@/lib/public-listing-access";
import { isUserFullyApproved } from "@/lib/userProfiles";

type Props = {
  children: ReactNode;
};

export default async function SiteAccessGate({ children }: Props) {
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
  const user = await getUserFromAuthToken(token);
  const hasLimitedListingAccess = hasPublicListingPageAccess(cookieStore);
  const hasFullSiteAccess = isUserFullyApproved(user);

  if (!hasFullSiteAccess && !hasLimitedListingAccess) {
    return <SitePrelaunchScreen />;
  }

  return <>{children}</>;
}
