# Deploy do Assistente CDP — Guia Passo a Passo

## ⚠️ Antes de começar: revogar chave exposta

1. Acesse https://platform.openai.com/api-keys
2. Encontre a chave que foi compartilhada no chat e clique em **Revoke**
3. Clique em **Create new secret key**, dê o nome "cdp-widget" e copie a nova chave

---

## 1. Preparar o ambiente local

```bash
# Instalar Node.js (se não tiver): https://nodejs.org
# Instalar Vercel CLI
npm install -g vercel

# Entrar na pasta do projeto
cd cdp-widget-backend

# Instalar dependências
npm install
```

---

## 2. Criar o arquivo .env local

Copie o `.env.example` e preencha:

```bash
cp .env.example .env
```

Edite o `.env`:
```
OPENAI_API_KEY=sk-proj-SUA_NOVA_CHAVE_AQUI
PORTAL_RSS_URL=https://www.tudosobrecdp.com.br/feed
PORTAL_BASE_URL=https://www.tudosobrecdp.com.br
CRON_SECRET=gere-uma-string-aleatoria-segura-aqui
```

---

## 3. Testar localmente

```bash
vercel dev
```

Acesse:
- `http://localhost:3000/api/briefing` → deve retornar JSON com artigos
- `http://localhost:3000/api/chat` (POST com `{"message":"O que é CDP?"}`)

---

## 4. Deploy no Vercel

```bash
# Fazer login no Vercel (cria conta grátis em vercel.com se não tiver)
vercel login

# Deploy
vercel --prod
```

O Vercel vai perguntar algumas coisas — responda:
- "Set up and deploy?" → **Y**
- "Which scope?" → sua conta pessoal
- "Link to existing project?" → **N** (é um projeto novo)
- "What's your project name?" → `cdp-widget-backend`
- "In which directory is your code?" → `.` (pasta atual)

---

## 5. Configurar variáveis de ambiente no Vercel

Após o deploy, acesse https://vercel.com → seu projeto → **Settings → Environment Variables**

Adicione:
| Nome | Valor |
|------|-------|
| `OPENAI_API_KEY` | sua nova chave OpenAI |
| `PORTAL_RSS_URL` | `https://www.tudosobrecdp.com.br/feed` |
| `PORTAL_BASE_URL` | `https://www.tudosobrecdp.com.br` |
| `CRON_SECRET` | string aleatória segura |

Após adicionar, faça um novo deploy: `vercel --prod`

---

## 6. Anotar a URL do deploy

Após o deploy, o Vercel vai mostrar uma URL como:
```
https://cdp-widget-backend-xxxx.vercel.app
```

Abra o arquivo `widget.js` e substitua:
```javascript
const API_BASE_URL = 'https://cdp-widget-backend.vercel.app'; // ← coloque sua URL aqui
```

---

## 7. Instalar o widget no WordPress via WPCode

1. No painel WordPress: **Plugins → Adicionar novo → buscar "WPCode"**
2. Instalar e ativar o plugin **WPCode – Insert Headers and Footers**
3. Ir em **Code Snippets → Add Snippet**
4. Escolher **HTML Snippet**
5. Cole o conteúdo abaixo (substitua a URL pela sua URL do Vercel):

```html
<script src="https://cdp-widget-backend-SUAURL.vercel.app/widget.js" defer></script>
```

6. Em **Insertion Location**, selecione: **Footer – Site Wide**
7. Ative e salve

O widget vai aparecer automaticamente em todas as páginas do portal!

---

## 8. Verificar o cron job (opcional)

O briefing é gerado automaticamente 2x por semana (segunda e quinta, às 8h).
Para testar manualmente:

```bash
curl -X GET https://SUA-URL.vercel.app/api/cron-briefing \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```

---

## Custos estimados (OpenAI API)

| Componente | Uso | Custo/mês |
|-----------|-----|-----------|
| Chat (GPT-4o-mini) | 200 perguntas/dia | ~$3/mês |
| Flash Briefing (resumo IA) | 2x/semana | ~$0,05/mês |
| TTS (áudio semanal) | 2x/semana ~1.500 chars | ~$0,20/mês |
| **Total estimado** | | **~$3–5/mês** |

Hosting Vercel: **gratuito** (plano Hobby cobre tranquilamente esse volume)

---

## Estrutura de arquivos

```
cdp-widget-backend/
├── api/
│   ├── chat.js           ← endpoint do chat com RAG
│   ├── briefing.js       ← flash briefing semanal
│   ├── audio.js          ← geração de áudio TTS
│   └── cron-briefing.js  ← cron 2x/semana
├── lib/
│   ├── rss.js            ← busca artigos do WordPress
│   └── openai.js         ← cliente OpenAI + prompts
├── widget.js             ← script que vai no WordPress
├── vercel.json           ← config + cron schedule
├── package.json
├── .env.example
└── DEPLOY.md             ← este arquivo
```
