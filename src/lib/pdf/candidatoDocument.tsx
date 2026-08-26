// ==========================================================
// RELATÓRIO EM PDF — CANDIDATO INDIVIDUAL
// Usa @react-pdf/renderer (gera o PDF direto no servidor,
// sem precisar de navegador headless — funciona bem na Vercel).
// ==========================================================

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#1f2937" },
  header: { marginBottom: 16, borderBottom: 1, borderColor: "#e5e7eb", paddingBottom: 12 },
  brand: { fontSize: 9, color: "#6b7280", marginBottom: 4 },
  nome: { fontSize: 18, fontWeight: "bold", marginBottom: 2 },
  vagaTexto: { fontSize: 10, color: "#6b7280" },
  scoreLinha: { flexDirection: "row", alignItems: "flex-end", marginTop: 10 },
  scoreNumero: { fontSize: 26, fontWeight: "bold", color: "#4f46e5", marginRight: 8 },
  scoreLabel: { fontSize: 9, color: "#6b7280" },
  secao: { marginTop: 14 },
  secaoTitulo: { fontSize: 12, fontWeight: "bold", marginBottom: 6, color: "#111827" },
  paragrafo: { fontSize: 10, lineHeight: 1.5, color: "#374151" },
  bullet: { flexDirection: "row", marginBottom: 4 },
  bulletMarker: { width: 14, fontSize: 10 },
  bulletTexto: { flex: 1, fontSize: 10, color: "#374151", lineHeight: 1.4 },
  requisitoLinha: { marginBottom: 6, borderBottom: 1, borderColor: "#f3f4f6", paddingBottom: 4 },
  requisitoTitulo: { fontSize: 10, fontWeight: "bold" },
  requisitoEvidencia: { fontSize: 9, color: "#9ca3af", fontStyle: "italic", marginTop: 1 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    fontSize: 8,
    color: "#9ca3af",
    textAlign: "center",
    borderTop: 1,
    borderColor: "#e5e7eb",
    paddingTop: 8,
  },
});

function statusTexto(status: string) {
  if (status === "atendido") return "[Atendido]";
  if (status === "parcial") return "[Parcial]";
  return "[Não identificado]";
}

export function CandidatoDocument({ candidato, vaga }: { candidato: any; vaga: any }) {
  const a = candidato.analise || {};
  const nome = a.dadosPessoais?.nome || candidato.nomeArquivo;
  const dataGeracao = new Date().toLocaleDateString("pt-BR");
  const contato = [a.dadosPessoais?.cidade, a.dadosPessoais?.telefone, a.dadosPessoais?.email]
    .filter(Boolean)
    .join("   ·   ");

  return (
    <Document title={`Relatorio - ${nome}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>TRIAGEM IA — Relatório de Análise de Currículo</Text>
          <Text style={styles.nome}>{nome}</Text>
          <Text style={styles.vagaTexto}>
            Vaga: {vaga?.titulo || "—"}
            {vaga?.area ? `  ·  ${vaga.area}` : ""}
          </Text>
          <View style={styles.scoreLinha}>
            <Text style={styles.scoreNumero}>{candidato.scoreGeral ?? "—"}</Text>
            <Text style={styles.scoreLabel}>
              Score geral de aderência{"\n"}
              Status RH: {candidato.statusRH ? candidato.statusRH.replace("_", " ") : "não definido"}
            </Text>
          </View>
        </View>

        {contato ? (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Dados de contato</Text>
            <Text style={styles.paragrafo}>{contato}</Text>
          </View>
        ) : null}

        {a.resumoExecutivo ? (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Resumo executivo</Text>
            <Text style={styles.paragrafo}>{a.resumoExecutivo}</Text>
          </View>
        ) : null}

        {a.pontosFortesPrincipais?.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Pontos fortes</Text>
            {a.pontosFortesPrincipais.map((p: string, i: number) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletMarker}>+</Text>
                <Text style={styles.bulletTexto}>{p}</Text>
              </View>
            ))}
          </View>
        )}

        {a.gaps?.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Gaps / pontos a validar</Text>
            {a.gaps.map((g: string, i: number) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletMarker}>•</Text>
                <Text style={styles.bulletTexto}>{g}</Text>
              </View>
            ))}
          </View>
        )}

        {a.requisitosAtendidos?.length > 0 && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Requisitos atendidos</Text>
            {a.requisitosAtendidos.map((r: any, i: number) => (
              <View key={i} style={styles.requisitoLinha} wrap={false}>
                <Text style={styles.requisitoTitulo}>
                  {statusTexto(r.status)} {r.requisito}
                </Text>
                {r.evidencia ? <Text style={styles.requisitoEvidencia}>"{r.evidencia}"</Text> : null}
              </View>
            ))}
          </View>
        )}

        {(a.senioridade || a.trajetoria) && (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Senioridade e trajetória</Text>
            {a.senioridade ? (
              <Text style={styles.paragrafo}>
                Avaliação de senioridade: {a.senioridade.avaliacao}. {a.senioridade.explicacao}
              </Text>
            ) : null}
            {a.senioridade?.alertaSobrequalificacao ? (
              <Text style={[styles.paragrafo, { marginTop: 4, color: "#92400e" }]}>
                Alerta: {a.senioridade.alertaSobrequalificacao}
              </Text>
            ) : null}
            {a.trajetoria?.evolucaoProfissional ? (
              <Text style={[styles.paragrafo, { marginTop: 4 }]}>{a.trajetoria.evolucaoProfissional}</Text>
            ) : null}
          </View>
        )}

        {a.perguntasEntrevistaPersonalizadas?.length > 0 && (
          <View style={styles.secao} break>
            <Text style={styles.secaoTitulo}>Perguntas sugeridas para entrevista</Text>
            {a.perguntasEntrevistaPersonalizadas.map((p: string, i: number) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletMarker}>{i + 1}.</Text>
                <Text style={styles.bulletTexto}>{p}</Text>
              </View>
            ))}
          </View>
        )}

        {candidato.observacoesRH ? (
          <View style={styles.secao}>
            <Text style={styles.secaoTitulo}>Observações do RH</Text>
            <Text style={styles.paragrafo}>{candidato.observacoesRH}</Text>
          </View>
        ) : null}

        <Text style={styles.footer} fixed>
          Relatório gerado por IA em {dataGeracao} — análise sempre sujeita à validação humana do RH. Documento de uso interno.
        </Text>
      </Page>
    </Document>
  );
}
