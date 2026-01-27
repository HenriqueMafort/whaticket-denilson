# PLANO_MODIFICACOES_PENDENTES.md

## 1) FlowBuilder -> Integração automática
Objetivo: criar integração automaticamente e gerenciar tudo pelo FlowBuilder.

Backend
- backend/src/services/FlowBuilderService/CreateFlowBuilderService.ts: após criar flow, criar QueueIntegrations type=flowbuilder.
- backend/src/services/FlowBuilderService/UpdateFlowBuilderService.ts: renomear integração se o flow mudar de nome.
- backend/src/services/FlowBuilderService/DuplicateFlowBuilderService.ts: duplicar integração junto com flow.
- backend/src/services/FlowBuilderService/DeleteFlowBuilderService.ts: remover integração quando flow for excluído.

Frontend
- frontend/src/components/QueueIntegrationModal/index.js: remover opção "Flowbuilder" do dropdown.
- frontend/src/pages/QueueIntegration/index.js: bloquear editar/excluir para integrações flowbuilder e mostrar "Gerenciado pelo FlowBuilder".

---

## 2) Transcrição de áudio (API api_transcricao)
Objetivo: corrigir transcrição ou remover opção.

Backend
- backend/src/services/MessageServices/TranscribeAudioMessageService.ts:
  - enviar FormData com audio ou url
  - não forçar Content-Type: application/json
  - validar TRANSCRIBE_URL
  - tratar mediaUrl local com path.basename

Frontend
- frontend/src/components/AudioModal/index.js e frontend/src/components/AudioModalCustom/index.js:
  - se API retornar 503, mostrar toast amigável
  - opcional: esconder botão se não houver TRANSCRIBE_URL

---

## 3) Fotos de contatos não aparecem
Objetivo: atualizar fotos faltantes e explicar quando é privacidade.

Backend
- backend/src/services/WbotServices/verifyContact.ts: reativar busca de foto quando foto está vazia/nopicture.
- logar motivo quando falhar (privacidade, not-authorized).
- opcional: job diário para refresh.

Frontend
- opcional: botão "Atualizar foto" no contato.

---

## 4) Menu de ações no mobile (Atendimentos)
Objetivo: remover botões pequenos e usar menu de 3 pontos com label "Ações".

Frontend
- frontend/src/components/TicketActionButtonsCustom/index.js:
  - usar useMediaQuery para detectar mobile
  - no mobile: ocultar ícones (fechar, transferir, voltar fila)
  - mostrar menu "Ações" com:
    - Transferir
    - Fechar
    - Excluir conversa (Admin)

---

## 5) Verifica??o de conta no cadastro e recupera??o de senha
Objetivo: evitar cadastros sem identifica??o e validar usu?rio via WhatsApp.

Backend
- Ponto atual do cadastro: backend/src/controllers/UserController.ts
  - store() ? chamado em /auth/signup (backend/src/routes/authRoutes.ts).
  - Hoje j? envia mensagem WhatsApp com dados do cadastro usando wbot.
  - Ajuste planejado: inserir etapa de OTP ANTES de CreateCompanyService:
    1) /auth/signup/request-otp -> valida telefone, gera OTP, salva e envia via WhatsApp.
    2) /auth/signup/confirm-otp -> valida OTP e s? ent?o cria a empresa/usu?rio.
- Criar fluxo de verifica??o por c?digo (OTP) para:
  - Cadastro de usu?rio
  - Recupera??o de senha (n?o existe endpoint/rota hoje -> precisa criar).
- Gerar c?digo (6 d?gitos) com expira??o (ex: 10 min) e tentativa m?xima.
- Persist?ncia:
  - Nova tabela (ex: VerificationTokens) com phone, type, codeHash, expiresAt, attempts, usedAt, companyId opcional.
  - Alternativa: coluna JSON em Users/Companies (menos ideal).
- Envio de OTP:
  - Reutilizar l?gica de envio WhatsApp do UserController (getWbot + sendMessage).
  - Definir fallback se n?o houver sess?o conectada.

Frontend
- Cadastro: frontend/src/pages/Signup/index.js
  - Transformar em fluxo de 2 passos: solicitar OTP -> validar OTP -> enviar signup final.
  - Exibir input de c?digo e bot?o "Confirmar".
