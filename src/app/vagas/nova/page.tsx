"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const CAMPOS = [
  { name: "titulo", label: "Nome da vaga", required: true },
  { name: "area", label: "Área" },
  { name: "departamento", label: "Departamento" },
  { name: "gestorResponsavel", label: "Gestor responsável" },
  { name: "localidade", label: "Localidade" },
  { name: "modalidade", label: "Modalidade (presencial/híbrido/remoto)" },
  { name: "tipoContratacao", label: "Tipo de contratação (CLT/PJ/temporário)" },
  { name: "faixaSalarial", label: "Faixa salarial" },
  { name: "escolaridadeMinima", label: "Escolaridade mínima" },
  { name: "experienciaMinima", label: "Experiência mínima" },
];

export default function NovaVagaPage() {
  const router = useRouter();
  const [form, setForm] = useState<Record<string, string>>({});
  const [descricaoCargo, setDescricaoCargo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (!form.titulo || !descricaoCargo) {
      setErro("Preencha ao menos o nome da vaga e cole a descrição do cargo.");
      return;
    }

    setEnviando(true);
    const res = await fetch("/api/vagas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, descricaoCargo }),
    });

    if (!res.ok) {
      const data = await res.json();
      setErro(data.erro || "Erro ao criar vaga.");
      setEnviando(false);
      return;
    }

    const vaga = await res.json();
    router.push(`/vagas/${vaga.id}`);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Nova vaga</h1>
      <p className="text-gray-500 text-sm mb-6">
        Preencha os dados básicos e cole a descrição completa do cargo. Depois, a IA vai
        interpretar a vaga e sugerir os requisitos, competências e pesos.
      </p>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {CAMPOS.map((campo) => (
            <div key={campo.name} className={campo.name === "titulo" ? "col-span-2" : ""}>
              <label className="label-field">
                {campo.label} {campo.required && <span className="text-red-500">*</span>}
              </label>
              <input
                className="input-field"
                value={form[campo.name] || ""}
                onChange={(e) => setForm({ ...form, [campo.name]: e.target.value })}
              />
            </div>
          ))}
        </div>

        <div>
          <label className="label-field">
            Descrição do cargo (cole aqui a descrição completa) <span className="text-red-500">*</span>
          </label>
          <textarea
            className="input-field min-h-[220px]"
            placeholder="Cole aqui a descrição completa da vaga: responsabilidades, requisitos obrigatórios, desejáveis, competências, etc."
            value={descricaoCargo}
            onChange={(e) => setDescricaoCargo(e.target.value)}
          />
        </div>

        {erro && <p className="text-red-600 text-sm">{erro}</p>}

        <div className="flex justify-end">
          <button type="submit" className="btn-primary" disabled={enviando}>
            {enviando ? "Criando..." : "Criar vaga"}
          </button>
        </div>
      </form>
    </div>
  );
}
