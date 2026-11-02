# Tarefas

Lista de pendências do TaskBio. Ordenada por impacto. Atualize ao concluir.

## Infraestrutura (bloqueios atuais)

- [ ] **`SUPABASE_SERVICE_ROLE_KEY` indisponível no Cloudflare.** A Lovable não libera a chave.
      XP, sequência e congelamentos já foram resolvidos com funções que usam `auth.uid()`
      (`drizzle/migrations/0023_self_service_xp.sql`). Ainda dependem do backend da Lovable:
      exclusão de conta e o cron de notificações.
- [ ] **Migrar para um Supabase próprio** (projeto `hecqqcconnbjawcevigo` já criado). Pausado.
      Falta gerar o token da CLI e rodar o `db push` com as migrações, depois importar os dados
      do export (`Export data` na Lovable).
- [ ] **Job de notificações** ainda aponta para `project--0c271fe2...lovable.app`.
      Só trocar depois que o backend estiver no ambiente novo.
- [ ] **`VAPID_PRIVATE_KEY` na Lovable é a chave antiga.** O Cloudflare já usa o par novo.
      Trocar na Lovable só depois do push e da troca do job.
- [ ] **Branch `melhorias/limite-ia-e-bugs` não foi para a `main`.** Já publicada no Cloudflare,
      falta merge + push para sincronizar com a Lovable.
- [ ] **`.env`, `.env.development` e `.env.production` estão versionados**, com um token Paddle
      `live_` sem uso. O `.gitignore` não ignora `.env*`. Parar de versionar e revogar o token.
- [ ] **Verificação de marca no Google** para o login exibir "TaskBio" em vez do domínio Supabase.
- [ ] **Schema não reproduzível:** migrações divididas entre `supabase/migrations` e
      `drizzle/migrations`, e o agendamento do cron vive fora do repositório.

## Privacidade e LGPD

- [x] **Excluir conta apaga os dados.** `delete_my_account()` remove todas as tabelas pessoais,
      os objetos do Storage e o login (`drizzle/migrations/0024_delete_my_account.sql`).
- [x] **Exportação completa.** Inclui rotina, hábitos, registro de hábitos, saúde, finanças,
      leitura, estudos, histórico de exercícios, progresso, pontos e aparelhos.
- [x] **Confirmação por digitação** no lugar do `window.confirm`.
- [ ] **Reautenticação de verdade** (senha ou código) antes de excluir. Hoje é só a digitação.
- [ ] **Área profissional sem consentimento granular nem auditoria.** Hoje o profissional lê o
      JSON inteiro do aluno, incluindo finanças e saúde.
- [ ] Revisar `clients_respond_to_invites`: o convidado consegue alterar `professional_id`,
      `invite_email` e `notes` ao aceitar.

## Correções e qualidade

- [ ] **Exercícios por tempo (prancha, isometria).** O modelo `Exercise` exige `reps: number` e a
      interface sempre mostra `séries × repetições`. Preciso de um campo de duração/medida
      (ex.: `durationSec`) e de a validação aceitar exercício sem repetições. Afeta
      `src/lib/trilha-data.ts`, `src/lib/training.ts`, `src/lib/plan-photo.ts`,
      `src/lib/plan-spreadsheet.ts`, `src/components/WorkoutPhotoImport.tsx`,
      `src/routes/treino.tsx` e `src/components/TrainingExplore.tsx`.
- [ ] **Importação inventa valores ausentes.** `src/lib/plan-import.server.ts` preenche
      `sets = 3` e `reps = 10` quando o plano não informa, o que contraria a regra do projeto
      de nunca preencher dados faltantes.
- [ ] **Rate limit** por usuário nas funções pagas, além da cota diária já existente.
- [ ] **Sincronização frágil:** upsert do documento inteiro, last-write-wins, sem versão nem
      limite de tamanho; dois aparelhos podem sobrescrever um ao outro.
- [ ] **Custo de banco cresce com o tempo de vida:** `process_habit_freezes` roda a cada
      salvamento e a cada 60 s; `routine_streak` percorre até 400 dias a cada 30 s.
- [ ] **Push:** um único POST processa todos os assinantes, sem paginação; `endpoint` aceita URL
      arbitrária (risco de SSRF); jobs e tentativas nunca são podados.
- [ ] **RPCs sociais residuais** (`search_profiles`, `league_week`, `league_inactive`,
      `claim_league_awards`) continuam concedidas a `authenticated` mesmo com a liga aposentada.

## Produto e ativação

- [ ] **Ao sair, limpar os dados locais do aparelho.** Hoje, depois de sair (ou com a sessão
      expirada), a rotina, saúde e finanças continuam visíveis sem login neste navegador, porque
      o app é local-first (`localStorage`). Quem usa o mesmo computador vê os dados do outro.
      Corrigir limpando o estado local no "Sair", avisando antes se houver algo não sincronizado.
      Quem nunca criou conta continua no modo local.
- [ ] **Explicar o modelo "dados neste aparelho"** para quem não tem conta, em vez de só oferecer
      login.
- [ ] **Onboarding em 3 passos** no cadastro: objetivo, módulos, semana de exemplo.
- [ ] **Home com estado vazio de verdade.** Hoje é uma linha solta ("Nenhum bloco para este dia.
      Adicione o primeiro."). Deve ter proposta de valor, um exemplo de como fica preenchido,
      botão principal ("Montar minha primeira semana" ou "Começar com semana de exemplo") e
      botão secundário para criar conta. Considerar oferecer a semana de exemplo já na home,
      não só em `/agenda`, e mostrar o app com dados antes de pedir cadastro.
- [ ] **Cadastro começa em "Criar conta"** e a proposta de valor aparece no celular
      (hoje é `hidden lg:block`).
- [ ] **Nível e XP total acumulado.** Hoje o XP zera visualmente todo dia, sem progressão longa.
- [ ] **E-mail de resumo semanal.** Hoje o resumo depende de push, que no iPhone exige o app
      instalado.
- [x] **Instrumentação de funil** (ativação, D1, D7). Painel em `/equipe → Produto`
      (`drizzle/migrations/0025_product_telemetry.sql`).

## Monetização (futuro)

- [ ] Estrutura de planos e `entitlements`, com checagem no servidor.
- [ ] Paywall da IA (custo variável real) mantendo o registro básico gratuito.
- [ ] Área profissional como produto B2B, depois das correções de privacidade.
