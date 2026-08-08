// ==========================================================
// CAMADA DE ABSTRAÇÃO DE IA
// (seção 42 do spec: permite trocar o modelo de IA no futuro
// sem precisar reconstruir o sistema — toda chamada de IA
// passa por esta função)
//
// Usando o Google Gemini (tier gratuito, sem cartão de crédito).
// Se um dia você quiser trocar para outro modelo, só precisa
// mexer neste arquivo — o resto do sistema não muda.
// ==========================================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

type ChamadaIA = {
  system: string;
  prompt: string;
  maxTokens?: number;
};

/**
 * Chama a IA (Google Gemini) e espera receber APENAS um JSON como resposta.
 * Faz a limpeza de possíveis blocos de markdown (```json ... ```)
 * e lança erro claro se a resposta não for um JSON válido.
 */
export async function chamarIAJson<T = any>({
  system,
  prompt,
  maxTokens = 4000,
}: ChamadaIA): Promise<T> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY não configurada. Adicione essa variável de ambiente no Vercel."
    );
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        responseMimeType: "application/json",
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro na chamada da IA (${response.status}): ${errText}`);
  }

  const data = await response.json();

  const rawText: string =
    data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";

  if (!rawText) {
    const motivoBloqueio = data.candidates?.[0]?.finishReason;
    throw new Error(
      `A IA não retornou conteúdo (motivo: ${motivoBloqueio ?? "desconhecido"}). Resposta bruta: ${JSON.stringify(data).slice(0, 500)}`
    );
  }

  const cleaned = rawText
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(
      `A IA retornou um JSON inválido. Resposta bruta: ${rawText.slice(0, 500)}`
    );
  }
}

// ----------------------------------------------------------
// PROMPT 1 — Interpretação da vaga (seção 4, 5, 6, 29 do spec)
// ----------------------------------------------------------
export function promptInterpretarVaga(descricaoCargo: string, camposVaga: Record<string, any>) {
  return {
    system: `Você é um Recruiter Sênior + Business Partner de RH + especialista em seleção por competências, com mais de 15 anos de experiência em Recrutamento & Seleção no Brasil.

Sua tarefa é interpretar a descrição de uma vaga e transformá-la em uma Matriz Inteligente de Competências e Requisitos.

REGRAS IMPORTANTES:
- Nunca invente informações que não estão na descrição da vaga.
- Separe claramente requisitos eliminatórios, críticos e desejáveis.
- Separe competências técnicas de competências comportamentais.
- Sugira pesos (que somem 100) explicando o motivo de cada peso.
- Avalie a qualidade da própria descrição da vaga (clareza, excesso de requisitos, requisitos conflitantes).
- Responda SOMENTE com um JSON válido, sem nenhum texto antes ou depois, seguindo EXATAMENTE este formato:

{
  "requisitosEliminatorios": [{"item": "string", "motivo": "string"}],
  "requisitosCriticos": [{"item": "string", "motivo": "string"}],
  "requisitosDesejaveis": [{"item": "string", "motivo": "string"}],
  "competenciasTecnicas": ["string"],
  "competenciasComportamentais": ["string"],
  "pesosSugeridos": {
    "experienciaFuncao": {"peso": 0, "explicacao": "string"},
    "conhecimentoTecnico": {"peso": 0, "explicacao": "string"},
    "competenciasComportamentais": {"peso": 0, "explicacao": "string"},
    "experienciaSegmento": {"peso": 0, "explicacao": "string"},
    "formacao": {"peso": 0, "explicacao": "string"},
    "ferramentasSistemas": {"peso": 0, "explicacao": "string"},
    "certificacoes": {"peso": 0, "explicacao": "string"}
  },
  "perguntasEntrevistaSugeridas": ["string"],
  "riscosContratacao": ["string"],
  "indicadoresSucessoFuncao": ["string"],
  "jobDescriptionScore": {
    "nota": 0,
    "clareza": "string",
    "excessoDeRequisitos": "string",
    "requisitosConflitantes": "string",
    "recomendacoes": ["string"]
  }
}`,
    prompt: `Dados adicionais da vaga (campos preenchidos pelo RH):
${JSON.stringify(camposVaga, null, 2)}

Descrição completa do cargo (colada pelo RH):
"""
${descricaoCargo}
"""

