# Backup e recuperação

## Onde ficam os backups

Repositório **privado** `augusto10vellozo-coder/taskbio-backups`.

- Automação: GitHub Actions, arquivo `.github/workflows/backup.yml`
- Horário: todo dia às **03:00 de Brasília** (06:00 UTC), mais execução manual
- Formato: `pg_dump --format custom`, sem dono (`--no-owner`)
- Retenção: os **14 mais recentes**; os anteriores são apagados pelo próprio job
- Tamanho típico: ~520 KB por arquivo, ~7 MB no total
- Segredo usado: `SUPABASE_DB_PASSWORD` (senha do Postgres do projeto)

O dump inclui `public` (app + migrations), `auth` (contas e vínculos) e as funções.

## Conferir se um backup está íntegro

```powershell
pg_restore -l taskbio-AAAAMMDD.dump | Measure-Object -Line
```

Um backup saudável tem ~900 entradas e ~25 tabelas em `public`. Se o comando falhar, o arquivo está corrompido.

## Restaurar

> Restaurar sobrescreve. Faça em um projeto novo primeiro quando possível.

Conecte pelo **Session pooler** (IPv4). A conexão direta do Supabase pode ser IPv6-only.

```powershell
$env:PGPASSWORD = "<senha do banco>"

pg_restore `
  --host aws-0-us-east-1.pooler.supabase.com `
  --port 5432 `
  --username postgres.hecqqcconnbjawcevigo `
  --dbname postgres `
  --schema=public `
  --schema-only `
  --no-owner `
  --no-comments `
  taskbio-AAAAMMDD.dump
```

- `--schema-only` restaura só a estrutura. Sem ele, restaura também os dados.
- Restaurar o schema `auth` **não é recomendado**: conflita com o schema gerenciado pelo Supabase.
  As contas são recriadas no cadastro; os dados antigos não se reconectam a usuários novos.

## Depois de restaurar, recriar o que fica fora de `public`

1. `create extension if not exists pgcrypto with schema extensions;`
2. Gatilho de perfil:
   ```sql
   create trigger on_auth_user_created after insert on auth.users
   for each row execute function public.handle_new_user();
   ```
3. Bucket `xp-photos` e as três políticas `xp_photos_*` em `storage.objects`.
4. Aplicar as migrations posteriores à data do dump (`drizzle/migrations/`).
5. Recriar os jobs de cron e o token em `push_cron_token`.

## Checagem rápida no dia a dia

- A aba **Actions** do repositório de backups deve ter um run verde por dia.
- Um run vermelho significa que o backup **parou** — o problema mais comum é senha do banco
  alterada sem atualizar o segredo `SUPABASE_DB_PASSWORD`.
- Se o GitHub desativar o agendamento por 60 dias sem atividade no repositório (acontece em
  repositórios inativos), basta um commit ou um run manual para reativar.
