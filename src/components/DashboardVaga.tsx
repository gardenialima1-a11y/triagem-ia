// ==========================================================
// DASHBOARD ESTRATÉGICO DA VAGA
// Métricas rápidas do funil de triagem — dá visão executiva
// sem precisar contar candidato por candidato manualmente.
// ==========================================================

export default function DashboardVaga({ candidatos }: { candidatos: any[] }) {
  const total = candidatos.length;
  if (total === 0) return null;

  const analisados = candidatos.filter((c) => c.status === "analisado");
  const comErro = candidatos.filter((c) => c.status === "erro").length;
  const pendentes = candidatos.filter((c) => c.status === "pendente").length;

  const mediaScore = analisados.length
    ? Math.round(
        analisados.reduce((soma, c) => soma + (c.scoreGeral ?? 0), 0) / analisados.length
      )
    : null;

  const contagemStatus: Record<string, number> = {
    recomendar: 0,
    avaliar: 0,
    nao_priorizar: 0,
    indefinido: 0,
  };
  analisados.forEach((c) => {
    const chave = c.statusRH && chave_valida(c.statusRH) ? c.statusRH : "indefinido";
    contagemStatus[chave] += 1;
  });

  function chave_valida(v: string) {
    return ["recomendar", "avaliar", "nao_priorizar"].includes(v);
  }

  return (
    <div className="card p-6">
      <h2 className="font-medium text-gray-900 mb-4">Visão geral do processo</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metrica label="Currículos recebidos" valor={total} />
        <Metrica label="Analisados pela IA" valor={analisados.length} />
        <Metrica label="Score médio" valor={mediaScore !== null ? mediaScore : "—"} />
        <Metrica
          label="Pendentes / com erro"
          valor={pendentes + comErro}
          destaque={pendentes + comErro > 0}
        />
      </div>

      {analisados.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mt-5">
          <MetricaStatus label="Recomendados" valor={contagemStatus.recomendar} cor="text-green-600" />
          <MetricaStatus label="A avaliar" valor={contagemStatus.avaliar} cor="text-yellow-600" />
          <MetricaStatus label="Não priorizados" valor={contagemStatus.nao_priorizar} cor="text-gray-500" />
        </div>
      )}
    </div>
  );
}

function Metrica({ label, valor, destaque }: { label: string; valor: any; destaque?: boolean }) {
  return (
    <div>
      <p className={`text-2xl font-semibold ${destaque ? "text-red-600" : "text-gray-900"}`}>
        {valor}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function MetricaStatus({ label, valor, cor }: { label: string; valor: number; cor: string }) {
  return (
    <div className="bg-gray-50 rounded-lg py-3 text-center">
      <p className={`text-xl font-semibold ${cor}`}>{valor}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
