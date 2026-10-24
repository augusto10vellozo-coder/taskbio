# Roadmap
- [ ] Leitura: sequência/melhor marca, XP diário seguro, meta única validada, percentual/páginas, resumo/estimativa e bloco na Agenda; testar regras e fluxo na conta. Backup pelo Histórico indisponível.
- [x] Agenda: remoções confirmadas; datas fixas em top 0 com versão compacta e setas; conclusão/desmarcação e FAB conferidos em 360/390/1280px na conta, com reabertura e limpeza dos blocos temporários; 8 testes passaram, sem erros.
- [x] Agenda: dashboard e congelamentos removidos; datas/Voltar fixos, conclusão uniforme e atalho +; 8 testes e fluxo autenticado em 360/390/1280px verificaram criação/reabertura/desmarcação, calendário ao rolar, refeições/treino preservados e último bloco sem sobreposição; blocos temporários removidos e ausência confirmada. Backup pelo Histórico indisponível. Progresso não tem equivalentes exatos para kcal do dia nem contagem semanal de refeições concluídas.
- [x] Hábitos: formulário diário/semanal, edição e histórico, limites, sequências e mapa; 25 testes e fluxo autenticado em 360/390/1280px confirmaram bloqueio da quarta marcação e XP, reversão exata de 10 XP, cliques rápidos e reabertura; dados originais restaurados; backup pelo Histórico indisponível
- [x] Corrigir Progresso: 26 testes e fluxo autenticado validaram eixos 84,5–88,5, distância real de seis dias, nomes, unidades, salvamento/reabertura sem detalhe, ponto único, vazio e meta 120%; valores/datas/observações originais conferidos por hash idêntico, teste removido; backup pelo Histórico indisponível
- [x] Planejamento etapa 2: atalhos de refeição/dia/semana e Compras com período, prévia, origem e atualização explícita; 42 testes passaram e fluxo autenticado confirmou cópias, carrinho persistido e lista intacta até atualizar em 360/390px; conta restaurada; backup pelo Histórico indisponível
- [x] Alimentação: Planejar/Registrar, consumo no mesmo ID, previsão original, pular e repetir; 22 testes e fluxo na conta com reabertura de consumida/pulada passaram; itens de teste removidos, compras preservadas; backup pelo Histórico indisponível
- [x] Compras: texto corrigido, estado vazio com dois caminhos, unidade fixa e consolidação normalizada; 4 testes passaram
- [x] Treino 1: marcação independente por série/data, carga opcional e progresso da sessão; testes 2/4, 4/4 e reabertura passaram
- [x] Treino 2: descanso por timestamp, pausa, +15s e reinício; pausa, navegação, reinício e zero conferidos
- [x] Treino 3: progresso por dias planejados/concluídos e semana completa; atualização imediata e badge conferidos
- [x] Treino 4: Excel/CSV local com revisão existente e campos ausentes; XLSX/XLS/CSV e execução autenticada passaram, dados originais restaurados; 42 testes aprovados e entradas PDF/foto preservadas
- [x] Ajustar validação por foto: carga opcional neutra e aquecimento/instruções como notas; 20 testes passaram e foto real autenticada confirmou bloqueio por repetições, rodapé e continuidade na validação existente, sem salvar dados ou alterar PDF
- [x] Importar fotos/prints com OCR local e confirmação; 17 testes e leitura real autenticada de duas imagens passaram, com campos ausentes, remoção/releitura, imagem inválida e PDF preservado; câmera/HEIC em aparelho físico ainda não verificados
- [x] Corrigir histórico independente por exercício e registros parciais sem carga; 21 testes passaram e registros individuais de uma semana apareceram na seguinte após recarregar, sem concluir o treino
- [x] Priorizar refeições do dia, recolher sugestões e integrar registros únicos com a Agenda; 15 testes e fluxo local completo em celular/computador validados, incluindo conclusão com kcal e link de Compras
- [x] Corrigir entrega por assinatura, renovação, telemetria, silêncio noturno e preferências; 42 testes passaram, controle de provas conferido na conta e renovação validada com envio simulado; recebimento em celular aguarda publicação e teste real
- [x] Evoluir Estudos: matérias com cor, cronômetro, provas com lembrete, metas por matéria, streak e +5 XP
- [x] Evoluir Leitura: busca de livros, estante, sessões por livro, meta semanal, streak, citações e +5 XP

