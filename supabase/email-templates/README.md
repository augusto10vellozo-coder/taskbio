# Templates de e-mail (Supabase Auth)

Prontos para colar em **Supabase → Authentication → Email Templates**.
Todos estão em pt-BR, com a marca do TaskBio e sem imagens externas (melhor entrega).

## O que colar em cada template

| Template no Supabase | Arquivo | Assunto sugerido |
|---|---|---|
| Confirm signup | `confirmacao-cadastro.html` | Confirme seu e-mail no TaskBio |
| Invite user | `convite.html` | Você recebeu um convite para o TaskBio |
| Magic link | `link-magico.html` | Seu link de acesso ao TaskBio |
| Recovery | `recuperacao-senha.html` | Redefinir sua senha — TaskBio |
| Change email address | `troca-email.html` | Confirme seu novo e-mail |
| Reauthentication | `reautenticacao.html` | Seu código de verificação |
| Password changed | `senha-alterada.html` | Sua senha foi alterada |

## Como aplicar

1. Abra `https://supabase.com/dashboard/project/hecqqcconnbjawcevigo/auth/templates`
2. Escolha o template na lista.
3. Cole o **assunto** no campo de assunto.
4. Cole o **conteúdo do arquivo** no campo de mensagem (substitua tudo).
5. **Save**.

## Variáveis usadas

- `{{ .ConfirmationURL }}` — link de confirmação/recuperação
- `{{ .Token }}` — código de 6 dígitos (reautenticação)
- `{{ .Email }}` e `{{ .NewEmail }}` — troca de e-mail
- `{{ .SiteURL }}` — endereço do site configurado no projeto

Não remova as variáveis: sem elas o e-mail chega sem link ou sem código.

## Remetente (SMTP próprio)

Hoje os e-mails saem como `Supabase Auth <noreply@mail.app.supabase.io>`, com limite baixo de envios.
Para usar `TaskBio <noreply@taskbio.com.br>`:

1. Crie uma conta em [resend.com](https://resend.com) (plano gratuito: 3.000 e-mails/mês).
2. Em **Domains → Add Domain**, informe `taskbio.com.br`.
3. O Resend gera registros DNS (SPF, DKIM). Crie-os no Cloudflare em **DNS → Records**.
4. Aguarde a verificação do domínio no Resend.
5. Crie uma **API Key** no Resend.
6. No Supabase, em **Authentication → SMTP Settings**, ative o SMTP próprio:
   - Host: `smtp.resend.com`
   - Porta: `465`
   - Usuário: `resend`
   - Senha: a API Key
   - Remetente: `noreply@taskbio.com.br`
   - Nome do remetente: `TaskBio`
7. Salve e teste com "Esqueci minha senha".

Depois disso, aumente também o limite de envio em **Authentication → Rate Limits**.
