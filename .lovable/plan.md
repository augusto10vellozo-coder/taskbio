# Avaliação de conteúdo, espaços de anúncio e métricas públicas

## Resultado
- Criar uma área **Equipe** acessível somente a administradores.
- Permitir cadastrar páginas públicas, colar ou descrever o conteúdo e informar critérios editoriais.
- Avaliar clareza, utilidade e adequação com Lovable AI, retornando notas e melhorias acionáveis.
- Reservar espaços responsivos e discretos para anúncios nas páginas públicas, sem carregar anúncios enquanto não houver aprovação e consentimento configurado.
- Exibir um painel simples de visitas e cliques por página e período.

## Experiência
- A área Equipe terá duas abas: **Revisão de conteúdo** e **Métricas**.
- A revisão aceitará várias páginas em uma solicitação e mostrará pontos fortes, riscos e ações priorizadas.
- Os espaços de anúncio serão identificados como publicidade apenas quando houver anúncio ativo; enquanto isso, não haverá bloco vazio visível ao visitante.
- Um aviso de privacidade permitirá aceitar ou recusar métricas opcionais, além de alterar a escolha depois pelo rodapé.

## Privacidade e segurança
- Registrar somente caminho da página, tipo de evento, posição do anúncio e horário; sem IP, e-mail, identificador de usuário ou impressão digital.
- Não registrar nada antes do consentimento para métricas.
- Restringir relatórios, critérios e avaliações à função administrativa validada no servidor.
- Manter publicidade inativa até serem fornecidos o ID AdSense aprovado e a configuração jurídica de consentimento.

## Implementação técnica
- Adicionar tabelas protegidas para critérios/avaliações e eventos públicos agregáveis, com permissões explícitas e políticas de acesso.
- Criar função protegida no servidor para a avaliação via AI Gateway usando `openai/gpt-6-astra`, Responses API, raciocínio habilitado e chave somente no servidor.
- Adicionar componentes reutilizáveis para consentimento, registro de métricas e posições futuras de anúncio.
- Incluir a área Equipe na navegação apenas para administradores e adicionar metadados próprios à nova página.
- Validar compilação, chamada real da avaliação, consentimento, coleta, painel e visual em celular e computador.
