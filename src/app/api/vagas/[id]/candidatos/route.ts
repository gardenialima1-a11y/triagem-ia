import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extrairTextoArquivo } from "@/lib/extrairTexto";

export const runtime = "nodejs";

// POST /api/vagas/[id]/candidatos — upload em lote (seção 7 do spec)
// Só extrai o texto e salva o candidato como "pendente".
// A análise da IA é feita depois, currículo por currículo, pelo
// endpoint /api/candidatos/[id]/analisar — isso evita timeout do
// servidor quando o RH sobe muitos currículos de uma vez.
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const vaga = await prisma.vaga.findUnique({ where: { id: params.id } });
  if (!vaga) {
    return NextResponse.json({ erro: "Vaga não encontrada." }, { status: 404 });
  }

  const formData = await req.formData();
  const arquivos = formData.getAll("arquivos") as File[];

  if (!arquivos.length) {
    return NextResponse.json({ erro: "Nenhum arquivo enviado." }, { status: 400 });
  }

  const resultados = [];

  for (const arquivo of arquivos) {
    try {
      const buffer = Buffer.from(await arquivo.arrayBuffer());
      const { texto, aviso } = await extrairTextoArquivo(buffer, arquivo.name);

      const candidato = await prisma.candidato.create({
        data: {
          vagaId: params.id,
          nomeArquivo: arquivo.name,
          textoBruto: texto,
          status: aviso ? "erro" : "pendente",
          analise: aviso ? { avisoExtracao: aviso } : undefined,
        },
      });

      resultados.push({ id: candidato.id, nomeArquivo: arquivo.name, ok: !aviso, aviso });
    } catch (err: any) {
      resultados.push({ nomeArquivo: arquivo.name, ok: false, aviso: err.message });
    }
  }

  return NextResponse.json({ resultados });
}
