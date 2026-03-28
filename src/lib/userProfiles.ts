import type {
  ListingOwnerProfile,
  User,
  UserAccountType,
  UserApprovalStatus,
  UserVerificationStatus
} from "@/lib/database";
import { onlyDigits } from "@/lib/document";

export function normalizeUserAccountType(
  value: unknown,
  fallback: UserAccountType = "individual"
) {
  if (value === "company" || value === "agency" || value === "individual") {
    return value;
  }
  return fallback;
}

export function normalizeUserApprovalStatus(
  value: unknown,
  fallback: UserApprovalStatus = "approved"
) {
  return value === "pending" ? "pending" : fallback;
}

export function normalizeUserVerificationStatus(
  value: unknown,
  fallback: UserVerificationStatus = "unverified"
) {
  return value === "verified" ? "verified" : fallback;
}

export function inferDocumentType(document: string | undefined) {
  const digits = onlyDigits(document);
  if (digits.length === 11) return "cpf" as const;
  if (digits.length === 14) return "cnpj" as const;
  return undefined;
}

export function normalizeUserRecord(user: User): User {
  const documentType = user.documentType ?? inferDocumentType(user.document);
  const accountType =
    user.accountType ??
    (documentType === "cnpj" ? "company" : "individual");
  const approvalStatus =
    user.role === "admin"
      ? "approved"
      : normalizeUserApprovalStatus(user.approvalStatus, "approved");
  const verificationStatus =
    user.verificationStatus ??
    (documentType ? "verified" : "unverified");

  return {
    ...user,
    accountType,
    approvalStatus,
    verificationStatus,
    documentType,
    listingLimitOverride:
      typeof user.listingLimitOverride === "number"
        ? Math.max(0, Math.round(user.listingLimitOverride))
        : null
  };
}

export function isCompanyAccount(user: Pick<User, "accountType"> | null | undefined) {
  return user?.accountType === "company" || user?.accountType === "agency";
}

export function isAgencyAccount(user: Pick<User, "accountType"> | null | undefined) {
  return user?.accountType === "agency";
}

export function isUserFullyApproved(user: Pick<User, "role" | "approvalStatus"> | null | undefined) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.approvalStatus !== "pending";
}

export function getUserDisplayName(user: Pick<User, "name" | "companyName" | "accountType">) {
  if (isCompanyAccount(user) && user.companyName?.trim()) {
    return user.companyName.trim();
  }
  return user.name.trim();
}

export function toListingOwnerProfile(user: User | null | undefined): ListingOwnerProfile | undefined {
  if (!user) return undefined;
  const normalized = normalizeUserRecord(user);
  return {
    id: normalized.id,
    accountType: normalized.accountType ?? "individual",
    displayName: getUserDisplayName(normalized),
    companyName: normalized.companyName?.trim() || undefined,
    logoUrl: normalized.logoUrl?.trim() || undefined,
    approvalStatus: normalized.approvalStatus ?? "approved"
  };
}

