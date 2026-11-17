# Deploy do TaskBio no Cloudflare

O app roda como Worker no Cloudflare, com assets estáticos e Supabase como banco/auth. O build é
feito por `vite build` + Nitro e o deploy usa o `wrangler.json` gerado em `.output/server`.

## Pré-requisitos

- `npx wrangler login` (uma vez; o token OAuth fica na máquina, nunca no repositório).
- Conta Cloudflare com acesso ao worker `augusto10vellozo-coder-taskbio`.
- Variáveis **públicas** do Supabase no build (as mesmas que vão para o bundle do cliente):
  `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Segredos de servidor já configurados no Worker: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
  `SUPABASE_PUBLISHABLE_KEY`, `OPENAI_API_KEY`, `VAPID_PRIVATE_KEY`, `RESEND_API_KEY`.

## Build

No PowerShell:

```powershell
$env:VITE_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
$env:VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
npm run build
```

Confira que a URL entrou no bundle:

```powershell
Select-String -Path .output\public\assets\client-*.js -Pattern "supabase.co"
```

## Deploy

```powershell
npx wrangler deploy --config .output\server\wrangler.json --keep-vars `
  --message "Descrição da mudança"
```

`--keep-vars` é obrigatório: sem ele o Wrangler apaga variáveis de ambiente definidas no painel.
Os segredos (`secret_text`) continuam no Worker entre deploys.

## Rollback

Liste as versões e faça rollback para a anterior, se necessário:

```powershell
npx wrangler deployments list --name augusto10vellozo-coder-taskbio
npx wrangler rollback --name augusto10vellozo-coder-taskbio
```

## Checklist pós-deploy

- `https://taskbio.com.br/` abre com 0 erros no console.
- `https://taskbio.com.br/auth` mostra o formulário de entrar/criar conta.
- Uma rota inexistente mostra **“Página não encontrada”** (sem `PÃ¡gina`).
- `npx wrangler secret list --name augusto10vellozo-coder-taskbio` continua com os 6 segredos.
