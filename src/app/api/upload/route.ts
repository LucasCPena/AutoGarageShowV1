import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { db, isMysqlRequiredError } from '@/lib/database';
import { getUploadsStorageDir, resolveUploadPathFromUrlPath } from '@/lib/uploads-storage';

const UPLOAD_DIR = getUploadsStorageDir();

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

    const allowedTypes =
      type === "site"
        ? Array.from(new Set([...baseAllowedTypes, "ico"]))
        : baseAllowedTypes;
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return NextResponse.json(
        { error: `Tipo de arquivo não permitido. Tipos permitidos: ${allowedTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Validar tamanho (máximo 5MB por padrão)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 5MB' },
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
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2);
    const fileName = `${timestamp}_${randomString}.${fileExtension}`;
    const filePath = path.join(typeDir, fileName);

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
