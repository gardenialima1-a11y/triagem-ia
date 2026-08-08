# Triagem IA — Talent Screening

Sistema de triagem, análise e ranqueamento estratégico de currículos com IA (MVP).

## O que esse MVP já faz

1. Criar vaga com descrição completa do cargo.
2. A IA lê a descrição e monta a "Matriz de Competências": requisitos eliminatórios, críticos, desejáveis, competências técnicas/comportamentais e pesos sugeridos.
3. Você aprova ou edita os pesos (modo híbrido).
4. Você sobe vários currículos em PDF/DOCX de uma vez.
5. A IA lê cada currículo, extrai os dados, calcula o score e mostra:
   - resumo executivo
   - pontos fortes e gaps (sem inventar informação)
   - evidências (trecho exato do currículo que justifica cada nota)
   - análise de trajetória e senioridade
   - alerta de sobrequalificação
   - perguntas de entrevista personalizadas
6. Ranking automático de todos os candidatos da vaga.
7. Você (RH) pode marcar "Recomendar / Avaliar / Não priorizar" e escrever observações — a IA nunca decide sozinha.

## O que NÃO está no MVP ainda (próximas etapas)

- OCR para PDF escaneado (imagem)
- Login/autenticação de usuários
- Comparação lado a lado de candidatos
- Exportar PDF/Excel
- Banco de talentos e busca semântica
- Dashboard do processo seletivo com métricas históricas

Podemos ir adicionando isso aos poucos, exatamente como fizemos no RH Intelligence.

---

## PASSO A PASSO PARA COLOCAR NO AR (bem simples)

### Passo 1 — Criar um repositório novo no GitHub

1. Entre no GitHub e clique em **"New repository"**.
2. Dê um nome, por exemplo `triagem-ia`.
3. Deixe como **privado**.
4. Clique em **"Create repository"** (não marque nenhuma opção extra).

### Passo 2 — Subir os arquivos

1. Na página do repositório vazio, clique em **"uploading an existing file"**.
2. Arraste TODOS os arquivos e pastas que estão dentro da pasta `triagem-ia` (mantendo a estrutura de pastas).
3. Clique em **"Commit changes"**.

> Dica: o GitHub permite arrastar pastas inteiras direto do seu computador para essa tela.

### Passo 3 — Criar o banco de dados (Neon)

1. Entre em [neon.tech](https://neon.tech) e crie um projeto novo (gratuito).
2. Copie a **Connection String** (parece com `postgresql://...`).
3. Guarde essa informação, vai usar no próximo passo.

### Passo 4 — Publicar na Vercel

1. Entre em [vercel.com](https://vercel.com) e clique em **"Add New Project"**.
2. Selecione o repositório `triagem-ia` que você acabou de criar.
3. Antes de clicar em "Deploy", abra **"Environment Variables"** e adicione:
   - `DATABASE_URL` → cole a connection string do Neon
   - `DIRECT_URL` → cole a mesma connection string do Neon
   - `ANTHROPIC_API_KEY` → sua chave da Anthropic (console.anthropic.com → API Keys)
4. Clique em **"Deploy"**.

### Passo 5 — Criar as tabelas no banco

Depois do primeiro deploy, você precisa "avisar" o banco sobre as tabelas do sistema (Vaga, Candidato). Como você não usa terminal, o jeito mais simples é:

1. Volte aqui no chat e me avise que já criou o projeto na Vercel e no Neon.
2. Eu te devolvo um comando pronto (via GitHub Action ou script) que roda isso automaticamente, sem precisar de terminal na sua máquina.

### Passo 6 — Usar o sistema

Acesse a URL que a Vercel te deu (algo como `triagem-ia.vercel.app`), clique em **"+ Nova vaga"** e comece a testar.

---

## Sobre custos

Cada análise de currículo faz uma chamada à API da Anthropic (Claude), que tem custo por uso — não é gratuito em grandes volumes. Para testar com poucos currículos o custo é bem baixo, mas se for usar em produção com centenas de currículos por mês, vale a pena acompanhar o consumo em console.anthropic.com.
