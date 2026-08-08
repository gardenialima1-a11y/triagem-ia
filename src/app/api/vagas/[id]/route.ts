import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularScoreFinal, statusSugerido } from "@/lib/scoring";

// GET /api/vagas/[id] — detalhe da vaga + candidatos (ranking)
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const vaga = await prisma.vaga.findUnique({
    where: { id: params.id },
    include: {
      candidatos: { orderBy: { scoreGeral: "desc" } },
    },
  });

  if (!vaga) {
    return NextResponse.json({ erro: "Vaga não encontrada." }, { status: 404 });
  }

  return NextResponse.json(vaga);
}

// PATCH /api/vagas/[id] — RH aprova/edita a matriz de pesos (seção 34 e 37 do spec)
// Se os pesos mudarem, recalcula o score de todos os candidatos já analisados,
// sem precisar chamar a IA de novo (motor de scoring estruturado — seção 43).
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();

  const vaga = await prisma.vaga.update({
    where: { id: params.id },
    data: {
      pesosAprovados: body.pesosAprovados,
      matrizCompetencias: body.matrizCompetencias ?? undefined,
      status: body.status ?? undefined,
    },
    include: { candidatos: true },
  });

  if (body.pesosAprovados) {
    for (const candidato of vaga.candidatos) {
      const analise = candidato.analise as any;
      if (analise?.scores) {
        const novoScore = calcularScoreFinal(analise.scores, body.pesosAprovados);
        await prisma.candidato.update({
          where: { id: candidato.id },
          data: {
            scoreGeral: novoScore,
            statusRH: candidato.statusRH ?? statusSugerido(novoScore),
          },
        });
      }
    }
  }

  return NextResponse.json(vaga);
}
