"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import BadgeAderencia from "@/components/BadgeAderencia";

export default function CompararCandidatosPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<p className="text-gray-400 text-sm">Carregando comparação...</p>}>
      <CompararConteudo vagaId={params.id} />
    </Suspense>
  );
}

function CompararConteudo({ vagaId }: { vagaId: string }) {
  const searchParams = useSearchParams();
  const ids = (searchParams.get("ids") || "").split(",").filter(Boolean);

  const [vaga, setVaga] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch(`/api/vagas/${vagaId}`)
      .then((r) => r.json())
      .then((data) => {
        setVaga(data);
        setCarregando(false);
      });
  }, [vagaId]);

  if (carregando) return <p className="text-gray-400 text-sm">Carregando...</p>;
  if (!vaga) return <p>Vaga não encontrada.</p>;

  const candidatos = (vaga.candidatos || []).filter((c: any) => ids.includes(c.id));

  if (candidatos.length < 2) {
    return (
      <div className="space-y-4">
        <Link href={`/vagas/${vagaId}`} className="text-sm text-brand-500 hover:underline">
          ← Voltar para o ranking
        </Link>
        <p className="text-gray-600 text-sm">
          Selecione pelo menos 2 candidatos no ranking (usando as caixinhas de seleção) para
          comparar lado a lado.
        </p>
      </div>
    );
  }

  const linhas: { label: string; render: (c: any) => React.ReactNode }[] = [
    { label: "Score geral", render: (c) => <BadgeAderencia score={c.scoreGeral} /> },
    {
      label: "Status RH",
      render: (c) => (
        <span className="capitalize">{c.statusRH ? c.statusRH.replace("_", " ") : "—"}</span>
      ),
    },
    { label: "Cargo atual", render: (c) => c.analise?.dadosPessoais?.cargoAtual || "—" },
    {
      label: "Senioridade",
      render: (c) => (
        <span className="capitalize">{c.analise?.senioridade?.avaliacao || "—"}</span>
      ),
    },
    {
      label: "Pontos fortes",
      render: (c) => {
        const lista: string[] = c.analise?.pontosFortesPrincipais || [];
        if (!lista.length) return <span className="text-gray-400">—</span>;
        return (
          <ul className="space-y-1">
            {lista.slice(0, 5).map((p, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-green-500">✓</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        );
      },
    },
    {
      label: "Gaps / pontos a validar",
      render: (c) => {
        const lista: string[] = c.analise?.gaps || [];
        if (!lista.length) return <span className="text-gray-400">—</span>;
        return (
          <ul className="space-y-1">
            {lista.slice(0, 5).map((g, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-yellow-500">•</span>
                <span>{g}</span>
              </li>
            ))}
          </ul>
        );
      },
    },
    {
      label: "Requisitos atendidos",
      render: (c) => {
        const req: any[] = c.analise?.requisitosAtendidos || [];
        if (!req.length) return <span className="text-gray-400">—</span>;
        const atendidos = req.filter((r) => r.status === "atendido").length;
        const parciais = req.filter((r) => r.status === "parcial").length;
        const naoIdent = req.filter((r) => r.status === "nao_identificado").length;
        return (
          <span>
            {atendidos} atendidos · {parciais} parciais · {naoIdent} não identificados
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/vagas/${vagaId}`} className="text-sm text-brand-500 hover:underline">
          ← Voltar para o ranking
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 mt-1">Comparação de candidatos</h1>
        <p className="text-sm text-gray-500">{vaga.titulo}</p>
      </div>

      <div className="card p-6 overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="text-left text-gray-400 font-normal align-bottom pb-3 pr-4 w-44"></th>
              {candidatos.map((c: any) => (
                <th key={c.id} className="text-left align-bottom pb-3 pr-6 min-w-[220px]">
                  <p className="font-medium text-gray-900">
                    {c.analise?.dadosPessoais?.nome || c.nomeArquivo}
                  </p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, i) => (
              <tr key={i} className="border-t align-top">
                <td className="py-3 pr-4 text-xs font-medium text-gray-500">{linha.label}</td>
                {candidatos.map((c: any) => (
                  <td key={c.id} className="py-3 pr-6 text-sm text-gray-700">
                    {linha.render(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
