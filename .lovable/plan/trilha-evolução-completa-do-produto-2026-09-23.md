# Trilha — evolução completa do produto

## Objetivo
Transformar a versão local atual em um produto completo, com conta pessoal, dados sincronizados, acompanhamento diário, assinatura Premium e uma área para profissionais.

## Entregas
1. **Conta e perfil** — acesso por Google ou e-mail e senha, confirmação e recuperação de senha, perfil com nome, foto, objetivo e preferências.
2. **Sincronização segura** — agenda, treinos, refeições, compras, medidas e configurações vinculadas à conta, com importação dos dados que hoje estão salvos no aparelho.
3. **Agenda completa** — criar, editar, excluir, concluir e repetir compromissos; categorias, horários e lembretes.
4. **Treino em execução** — tela focada, séries marcáveis, carga e repetições realizadas, cronômetro de descanso e histórico por exercício.
5. **Alimentação e compras** — montar a semana por refeição, recalcular estimativas nutricionais e gerar a lista consolidada de compras.
6. **Progresso** — registros de peso, medidas, cargas, corrida e consistência; filtros semanais e mensais com gráficos.
7. **Premium** — R$ 9,90/mês ou R$ 79,90/ano, pagamento recorrente, estado da assinatura e bloqueio claro de recursos avançados.
8. **Plano Profissional** — cadastro profissional, convite e vínculo de alunos, montagem de rotinas e acompanhamento, mantendo o controle de acesso de cada pessoa.
9. **Qualidade** — interface em português, boa experiência no celular, estados vazios/erro/carregamento e avisos de que estimativas não substituem orientação profissional.

## Segurança e dados
- Cada pessoa acessa somente os próprios dados.
- Perfis profissionais e permissões ficam separados dos dados pessoais.
- Pagamentos são confirmados pelo provedor antes de liberar recursos.
- Lembretes usam preferências explícitas de cada pessoa.

## Ordem de implementação
```text
Conta → Perfil → Sincronização → Agenda → Treinos → Alimentação
      → Progresso → Premium → Área Profissional → Revisão final
```

## Decisões confirmadas
- Perfil completo.
- Entrada por Google e e-mail/senha.
- Escopo completo, incluindo assinaturas e área profissional.
