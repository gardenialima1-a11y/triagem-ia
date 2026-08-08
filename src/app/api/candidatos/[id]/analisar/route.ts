import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chamarIAJson, promptAnalisarCurriculo } from "@/lib/ai";
import { calcularScoreFinal, statusSugerido, PESOS_PADRAO } from "@/lib/scoring";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST /api/candidatos/[id]/analisar
export async function POST(
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

  if (!candidato.vaga.matrizCompetencias) {
    return NextResponse.json(
      { erro: "Analise a vaga com IA antes de analisar os currículos." },
      { status: 400 }
    );
  }

  const pesos = (candidato.vaga.pesosAprovados as any) ?? PESOS_PADRAO;

  try {
    const { system, prompt } = promptAnalisarCurriculo(
      candidato.textoBruto,
      candidato.vaga.matrizCompetencias,
      pesos
    );

    const analise = await chamarIAJson<any>({ system, prompt, maxTokens: 4000 });
    const scoreFinal = calcularScoreFinal(analise.scores, pesos);

    const atualizado = await prisma.candidato.update({
      where: { id: params.id },
      data: {
        dadosExtraidos: {
          dadosPessoais: analise.dadosPessoais,
          formacao: analise.formacao,
          experiencias: analise.experiencias,
        },
        analise,
        perguntasEntrevista: analise.perguntasEntrevistaPersonalizadas ?? [],
        scoreGeral: scoreFinal,
        statusRH: statusSugerido(scoreFinal),
        status: "analisado",
      },
    });

    return NextResponse.json(atualizado);
  } catch (err: any) {
    await prisma.candidato.update({
      where: { id: params.id },
      data: {
        status: "erro",
        analise: { erroProcessamento: err.message },
      },
    });
    return NextResponse.json(
      { erro: `Erro ao analisar currículo: ${err.message}` },
      { status: 500 }
    );
  }
}
