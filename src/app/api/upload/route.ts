import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { db, isMysqlRequiredError } from '@/lib/database';
import { getUploadsStorageDir, resolveUploadPathFromUrlPath } from '@/lib/uploads-storage';

const UPLOAD_DIR = getUploadsStorageDir();

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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const rawType = formData.get('type');
    const type =
      typeof rawType === "string" && rawType.trim()
        ? rawType.trim()
        : "misc"; // 'listing', 'event', 'banner', 'site'
    
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    let baseAllowedTypes = ['jpg', 'jpeg', 'png', 'webp'];
    try {
      const settings = await db.settings.get();
      if (Array.isArray(settings?.events?.allowedImageTypes) && settings.events.allowedImageTypes.length > 0) {
        baseAllowedTypes = settings.events.allowedImageTypes;
      }
    } catch (error) {
      // Keep upload available even if settings storage is temporarily unavailable.
      if (isMysqlRequiredError(error)) {
        console.warn('[upload] settings indisponivel; usando tipos padrao de imagem.');
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
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Tipo de arquivo não permitido. Tipos permitidos: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validar tamanho
    const maxSize = isListingVideoUpload ? 100 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Arquivo muito grande. Tamanho maximo: ${isListingVideoUpload ? '100MB' : '5MB'}` },
        { status: 400 }
      );
    }

    // Criar diretório se não existir
    const typeDir = path.join(UPLOAD_DIR, type);
    try {
      await fs.access(typeDir);
    } catch {
      await fs.mkdir(typeDir, { recursive: true });
    }

    // Gerar nome único
    const rawAlt = formData.get("alt");
    const baseSource =
      typeof rawAlt === "string" && rawAlt.trim()
        ? rawAlt
        : file.name;
    const baseName = sanitizeFileBaseName(baseSource);
    const { fileName, filePath } = await buildUniqueFileName(typeDir, baseName, fileExtension);

    // Salvar arquivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await fs.writeFile(filePath, buffer);

    // Retornar URL pública
    const publicUrl = `/uploads/${type}/${fileName}`;

    return NextResponse.json({
      url: publicUrl,
      fileName,
      size: file.size,
      type: file.type
    });
  } catch (error) {
    console.error('Erro ao fazer upload:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL não fornecida' },
        { status: 400 }
      );
    }

    // Remover prefixo /uploads/
    const filePath = resolveUploadPathFromUrlPath(url);
    
    try {
      await fs.unlink(filePath);
      return NextResponse.json({ message: 'Arquivo excluído com sucesso' });
    } catch {
      return NextResponse.json(
        { error: 'Arquivo não encontrado' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Erro ao excluir arquivo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
