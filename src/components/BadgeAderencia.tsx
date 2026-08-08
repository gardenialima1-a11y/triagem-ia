export function classificarCor(score: number | null) {
  if (score === null) return "bg-gray-100 text-gray-500";
  if (score >= 90) return "bg-green-100 text-green-800";
  if (score >= 75) return "bg-emerald-50 text-emerald-700";
  if (score >= 60) return "bg-yellow-50 text-yellow-700";
  return "bg-red-50 text-red-700";
}

export function textoAderencia(score: number | null) {
  if (score === null) return "Não analisado";
  if (score >= 90) return "Muito alta";
  if (score >= 75) return "Alta";
  if (score >= 60) return "Média";
  return "Baixa";
}

export default function BadgeAderencia({ score }: { score: number | null }) {
  return (
    <span className={`badge ${classificarCor(score)}`}>
      {score !== null ? `${score} — ${textoAderencia(score)}` : "Não analisado"}
    </span>
  );
}
