import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chamarIAJson, promptInterpretarVaga } from "@/lib/ai";
import { PESOS_PADRAO } from "@/lib/scoring";

// POST /api/vagas/[id]/interpretar
// Botão "Analisar vaga com IA" (seção 39, etapa 3 do spec)
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const vaga = await prisma.vaga.findUnique({ where: { id: params.id } });
  if (!vaga) {
    return NextResponse.json({ erro: "Vaga não encontrada." }, { status: 404 });
  }

  try {
    const { system, prompt } = promptInterpretarVaga(vaga.descricaoCargo, {
      titulo: vaga.titulo,
      area: vaga.area,
      localidade: vaga.localidade,
      modalidade: vaga.modalidade,
      experienciaMinima: vaga.experienciaMinima,
      escolaridadeMinima: vaga.escolaridadeMinima,
    });

    const resultado = await chamarIAJson<any>({ system, prompt, maxTokens: 8000 });

    // Converte os pesos sugeridos pela IA (formato com explicação) em pesos simples,
    // já pré-preenchidos para o RH aprovar/editar (modo híbrido — seção 34)
    const pesosSimples = resultado.pesosSugeridos
      ? {
          experienciaFuncao: resultado.pesosSugeridos.experienciaFuncao?.peso ?? PESOS_PADRAO.experienciaFuncao,
          conhecimentoTecnico: resultado.pesosSugeridos.conhecimentoTecnico?.peso ?? PESOS_PADRAO.conhecimentoTecnico,
          competenciasComportamentais: resultado.pesosSugeridos.competenciasComportamentais?.peso ?? PESOS_PADRAO.competenciasComportamentais,
          experienciaSegmento: resultado.pesosSugeridos.experienciaSegmento?.peso ?? PESOS_PADRAO.experienciaSegmento,
          formacao: resultado.pesosSugeridos.formacao?.peso ?? PESOS_PADRAO.formacao,
          ferramentasSistemas: resultado.pesosSugeridos.ferramentasSistemas?.peso ?? PESOS_PADRAO.ferramentasSistemas,
          certificacoes: resultado.pesosSugeridos.certificacoes?.peso ?? PESOS_PADRAO.certificacoes,
        }
      : PESOS_PADRAO;

    const vagaAtualizada = await prisma.vaga.update({
      where: { id: params.id },
      data: {
        matrizCompetencias: resultado,
        pesosAprovados: pesosSimples,
        jobDescriptionScore: resultado.jobDescriptionScore ?? null,
      },
    });

    return NextResponse.json(vagaAtualizada);
  } catch (err: any) {
    return NextResponse.json(
      { erro: `Erro ao interpretar a vaga com IA: ${err.message}` },
      { status: 500 }
    );
  }
}
