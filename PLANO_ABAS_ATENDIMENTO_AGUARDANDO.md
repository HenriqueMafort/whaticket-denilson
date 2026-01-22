# Plano - Abas "Aguardando" no Atendimento

Objetivo: adicionar duas abas na tela de atendimento:
- **Atendente aguardando**: ultimo envio foi do atendente, aguardando cliente responder.
- **Cliente aguardando**: ultimo envio foi do cliente, aguardando atendente responder.

## Diagnostico (como esta hoje)
- `backend/src/models/Ticket.ts` tem `fromMe` (bool) e `unreadMessages`.
  - `fromMe` indica se a ultima mensagem do ticket foi enviada pelo atendente/sistema.
  - `unreadMessages` cresce quando o cliente envia e o atendente ainda nao leu.
- Lista de tickets passa por `backend/src/services/TicketServices/ListTicketsService.ts`.
- UI de abas fica em `frontend/src/components/TicketsManagerTabs/index.js` (abas open/pending/etc).

## Mapeamento atual (backend -> frontend)
- Endpoint: `GET /tickets` (controller: `backend/src/controllers/TicketController.ts`, metodo `index`)
- Query params ja usados:
  - `status` (open/pending/closed/group/chatbot/search)
  - `showAll`, `queueIds`, `tags`, `users`, `whatsapps`, `statusFilter`
  - `withUnreadMessages`, `sortTickets`, `searchOnMessages`, `pageNumber`, `searchParam`
- `ListTicketsService`:
  - `attributes` atuais incluem: `status`, `lastMessage`, `updatedAt`, `unreadMessages`
  - **nao retorna `fromMe`** hoje (precisa adicionar se for filtrar no frontend)
  - `whereCondition` inicial inclui: `status = pending` ou `userId` (para tickets do usuario)
  - filtro por `status` e `withUnreadMessages` ja existentes

## Opcao de implementacao (filtro no backend)
1) **Adicionar query param `awaiting` no endpoint** `/tickets`
   - `awaiting=agent`: `fromMe = true` e `unreadMessages = 0`
   - `awaiting=customer`: `fromMe = false` e `unreadMessages > 0`
2) **Incluir `fromMe` nos atributos retornados**
   - arquivo: `backend/src/services/TicketServices/ListTicketsService.ts`
   - adicionar `fromMe` em `attributes`

## Opcao de implementacao (filtro no frontend)
1) **Sem alterar backend**: buscar tickets por status e filtrar localmente
   - requer `fromMe` nos objetos de ticket
   - **mas hoje `fromMe` nao vem**, entao precisa expor no backend de qualquer forma

## Ponto de atencao
- `withUnreadMessages=true` ja tem logica especifica para pending/open/group/chatbot.
- Para nao conflitar, `awaiting` deve ter prioridade ou ser combinado com `status`.

## Regra sugerida (MVP)
- **Atendente aguardando**:
  - `ticket.fromMe = true`
  - `unreadMessages = 0`
  - `status in ("open","pending")` (avaliar se inclui "group"/"lgpd")
- **Cliente aguardando**:
  - `ticket.fromMe = false`
  - `unreadMessages > 0`
  - `status in ("open","pending")`

> Justificativa: `fromMe` marca o ultimo lado que falou; `unreadMessages` evita falso positivo quando o atendente respondeu e o cliente ja respondeu de volta.

## Ajustes no Backend (planejado)
1) **Filtro novo no ListTicketsService**
   - Arquivo: `backend/src/services/TicketServices/ListTicketsService.ts`
   - Adicionar query param `awaiting` com valores:
     - `agent` (atendente aguardando)
     - `customer` (cliente aguardando)
   - Aplicar filtros combinando `fromMe` e `unreadMessages`.
2) **Retorno de contadores**
   - Se existir contagem de abas (badges), expor contadores no endpoint atual:
     - `awaitingAgentCount`
     - `awaitingCustomerCount`
   - Mesmo filtro por companyId e status.

## Ajustes no Frontend (planejado)
1) **Nova(s) abas no atendimento**
   - Arquivo: `frontend/src/components/TicketsManagerTabs/index.js`
   - Adicionar duas tabs:
     - "Atendente aguardando"
     - "Cliente aguardando"
2) **Listagem por aba**
   - Ao trocar de aba, chamar listagem de tickets com `awaiting=agent` ou `awaiting=customer`.
3) **Badges**
   - Mostrar contagem vinda do backend (se implementado).

## Pontos de validacao
- Envio do atendente deve mover ticket para **Atendente aguardando**.
- Resposta do cliente deve mover ticket para **Cliente aguardando**.
- Ao atendente ler/responder, ticket sai de **Cliente aguardando**.

## Observacoes
- Definir se grupos entram nas abas (provavel **nao**).
- Validar comportamento para status "pending" vs "open".
- Ajustar traducoes em `frontend/src/translate/languages/pt.js` etc.
