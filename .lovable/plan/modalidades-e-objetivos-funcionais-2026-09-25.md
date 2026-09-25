# Modalidades e objetivos funcionais

## O que será construído
- Tornar cada modalidade selecionável, com estado visual claro e uma área de conteúdo correspondente.
- Usar a combinação **modalidade + objetivo** para mostrar exemplos de treinos adequados à intenção escolhida.
- Explicar, ao trocar o objetivo, o que muda nas sugestões: frequência, intensidade, duração, descanso e foco.
- Permitir adicionar um exemplo aos “Meus treinos”, para depois ajustar exercícios, séries, repetições e cargas.
- Manter as escolhas e treinos sincronizados na conta do usuário.
- Exibir em todas as sugestões que são exemplos gerais e que o ideal é buscar um profissional de educação física.

## Comportamento esperado
1. A pessoa escolhe uma modalidade, como Musculação, Corrida ou Yoga.
2. Escolhe ou altera seu objetivo.
3. A tela atualiza os exemplos imediatamente para essa combinação.
4. Cada exemplo mostra foco, nível, duração aproximada e exercícios/etapas.
5. A pessoa pode visualizar o exemplo ou adicioná-lo aos próprios treinos.

## Detalhes técnicos
- Ampliar o catálogo atual com exemplos reutilizáveis por modalidade e objetivo, sem prometer resultados.
- Persistir modalidade preferida e objetivo no estado já sincronizado.
- Reutilizar o fluxo existente de execução e histórico para os treinos adicionados.
- Verificar funcionamento e leitura em celular e computador.
