import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { VagaComparativoDocument } from "@/lib/pdf/vagaComparativoDocument";

export const runtime = "nodejs";

// GET /api/vagas/[id]/pdf — baixa o relatório comparativo (ranking) da vaga em PDF
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const vaga = await prisma.vaga.findUnique({
    where: { id: params.id },
    include: { candidatos: true },
  });

  if (!vaga) {
    return NextResponse.json({ erro: "Vaga não encontrada." }, { status: 404 });
  }

  const candidatosAnalisados = [...vaga.candidatos]
    .filter((c) => c.status === "analisado")
    .sort((a, b) => (b.scoreGeral ?? -1) - (a.scoreGeral ?? -1));

  if (candidatosAnalisados.length === 0) {
    return NextResponse.json(
      { erro: "Nenhum candidato analisado ainda para gerar o relatório." },
      { status: 400 }
    );
  }

  const buffer = await renderToBuffer(
    <VagaComparativoDocument vaga={vaga} candidatos={candidatosAnalisados} />
  );

  const nomeSeguro = vaga.titulo
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\d]+/g, "-")
    .toLowerCase();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ranking-${nomeSeguro}.pdf"`,
    },
  });
}
