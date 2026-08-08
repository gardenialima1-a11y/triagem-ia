import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/vagas — lista todas as vagas (dashboard)
export async function GET() {
  const vagas = await prisma.vaga.findMany({
    orderBy: { criadoEm: "desc" },
    include: { _count: { select: { candidatos: true } } },
  });
  return NextResponse.json(vagas);
}

// POST /api/vagas — cria uma nova vaga
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.titulo || !body.descricaoCargo) {
    return NextResponse.json(
      { erro: "Título e descrição do cargo são obrigatórios." },
      { status: 400 }
    );
  }

  const vaga = await prisma.vaga.create({
    data: {
      titulo: body.titulo,
      area: body.area || null,
      departamento: body.departamento || null,
      gestorResponsavel: body.gestorResponsavel || null,
      localidade: body.localidade || null,
      modalidade: body.modalidade || null,
      tipoContratacao: body.tipoContratacao || null,
      faixaSalarial: body.faixaSalarial || null,
      escolaridadeMinima: body.escolaridadeMinima || null,
      experienciaMinima: body.experienciaMinima || null,
      descricaoCargo: body.descricaoCargo,
    },
  });

  return NextResponse.json(vaga, { status: 201 });
}
