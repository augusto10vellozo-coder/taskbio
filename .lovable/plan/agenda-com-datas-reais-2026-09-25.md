# Agenda com datas reais

## Objetivo
Trocar a navegação limitada por dias fixos por uma agenda baseada em datas, permitindo planejar qualquer dia futuro.

## O que será alterado
- Exibir uma faixa móvel de sete datas reais, com dia da semana, número e mês.
- Adicionar navegação para semana anterior, próxima semana e retorno rápido para hoje.
- Incluir um calendário mensal para escolher diretamente uma data distante.
- Salvar cada compromisso pela data escolhida, preservando edição, conclusão, lembrete e remoção.
- Ao repetir um compromisso, gerar ocorrências futuras por um período definido, em vez de preencher apenas a semana exibida.
- Atualizar os resumos, compras e progresso para considerar a semana correspondente à data selecionada.
- Migrar automaticamente agendas existentes no formato antigo para a semana atual, sem perder dados.

## Detalhes técnicos
- O planejamento passará de chaves fixas (`seg` a `dom`) para chaves ISO (`AAAA-MM-DD`).
- A tela usará o calendário Shadcn já disponível, com suporte a seleção dentro do popover.
- A sincronização existente continuará salvando a agenda na conta do usuário.
- A interface permanecerá em PT-BR e os cálculos usarão a semana de segunda a domingo.

## Validação
- Testar seleção de uma data futura pelo calendário.
- Criar, editar, concluir e excluir compromisso nessa data.
- Navegar entre semanas e voltar para hoje.
- Conferir a apresentação em celular e computador.
