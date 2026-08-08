import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/candidatos/[id] — dashboard individual do candidato
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const candidato = await prisma.candidato.findUnique({
    where: { id: params.id },
    include: { vaga: true },
  });

  if (!candidato) {
    return NextResponse.json({ erro: "Candidato não encontrado." }, { status: 404 });
  }

  return NextResponse.json(candidato);
}

// PATCH /api/candidatos/[id] — RH pode sobrescrever status e adicionar observações
// (seção 37 do spec: humano no controle — toda alteração fica registrada)
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  const candidato = await prisma.candidato.update({
    where: { id: params.id },
    data: {
      statusRH: body.statusRH ?? undefined,
      observacoesRH: body.observacoesRH ?? undefined,
    },
  });

  return NextResponse.json(candidato);
}
