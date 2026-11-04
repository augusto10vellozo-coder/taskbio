# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primário (confirmado):** concurseiros e estudantes brasileiros. A rotina deles gira em torno de estudo e prova; o treino é pausa e energia entre blocos, não o centro da vida. Usam o app no celular, ao longo do dia, muitas vezes entre uma sessão de estudo e outra.

Público secundário (não confirmado): adultos organizando rotina e saúde em geral.

## Product Purpose

Reunir a rotina de vida saudável num app só — estudos, treino, alimentação, hábitos, leitura, finanças e agenda — para que a pessoa não precise manter cinco aplicativos e uma planilha.

**Sucesso nos próximos 3 meses (confirmado):** retenção semanal. As pessoas voltam toda semana e mantêm a sequência. Receita não é a meta deste ciclo.

## Positioning

**Tudo num lugar (confirmado).** Rotina, estudos e treino convivem no mesmo dia, com a mesma agenda e o mesmo XP. Um app só de treino ou só de estudos não consegue mostrar que estudar três blocos e treinar 25 minutos competem pelo mesmo tempo e pela mesma energia.

## Operating Context

- PWA instalado no celular, com uso diário e interrupções frequentes.
- Idioma e tom em pt-BR; o dia vira à meia-noite de Brasília.
- A agenda é o eixo compartilhado: blocos datados de treino, refeição, estudo, leitura e compromisso.
- O cronograma de estudos gera revisões espaçadas (1/7/30 dias) que entram na rotina do dia.
- Importação de plano de treino por arquivo ou foto, com revisão humana antes de salvar.
- Operação gratuita: Supabase no plano free, deploy em Cloudflare Workers, sem anúncios até haver ID aprovado e consentimento.

## Capabilities and Constraints

- Módulos: agenda/hoje, treino, alimentação, compras, progresso, hábitos, metas, saúde, finanças, leitura e estudos. Alguns são opcionais e desligados por padrão.
- XP e sequência são decididos no servidor e gravados apenas por funções SQL; o cliente não escreve no histórico.
- Progresso é somente leitura; cada módulo registra o que é dele.
- Sem promessa de resultado de saúde, diagnóstico ou prescrição.
- Sem dados de saúde de visitantes em analytics público.

## Brand Commitments

- Nome: TaskBio. Assinatura: "organização de vida saudável".
- Tom direto e didático, em pt-BR, sem prometer resultados de saúde.
- Identidade visual existente: tokens em `src/styles.css`, tema claro e escuro, nenhuma cor literal nos componentes.

## Evidence on Hand

Não há depoimentos, clientes, benchmarks, estudos de caso ou números de uso reais. Trabalho futuro não deve inventá-los.

## Product Principles

1. **Um dia, uma lista.** Toda decisão de produto responde a "o que eu faço agora?", não a "qual módulo eu abro?".
2. **Tempo é o recurso escasso.** Estudar, treinar e descansar disputam as mesmas horas; a interface deve mostrar o custo de escolher.
3. **Registrar tem que ser mais rápido que planejar.** Se marcar uma série ou uma sessão custa mais que três toques, o hábito morre.
4. **Nunca inventar dado.** Valores ausentes ficam ausentes e são marcados para revisão; o app não completa prescrição por conta própria.
5. **Reter antes de vender.** Neste ciclo, a medida de sucesso é a pessoa voltar na semana seguinte.
