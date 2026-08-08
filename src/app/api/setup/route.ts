import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/setup
// Visite essa URL UMA VEZ depois do primeiro deploy para criar as tabelas
// do banco de dados, sem precisar de terminal. É seguro rodar mais de uma
// vez (usa "IF NOT EXISTS", não apaga nada que já existe).
export async function GET() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Vaga" (
        "id" TEXT PRIMARY KEY,
        "titulo" TEXT NOT NULL,
        "area" TEXT,
        "departamento" TEXT,
        "gestorResponsavel" TEXT,
        "localidade" TEXT,
        "modalidade" TEXT,
        "tipoContratacao" TEXT,
        "faixaSalarial" TEXT,
        "escolaridadeMinima" TEXT,
        "experienciaMinima" TEXT,
        "descricaoCargo" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'triagem',
        "matrizCompetencias" JSONB,
        "pesosAprovados" JSONB,
        "jobDescriptionScore" JSONB,
        "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Candidato" (
        "id" TEXT PRIMARY KEY,
        "vagaId" TEXT NOT NULL REFERENCES "Vaga"("id") ON DELETE CASCADE,
        "nomeArquivo" TEXT NOT NULL,
        "textoBruto" TEXT NOT NULL,
        "dadosExtraidos" JSONB,
        "analise" JSONB,
        "perguntasEntrevista" JSONB,
        "scoreGeral" DOUBLE PRECISION,
        "status" TEXT NOT NULL DEFAULT 'pendente',
        "observacoesRH" TEXT,
        "statusRH" TEXT,
        "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "atualizadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Candidato_vagaId_idx" ON "Candidato"("vagaId");
    `);

    return NextResponse.json({
      ok: true,
      mensagem: "Tabelas criadas com sucesso! Pode voltar para o sistema e usar normalmente.",
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, erro: err.message },
      { status: 500 }
    );
  }
}