- [x] Ajustar hábitos, desobstruir navegação e padronizar Voltar; 18 telas validadas em 360/390px e desktop, marcação local persistida e retorno direto conferidos sem alterar dados da conta

- [x] Corrigir participantes compartilhados da liga, incluindo ranking, prêmios e avisos; grupo de três validado para cada participante e tela conferida com a conta do anfitrião

- [x] Corrigir estado vazio do treino e agendamento explícito de exemplos
- [x] Corrigir totais semanais/diários de refeições e acentos dos alimentos; registros sem nutrientes são identificados e podem ser completados
- [x] Ajustar texto cortado no progresso da agenda e validar os três fluxos

- [x] Refinar Minha Agenda: resumo compacto, opções protegidas, estados vazios e testes de sincronização/cancelamento

- [ ] Verificar e configurar a expiração real de recuperação para 60 minutos — bloqueado: as ferramentas disponíveis não expõem leitura nem alteração de `mailer_otp_exp`; não considerar o texto do e-mail como validação.
- [ ] Validar recuperação com um link real e rejeição da segunda utilização — bloqueado até acesso à configuração de autenticação e teste autorizado de recuperação.

- [x] Restaurar o visual anterior à reformulação verde e branca e ao menu lateral, preservando funcionalidades e dados

- [x] Exportar lista de compras como texto e PDF
- [x] Oferecer temas claro, escuro e seguir sistema
- [x] Metas semanais editáveis e comparativo no progresso
- [x] Semana de exemplo opcional, uso local sem conta e ações rápidas da agenda
- [x] Instalação no celular e lembretes locais consentidos
- [x] Contas Google e e-mail com perfil completo
- [x] Sincronização da agenda, treinos e alimentação
- [x] Criação, edição, repetição e lembretes de compromissos
- [x] Execução de treino com cronômetro e histórico
- [x] Modalidades e objetivos com exemplos de treinos contextualizados
- [x] Novas contas sem treinos iniciais e exclusão confirmada de treinos adicionados
- [x] Agenda por datas reais e planejamento futuro
- [x] Planejamento alimentar e compras automáticas
- [x] Registro manual de alimentos consumidos com porção e valores nutricionais opcionais
- [x] Gráficos completos de progresso
- [x] Aplicativo gratuito, sem planos ou cobranças
- [x] Área profissional restrita, convites e vínculos autorizados
- [x] Agenda mensal e visão integrada de datas
- [x] Lembretes locais com preferências e permissões
- [x] Estados vazios, carregamentos e mensagens de erro consistentes
- [x] Exportação e exclusão de dados e páginas jurídicas iniciais
- [x] Revisão de acessibilidade, experiência móvel e estabilidade do acesso
- [x] Testes dos fluxos públicos e proteção da área profissional em celular e computador
- [x] Remover referências públicas à fase de testes
- [x] Preparar informações públicas, contato e política para candidatura ao AdSense, sem carregar anúncios antes da aprovação
- [x] Revisão editorial por IA, espaços responsivos de anúncios inativos e métricas opcionais com consentimento
- [x] Restringir futuros anúncios ao navegador, ocultando-os no aplicativo instalado e em contêiner nativo
- [ ] Ativar AdSense — aguarda ID de editor aprovado, identificação legal do responsável, política e mecanismo de escolhas de privacidade para publicidade

- [x] Renomear o produto e a identidade visual para TaskBio, preservando dados e endereços existentes
- [x] Aplicar o novo ícone TaskBio sem a borda branca, mantendo o desenho original
- [x] Traduzir para português as telas de erro, avisos de acesso e rótulos do calendário
- [x] Padronizar o contato público no e-mail contatotaskbio@gmail.com e retirar o telefone de Contato, Termos e Privacidade

- [x] Tela inicial "o que importa hoje", hábitos, metas do mês, saúde e módulos ligáveis
- [x] Módulo Treino: plano semanal, registro de exercícios, progressão e importação de plano por arquivo
- [x] Unificar Treino e Atividades em uma página com abas e modelos agendáveis
- [x] Módulos ativáveis, Finanças, Leitura, Estudos e medicamentos com lembretes
- [x] Pontos (XP) com regras de integridade, Amigos, convites, liga semanal e card compartilhável
- [ ] Testar cadastro completo por convite com uma segunda sessão autorizada — ranking dos três participantes validado; cadastro por link ainda depende dessa sessão
