// ==========================================================
// EXTRAÇÃO DE TEXTO DE CURRÍCULOS (PDF e DOCX)
// seção 7, 8 e 26 do spec — funciona mesmo com layouts
// complexos, desde que o PDF tenha texto selecionável.
// PDFs escaneados (imagem) precisariam de OCR — não incluído
// no MVP, mas o código já sinaliza esse caso (ver aviso abaixo).
// ==========================================================

import mammoth from "mammoth";
// @ts-ignore - pdf-parse não tem types completos
import pdfParse from "pdf-parse";

export async function extrairTextoArquivo(
  buffer: Buffer,
  nomeArquivo: string
): Promise<{ texto: string; aviso?: string }> {
  const extensao = nomeArquivo.split(".").pop()?.toLowerCase();

  if (extensao === "pdf") {
    const resultado = await pdfParse(buffer);
    const texto = resultado.text?.trim() ?? "";

    if (texto.length < 50) {
      return {
        texto,
        aviso:
          "Este PDF parece ser uma imagem escaneada (pouco ou nenhum texto extraído). O MVP atual não inclui OCR — considere converter o arquivo ou digitar manualmente as informações principais.",
      };
    }
    return { texto };
  }

  if (extensao === "docx" || extensao === "doc") {
    const resultado = await mammoth.extractRawText({ buffer });
    return { texto: resultado.value?.trim() ?? "" };
  }

  throw new Error(
    `Formato de arquivo não suportado: .${extensao}. Envie PDF ou DOCX.`
  );
}
