import { NextResponse } from "next/server";

import { db, isMysqlRequiredError } from "@/lib/database";
import { logServerError } from "@/lib/server-log";
import { getUserDisplayName, isCompanyAccount, normalizeUserRecord } from "@/lib/userProfiles";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = await db.users.getAll();

    const services = users
      .map((user) => normalizeUserRecord(user))
      .filter(
        (user) =>
          user.marketplaceProfile === "services" &&
          isCompanyAccount(user) &&
          user.approvalStatus !== "pending"
      )
      .map((user) => ({
        id: user.id,
        displayName: getUserDisplayName(user),
        email: user.email,
        companyName: user.companyName,
        activityType: user.activityType,
        shortDescription: user.shortDescription,
        websiteUrl: user.websiteUrl,
        address: user.address,
        city: user.city,
        state: user.state,
        phone: user.phone,
        logoUrl: user.logoUrl,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ services });
  } catch (error) {
    logServerError("Erro ao buscar servicos publicos", error);
    if (isMysqlRequiredError(error)) {
      return NextResponse.json(
        { error: "Banco de dados indisponivel no momento." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
