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

// ----------------------------------------------------------
// MODELOS E PLANO B
// Antes o sistema usava 1 modelo só e, quando o Google estava
// sobrecarregado, ficava esperando 3s + 8s + 15s pelo MESMO modelo.
// Pior: se o Google simplesmente demorasse, não havia limite de
// tempo nenhum — a tela ficava contando segundos sem fim.
//
// Agora:
// 1) cada tentativa tem um tempo máximo (corta se travar);
// 2) se um modelo falhar ou travar, passa NA HORA para o próximo;
// 3) existe um prazo total, para SEMPRE devolver uma resposta
//    (ou um erro claro) antes do limite de 60s do Vercel.
// ----------------------------------------------------------

// Para interpretar a vaga: tarefa de organizar informação → modelos rápidos primeiro
export const MODELOS_RAPIDOS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.6-flash"];
// Para analisar currículo: tarefa de julgamento → modelo mais capaz primeiro
// (o 3.6-flash é de "geração anterior" e foi o que travou; o 3.8-flash é o atual)
export const MODELOS_ANALISE = ["gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

const PRAZO_TOTAL_MS = 52000; // margem de segurança antes dos 60s do Vercel

export type MetricasIA = {
  segundosTotal: number;   // tempo total que o usuário esperou
  modeloUsado: string;     // qual modelo respondeu
  tentativas: string[];    // o que aconteceu em cada tentativa
  tokensPensamento: number;
  tokensResposta: number;
};

type ChamadaIA = {
  system: string;
  prompt: string;
  maxTokens?: number;
  // Quanto a IA "pensa" antes de responder. Menos = mais rápido.
  pensamento?: "minimal" | "low" | "medium" | "high";
  // Ordem de modelos a tentar (o primeiro que responder vence)
  modelos?: string[];
  // Tempo máximo de cada tentativa, em milissegundos
  limitePorTentativaMs?: number;
  // Se for passado, é preenchido com o diagnóstico da chamada
  metricas?: Partial<MetricasIA>;
};

class FalhaTentativa extends Error {}

async function chamarUmModelo(
  modelo: string,
  corpo: any,
  limiteMs: number
): Promise<any> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${GEMINI_API_KEY}`;
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), limiteMs);
  try {
    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
      signal: controle.signal,
    });

    // Alguns modelos não aceitam a configuração de "pensamento".
    // Se reclamar disso, tenta de novo o mesmo modelo sem ela.
    if (response.status === 400) {
      const txt = await response.text();
      if (/thinking/i.test(txt)) {
        const { thinkingConfig, ...semPensamento } = corpo.generationConfig;
        response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...corpo, generationConfig: semPensamento }),
          signal: controle.signal,
        });
      } else {
        throw new FalhaTentativa(`erro 400: ${txt.slice(0, 200)}`);
      }
    }

    if (response.status === 429) throw new FalhaTentativa("limite gratuito de pedidos atingido (429)");
    if (response.status === 503) throw new FalhaTentativa("Google sobrecarregado (503)");
    if (response.status === 404) throw new FalhaTentativa("modelo não disponível para sua chave (404)");
    if (!response.ok) {
      const txt = await response.text();
      throw new FalhaTentativa(`erro ${response.status}: ${txt.slice(0, 200)}`);
    }
    return await response.json();
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new FalhaTentativa(`não respondeu em ${Math.round(limiteMs / 1000)}s`);
    }
    if (err instanceof FalhaTentativa) throw err;
    throw new FalhaTentativa(`falha de conexão: ${err?.message ?? err}`);
  } finally {
    clearTimeout(relogio);
  }
}

function lerJson(data: any): any {
  const rawText: string =
    data.candidates?.[0]?.content?.parts
      ?.filter((p: any) => !p.thought)
      .map((p: any) => p.text ?? "")
      .join("") ?? "";
  const finishReason = data.candidates?.[0]?.finishReason;

  if (!rawText) {
    throw new FalhaTentativa(`resposta vazia (motivo: ${finishReason ?? "desconhecido"})`);
  }

  const cleaned = rawText
    .trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    if (finishReason === "MAX_TOKENS") {
      throw new FalhaTentativa("resposta cortada (limite de tokens)");
    }
    throw new FalhaTentativa("JSON inválido na resposta");
  }
}

/**
 * Chama a IA (Google Gemini) e espera receber APENAS um JSON como resposta.
 * Tenta os modelos em ordem, com tempo máximo por tentativa e prazo total.
 */
export async function chamarIAJson<T = any>({
  system,
  prompt,
  maxTokens = 16000,
  pensamento = "low",
  modelos = MODELOS_ANALISE,
  limitePorTentativaMs = 40000,
  metricas,
}: ChamadaIA): Promise<T> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "GEMINI_API_KEY não configurada. Adicione essa variável de ambiente no Vercel."
    );
  }

  const inicio = Date.now();
  const historico: string[] = [];

  const corpo = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      responseMimeType: "application/json",
      temperature: 0.3,
      thinkingConfig: { thinkingLevel: pensamento },
    },
  };

  for (const modelo of modelos) {
    const restante = PRAZO_TOTAL_MS - (Date.now() - inicio);
    if (restante < 5000) {
      historico.push(`${modelo}: não tentado (sem tempo restante)`);
      break;
    }
    const t0 = Date.now();
    try {
      const data = await chamarUmModelo(modelo, corpo, Math.min(limitePorTentativaMs, restante));
      const resultado = lerJson(data);
      const seg = Math.round((Date.now() - t0) / 100) / 10;
      historico.push(`${modelo}: OK em ${seg}s`);

      const uso = data.usageMetadata ?? {};
      const m: MetricasIA = {
        segundosTotal: Math.round((Date.now() - inicio) / 100) / 10,
        modeloUsado: modelo,
        tentativas: historico,
        tokensPensamento: uso.thoughtsTokenCount ?? 0,
        tokensResposta: uso.candidatesTokenCount ?? 0,
      };
      console.log("[IA] diagnóstico:", JSON.stringify(m));
      if (metricas) Object.assign(metricas, m);
      return resultado as T;
    } catch (err: any) {
      const seg = Math.round((Date.now() - t0) / 100) / 10;
      historico.push(`${modelo}: ${err.message} (${seg}s)`);
      console.warn(`[IA] ${modelo} falhou: ${err.message}`);
    }
  }

  if (metricas) {
    Object.assign(metricas, {
      segundosTotal: Math.round((Date.now() - inicio) / 100) / 10,
      modeloUsado: "",
      tentativas: historico,
    });
  }
  throw new Error(
    `Nenhum modelo do Gemini conseguiu responder agora. O que aconteceu: ${historico.join(" | ")}. ` +
      `Se aparecer "limite gratuito" ou "sobrecarregado", é do lado do Google: aguarde 1-2 minutos e tente de novo.`
  );
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
- SEJA CONCISO (isso deixa a resposta mais rápida): cada "motivo" e cada "explicacao" com no máximo 1 frase curta (até 20 palavras); no máximo 6 itens por lista; no máximo 6 perguntas de entrevista.
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

SEJA CONCISO (isso deixa a análise mais rápida e evita travamentos):
- "responsabilidades": no máximo 2 frases por experiência; liste no máximo as 6 experiências mais recentes/relevantes.
- Cada "justificativa", "evidencia" e "trechoEvidencia": no máximo 1 frase curta (até 25 palavras).
- No máximo 6 itens em cada lista (pontos fortes, gaps, evidências, pontos a validar, perguntas).
- "requisitosAtendidos": apenas os requisitos eliminatórios e críticos da vaga.

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