Gere a Matriz Inteligente de Competências e Requisitos seguindo exatamente o formato JSON especificado.`,
  };
}

// ----------------------------------------------------------
// PROMPT 2 — Extração + análise do currículo (seções 8-25 do spec)
// ----------------------------------------------------------
export function promptAnalisarCurriculo(
  textoCurriculo: string,
  matrizVaga: any,
  pesos: any
) {
  return {
    system: `Você é um Recruiter Sênior especialista em análise de currículos por competências e evidências, atuando como Business Partner estratégico de RH.

Você NUNCA deve:
- Inventar informações que não estejam explícitas ou claramente inferíveis do currículo.
- Usar gênero, idade, raça/cor, religião, orientação sexual, estado civil, deficiência (exceto quando legalmente pertinente à função), foto ou endereço exato como critério de avaliação.
- Afirmar que o candidato "não possui" uma competência — em vez disso, diga "não foi identificada evidência no currículo analisado".
- Acusar o candidato de inconsistência ou mentira — use sempre "ponto a validar".

Você SEMPRE deve:
- Basear cada pontuação em evidências textuais concretas do currículo (cite o trecho).
- Diferenciar evidência explícita de inferência da IA, indicando o nível de confiança (alta/média/baixa).
- Considerar contexto semântico, não apenas palavras-chave (ex: "gestão de equipe de 15 pessoas" é evidência de liderança mesmo sem a palavra "liderança").
- Avaliar aderência à SENIORIDADE da vaga, não apenas volume de experiência (sobrequalificação também é um alerta).
- Dar mais peso a resultados mensuráveis do que a descrições de atividades genéricas.
- Analisar a trajetória profissional (estabilidade, evolução, lacunas) sem tratar automaticamente lacunas como risco — apenas sinalizar para investigação.

A matriz de requisitos e pesos desta vaga é:
${JSON.stringify(matrizVaga, null, 2)}

Pesos finais aprovados pelo RH:
${JSON.stringify(pesos, null, 2)}

Responda SOMENTE com um JSON válido, sem texto antes ou depois, seguindo EXATAMENTE este formato:

{
  "dadosPessoais": {
    "nome": "string ou null", "cidade": "string ou null", "telefone": "string ou null",
    "email": "string ou null", "linkedin": "string ou null", "cargoAtual": "string ou null"
  },
  "formacao": [{"curso": "string", "instituicao": "string ou null", "nivel": "string", "situacao": "string ou null"}],
  "experiencias": [{
    "empresa": "string", "cargo": "string", "periodo": "string", "duracaoMeses": 0,
    "segmento": "string ou null", "responsabilidades": "string",
    "resultadosMensuraveis": ["string"], "ferramentasCitadas": ["string"]
  }],
  "resumoExecutivo": "string (2-4 frases no estilo de um recruiter sênior)",
  "scores": {
    "geral": 0, "tecnico": 0, "comportamental": 0, "experiencia": 0,
    "senioridade": 0, "formacao": 0, "requisitosCriticos": 0
  },
  "composicaoScore": [{"criterio": "string", "peso": 0, "nota": 0, "justificativa": "string"}],
  "pontosFortesPrincipais": ["string"],
  "gaps": ["string (usando linguagem 'não foi identificada evidência de...')"],
  "requisitosAtendidos": [{"requisito": "string", "status": "atendido|parcial|nao_identificado", "evidencia": "string ou null", "confianca": "alta|media|baixa"}],
  "evidencias": [{"competencia": "string", "score": 0, "trechoEvidencia": "string", "fonteExperiencia": "string", "confianca": "alta|media|baixa"}],
  "trajetoria": {
    "tempoMedioEmpresasMeses": 0,
    "movimentacoesCurtas": 0,
    "evolucaoProfissional": "string",
    "coerenciaComVaga": 0,
    "pontosParaInvestigar": ["string"]
  },
  "senioridade": {
    "avaliacao": "abaixo|adequado|acima",
    "explicacao": "string",
    "alertaSobrequalificacao": "string ou null"
  },
  "inconsistenciasPontosAValidar": ["string"],
  "forcaDasEvidenciasDeResultados": "alta|media|baixa",
  "perguntasEntrevistaPersonalizadas": ["string (perguntas específicas sobre este currículo)"],
  "recomendacaoProximaEtapa": "recomendar|avaliar|nao_priorizar"
}`,
    prompt: `Texto extraído do currículo:
"""
${textoCurriculo.slice(0, 15000)}
"""

Analise este currículo em relação à vaga e retorne o JSON completo conforme especificado.`,
  };
}
