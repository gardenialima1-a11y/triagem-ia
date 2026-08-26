import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { CandidatoDocument } from "@/lib/pdf/candidatoDocument";

export const runtime = "nodejs";

// GET /api/candidatos/[id]/pdf — baixa o relatório individual do candidato em PDF
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

  if (candidato.status !== "analisado") {
    return NextResponse.json(
      { erro: "Este candidato ainda não foi analisado pela IA." },
      { status: 400 }
    );
  }

  const buffer = await renderToBuffer(
    <CandidatoDocument candidato={candidato} vaga={candidato.vaga} />
  );

  const nomeCandidato =
    (candidato.analise as any)?.dadosPessoais?.nome || candidato.nomeArquivo;
  const nomeSeguro = nomeCandidato
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\d]+/g, "-")
    .toLowerCase();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="relatorio-${nomeSeguro}.pdf"`,
    },
  });
}
