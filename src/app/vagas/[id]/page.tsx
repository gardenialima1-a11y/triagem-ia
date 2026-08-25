"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import BadgeAderencia from "@/components/BadgeAderencia";

export default function DetalheVagaPage({ params }: { params: { id: string } }) {
  const [vaga, setVaga] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [interpretando, setInterpretando] = useState(false);
  const [pesos, setPesos] = useState<any>(null);
  const [salvandoPesos, setSalvandoPesos] = useState(false);
  const [enviandoArquivos, setEnviandoArquivos] = useState(false);
  const [progressoAnalise, setProgressoAnalise] = useState({ feito: 0, total: 0 });
  const [reanalisandoId, setReanalisandoId] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  const carregarVaga = useCallback(async () => {
    const res = await fetch(`/api/vagas/${params.id}`);
    const data = await res.json();
    setVaga(data);
    if (data.pesosAprovados) setPesos(data.pesosAprovados);
    setCarregando(false);
  }, [params.id]);

  useEffect(() => {
    carregarVaga();
  }, [carregarVaga]);

  async function interpretarComIA() {
    setInterpretando(true);
    setErro("");
    const res = await fetch(`/api/vagas/${params.id}/interpretar`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setErro(data.erro || "Erro ao interpretar vaga.");
      setInterpretando(false);
      return;
    }
    setVaga(data);
    setPesos(data.pesosAprovados);
    setInterpretando(false);
  }

  async function salvarPesos() {
    setSalvandoPesos(true);
    const res = await fetch(`/api/vagas/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pesosAprovados: pesos }),
    });
    const data = await res.json();
    setVaga(data);
    setSalvandoPesos(false);
  }

  async function handleUpload(files: FileList | null) {
    if (!files || !files.length) return;
    setEnviandoArquivos(true);
    setErro("");

    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("arquivos", f));

    const res = await fetch(`/api/vagas/${params.id}/candidatos`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    setEnviandoArquivos(false);

    if (!res.ok) {
      setErro(data.erro || "Erro no upload.");
      return;
    }

    await carregarVaga();

    // dispara a análise da IA para cada currículo pendente, um de cada vez
    const idsParaAnalisar = data.resultados.filter((r: any) => r.ok).map((r: any) => r.id);
    setProgressoAnalise({ feito: 0, total: idsParaAnalisar.length });

    for (let i = 0; i < idsParaAnalisar.length; i++) {
      await fetch(`/api/candidatos/${idsParaAnalisar[i]}/analisar`, { method: "POST" });
      setProgressoAnalise({ feito: i + 1, total: idsParaAnalisar.length });
      await carregarVaga();
    }
  }

  // Reanalisa um único candidato (usado quando a análise deu erro ou
  // ficou pendente, sem precisar reenviar o arquivo do zero)
  async function reanalisarCandidato(id: string) {
    setReanalisandoId(id);
    setErro("");
    try {
      const res = await fetch(`/api/candidatos/${id}/analisar`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setErro(data.erro || "Erro ao reanalisar currículo.");
      }
    } finally {
      setReanalisandoId(null);
      await carregarVaga();
    }
  }

  // Reanalisa todos os candidatos com erro ou pendentes, um de cada vez,
  // sem travar a tela nem exigir reenvio de arquivo
  async function reanalisarTodosComErro() {
    const pendentes = candidatosComProblema.map((c: any) => c.id);
    if (!pendentes.length) return;
    setProgressoAnalise({ feito: 0, total: pendentes.length });
    for (let i = 0; i < pendentes.length; i++) {
      await fetch(`/api/candidatos/${pendentes[i]}/analisar`, { method: "POST" });
      setProgressoAnalise({ feito: i + 1, total: pendentes.length });
      await carregarVaga();
    }
  }

  if (carregando) return <p className="text-gray-400 text-sm">Carregando vaga...</p>;
  if (!vaga) return <p>Vaga não encontrada.</p>;

  const matriz = vaga.matrizCompetencias;
  const candidatosOrdenados = [...(vaga.candidatos || [])].sort(
    (a: any, b: any) => (b.scoreGeral ?? -1) - (a.scoreGeral ?? -1)
  );
  const candidatosComProblema = candidatosOrdenados.filter(
    (c: any) => c.status === "erro" || c.status === "pendente"
  );

  return (
    <div className="space-y-8">
      <div>
        <Link href="/" className="text-sm text-brand-500 hover:underline">
          ← Voltar
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 mt-1">{vaga.titulo}</h1>
        <p className="text-sm text-gray-500">{vaga.area || "Área não informada"} · {vaga.localidade || "Localidade não informada"}</p>
      </div>

      {erro && <p className="text-red-600 text-sm">{erro}</p>}

      {/* ETAPA 3-4: interpretação da vaga pela IA */}
      {!matriz && (
        <div className="card p-6 text-center">
          <p className="text-gray-600 mb-4">
            Ainda não interpretamos essa vaga. Clique abaixo para a IA identificar requisitos,
            competências e pesos recomendados.
          </p>
          <button className="btn-primary" onClick={interpretarComIA} disabled={interpretando}>
            {interpretando ? "Analisando vaga com IA..." : "Analisar vaga com IA"}
          </button>
        </div>
      )}

      {matriz && (
        <>
          {/* Job Description Score */}
          {matriz.jobDescriptionScore && (
            <div className="card p-6">
              <h2 className="font-medium text-gray-900 mb-2">Qualidade da descrição da vaga</h2>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl font-semibold text-brand-600">
                  {matriz.jobDescriptionScore.nota}
                </span>
                <span className="text-sm text-gray-500">/ 100</span>
              </div>
              <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
                {matriz.jobDescriptionScore.recomendacoes?.map((r: string, i: number) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Requisitos */}
          <div className="grid md:grid-cols-3 gap-4">
            <BlocoRequisitos titulo="Eliminatórios" cor="red" itens={matriz.requisitosEliminatorios} />
            <BlocoRequisitos titulo="Críticos" cor="yellow" itens={matriz.requisitosCriticos} />
            <BlocoRequisitos titulo="Desejáveis" cor="blue" itens={matriz.requisitosDesejaveis} />
          </div>

          {/* Pesos editáveis (modo híbrido) */}
          {pesos && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-medium text-gray-900">Pesos da vaga (modo híbrido — IA sugere, RH aprova)</h2>
                <button className="btn-secondary text-sm" onClick={salvarPesos} disabled={salvandoPesos}>
                  {salvandoPesos ? "Salvando..." : "Salvar pesos"}
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {Object.entries(pesos).map(([chave, valor]: [string, any]) => (
                  <div key={chave} className="flex items-center justify-between gap-3">
                    <label className="text-sm text-gray-600 capitalize">
                      {chave.replace(/([A-Z])/g, " $1")}
                    </label>
                    <input
                      type="number"
                      className="input-field w-24"
                      value={valor}
                      onChange={(e) =>
                        setPesos({ ...pesos, [chave]: Number(e.target.value) })
                      }
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Os pesos não precisam somar exatamente 100 — o sistema normaliza automaticamente.
              </p>
            </div>
          )}

          {/* Upload de currículos */}
          <div className="card p-6">
            <h2 className="font-medium text-gray-900 mb-3">Currículos</h2>
            <label className="btn-primary inline-block cursor-pointer">
              {enviandoArquivos ? "Enviando..." : "Adicionar currículos (PDF ou DOCX)"}
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
                disabled={enviandoArquivos}
              />
            </label>

            {progressoAnalise.total > 0 && progressoAnalise.feito < progressoAnalise.total && (
              <p className="text-sm text-gray-500 mt-3">
                Analisando currículos com IA: {progressoAnalise.feito} de {progressoAnalise.total}...
              </p>
            )}
          </div>

          {/* Ranking */}
          {candidatosOrdenados.length > 0 && (
            <div className="card p-6 overflow-x-auto">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="font-medium text-gray-900">
                  Ranking ({candidatosOrdenados.length} currículo(s) analisado(s))
                </h2>
                {candidatosComProblema.length > 0 && (
                  <button
                    className="btn-secondary text-sm"
                    onClick={reanalisarTodosComErro}
                    disabled={progressoAnalise.total > 0 && progressoAnalise.feito < progressoAnalise.total}
                  >
                    Tentar novamente todos ({candidatosComProblema.length})
                  </button>
                )}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2">#</th>
                    <th className="pb-2">Candidato</th>
                    <th className="pb-2">Score</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {candidatosOrdenados.map((c: any, i: number) => (
                    <tr key={c.id} className="border-b last:border-0">
                      <td className="py-3">{i + 1}º</td>
                      <td className="py-3">
                        {c.analise?.dadosPessoais?.nome || c.nomeArquivo}
                        {c.status === "erro" && (
                          <span className="text-red-500 text-xs block max-w-xs">
                            {c.analise?.avisoExtracao ||
                              c.analise?.erroProcessamento ||
                              "Erro ao processar"}
                          </span>
                        )}
                        {c.status === "pendente" && (
                          <span className="text-gray-400 text-xs block">Aguardando análise</span>
                        )}
                      </td>
                      <td className="py-3">
                        <BadgeAderencia score={c.scoreGeral} />
                      </td>
                      <td className="py-3 capitalize">{c.statusRH?.replace("_", " ") || "—"}</td>
                      <td className="py-3">
                        {c.status === "analisado" && (
                          <Link href={`/candidatos/${c.id}`} className="text-brand-500 hover:underline">
                            Ver análise →
                          </Link>
                        )}
                        {(c.status === "erro" || c.status === "pendente") && (
                          <button
                            className="text-brand-500 hover:underline text-sm disabled:opacity-50 disabled:cursor-wait"
                            onClick={() => reanalisarCandidato(c.id)}
                            disabled={reanalisandoId === c.id}
                          >
                            {reanalisandoId === c.id ? "Analisando..." : "Tentar novamente"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function BlocoRequisitos({ titulo, cor, itens }: { titulo: string; cor: string; itens: any[] }) {
  const cores: Record<string, string> = {
    red: "border-red-200 bg-red-50",
    yellow: "border-yellow-200 bg-yellow-50",
    blue: "border-blue-200 bg-blue-50",
  };
  return (
    <div className={`card p-5 border ${cores[cor]}`}>
      <h3 className="font-medium text-gray-900 mb-2">{titulo}</h3>
      <ul className="space-y-2">
        {itens?.map((item, i) => (
          <li key={i} className="text-sm">
            <span className="font-medium text-gray-800">{item.item}</span>
            <p className="text-gray-500 text-xs">{item.motivo}</p>
          </li>
        ))}
        {(!itens || itens.length === 0) && <p className="text-sm text-gray-400">Nenhum identificado</p>}
      </ul>
    </div>
  );
}
