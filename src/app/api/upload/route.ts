import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { db } from '@/lib/database';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads');

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string; // 'listing', 'event', 'banner'
    
    if (!file) {
      return NextResponse.json(
        { error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    // Validar tipo de arquivo
    const settings = await db.settings.get();
    const allowedTypes = settings?.events.allowedImageTypes || ['jpg', 'jpeg', 'png', 'webp'];
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
    const filePath = path.join(process.cwd(), 'public', url);
    
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
