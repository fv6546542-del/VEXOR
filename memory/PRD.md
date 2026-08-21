# VEXOR — Product Requirements Document

## Problema original
Criar a VEXOR, uma plataforma própria de comunicação em tempo real para comunidades, canais, mensagens, presença, chamadas de voz e compartilhamento de tela, com identidade Dark Tech profissional, interface responsiva e arquitetura preparada para evolução.

## Decisões de arquitetura
- Preservar o starter React + FastAPI + MongoDB existente no workspace.
- Implementar a primeira experiência em React com componentes de workspace próprios, CSS modular e lucide-react.
- Implementar WebSocket por canal em FastAPI (`/api/ws/{room}`), com presença e broadcast de mensagens.
- Manter voz, microfone, WebRTC e compartilhamento de tela como entry points visuais explícitos para a próxima fase, sem simular uma chamada conectada.
- Usar a direção visual “Signal Room”: superfícies sólidas, laranja como sinal primário, tipografia Barlow Condensed + IBM Plex e grid de command center.

## Implementado nesta fase
- Landing page VEXOR com slogan, CTA, navegação e visual de produto.
- Fluxo de entrada e cadastro/login visual por e-mail/senha, com Google reservado como “Em breve”.
- Workspace responsivo com community rail, channel rail, thread central e presença.
- Troca entre comunidades e canais.
- Composer de mensagens com envio por WebSocket e fallback de disponibilidade.
- Estado visível Conectado/Offline e correção de lifecycle sob React StrictMode.
- Broadcast WebSocket entre clientes no mesmo canal.
- Lista de membros/status e card de voz/tela preparado para próxima fase.
- Menu mobile e layout sem overflow horizontal.
- `data-testid` em elementos críticos e interativos.

## Backlog priorizado
### P0
- Implementar autenticação real com hash de senha, sessão persistente, refresh token e recuperação de senha.
- Persistir usuários, comunidades, canais e mensagens no MongoDB com autorização backend.
- Integrar presença persistente e reconexão com recuperação de histórico.

### P1
- Amigos, DMs, convites e notificações.
- Cargos, permissões, regras e moderação com audit log.
- Sinalização WebRTC e sala de voz real com microfone.

### P2
- Compartilhamento de tela via WebRTC e áudio do sistema quando permitido.
- Uploads, reações, threads e busca.
- Cliente mobile e painel administrativo global.
