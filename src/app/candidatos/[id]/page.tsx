"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import BadgeAderencia from "@/components/BadgeAderencia";

export default function CandidatoPage({ params }: { params: { id: string } }) {
  const [candidato, setCandidato] = useState<any>(null);
  const [salvando, setSalvando] = useState(false);
  const [observacoes, setObservacoes] = useState("");

  useEffect(() => {
    fetch(`/api/candidatos/${params.id}`)
      .then((r) => r.json())
      .then((data) => {
        setCandidato(data);
        setObservacoes(data.observacoesRH || "");
      });
  }, [params.id]);

  async function salvarStatus(statusRH: string) {
    setSalvando(true);
    const res = await fetch(`/api/candidatos/${params.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusRH, observacoesRH: observacoes }),
    });
    const data = await res.json();
    setCandidato({ ...candidato, ...data });
    setSalvando(false);
  }

  if (!candidato) return <p className="text-gray-400 text-sm">Carregando...</p>;

  const a = candidato.analise || {};

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href={`/vagas/${candidato.vagaId}`} className="text-sm text-brand-500 hover:underline">
          ← Voltar para o ranking
        </Link>
        <div className="flex items-center justify-between mt-1">
          <h1 className="text-2xl font-semibold text-gray-900">
            {a.dadosPessoais?.nome || candidato.nomeArquivo}
          </h1>
          <BadgeAderencia score={candidato.scoreGeral} />
        </div>
        <p className="text-sm text-gray-400">
          Análise gerada por IA — requer validação humana.
        </p>
      </div>

      {/* Resumo executivo */}
      <div className="card p-6">
        <h2 className="font-medium text-gray-900 mb-2">Resumo executivo</h2>
        <p className="text-gray-700 text-sm">{a.resumoExecutivo}</p>
      </div>

      {/* Modo Análise Executiva (seção 46) */}
      {a.composicaoScore && (
        <div className="card p-6">
          <h2 className="font-medium text-gray-900 mb-4">Composição do score</h2>
          <div className="space-y-3">
            {a.composicaoScore.map((c: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{c.criterio}</span>
                  <span className="font-medium text-gray-900">{c.nota}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="bg-brand-500 h-2 rounded-full"
                    style={{ width: `${c.nota}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">{c.justificativa}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pontos fortes e gaps */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h2 className="font-medium text-gray-900 mb-3">Pontos fortes</h2>
          <ul className="space-y-2">
            {a.pontosFortesPrincipais?.map((p: string, i: number) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2">
                <span className="text-green-500">✓</span> {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="font-medium text-gray-900 mb-3">Gaps / pontos a validar</h2>
          <ul className="space-y-2">
            {a.gaps?.map((g: string, i: number) => (
              <li key={i} className="text-sm text-gray-700 flex gap-2">
                <span className="text-yellow-500">•</span> {g}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Requisitos atendidos */}
      {a.requisitosAtendidos && (
        <div className="card p-6">
          <h2 className="font-medium text-gray-900 mb-3">Requisitos atendidos</h2>
          <div className="space-y-2">
            {a.requisitosAtendidos.map((r: any, i: number) => (
              <div key={i} className="flex items-start gap-3 text-sm border-b last:border-0 pb-2">
                <span>
                  {r.status === "atendido" ? "✅" : r.status === "parcial" ? "⚠️" : "❌"}
                </span>
                <div>
                  <p className="text-gray-800">{r.requisito}</p>
                  {r.evidencia && <p className="text-gray-400 text-xs">"{r.evidencia}"</p>}
                  <span className="text-xs text-gray-400">Confiança: {r.confianca}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Evidências */}
      {a.evidencias && (
        <div className="card p-6">
          <h2 className="font-medium text-gray-900 mb-3">Evidências</h2>
          <div className="space-y-3">
            {a.evidencias.map((e: any, i: number) => (
              <div key={i} className="border-l-2 border-brand-200 pl-3">
                <p className="text-sm font-medium text-gray-800">
                  {e.competencia} — {e.score}%{" "}
                  <span className="text-xs text-gray-400 font-normal">({e.confianca} confiança)</span>
                </p>
                <p className="text-sm text-gray-500 italic">"{e.trechoEvidencia}"</p>
                <p className="text-xs text-gray-400">Fonte: {e.fonteExperiencia}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trajetória e senioridade */}
      <div className="grid md:grid-cols-2 gap-4">
        {a.trajetoria && (
          <div className="card p-5">
            <h2 className="font-medium text-gray-900 mb-2">Trajetória profissional</h2>
            <p className="text-sm text-gray-700 mb-2">{a.trajetoria.evolucaoProfissional}</p>
            <p className="text-xs text-gray-500">
              Coerência com a vaga: {a.trajetoria.coerenciaComVaga}%
            </p>
            {a.trajetoria.pontosParaInvestigar?.length > 0 && (
              <ul className="mt-2 space-y-1">
                {a.trajetoria.pontosParaInvestigar.map((p: string, i: number) => (
                  <li key={i} className="text-xs text-gray-500">⚠ {p}</li>
                ))}
              </ul>
            )}
          </div>
        )}
        {a.senioridade && (
          <div className="card p-5">
            <h2 className="font-medium text-gray-900 mb-2">Senioridade</h2>
            <p className="text-sm text-gray-700 capitalize">{a.senioridade.avaliacao}</p>
            <p className="text-xs text-gray-500 mt-1">{a.senioridade.explicacao}</p>
            {a.senioridade.alertaSobrequalificacao && (
              <p className="text-xs text-yellow-700 mt-2 bg-yellow-50 p-2 rounded">
                ⚠️ {a.senioridade.alertaSobrequalificacao}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Perguntas de entrevista personalizadas */}
      {a.perguntasEntrevistaPersonalizadas && (
        <div className="card p-6">
          <h2 className="font-medium text-gray-900 mb-3">Perguntas personalizadas para entrevista</h2>
          <ol className="space-y-2 list-decimal pl-5">
            {a.perguntasEntrevistaPersonalizadas.map((p: string, i: number) => (
              <li key={i} className="text-sm text-gray-700">{p}</li>
            ))}
          </ol>
        </div>
      )}

      {/* Ação do RH — humano no controle */}
      <div className="card p-6">
        <h2 className="font-medium text-gray-900 mb-3">Decisão do RH</h2>
        <textarea
          className="input-field mb-3"
          placeholder="Observações do RH sobre este candidato..."
          value={observacoes}
          onChange={(e) => setObservacoes(e.target.value)}
        />
        <div className="flex gap-2">
          <button
            className="btn-primary"
            disabled={salvando}
            onClick={() => salvarStatus("recomendar")}
          >
            Recomendar
          </button>
          <button
            className="btn-secondary"
            disabled={salvando}
            onClick={() => salvarStatus("avaliar")}
          >
            Avaliar
          </button>
          <button
            className="btn-secondary"
            disabled={salvando}
            onClick={() => salvarStatus("nao_priorizar")}
          >
            Não priorizar
          </button>
        </div>
      </div>
    </div>
  );
}
