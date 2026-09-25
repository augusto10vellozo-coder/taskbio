# Trilha — conclusão das melhorias do produto

## Objetivo
Concluir o Trilha como uma plataforma segura e utilizável de organização de vida saudável, sem dados fictícios e com uma experiência consistente no celular e no computador.

## Etapas
1. **Alimentação semanal e compras**
   - Permitir escolher uma refeição para uma data e horário, trocar ou remover a escolha e repetir o planejamento.
   - Exibir totais diários e semanais de calorias, macros e custo estimado.
   - Consolidar ingredientes iguais na lista de compras, preservar itens marcados e permitir acrescentar itens pessoais.
   - Manter avisos claros de que os valores são estimativas e não substituem orientação profissional.

2. **Progresso completo**
   - Registrar peso, medidas, força, corrida e consistência com data, unidade e observações.
   - Salvar os registros com acesso restrito à própria conta.
   - Criar filtros por semana, mês e período, com gráficos adequados para cada tipo de registro.
   - Integrar automaticamente o histórico de treinos e os blocos concluídos.

3. **Agenda mensal e lembretes**
   - Adicionar uma visão mensal com indicadores por dia e acesso rápido à agenda diária.
   - Implementar lembretes no navegador quando houver permissão, respeitando as preferências do perfil.
   - Exibir o estado da permissão e alternativas claras quando notificações não estiverem disponíveis.

4. **Privacidade, segurança e páginas jurídicas**
   - Criar Termos de Uso, Política de Privacidade e Política de Cancelamento/Reembolso em linguagem clara.
   - Adicionar consentimentos de dados sensíveis e comunicações.
   - Permitir exportar os próprios dados e solicitar exclusão da conta com confirmação reforçada.
   - Manter dados, papéis profissionais e permissões separados; nenhum papel será validado apenas pela tela.

5. **Premium**
   - Cadastrar os planos de R$ 9,90/mês e R$ 79,90/ano no ambiente de teste do Paddle.
   - Criar a página de planos, checkout, estado da assinatura, cancelamento e restauração de acesso.
   - Liberar recursos somente após confirmação do provedor de pagamento.
   - Manter a cobrança real desativada até a validação comercial e jurídica da conta do responsável.

6. **Plano Profissional**
   - Criar área exclusiva para profissionais, com solicitação de perfil profissional e estado de validação.
   - Permitir convite, aceite, vínculo e encerramento do acompanhamento de alunos.
   - Garantir que cada aluno controle seus dados e que o profissional veja apenas vínculos autorizados.

7. **Qualidade final**
   - Corrigir a instabilidade de carregamento da tela de acesso.
   - Padronizar estados vazios, carregamento e erro sem inserir conteúdo fictício.
   - Revisar navegação por teclado, leitores de tela, contraste, textos e operação com uma mão no celular.
   - Testar cadastro, recuperação de senha, agenda, treino, alimentação, compras, progresso, assinatura e vínculo profissional em celular e computador.

## Decisões e limites
- Interface e mensagens em português do Brasil; valores em reais.
- Sugestões de treino e alimentação continuam sendo exemplos gerais, não prescrição médica, nutricional ou de educação física.
- Lembretes do navegador dependem da permissão e do suporte do aparelho; envio por e-mail exige a configuração do remetente antes de produção.
- Os textos jurídicos serão uma base inicial e precisarão de revisão de advogado; configuração fiscal e emissão de notas exigem validação de contador.
- A cobrança real e a abertura ampla do Plano Profissional ficam condicionadas à validação do produto e da operação.

## Ordem de entrega
```text
Alimentação e compras → Progresso → Agenda mensal e lembretes
→ Privacidade e páginas jurídicas → Premium de teste
→ Plano Profissional → Revisão e testes finais
```