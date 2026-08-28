# VEXOR — Product Requirements Document

## Problema original
Plataforma própria de comunicação em tempo real (comunidades, canais, chat, voz, tela, amigos, DMs, moderação) com identidade Dark Tech vermelha, monetização por assinatura e integração social. Não recriar do zero — evoluir o MVP existente sem apagar dados.

## Stack (fixado)
- **Frontend:** React + Tailwind base + CSS modular · fontes Chakra Petch + Space Grotesk + JetBrains Mono
- **Backend:** FastAPI + Motor (MongoDB) + JWT + bcrypt
- **Realtime:** WebSocket (chat + signalling) · WebRTC P2P mesh (voz + tela + áudio do sistema)
- **Pagamentos:** Stripe (Flow A — claimable sandbox `acct_1U9GIuAMeKVSN4ut`, país BR, `diy` tax mode)
- **Auth alternativa:** Google OAuth (pendente — aguardando credenciais do usuário)

## Identidade visual
- Paleta Dark Tech: `--red #ff2b3a`, `--red-hot #ff5c68`, `--bg #0a0a0c`, `--surface #141419`, `--graphite #17171c`
- Logo VEXOR: V estilizado em vermelho com clip-path triangular e glow
- Slogan: **CONNECT · TALK · SHARE**

## Implementado
### MVP anterior (preservado)
- Auth JWT + refresh + recovery + logout
- Comunidades, canais, mensagens, WebSocket broadcast
- WebRTC voz P2P (mute, active speaker) + compartilhamento de tela + áudio do sistema
- Amigos, DMs, regras, aceite de regras, moderação (ban/kick/unban), audit log, denúncias, bloqueios

### Iteração atual — Evolução
- ✅ **Identidade Dark Tech** — novo App.css + landing renovada com hero, feature strip e waveform animado
- ✅ **Pricing page** (`/pricing`) com 3 tiers: FREE (R$0/50 comunidades), PULSE (R$14,99/150/1080p), IGNITE (R$39,99/300/4K)
- ✅ **Stripe billing** — Flow A sandbox, checkout com `subscription_data.trial_period_days=30`, webhook `/api/stripe/webhook`, billing portal, status polling, catálogo idempotente (`setup_stripe.py`)
- ✅ **Perfil enriquecido** — bio, activity/jogo, avatar_url, banner_url via `PATCH /api/users/me`
- ✅ **Tier enforcement** — `create_community` checa `community_limit` e retorna 402
- ✅ **Settings panel** com abas Perfil e Plano (gerenciar assinatura via portal Stripe)
- ✅ **Tier badges** — PULSE (rosa) e IGNITE (dourado) exibidos no user-dock e perfil
- ✅ **Mobile refinado** — channel-rail agora abre como drawer via botão Hash na topbar; settings acessível via ícone Settings; composer sem overlays
- ✅ Bug fixes iteração 7→8: global-tools overlay removido, /payment/cancel dedicado, billing/status agora auth+owner, webhook trata JSON inválido, refresh guard user None

## Backend endpoints novos
- `GET /api/billing/tiers` · `GET /api/billing/me` · `POST /api/billing/checkout`
- `GET /api/billing/status/{session_id}` (auth + owner) · `POST /api/billing/portal`
- `POST /api/stripe/webhook` (signature verify + ValueError tolerant)
- `PATCH /api/users/me`
- `TIERS` dict com `community_limit`, `max_video`, `badge`, `lookup_key`

## Testes
- **38/38 pytest passing** (iteration_8.json)
- Suites: `test_billing_profile.py`, `test_iteration8_fixes.py`, `test_auth_workspace_regression.py`, `test_social_rules_regression.py`, `test_websocket.py`
- Frontend E2E: landing, pricing, register→workspace, settings profile save, /payment/cancel, mobile 390px

## Backlog priorizado
### P0
- **Google OAuth** — aguardando GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET do usuário
- **Mascote VEXOR** — gerar via Gemini Nano Banana para loaders e estados vazios (Fase D)

### P1
- Splittar `App.js` (762 linhas) em `components/` (Landing, Pricing, Auth, Workspace, Voice, Settings)
- Client-side router (deep link em `/pricing`)
- Bordas de avatar animadas para PULSE/IGNITE
- Cap real de resolução WebRTC pelo tier (720p/1080p/4K)
- Presença persistente + reconnect com histórico

### P2
- Cliente mobile nativo, dashboard administrativo global, uploads, threads, busca
