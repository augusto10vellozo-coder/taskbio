# Rotina personalizada

## Objetivo
Criar uma tela diária que reúna, por horário, atividades físicas, refeições e sono já cadastrados pelo usuário, sem duplicar informações.

## O que será feito
- Adicionar a página **Minha Rotina** à navegação principal.
- Exibir os sete dias da semana e permitir escolher outra data no calendário.
- Montar uma linha do tempo ordenada com treino, alimentação e sono/descanso vindos da agenda atual.
- Mostrar um resumo do dia com quantidade de refeições, treinos e duração planejada do sono.
- Permitir incluir treino, refeição ou sono diretamente nessa tela, usando os treinos e refeições que o usuário já criou ou cadastrou.
- Permitir marcar itens como concluídos e abrir a agenda para edições mais completas.
- Manter todos os dados no armazenamento e na sincronização de conta já existentes.
- Incluir estado vazio e funcionamento adequado em celular e computador.

## Detalhes técnicos
- A nova página usará o mesmo `plan` e as mesmas ações do armazenamento compartilhado, portanto alterações aparecerão imediatamente na Agenda, Alimentação e Atividades.
- Sono será representado por blocos de descanso com horário inicial e final, sem criar uma segunda fonte de dados.
- A nova rota terá metadados próprios e será adicionada à navegação tipada do aplicativo.
- Ao final, serão verificados a compilação, o carregamento da página e os principais controles em telas móvel e desktop.
