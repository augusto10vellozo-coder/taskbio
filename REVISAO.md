# Experiência de revisão — desenho

## Problema

Hoje o app **agenda** revisões, mas não **faz** revisão. Ao concluir uma sessão de estudo, ele cria três blocos na agenda (1, 7 e 30 dias) chamados `Revisão: <tópico>`. O usuário marca o bloco como feito e nada acontece: não há recordação, não há veredito, não há consequência.

Um bloco de revisão não pode ser uma tarefa para riscar. Precisa ser uma **tentativa de recordação com veredito**, e o veredito precisa mudar o futuro.

## Princípio

> Revisão é dívida, não tarefa. Quem lembra, espaça. Quem esquece, reforça.

## O que já existe (e será reaproveitado)

- Bloco de revisão: `kind: "compromisso"`, `review: true`, `subjectId`, `durationMinutes`, `done`.
- Id do bloco: `rev:<sessionId>:<offset>` — o offset (1, 7 ou 30) já está codificado.
- Sessão de estudo: `trackers.estudos[]` com `id`, `date`, `title`, `subjectId`, `minutes`, `learned`.
- Exames: `trackers.exams[]` com `subjectId`, `date`.
- Utilitários: `daysUntil`, `upcomingExams`, `minutesBySubject`.

## Modelo de dados (sem tabela nova)

Campos adicionados ao bloco de revisão:

| Campo | Tipo | Para quê |
|---|---|---|
| `reviewStage` | `1 \| 7 \| 30` | Degrau atual da escada |
| `reviewOf` | `string` | `sessionId` da sessão original |
| `reviewVerdict` | `"lembrei" \| "esqueci"` | Resultado da tentativa |
| `reviewedAt` | `string` (yyyy-MM-dd) | Quando foi revisado |
| `reviewReinforcement` | `boolean` | Marca um reforço criado por esquecimento |

Tudo vive no `user_data` já sincronizado. Nenhuma migração de banco.

## Fluxo

### 1. Entrada

Três portas, todas levando ao mesmo lugar:

- **Home:** cartão "Revisões" com `N para hoje · M vencidas` e botão **Revisar** (abre a mais antiga).
- **Agenda:** tocar num bloco com `review: true` abre a revisão, não o editor genérico.
- **Estudos:** seção "Revisões pendentes" com a lista por matéria.

### 2. Tela de revisão (sheet em tela cheia)

**Passo 1 — Recordar**
- Cabeçalho: matéria + tópico (do título da sessão).
- Texto: *"Sem olhar, tente lembrar o que você estudou sobre <tópico>."*
- Botão primário: **Já tentei lembrar**.
- Nada do conteúdo aparece ainda. O `learned` fica escondido — mostrá-lo antes anula a recordação.

**Passo 2 — Conferir**
- Mostra o que você anotou (`learned` da sessão).
- Se não houver anotação: *"Você não anotou nada nesta sessão. Na próxima, escreva uma frase do que aprendeu — é isso que você vai revisar."*
- Botões: **Lembrei** (primário) e **Esqueci** (secundário).

**Passo 3 — Consequência**
- Lembrei: *"Próxima revisão: 7 de dezembro."* (ou "Escada concluída" no degrau 30.)
- Esqueci: *"Reforço amanhã, 5 de novembro."*
- Botão: **Concluir**.

### 3. Regras do veredito

| Situação | Efeito |
|---|---|
| **Lembrei** no degrau 1 | Bloco concluído; degrau 7 já existe na agenda |
| **Lembrei** no degrau 7 | Bloco concluído; degrau 30 já existe |
| **Lembrei** no degrau 30 | Bloco concluído; escada encerrada |
| **Esqueci** em qualquer degrau | Bloco concluído + **novo bloco de reforço em +1 dia** (`reviewReinforcement: true`) |
| Revisão vencida e não feita | Continua pendente, com "vencida há N dias" e ação **Reagendar para hoje** |
| Bloco concluído sem veredito (dados antigos) | Tratado como "lembrei" para não criar dívida falsa |

O reforço entra na mesma escada: se o usuário esquecer de novo, cria outro reforço em +1 dia. Isso transforma "esqueci" em trabalho concreto, não em culpa.

### 4. O que aparece na home

Uma linha, sem gamificação:

```
Revisões   3 hoje · 2 vencidas        [ Revisar ]
```

E, quando não há nada: a linha não aparece. Silêncio é recompensa.

## Casos de borda

- **Sessão apagada:** a revisão continua válida (guarda o título no próprio bloco).
- **Matéria apagada:** a revisão continua, sem cor de matéria.
- **Muitas revisões no mesmo dia:** a home mostra a contagem; a tela abre uma por vez, da mais antiga para a mais nova.
- **Revisão de 30 dias caindo no passado:** vira vencida, não desaparece.
- **Usuário sem nenhuma anotação:** a revisão funciona, mas o app sugere anotar na próxima sessão.
- **Fuso:** tudo em dia de Brasília, como o resto do app.

## O que NÃO entra nesta versão

- Flashcards e baralhos.
- Geração de perguntas por IA.
- Intervalos adaptativos (SM-2). A escada 1/7/30 continua fixa.
- Conteúdo de terceiros ou banco de questões.
- Notificação nova: o lembrete de revisão usa o canal de exames/estudos que já existe.

## Métricas de validação

| Métrica | O que prova |
|---|---|
| Revisões feitas ÷ revisões devidas por semana | O mecanismo está sendo usado |
| % de "lembrei" por matéria | O app está ajudando a lembrar, não só cobrando |
| Retorno semanal de quem tem revisão vs. quem não tem | A dívida de revisão realmente retém |
| Sessões com `learned` preenchido | A qualidade do ciclo depende disso |

## Fases

**Fase 1 — o veredito (menor fatia que já muda o jogo)**
- Campos no bloco, sheet de revisão com recordar → conferir → veredito, regra de reforço.
- Cartão na home.
- Sem reagendamento automático de vencidas (só o rótulo "vencida").

**Fase 2 — a dívida**
- Reagendar para hoje, lista de vencidas por matéria, contagem semanal.

**Fase 3 — a inteligência**
- Intervalos adaptativos conforme o histórico de "lembrei/esqueci" por matéria.

## Decisão de produto embutida

Este desenho assume que **estudar e não esquecer é o coração do app**, e que treino, alimentação e hábitos são contexto. Se essa premissa mudar, a Fase 1 perde sentido — porque a revisão deixa de ser o motivo de voltar.
