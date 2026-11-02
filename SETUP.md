# Trocar de computador

## O que está na nuvem (não se perde)

| Item | Onde |
|---|---|
| Código | GitHub, repositório privado `taskbio` |
| Backups do banco | GitHub, repositório privado `taskbio-backups` (14 dias) |
| Banco, login e dados | Supabase (`hecqqcconnbjawcevigo`) |
| Site e variáveis de ambiente | Cloudflare Worker |
| E-mails | Resend |
| Domínio e DNS | Cloudflare |

## O que vive só nesta máquina

- **Ferramentas:** Node, Bun, dependências (`node_modules`).
- **Senha do banco do Supabase** — não é exibida em lugar nenhum. Guarde no gerenciador de senhas.
- **Cliente do PostgreSQL** (`pg_restore`, `pg_dump`) — só necessário para restaurar backups. Pode ser baixado de novo.
- **Credenciais do Git** — o Windows guarda; numa máquina nova, o primeiro `git push` pede login.

## Montar em uma máquina nova

```powershell
# 1. Node 20+ e Bun
powershell -c "irm https://bun.sh/install.ps1 | iex"

# 2. Clonar
git clone https://github.com/augusto10vellozo-coder/taskbio.git
cd taskbio

# 3. Dependências (o .env já vem no repositório, com chaves públicas)
& "$env:USERPROFILE\.bun\bin\bun.exe" install

# 4. Rodar local
& "$env:USERPROFILE\.bun\bin\bun.exe" run dev

# 5. Publicar
& "$env:USERPROFILE\.bun\bin\bun.exe" run build
npx wrangler deploy -c .output/server/wrangler.json
```

O `wrangler` vai pedir login no Cloudflare na primeira vez.

## Segredos do Cloudflare

Ficam no Worker e **não** no repositório. Se o Worker for recriado do zero, é preciso cadastrá-los de novo:

| Nome | De onde vem |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API Keys |
| `SUPABASE_PUBLISHABLE_KEY` | idem (chave pública) |
| `SUPABASE_SERVICE_ROLE_KEY` | idem (secret key) |
| `OPENAI_API_KEY` | platform.openai.com |
| `RESEND_API_KEY` | Resend → API keys |
| `VAPID_PRIVATE_KEY` | gerado por você; se perdido, gere outro par |

Anote em um gerenciador de senhas **quais** são esses nomes e onde achar cada valor.

## Cuidado com a pasta atual

O projeto está dentro de `OneDrive - Pluma Agroavicola Ltda`, uma conta **da empresa**. Se você sair da empresa ou a conta for desativada, essa pasta pode desaparecer.

Isso **não** causa perda, porque tudo está no GitHub. Mas, se quiser independência total, mova a pasta de trabalho para uma conta pessoal e clone de novo a partir do GitHub.

## Regra de ouro

Antes de desligar a máquina por definitivo:

```powershell
git status
```

Se aparecer qualquer arquivo modificado, faça commit e push. O que não foi enviado existe só ali.
