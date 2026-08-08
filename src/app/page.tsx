"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Vaga = {
  id: string;
  titulo: string;
  area: string | null;
  status: string;
  criadoEm: string;
  matrizCompetencias: any;
  _count: { candidatos: number };
};

export default function DashboardPage() {
  const [vagas, setVagas] = useState<Vaga[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/vagas")
      .then((r) => r.json())
      .then((data) => {
        setVagas(data);
        setCarregando(false);
      });
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Vagas</h1>
        <p className="text-gray-500 text-sm mt-1">
          Acompanhe a triagem de currículos com apoio de IA — análise gerada por IA, sempre com validação humana.
        </p>
      </div>

      {carregando && <p className="text-gray-400 text-sm">Carregando vagas...</p>}

      {!carregando && vagas.length === 0 && (
        <div className="card p-10 text-center">
          <p className="text-gray-500 mb-4">Você ainda não criou nenhuma vaga.</p>
          <Link href="/vagas/nova" className="btn-primary">
            Criar primeira vaga
          </Link>
        </div>
      )}

      <div className="grid gap-4">
        {vagas.map((vaga) => (
          <Link
            key={vaga.id}
            href={`/vagas/${vaga.id}`}
            className="card p-5 flex items-center justify-between hover:border-brand-500 transition-colors"
          >
            <div>
              <h2 className="font-medium text-gray-900">{vaga.titulo}</h2>
              <p className="text-sm text-gray-500">{vaga.area || "Área não informada"}</p>
              <div className="flex gap-2 mt-2">
                <span className="badge bg-gray-100 text-gray-600">
                  {vaga._count.candidatos} currículo(s)
                </span>
                <span
                  className={`badge ${
                    vaga.matrizCompetencias
                      ? "bg-green-50 text-green-700"
                      : "bg-yellow-50 text-yellow-700"
                  }`}
                >
                  {vaga.matrizCompetencias ? "Vaga interpretada por IA" : "Aguardando análise da IA"}
                </span>
              </div>
            </div>
            <span className="text-gray-300">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