- Recupera??o de senha:
  - N?o existe UI hoje (Login n?o tem link de recupera??o).
  - Criar nova rota/p?gina (ex: /recover) com:
    1) telefone -> solicitar OTP
    2) OTP + nova senha -> confirmar
  - Atualizar tradu??es em frontend/src/translate/languages/*.js

Notas
- Se n?o houver conex?o WhatsApp ativa, mostrar erro espec?fico.
- Logar tentativas e bloquear por excesso (rate limit).

---


## 6) Menu de ações no mobile (atendimentos)
Objetivo: no mobile, remover botões pequenos (transferir/fechar) e usar menu de 3 pontos com label "Ações".

Onde fica hoje
- frontend/src/components/TicketActionButtonsCustom/index.js
  - Ícones atuais: fechar (HighlightOffIcon), voltar fila (UndoIcon), transferir (SwapHorizOutlined)
  - Menu de 3 pontos já existe no final (MoreVert + Menu)

Plano frontend
1) Detectar mobile
- Adicionar: const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

2) No mobile, esconder ícones diretos
- Condicionar render dos botões de fechar/transferir/voltar fila para !isMobile

3) Criar botão "Ações" (3 pontos + label) no mobile
- Substituir o ícone MoreVert isolado por botão com label "Ações" (apenas mobile)

4) Menu de ações
- Dentro do Menu (já existe), incluir:
  - Transferir -> handleOpenTransferModal
  - Fechar -> handleClickResolver
  - Excluir conversa -> handleOpenConfirmationModal (somente admin)

5) Permissões
- Excluir conversa somente se user.profile === 'admin'

Resultado esperado
- Mobile: só menu "Ações" com itens clicáveis maiores
- Desktop: mantém botões atuais


## 7) Assinatura interna por mensagem (canal/usuario/hora/bot)
Objetivo: mostrar informa??o interna abaixo da mensagem (sem enviar ao cliente).

Backend
- Mensagem n?o possui remetente expl?cito. Hoje Message n?o tem userId/sender.
- Op??es de persist?ncia:
  - Melhor: adicionar colunas em Message (senderId, senderName, senderType, channelName/whatsappName).
  - Alternativa r?pida: gravar metadata em dataJson (ex: {meta:{senderId,...}}) e expor no GET.
- Onde preencher:
  - backend/src/controllers/MessageController.ts (store): mensagens manuais -> senderType="user", senderId=req.user.id, senderName=req.user.name.
  - Servi?os autom?ticos (Typebot, BirthdayService, etc.): preencher senderType="bot" e senderName (ex: "FlowBuilder", "BirthdayBot").
- Expor no GET:
  - backend/src/services/MessageServices/ListMessagesService.ts: incluir novos campos nos attributes e no include de Ticket/Whatsapp.
  - garantir whatsapp.name via include (Ticket -> Whatsapp) para exibir conex?o.

Frontend
- frontend/src/components/MessagesList/index.js:
  - adicionar linha sutil abaixo do conte?do (antes do timestamp) com fonte menor.
  - exibir: "{whatsappName} ? {senderName} ? {HH:mm} ? {Bot/Atendente}".
  - mostrar apenas para mensagens internas (UI), n?o altera o body.
- Estilo:
  - cor cinza/verde claro, tamanho 10-11px, alinhado ? direita (fromMe) e ? esquerda (recebidas se necess?rio).

Notas
- Origem: manual = atendente; automa??es = bot.
- Canal: usar ticket.channel + whatsapp.name (ex: ZapSM / ZapOficialAPI).



## 8) Mobile: remover bot?o ticket/atendimentos e voltar do contato
Objetivo: no mobile, n?o mostrar o bot?o de alternar Ticket/Atendimentos; ao sair do contato, voltar direto para atendimentos; lista de conversas fixa (sem pular layout).

Frontend
- Ver onde fica o toggle Ticket/Atendimentos (prov?vel em Tickets page / layout mobile):
  - frontend/src/pages/Tickets/index.js
  - frontend/src/components/TicketsListCustom/index.js (tabs/toggle em mobile)
- A??o ao ?voltar? do contato:
  - frontend/src/components/ContactDrawer/index.js ou ContactDrawer/Modal
  - ajustar handler de close para fazer history.push('/tickets') ou setTabOpen('open')
- Fixar conversas no mobile:
  - revisar CSS/layout de lista em: frontend/src/components/TicketsListCustom/index.js
  - impedir reflow no header (usando container fixo e overflow somente no list)

Notas
- A l?gica de tabs foi recentemente alterada; manter compat?vel com ?Aguardando/Atendendo?.


Detalhamento (verificado no c?digo)
- Toggle ?Ticket/Atendimentos? (mobile): est? em frontend/src/pages/TicketsAdvanced/index.js
  - Usa BottomNavigationAction com label ?Atendimentos?.
  - Para remover no mobile: condicionar render desse BottomNavigation quando isMobile.

- Tabs e lista de conversas (Atendimentos): frontend/src/components/TicketsManagerTabs/index.js
  - Tabs ?Atendendo/Aguardando/Atendente aguard./Cliente aguard./Grupos?.
  - Estilo/scroll da lista: frontend/src/components/TicketsListCustom/index.js
    - ticketsListWrapper e ticketsList (overflow/scroll).

- Voltar do contato para atendimentos:
  - A navega??o de tickets ocorre em TicketsManagerTabs: handleBack() faz history.push("/tickets").
  - Para garantir ?voltar do contato -> atendimentos?, ajustar o handler de close do ContactDrawer (frontend/src/components/ContactDrawer/index.js) para chamar history.push('/tickets') e/ou setTabOpen('open').
  - Tamb?m h? setTabOpen em frontend/src/components/TicketListItem/index.js e frontend/src/components/TicketActionButtonsCustom/index.js.

Plano de ajuste (sem implementar)
1) TicketsAdvanced: condicionar o BottomNavigation (Ticket/Atendimentos) a !isMobile.
2) ContactDrawer: ao fechar, navegar para /tickets e setar tabOpen "open".
3) Garantir layout fixo no mobile:
   - manter header de tabs fixo, scroll somente em ticketsList (j? em TicketsListCustom).
   - se ainda ?pula? no mobile, ajustar CSS no TicketsManagerTabs (tabsWrapper height fixa) e em TicketsListCustom (ticketsList height: calc(100% - header)).


## 9) Dispositivos conectados (WhatsApp)
Observa??o: a lista "Dispositivos conectados" ? controlada pelo pr?prio WhatsApp.
N?o ? poss?vel exibir "ZapGO" ali via Whaticket/Baileys/API oficial.
Alternativas: mostrar "Conectado ZapGO" dentro do Whaticket (tela de conex?es) ou mensagem interna.

