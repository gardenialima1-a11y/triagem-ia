// ==========================================================
// MOTOR DE SCORING (seção 43 do spec)
// A IA interpreta e sugere notas por critério; este motor
// recalcula o score final de forma consistente e auditável,
// usando os pesos aprovados pelo RH (não os da IA "no ato").
// ==========================================================

export type Pesos = {
  experienciaFuncao: number;
  conhecimentoTecnico: number;
  competenciasComportamentais: number;
  experienciaSegmento: number;
  formacao: number;
  ferramentasSistemas: number;
  certificacoes: number;
};

export type ScoresIA = {
  geral: number;
  tecnico: number;
  comportamental: number;
  experiencia: number;
  senioridade: number;
  formacao: number;
  requisitosCriticos: number;
};

/**
 * Recalcula o score final combinando as notas por critério (dadas pela IA)
 * com os pesos aprovados pelo RH. Isso garante que, se o RH mudar um peso,
 * o score muda de forma previsível — sem precisar chamar a IA de novo.
 */
export function calcularScoreFinal(scoresIA: ScoresIA, pesos: Pesos): number {
  const somaPesos =
    pesos.experienciaFuncao +
    pesos.conhecimentoTecnico +
    pesos.competenciasComportamentais +
    pesos.experienciaSegmento +
    pesos.formacao +
    pesos.ferramentasSistemas +
    pesos.certificacoes;

  const pesosNormalizados =
    somaPesos > 0
      ? {
          experienciaFuncao: pesos.experienciaFuncao / somaPesos,
          conhecimentoTecnico: pesos.conhecimentoTecnico / somaPesos,
          competenciasComportamentais: pesos.competenciasComportamentais / somaPesos,
          experienciaSegmento: pesos.experienciaSegmento / somaPesos,
          formacao: pesos.formacao / somaPesos,
          ferramentasSistemas: pesos.ferramentasSistemas / somaPesos,
          certificacoes: pesos.certificacoes / somaPesos,
        }
      : pesos;

  const scoreFinal =
    scoresIA.experiencia * pesosNormalizados.experienciaFuncao +
    scoresIA.tecnico * (pesosNormalizados.conhecimentoTecnico + pesosNormalizados.ferramentasSistemas) +
    scoresIA.comportamental * pesosNormalizados.competenciasComportamentais +
    scoresIA.requisitosCriticos * pesosNormalizados.experienciaSegmento +
    scoresIA.formacao * (pesosNormalizados.formacao + pesosNormalizados.certificacoes);

  return Math.round(Math.min(100, Math.max(0, scoreFinal)));
}

export function classificarAderencia(score: number): string {
  if (score >= 90) return "Muito alta";
  if (score >= 75) return "Alta";
  if (score >= 60) return "Média";
  return "Baixa";
}

export function statusSugerido(score: number): "recomendar" | "avaliar" | "nao_priorizar" {
  if (score >= 80) return "recomendar";
  if (score >= 60) return "avaliar";
  return "nao_priorizar";
}

export const PESOS_PADRAO: Pesos = {
  experienciaFuncao: 25,
  conhecimentoTecnico: 20,
  competenciasComportamentais: 15,
  experienciaSegmento: 15,
  formacao: 10,
  ferramentasSistemas: 10,
  certificacoes: 5,
};
