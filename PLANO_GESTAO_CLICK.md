# Plano de Integracao - Gestao Click

Objetivo: integrar a API da Gestao Click para sincronizar data de nascimento
dos clientes com contatos do Whaticket, via job diario. Sem usar SGP.

## Requisitos definidos
- Criar nova integracao "Gestao Click" (type: gestaoclick) separada do SGP.
- Buscar clientes na API e usar data_nascimento.
- Normalizar telefone/celular mantendo apenas digitos; usar BR como padrao.
- Procurar contato no Whaticket por numero (celular primeiro, fallback telefone).
- Atualizar Contacts.birthDate usando regra de meio-dia local (evitar timezone).
- Atualizar nome apenas quando o identificador for numero (bug atual grava LID no nome).
- Normalizar nome: se estiver TODO EM CAIXA ALTA, converter para "Title Case"
  mantendo "dos", "da", "de" em minusculo
  (ex.: "OSMAR DOS SANTOS" -> "Osmar dos Santos").
- Criar contatos novos somente quando houver birthDate valida e telefone valido.
  Caso contrario, ignorar. Atualizacao segue normal para contatos existentes.
- Job diario (sem sync manual).
- Nao exibir Gestao Click nas listas usadas por bots.
- Exibir na tela da integracao a quantidade de contatos atualizados.
- Persistir quantidade em coluna dedicada (nao jsonContent).
- Se job falhar, registrar falha e mostrar motivo.

## UI (Frontend)
- Arquivo: frontend/src/components/QueueIntegrationModal/index.js
  - Adicionar tipo "gestaoclick" no select.
  - Campos:
    - gcAccessToken
    - gcSecretToken
    - gcBaseUrl (opcional)
  - Persistir em jsonContent.
  - Exibir leitura dos dados:
    - Ultima sincronizacao (timestamp)
    - Total de contatos atualizados
    - Ultimo erro (mensagem de falha)

- Arquivo: frontend/src/pages/QueueIntegration/index.js
  - Opcional: avatar/icone para Gestao Click.

- Nao mostrar Gestao Click nas listas de bots:
  - frontend/src/components/QueueModal/index.js
  - frontend/src/components/WhatsAppModal/index.js
  - Filtrar o tipo gestaoclick desses selects.

## Backend (Modelo e Persistencia)
- Adicionar colunas dedicadas em QueueIntegrations:
  - gcLastSyncAt (datetime)
  - gcUpdatedCount (int)
  - gcLastError (text)
  - Migration nova.
- Manter tokens no jsonContent.

## Backend (Cliente de API)
- Novo client:
  - backend/src/services/IntegrationsServices/GestaoClick/GestaoClickClient.ts
  - Base URL:
    - gcBaseUrl do jsonContent, fallback: https://api.beteltecnologia.com/api
  - Headers:
    - access-token
    - secret-access-token
  - GET /clientes com paginacao (limite 100).
  - Respeitar rate limit (3 req/s) com delay entre chamadas.

## Backend (Servico de Sync)
- Novo servico:
  - backend/src/services/IntegrationsServices/GestaoClick/SyncGestaoClickBirthdaysService.ts
- Fluxo:
  1) Listar QueueIntegrations do tipo gestaoclick por empresa.
  2) Buscar clientes paginados.
  3) Normalizar celular/telefone.
  4) Selecionar celular, fallback telefone.
  5) Procurar Contact por number.
  6) Se existir:
     - Atualizar birthDate com regra de meio-dia local.
     - Atualizar name apenas se for numero (evitar LID no nome).
  7) Contar atualizacoes.
  8) Salvar gcLastSyncAt, gcUpdatedCount.
  9) Se falhar:
     - Registrar gcLastError com motivo.
     - Log de erro por empresa/integracao.

## Job Diario
- Adicionar cron em backend/src/queues.ts
- Exemplo horario: 03:00 BRT
- Execucao:
  - Rodar SyncGestaoClickBirthdaysService para todas as empresas ativas.

## Decisoes confirmadas
- Chave de busca: celular ou telefone (celular primeiro).
- Criar contatos novos somente quando houver birthDate valida e telefone valido.
  Caso contrario, ignorar.
- Atualizar nome somente quando o contato tiver name como numero (conteudo numero).
- Ao atualizar nome, aplicar normalizacao de caixa alta para Title Case
  mantendo "dos", "da", "de" em minusculo.
- DDI/DDD sempre BR.
- Registrar falha e mostrar motivo no UI.

## Pendencias
- Validar baseUrl real da API quando tokens estiverem disponiveis.
- Definir horario exato do cron (03:00 e sugestao).
