// ==========================================================
// RELATÓRIO EM PDF — COMPARATIVO DE CANDIDATOS DA VAGA
// Tabela de ranking pronta para levar em reunião de fechamento.
// ==========================================================

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica", color: "#1f2937" },
  header: { marginBottom: 14, borderBottom: 1, borderColor: "#e5e7eb", paddingBottom: 10 },
  brand: { fontSize: 8, color: "#6b7280", marginBottom: 3 },
  titulo: { fontSize: 16, fontWeight: "bold" },
  subtitulo: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  tabela: { marginTop: 10 },
  linhaCabecalho: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  linha: {
    flexDirection: "row",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderBottom: 1,
    borderColor: "#f3f4f6",
  },
  colPos: { width: "6%", fontSize: 9 },
  colNome: { width: "24%", fontSize: 9, fontWeight: "bold" },
  colScore: { width: "9%", fontSize: 9 },
  colStatus: { width: "14%", fontSize: 9, textTransform: "capitalize" },
  colFortes: { width: "47%", fontSize: 8, color: "#4b5563" },
  cabecalhoTexto: { fontSize: 8, fontWeight: "bold", color: "#374151" },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 28,
    right: 28,
    fontSize: 7,
    color: "#9ca3af",
    textAlign: "center",
    borderTop: 1,
    borderColor: "#e5e7eb",
    paddingTop: 6,
  },
});

export function VagaComparativoDocument({ vaga, candidatos }: { vaga: any; candidatos: any[] }) {
  const dataGeracao = new Date().toLocaleDateString("pt-BR");

  return (
    <Document title={`Ranking comparativo - ${vaga.titulo}`}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>TRIAGEM IA — Relatório Comparativo de Candidatos</Text>
          <Text style={styles.titulo}>{vaga.titulo}</Text>
          <Text style={styles.subtitulo}>
            {vaga.area || "Área não informada"} · {vaga.localidade || "Localidade não informada"} ·{" "}
            {candidatos.length} candidato(s) analisado(s)
          </Text>
        </View>

        <View style={styles.tabela}>
          <View style={styles.linhaCabecalho} fixed>
            <Text style={[styles.cabecalhoTexto, { width: "6%" }]}>#</Text>
            <Text style={[styles.cabecalhoTexto, { width: "24%" }]}>Candidato</Text>
            <Text style={[styles.cabecalhoTexto, { width: "9%" }]}>Score</Text>
            <Text style={[styles.cabecalhoTexto, { width: "14%" }]}>Status RH</Text>
            <Text style={[styles.cabecalhoTexto, { width: "47%" }]}>Principais pontos fortes</Text>
          </View>
          {candidatos.map((c, i) => {
            const a = c.analise || {};
            return (
              <View key={c.id} style={styles.linha} wrap={false}>
                <Text style={styles.colPos}>{i + 1}º</Text>
                <Text style={styles.colNome}>{a.dadosPessoais?.nome || c.nomeArquivo}</Text>
                <Text style={styles.colScore}>{c.scoreGeral ?? "—"}</Text>
                <Text style={styles.colStatus}>
                  {c.statusRH ? c.statusRH.replace("_", " ") : "—"}
                </Text>
                <Text style={styles.colFortes}>
                  {(a.pontosFortesPrincipais || []).slice(0, 2).join("  ·  ") || "—"}
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.footer} fixed>
          Relatório gerado por IA em {dataGeracao} — ranking sugerido; a decisão final é sempre do RH.
        </Text>
      </Page>
    </Document>
  );
}
