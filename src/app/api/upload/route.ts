import { promises as fs } from "fs";
import path from "path";

import { NextRequest, NextResponse } from "next/server";

import { getUserFromToken, requireAuth } from "@/lib/auth-middleware";
import { db, isMysqlRequiredError } from "@/lib/database";
import { logServerError } from "@/lib/server-log";
import { getUploadsStorageDir, resolveUploadPathFromUrlPath } from "@/lib/uploads-storage";

const UPLOAD_DIR = getUploadsStorageDir();
const ALLOWED_UPLOAD_TYPES = new Set([
  "listing",
  "listing-video",
  "event",
  "banner",
  "site",
  "news"
]);

const MIME_BY_EXTENSION: Record<string, string[]> = {
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  webp: ["image/webp"],
  ico: ["image/x-icon", "image/vnd.microsoft.icon"],
  mp4: ["video/mp4"],
  webm: ["video/webm"],
  mov: ["video/quicktime", "video/mov"]
};

function sanitizeFileBaseName(value: string) {
  const cleaned = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\.[^/.]+$/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return cleaned || "arquivo";
}

async function buildUniqueFileName(directory: string, baseName: string, extension: string) {
  let attempt = 0;

  while (attempt < 9999) {
    const suffix = attempt === 0 ? "" : `-${attempt + 1}`;
    const candidate = `${baseName}${suffix}.${extension}`;
    const candidatePath = path.join(directory, candidate);

    try {
      await fs.access(candidatePath);
      attempt += 1;
    } catch {
      return { fileName: candidate, filePath: candidatePath };
    }
  }

  const fallbackName = `${baseName}-${Date.now()}.${extension}`;
  return {
    fileName: fallbackName,
    filePath: path.join(directory, fallbackName)
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request);
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const rawType = formData.get("type");
    const type =
      typeof rawType === "string" && rawType.trim()
        ? rawType.trim()
        : "misc";

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    if (!ALLOWED_UPLOAD_TYPES.has(type)) {
      return NextResponse.json({ error: "Tipo de upload invalido." }, { status: 400 });
    }

    const requiresAdmin = type === "banner" || type === "site" || type === "news";
    const requiresAuth = requiresAdmin || type === "listing" || type === "listing-video";

    if (requiresAuth && !user) {
      return NextResponse.json(
        { error: "Faca login para enviar este arquivo." },
        { status: 401 }
      );
    }

    if (requiresAdmin && user?.role !== "admin") {
      return NextResponse.json(
        { error: "Apenas administradores podem enviar este tipo de arquivo." },
        { status: 403 }
      );
    }

    let baseAllowedTypes = ["jpg", "jpeg", "png", "webp"];
    try {
      const settings = await db.settings.get();
      if (
        Array.isArray(settings?.events?.allowedImageTypes) &&
        settings.events.allowedImageTypes.length > 0
      ) {
        baseAllowedTypes = settings.events.allowedImageTypes;
      }
    } catch (error) {
      if (isMysqlRequiredError(error)) {
        console.warn("[upload] settings indisponivel; usando tipos padrao de imagem.");
      } else {
        throw error;
      }
    }

    const isListingVideoUpload = type === "listing-video";
    const allowedTypes = isListingVideoUpload
      ? ["mp4", "webm", "mov"]
      : type === "site"
        ? Array.from(new Set([...baseAllowedTypes, "ico"]))
        : baseAllowedTypes;
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return NextResponse.json(
        {
          error: `Tipo de arquivo nao permitido. Tipos permitidos: ${allowedTypes.join(", ")}`
        },
        { status: 400 }
      );
    }

    const expectedMimeTypes = MIME_BY_EXTENSION[fileExtension] || [];
    if (expectedMimeTypes.length > 0 && file.type && !expectedMimeTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "O arquivo enviado nao corresponde ao tipo informado." },
        { status: 400 }
      );
    }

    const maxSize = isListingVideoUpload ? 100 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `Arquivo muito grande. Tamanho maximo: ${isListingVideoUpload ? "100MB" : "5MB"}`
        },
        { status: 400 }
      );
    }

    const typeDir = path.join(UPLOAD_DIR, type);
    try {
      await fs.access(typeDir);
    } catch {
      await fs.mkdir(typeDir, { recursive: true });
    }

    const rawAlt = formData.get("alt");
    const baseSource = typeof rawAlt === "string" && rawAlt.trim() ? rawAlt : file.name;
    const baseName = sanitizeFileBaseName(baseSource);
    const { fileName, filePath } = await buildUniqueFileName(typeDir, baseName, fileExtension);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/${type}/${fileName}`;

    if (user) {
      await db.audit.create({
        actorUserId: user.id,
        action: "upload.create",
        entityType: "upload",
        status: "success",
        path: "/api/upload",
        metadata: {
          uploadType: type
        }
      });
    }

    return NextResponse.json({
      url: publicUrl,
      fileName,
      size: file.size,
      type: file.type
    });
  } catch (error) {
    logServerError("Erro ao fazer upload", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await requireAuth(request);
    const { searchParams } = new URL(request.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json({ error: "URL nao fornecida" }, { status: 400 });
    }

    const filePath = resolveUploadPathFromUrlPath(url);

    try {
      await fs.unlink(filePath);
      await db.audit.create({
        actorUserId: user.id,
        action: "upload.delete",
        entityType: "upload",
        status: "success",
        path: "/api/upload"
      });
      return NextResponse.json({ message: "Arquivo excluido com sucesso" });
    } catch {
      return NextResponse.json({ error: "Arquivo nao encontrado" }, { status: 404 });
    }
  } catch (error) {
    logServerError("Erro ao excluir arquivo", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
