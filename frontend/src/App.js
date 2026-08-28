import { useEffect, useRef, useState } from "react";
import {
  Bell, Check, ChevronRight, Cpu, Crown, Flame, Hash, Headphones, LogIn,
  Menu, MessageSquare, Mic, MonitorUp, MoreHorizontal, Play, Plus,
  Radio, Search, Send, Settings, Shield, Signal, Smile, Sparkles, Users,
  UserPlus, Volume2, Wallet, X, Zap
} from "lucide-react";
import "@/App.css";
import { api, clearSession, saveSession, websocketUrl } from "@/lib/api";

const fallbackCommunities = [
  { id: "nexus", label: "N", name: "Nexus Lab" },
  { id: "atlas", label: "A", name: "Atlas Studio" },
  { id: "orbit", label: "O", name: "Orbit" },
];
const fallbackChannels = [
  { id: "general", name: "general", count: "24" },
  { id: "projects", name: "projects", count: "8" },
  { id: "feedback", name: "feedback", count: "" },
];
const initialMessages = [
  { id: 1, name: "Maya Chen", initials: "MC", role: "Product", time: "09:42", text: "Bom dia. O novo fluxo de onboarding já está no ar para revisão.", tone: "red" },
  { id: 2, name: "Ravi Mendes", initials: "RM", role: "Design", time: "09:45", text: "Vou olhar agora. A nova hierarquia deixa as ações principais bem mais claras.", tone: "glow" },
  { id: 3, name: "Você", initials: "VC", role: "Member", time: "09:47", text: "Perfeito. Também deixei uma nota no canal #feedback.", tone: "graphite" },
];
const fallbackMembers = [
  { name: "Maya Chen", role: "Product lead", initials: "MC", status: "Online", tone: "red" },
  { name: "Ravi Mendes", role: "Designer", initials: "RM", status: "Online", tone: "glow" },
  { name: "Joana Silva", role: "Engineer", initials: "JS", status: "Ausente", tone: "graphite" },
  { name: "Theo Martins", role: "Community", initials: "TM", status: "Ocupado", tone: "outline" },
];

function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`} data-testid="vexor-brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5 L12 20 L21 5" /></svg>
      </span>
      <span className="brand-text"><strong>VEXOR</strong><small>CONNECT · TALK · SHARE</small></span>
    </div>
  );
}

function TierBadge({ tier }) {
  if (!tier || tier === "free") return null;
  const label = tier === "ignite" ? "IGNITE" : "PULSE";
  const Icon = tier === "ignite" ? Crown : Flame;
  return <span className={`tier-badge ${tier}`} data-testid={`tier-badge-${tier}`}><Icon size={11}/> {label}</span>;
}

function Landing({ onEnter, onPricing }) {
  return (
    <main className="landing" data-testid="landing-page">
      <nav className="landing-nav">
        <Brand />
        <div className="landing-links">
          <a href="#platform" data-testid="platform-link">Plataforma</a>
          <a href="#pricing" data-testid="pricing-link" onClick={(e) => { e.preventDefault(); onPricing(); }}>Planos</a>
          <a href="#security" data-testid="security-link">Segurança</a>
        </div>
        <button className="button button-ghost" onClick={onEnter} data-testid="landing-login-button">Entrar <LogIn size={15}/></button>
      </nav>

      <section className="hero">
        <div>
          <span className="eyebrow">SINAL ABERTO · V0.3</span>
          <h1>Conexões que<br/><em>disparam</em> ideias.</h1>
          <p className="hero-lede">A VEXOR é a plataforma de comunidades, voz, tela e mensagens feita para times, gamers e coletivos que querem se conectar sem ruído.</p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={onEnter} data-testid="landing-start-button">Começar agora <Zap size={16}/></button>
            <button className="text-link" onClick={onPricing} data-testid="landing-pricing-button">Ver planos <ChevronRight size={14} style={{verticalAlign:"middle"}}/></button>
          </div>
          <div className="hero-proof">
            <div className="avatar-stack">
              <span className="avatar avatar-red">MC</span>
              <span className="avatar avatar-glow">RM</span>
              <span className="avatar avatar-graphite">JS</span>
              <span className="avatar avatar-dark">+2K</span>
            </div>
            <span><strong>2.418</strong> pessoas conectadas<br/><small>em comunidades VEXOR agora</small></span>
          </div>
        </div>

        <div className="hero-art" aria-label="Prévia do workspace VEXOR">
          <div className="hero-orb" />
          <div className="signal-card">
            <div className="signal-header">
              <span className="live-pill">LIVE · NEXUS LAB</span>
              <span className="signal-time">09:48:12</span>
            </div>
            <div className="waveform">{Array.from({length:20}).map((_,i)=><i key={i}/>)}</div>
            <div className="signal-footer">
              <div>
                <strong>Uma sala para cada conversa.</strong>
                <small>WEBRTC · P2P · 1080p</small>
              </div>
              <span className="peers">24 online</span>
            </div>
          </div>
          <div className="floating-note">VOZ EM TEMPO REAL<strong>Conecte-se sem ruído.</strong></div>
        </div>
      </section>

      <section className="feature-strip" id="platform">
        <div>
          <span className="feature-number">01 / COMUNIDADES</span>
          <div className="feature-icon"><Users size={20}/></div>
          <h3>Espaços que fazem sentido</h3>
          <p>Comunidades com contexto, canais, cargos e regras. Do lobby ao raid, tudo organizado.</p>
        </div>
        <div>
          <span className="feature-number">02 / VOZ + TELA</span>
          <div className="feature-icon"><Radio size={20}/></div>
          <h3>WebRTC de verdade</h3>
          <p>Voz P2P com supressão de ruído, tela + áudio quando o SO permite e latência baixa.</p>
        </div>
        <div>
          <span className="feature-number">03 / TECNOLOGIA</span>
          <div className="feature-icon"><Cpu size={20}/></div>
          <h3>Pronto pra escalar</h3>
          <p>Presença em tempo real, autenticação real e caminho aberto pra SFU quando a comunidade crescer.</p>
        </div>
      </section>
    </main>
  );
}

function Pricing({ onBack, onEnter, user, currentTier }) {
  const [tiers, setTiers] = useState([]);
  const [error, setError] = useState("");
  const [loadingKey, setLoadingKey] = useState("");
  useEffect(() => { api("/billing/tiers").then((data) => setTiers(data.tiers)).catch((err) => setError(err.message)); }, []);

  const checkout = async (lookup_key) => {
    if (!user) { onEnter("pricing"); return; }
    setLoadingKey(lookup_key); setError("");
    try {
      const data = await api("/billing/checkout", { method: "POST", body: JSON.stringify({ lookup_key, origin_url: window.location.origin }) });
      window.location.href = data.checkout_url;
    } catch (err) { setError(err.message); setLoadingKey(""); }
  };

  return (
    <main className="billing-page" data-testid="pricing-page">
      <button className="billing-back" onClick={onBack} data-testid="pricing-back-button"><X size={16}/> Voltar</button>
      <div style={{position:"relative",zIndex:1}}>
        <div className="pricing-head">
          <span className="eyebrow">PLANOS VEXOR</span>
          <h2>Escolha o seu <em style={{fontStyle:"normal",color:"var(--red-hot)"}}>sinal</em>.</h2>
          <p>Comece de graça. Faça upgrade para mais comunidades, transmissão em 1080p ou 4K, badges exclusivos e bordas de perfil que separam quem está aqui pra ficar.</p>
        </div>
        {error && <p className="form-error" data-testid="pricing-error" style={{maxWidth:640,margin:"0 auto 22px"}}>{error}</p>}
        <div className="pricing-grid">
          {tiers.map((tier) => {
            const isPopular = tier.id === "pulse";
            const isPremium = tier.id === "ignite";
            const isCurrent = currentTier === tier.id;
            return (
              <div key={tier.id} className={`pricing-card ${isPopular ? "popular" : ""} ${isPremium ? "premium" : ""}`} data-testid={`pricing-card-${tier.id}`}>
                {isPopular && <span className="pricing-badge">MAIS ESCOLHIDO</span>}
                {isPremium && <span className="pricing-badge premium">PREMIUM</span>}
                <h3>{tier.name}</h3>
                <div className="pricing-price">
                  {tier.price === 0 ? (<><strong>R$0</strong><small>/ sempre</small></>) : (<><strong>R${tier.price.toString().replace(".", ",")}</strong><small>/ mês · BRL</small></>)}
                </div>
                {tier.price > 0 && <span className="pricing-trial">◉ 30 DIAS GRÁTIS DE TRIAL</span>}
                <ul className="pricing-features">
                  {tier.features.map((f, i) => <li key={i}><Check size={14}/> {f}</li>)}
                </ul>
                <div className="pricing-cta">
                  {tier.id === "free" ? (
                    isCurrent ? (
                      <button className="button button-outline full" disabled data-testid={`pricing-cta-${tier.id}`}>Plano atual</button>
                    ) : (
                      <button className="button button-outline full" onClick={() => user ? onBack() : onEnter("pricing")} data-testid={`pricing-cta-${tier.id}`}>{user ? "Voltar ao workspace" : "Começar grátis"}</button>
                    )
                  ) : isCurrent ? (
                    <button className="button button-outline full" disabled data-testid={`pricing-cta-${tier.id}`}>Plano atual</button>
                  ) : (
                    <button className={`button ${isPremium ? "button-outline" : "button-primary"} full`} onClick={() => checkout(tier.lookup_key)} disabled={loadingKey === tier.lookup_key} data-testid={`pricing-cta-${tier.id}`}>
                      {loadingKey === tier.lookup_key ? "Abrindo checkout..." : `Ativar ${tier.name.replace("VEXOR ", "")}`} <Sparkles size={15}/>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p style={{textAlign:"center",color:"var(--muted)",fontSize:12,marginTop:32,fontFamily:"var(--font-mono)",letterSpacing:".14em"}}>PAGAMENTO PROCESSADO POR STRIPE · CANCELE QUANDO QUISER</p>
      </div>
    </main>
  );
}

function PaymentResult({ sessionId, cancelled, onDone }) {
  const [status, setStatus] = useState(cancelled ? "Você cancelou o checkout — nenhum valor foi cobrado." : "Confirmando pagamento");
  const [ok, setOk] = useState(cancelled ? false : null);
  const [tier, setTier] = useState("");
  useEffect(() => {
    if (cancelled) return;
    let cancel = false; let tries = 0;
    const poll = async () => {
      try {
        const data = await api(`/billing/status/${sessionId}`);
        if (cancel) return;
        if (data.payment_status === "paid") { setOk(true); setStatus("Assinatura ativada"); setTier(data.tier || ""); return; }
        if (data.payment_status === "expired" || data.payment_status === "failed") { setOk(false); setStatus("Pagamento não concluído"); return; }
        if (tries++ < 20) window.setTimeout(poll, 2000);
        else { setOk(false); setStatus("Tempo esgotado — verifique o e-mail"); }
      } catch (err) { setOk(false); setStatus(err.message); }
    };
    poll();
    return () => { cancel = true; };
  }, [sessionId, cancelled]);
  const title = ok === true ? "Sinal recebido!" : cancelled ? "Pagamento cancelado" : ok === false ? "Algo travou" : "Aguardando";
  const description = ok === true ? `Seu plano ${tier ? tier.toUpperCase() : ""} está no ar. Trial de 30 dias começa agora — cancele quando quiser sem pegadinha.` : status;
  return (
    <div className="payment-result" data-testid="payment-result">
      <div className="payment-result-card">
        <div className={`payment-icon ${ok === false || cancelled ? "error" : ""}`}>{ok === true ? <Check size={36}/> : (ok === false || cancelled) ? <X size={36}/> : <Radio size={36}/>}</div>
        <h1>{title}</h1>
        <p>{description}</p>
        <button className="button button-primary" onClick={onDone} data-testid="payment-done-button">Continuar <ChevronRight size={16}/></button>
      </div>
    </div>
  );
}

function Auth({ initialMode = "login", onBack, onSuccess }) {
  const [isLogin, setIsLogin] = useState(initialMode !== "register");
  const [recovery, setRecovery] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault(); setError(""); setLoading(true);
    const form = new FormData(event.currentTarget);
    try {
      const body = { email: form.get("email"), password: form.get("password"), ...(form.get("username") ? { username: form.get("username") } : {}) };
      const data = await api(isLogin ? "/auth/login" : "/auth/register", { method: "POST", body: JSON.stringify(body) });
      saveSession(data); onSuccess(data.user);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  const recover = async (event) => {
    event.preventDefault(); setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (!form.get("code")) {
        const data = await api("/auth/recovery/request", { method: "POST", body: JSON.stringify({ email: form.get("email") }) });
        setError(`Código de demonstração: ${data.demo_code}`);
      } else {
        await api("/auth/recovery/verify", { method: "POST", body: JSON.stringify({ email: form.get("email"), code: form.get("code"), new_password: form.get("password") }) });
        setRecovery(false); setError("Senha atualizada. Faça login novamente.");
      }
    } catch (err) { setError(err.message); }
  };

  return (
    <div className="auth-page" data-testid="auth-page">
      <button className="auth-back" onClick={onBack} data-testid="auth-back-button"><X size={16}/> Voltar</button>
      <div className="auth-aside">
        <Brand/>
        <span className="eyebrow" style={{marginTop:28,display:"inline-flex"}}>SUA SALA DE CONTROLE</span>
        <h1>Onde a boa<br/><em>conversa</em><br/>acontece.</h1>
        <p>Entre na sua rede de pessoas e projetos. Comece grátis, evolua quando fizer sentido.</p>
      </div>
      <section className="auth-panel">
        <div className="auth-heading">
          <span className="eyebrow">{recovery ? "RECUPERAÇÃO SEGURA" : isLogin ? "BEM-VINDO DE VOLTA" : "COMECE AGORA"}</span>
          <h2>{recovery ? "Recupere seu acesso." : isLogin ? "Acesse seu espaço." : "Crie seu espaço."}</h2>
          <p>{recovery ? "Use o código enviado para criar uma nova senha." : isLogin ? "Continue de onde você parou." : "Seu próximo capítulo começa aqui."}</p>
        </div>
        <form onSubmit={recovery ? recover : submit}>
          <label>E-mail<input name="email" type="email" placeholder="voce@exemplo.com" required data-testid="auth-email-input"/></label>
          {recovery && <label>Código<input name="code" placeholder="deixe vazio para gerar" data-testid="recovery-code-input"/></label>}
          <label>{recovery ? "Nova senha" : "Senha"}<input name="password" type="password" placeholder="mínimo 8 caracteres" minLength="8" required data-testid="auth-password-input"/></label>
          {!isLogin && !recovery && <label>Nome de usuário<input name="username" placeholder="seu_nome" required data-testid="auth-username-input"/></label>}
          {error && <p className="form-error" data-testid="auth-error">{error}</p>}
          <button className="button button-primary full" type="submit" disabled={loading} data-testid="auth-submit-button">
            {recovery ? "Continuar recuperação" : loading ? "Conectando..." : isLogin ? "Entrar na VEXOR" : "Criar conta"}<LogIn size={16}/>
          </button>
        </form>
        {!recovery && (<>
          <div className="auth-divider"><span>OU</span></div>
          <button className="google-btn" disabled data-testid="google-auth-button">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuar com Google <small style={{color:"var(--muted)",marginLeft:"auto",fontFamily:"var(--font-mono)",fontSize:9,letterSpacing:".18em"}}>EM BREVE</small>
          </button>
        </>)}
        <p className="auth-switch">
          {recovery ? "Lembrou a senha?" : isLogin ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
          <button onClick={() => { setRecovery(!recovery); setIsLogin(true); setError(""); }} data-testid="auth-recovery-toggle">{recovery ? "Entrar" : "Esqueci minha senha"}</button>
          {!recovery && <>{" · "}<button onClick={() => { setIsLogin(!isLogin); setError(""); }} data-testid="auth-mode-toggle">{isLogin ? "Criar agora" : "Entrar"}</button></>}
        </p>
      </section>
    </div>
  );
}

function Workspace({ user, setUser, onLogout, onPricing }) {
  const [activeCommunity, setActiveCommunity] = useState("nexus");
  const [activeChannel, setActiveChannel] = useState("general");
  const [communityList, setCommunityList] = useState(fallbackCommunities);
  const [channelList, setChannelList] = useState(fallbackChannels);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [mobileRail, setMobileRail] = useState(false);
  const [mobileChannels, setMobileChannels] = useState(false);
  const [connection, setConnection] = useState("Conectando");
  const [showVoice, setShowVoice] = useState(false);
  const [panel, setPanel] = useState(null);
  const socketRef = useRef(null);

  const community = communityList.find((item) => item.id === activeCommunity) || communityList[0];
  const channelName = channelList.find((item) => item.id === activeChannel)?.name || activeChannel;
  const initials = (user?.username || "VC").slice(0, 2).toUpperCase();

  useEffect(() => {
    api("/communities").then((items) => {
      if (items.length) { setCommunityList(items.map((item) => ({ ...item, label: item.name.slice(0, 1).toUpperCase() }))); setActiveCommunity(items[0].id); }
    }).catch(() => {});
  }, []);
  useEffect(() => {
    if (!activeCommunity || activeCommunity === "nexus") return;
    api(`/communities/${activeCommunity}/channels`).then((items) => { if (items.length) { setChannelList(items); setActiveChannel(items[0].id); } }).catch(() => {});
  }, [activeCommunity]);
  useEffect(() => {
    if (!activeChannel || activeChannel === "general") return;
    api(`/channels/${activeChannel}/messages`).then((items) => {
      if (items.length) setMessages(items.map((m) => ({ ...m, name: m.author, initials: (m.author || "VC").slice(0, 2).toUpperCase(), role: "Member", time: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), tone: "graphite" })));
    }).catch(() => {});
  }, [activeChannel]);
  useEffect(() => {
    const openPanel = (event) => setPanel(event.detail);
    window.addEventListener("vexor:panel", openPanel);
    return () => window.removeEventListener("vexor:panel", openPanel);
  }, []);
  useEffect(() => {
    const socket = new WebSocket(websocketUrl(activeChannel));
    socketRef.current = socket;
    socket.onopen = () => { if (socketRef.current === socket) setConnection("Conectado"); };
    socket.onclose = () => { if (socketRef.current === socket) setConnection("Offline"); };
    socket.onerror = () => { if (socketRef.current === socket) setConnection("Offline"); };
    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "message") setMessages((prev) => [...prev, { id: Date.now() + Math.random(), name: payload.author, initials: (payload.author || "VC").slice(0, 2).toUpperCase(), role: "Member", time: "agora", text: payload.text, tone: "red" }]);
    };
    return () => { if (socketRef.current === socket) socketRef.current = null; socket.close(); };
  }, [activeChannel]);

  const sendMessage = (event) => {
    event.preventDefault();
    if (!draft.trim()) return;
    const text = draft.trim();
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ type: "message", text, author: user?.username || "Você" }));
    else setMessages((prev) => [...prev, { id: Date.now(), name: "Você", initials, role: "Member", time: "agora", text, tone: "red" }]);
    setDraft("");
  };

  return (
    <main className="workspace" data-testid="workspace-page">
      <aside className={`community-rail ${mobileRail ? "mobile-open" : ""}`}>
        <Brand compact/>
        <div className="rail-rule"/>
        <button className="rail-item active" data-testid="home-rail-button" title="Home"><Zap size={18}/></button>
        {communityList.map((item) => (
          <button key={item.id} onClick={() => { setActiveCommunity(item.id); setMobileRail(false); }} className={`community-icon ${item.id === activeCommunity ? "selected" : ""}`} aria-label={item.name} data-testid={`community-${item.id}-button`}>{item.label || item.name.slice(0,1).toUpperCase()}</button>
        ))}
        <button className="community-icon add" onClick={() => setPanel("community")} data-testid="add-community-button" title="Nova comunidade"><Plus size={20}/></button>
        <div className="rail-bottom">
          <button className="rail-item" onClick={onPricing} data-testid="pricing-rail-button" title="Planos"><Wallet size={18}/></button>
          <button className="rail-item" data-testid="notifications-rail-button" title="Notificações"><Bell size={18}/></button>
          <button className="rail-item" onClick={() => { clearSession(); onLogout(); }} data-testid="logout-rail-button" title="Sair"><LogIn size={18}/></button>
        </div>
      </aside>

      <aside className={`channel-rail ${mobileChannels ? "mobile-open" : ""}`}>
        <div className="community-heading">
          <div>
            <span className="eyebrow">COMUNIDADE</span>
            <strong>{community?.name}</strong>
          </div>
          <button onClick={() => setPanel("audit")} data-testid="community-menu-button"><MoreHorizontal size={18}/></button>
        </div>
        <div className="channel-search"><Search size={14}/><input placeholder="Buscar" aria-label="Buscar canais" data-testid="channel-search-input"/></div>
        <div className="channel-section">
          <div className="section-label">CANAIS DE TEXTO<button onClick={() => setPanel("channel")} data-testid="add-channel-button"><Plus size={14}/></button></div>
          {channelList.map((item) => (
            <button key={item.id} onClick={() => setActiveChannel(item.id)} className={`channel-item ${item.id === activeChannel ? "active" : ""}`} data-testid={`channel-${item.id}-button`}>
              <Hash size={16}/>{item.name}{item.count && <small>{item.count}</small>}
            </button>
          ))}
        </div>
        <div className="channel-section">
          <div className="section-label">SALAS DE VOZ<button onClick={() => setShowVoice(true)} data-testid="add-voice-room-button"><Plus size={14}/></button></div>
          <button className="channel-item voice-ready" onClick={() => setShowVoice(true)} data-testid="voice-room-lounge-button"><Volume2 size={16}/> lounge <span className="ready-pill">AO VIVO</span></button>
        </div>
        <div className="user-dock">
          <span className="avatar avatar-red">{initials}</span>
          <div><strong>{user?.username || "você"} <TierBadge tier={user?.tier}/></strong><small><span className="status-dot"/> ONLINE</small></div>
          <button onClick={() => setPanel("settings")} data-testid="user-settings-button"><Settings size={16}/></button>
        </div>
      </aside>

      <section className="conversation">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileRail(!mobileRail)} data-testid="mobile-menu-button"><Menu size={20}/></button>
          <button className="mobile-menu mobile-channels-toggle" onClick={() => setMobileChannels(!mobileChannels)} data-testid="mobile-channels-button" aria-label="Canais"><Hash size={18}/></button>
          <div className="channel-title"><Hash size={20}/><div><strong>{channelName}</strong><span>Canal da comunidade</span></div></div>
          <div className="top-actions">
            <span className="connection-status" data-testid="connection-status"><span className={`status-dot ${connection === "Conectado" ? "" : "off"}`}/> {connection}</span>
            <button onClick={() => setPanel("friends")} data-testid="topbar-friends-button"><Users size={16}/><span>Amigos</span></button>
            <button onClick={() => setPanel("rules")} data-testid="topbar-rules-button"><Shield size={16}/><span>Regras</span></button>
            <button onClick={() => setPanel("settings")} className="mobile-settings-btn" data-testid="topbar-settings-button" aria-label="Configurações"><Settings size={17}/></button>
            <button onClick={() => setPanel("invite")} data-testid="invite-button"><UserPlus size={17}/><span>Convidar</span></button>
            <button aria-label="Buscar mensagens" data-testid="message-search-button"><Search size={18}/></button>
          </div>
        </header>
        <div className="thread" data-testid="message-thread">
          <div className="thread-intro"><span className="channel-symbol">#</span><h2>Bem-vindo ao #{channelName}</h2><p>Este é o início do canal. Compartilhe ideias, atualizações e links com a comunidade.</p></div>
          {messages.map((m) => (
            <article className="message" key={m.id} data-testid={`message-${m.id}`}>
              <span className={`avatar avatar-${m.tone}`}>{m.initials}</span>
              <div className="message-content">
                <div className="message-meta"><strong>{m.name}</strong><span className="role-tag">{m.role}</span><time>{m.time}</time></div>
                <p>{m.text}</p>
              </div>
              <button className="message-more" aria-label="Mais ações" data-testid={`message-actions-${m.id}`}><MoreHorizontal size={16}/></button>
            </article>
          ))}
        </div>
        <form className="composer" onSubmit={sendMessage}>
          <button type="button" aria-label="Adicionar arquivo" data-testid="attach-message-button"><Plus size={19}/></button>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Mensagem em #${channelName}`} data-testid="message-composer-input"/>
          <button type="button" aria-label="Adicionar emoji" data-testid="emoji-message-button"><Smile size={18}/></button>
          <button className="send-button" type="submit" aria-label="Enviar mensagem" data-testid="send-message-button"><Send size={17}/></button>
        </form>
      </section>

      <aside className="member-rail">
        <div className="member-header">
          <span className="eyebrow">PRESENÇA</span>
          <strong><span className="status-dot"/> 4 online</strong>
          <button onClick={() => setPanel("moderation")} data-testid="moderation-open-button"><Shield size={14}/> Moderar</button>
        </div>
        <div className="member-group">
          <div className="section-label">ONLINE — 2</div>
          {fallbackMembers.slice(0, 2).map((m) => <Member member={m} key={m.name}/>)}
        </div>
        <div className="member-group">
          <div className="section-label">AUSENTE / OCUPADO</div>
          {fallbackMembers.slice(2).map((m) => <Member member={m} key={m.name}/>)}
        </div>
        <div className="voice-dock" data-testid="voice-ready-card">
          <div className="voice-dock-icon"><Headphones size={16}/></div>
          <div><strong>Voz e tela</strong><p>MICROFONE · P2P</p></div>
          <button onClick={() => setShowVoice(true)} aria-label="Abrir sala de voz" data-testid="voice-settings-button"><Play size={14}/></button>
          <small>WEBRTC · MESH</small>
        </div>
      </aside>

      {showVoice && <VoiceRoom room={activeChannel} onClose={() => setShowVoice(false)}/>}
      {panel && <ManagementPanel
        mode={panel}
        communityId={activeCommunity}
        user={user}
        setUser={setUser}
        onPricing={onPricing}
        onClose={() => setPanel(null)}
        onResult={(result) => {
          if (result.type === "community") { setCommunityList((items) => [...items, { ...result.data, label: result.data.name.slice(0, 1).toUpperCase() }]); setActiveCommunity(result.data.id); }
          if (result.type === "channel") { setChannelList((items) => [...items, result.data]); setActiveChannel(result.data.id); }
        }}
      />}
    </main>
  );
}

function Member({ member }) {
  return (
    <div className="member-row" data-testid={`member-${member.initials.toLowerCase()}`}>
      <span className={`avatar avatar-${member.tone}`}>{member.initials}</span>
      <div>
        <strong>{member.name}</strong>
        <small><span className={`status-dot ${member.status !== "Online" ? "muted" : ""}`}/> {member.status}</small>
      </div>
    </div>
  );
}

function GlobalTools() { return null; }

function CommunitySocialPanel({ mode, communityId, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [rules, setRules] = useState("");
  const [dmTarget, setDmTarget] = useState("");
  const [dmText, setDmText] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { if (mode === "rules") api(`/communities/${communityId}/rules`).then((data) => setRules(data.rules.join("\n"))).catch((err) => setMessage(err.message)); }, [mode, communityId]);
  const search = async (e) => { e.preventDefault(); try { setResults(await api(`/users/search?q=${encodeURIComponent(query)}`)); } catch (err) { setMessage(err.message); } };
  const sendRequest = async (id) => { try { await api(`/friends/${id}`, { method: "POST" }); setMessage("Solicitação enviada"); } catch (err) { setMessage(err.message); } };
  const saveRules = async (e) => { e.preventDefault(); try { await api(`/communities/${communityId}/rules`, { method: "PUT", body: JSON.stringify({ rules: rules.split("\n").map((r) => r.trim()).filter(Boolean) }) }); await api(`/communities/${communityId}/rules/accept`, { method: "POST" }); setMessage("Regras salvas e aceitas"); } catch (err) { setMessage(err.message); } };
  const sendDm = async (e) => { e.preventDefault(); try { await api(`/dm/${dmTarget}`, { method: "POST", body: JSON.stringify({ text: dmText }) }); setDmText(""); setMessage("Mensagem privada enviada"); } catch (err) { setMessage(err.message); } };
  return (
    <div className="voice-modal" data-testid="social-panel">
      <div className="voice-modal-card management-card">
        <button className="voice-close" onClick={onClose} data-testid="social-close-button"><X size={18}/></button>
        <span className="eyebrow">REDE VEXOR</span>
        <h2>{mode === "rules" ? "Regras da comunidade" : "Amigos e DMs"}</h2>
        {mode === "rules" ? (
          <form onSubmit={saveRules}>
            <label>Uma regra por linha<textarea value={rules} onChange={(e) => setRules(e.target.value)} rows="7" data-testid="community-rules-input"/></label>
            <button className="button button-primary full" type="submit" data-testid="community-rules-save-button">Salvar e aceitar <Shield size={16}/></button>
          </form>
        ) : (<>
          <form onSubmit={search}>
            <label>Buscar usuário<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="nome de usuário" data-testid="friend-search-input"/></label>
            <button className="button button-primary full" type="submit" data-testid="friend-search-button">Buscar <Users size={16}/></button>
          </form>
          <div className="search-results">{results.map((r) => <p key={r.id}><strong>{r.username}</strong><button onClick={() => sendRequest(r.id)} data-testid={`friend-request-${r.id}`}>Adicionar</button></p>)}</div>
          <form onSubmit={sendDm}>
            <label>ID do amigo<input value={dmTarget} onChange={(e) => setDmTarget(e.target.value)} required data-testid="dm-target-input"/></label>
            <label>Mensagem<input value={dmText} onChange={(e) => setDmText(e.target.value)} required data-testid="dm-message-input"/></label>
            <button className="button button-outline full" type="submit" data-testid="dm-send-button">Enviar DM <Send size={16}/></button>
          </form>
        </>)}
        {message && <p className="form-success" data-testid="social-result">{message}</p>}
      </div>
    </div>
  );
}

function SettingsPanel({ user, setUser, onPricing, onClose }) {
  const [tab, setTab] = useState("profile");
  const [form, setForm] = useState({ username: user.username, bio: user.bio || "", activity: user.activity || "", avatar_url: user.avatar_url || "", banner_url: user.banner_url || "" });
  const [msg, setMsg] = useState("");
  const [billing, setBilling] = useState(null);
  useEffect(() => { if (tab === "billing") api("/billing/me").then(setBilling).catch(() => {}); }, [tab]);
  const save = async (e) => {
    e.preventDefault(); setMsg("");
    try { const updated = await api("/users/me", { method: "PATCH", body: JSON.stringify(form) }); setUser(updated); setMsg("Perfil atualizado"); } catch (err) { setMsg(err.message); }
  };
  const openPortal = async () => {
    try { const data = await api("/billing/portal", { method: "POST" }); window.open(data.url, "_blank"); } catch (err) { setMsg(err.message); }
  };
  const initials = (form.username || "VC").slice(0, 2).toUpperCase();
  return (
    <div className="voice-modal" data-testid="settings-panel">
      <div className="voice-modal-card management-card" style={{width:"min(560px,100%)"}}>
        <button className="voice-close" onClick={onClose} data-testid="settings-close-button"><X size={18}/></button>
        <span className="eyebrow">CONFIGURAÇÕES</span>
        <h2>Sua conta</h2>
        <div className="settings-tabs">
          <button className={tab === "profile" ? "active" : ""} onClick={() => { setTab("profile"); setMsg(""); }} data-testid="settings-tab-profile">Perfil</button>
          <button className={tab === "billing" ? "active" : ""} onClick={() => { setTab("billing"); setMsg(""); }} data-testid="settings-tab-billing">Plano</button>
        </div>
        {tab === "profile" ? (<>
          <div className="profile-preview">
            <span className="avatar avatar-red" style={form.avatar_url ? { background:`url(${form.avatar_url}) center/cover`, color:"transparent"} : {}}>{initials}</span>
            <div><strong>{form.username} <TierBadge tier={user.tier}/></strong><small>{form.activity || "Sem atividade definida"}</small></div>
          </div>
          <form onSubmit={save}>
            <label>Nome de usuário<input value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} data-testid="profile-username-input"/></label>
            <label>Bio<textarea rows="3" value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})} data-testid="profile-bio-input"/></label>
            <label>Atividade / jogo favorito<input value={form.activity} onChange={(e) => setForm({...form, activity: e.target.value})} placeholder="Ex: Jogando Elden Ring" data-testid="profile-activity-input"/></label>
            <label>Avatar (URL)<input value={form.avatar_url} onChange={(e) => setForm({...form, avatar_url: e.target.value})} placeholder="https://..." data-testid="profile-avatar-input"/></label>
            <label>Banner (URL)<input value={form.banner_url} onChange={(e) => setForm({...form, banner_url: e.target.value})} placeholder="https://..." data-testid="profile-banner-input"/></label>
            <button className="button button-primary full" type="submit" data-testid="profile-save-button">Salvar perfil <Check size={16}/></button>
          </form>
        </>) : (<>
          <div className="profile-preview">
            <span className="avatar avatar-red"><Sparkles size={16}/></span>
            <div><strong>{user.tier_name || "VEXOR Free"} <TierBadge tier={user.tier}/></strong><small>Limite: {user.community_limit} comunidades{billing?.trial_ends_at ? ` · trial até ${new Date(billing.trial_ends_at).toLocaleDateString()}` : ""}</small></div>
          </div>
          <button className="button button-primary full" onClick={() => { onClose(); onPricing(); }} data-testid="settings-upgrade-button">Ver planos e fazer upgrade <Sparkles size={15}/></button>
          {user.tier !== "free" && <button className="button button-outline full" onClick={openPortal} data-testid="settings-portal-button">Gerenciar assinatura no Stripe</button>}
        </>)}
        {msg && <p className="form-success" data-testid="settings-result">{msg}</p>}
      </div>
    </div>
  );
}

function ManagementPanel({ mode, communityId, user, setUser, onPricing, onClose, onResult }) {
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [target, setTarget] = useState("");
  const [action, setAction] = useState("ban");
  const [result, setResult] = useState("");
  const [logs, setLogs] = useState([]);
  useEffect(() => { if (mode === "audit") api(`/communities/${communityId}/audit-log`).then(setLogs).catch((err) => setResult(err.message)); }, [mode, communityId]);
  if (mode === "friends" || mode === "rules") return <CommunitySocialPanel mode={mode} communityId={communityId} onClose={onClose} />;
  if (mode === "settings") return <SettingsPanel user={user} setUser={setUser} onPricing={onPricing} onClose={onClose} />;
  const submit = async (e) => {
    e.preventDefault();
    try {
      let data;
      if (mode === "community") data = await api("/communities", { method: "POST", body: JSON.stringify({ name, description: "Comunidade criada pela VEXOR" }) });
      if (mode === "channel") data = await api(`/communities/${communityId}/channels`, { method: "POST", body: JSON.stringify({ name, kind: "text" }) });
      if (mode === "invite") data = await api(`/communities/${communityId}/invites`, { method: "POST", body: "{}" });
      if (mode === "moderation") data = await api(`/communities/${communityId}/members/${target}/moderate`, { method: "POST", body: JSON.stringify({ action, reason }) });
      setResult(mode === "invite" ? `Convite: ${data.id}` : "Alteração salva com sucesso");
      if (data?.id && (mode === "community" || mode === "channel")) onResult({ type: mode, data });
    } catch (err) { setResult(err.message); }
  };
  const title = { community: "Nova comunidade", channel: "Novo canal", invite: "Convite da comunidade", moderation: "Moderação", audit: "Audit log" }[mode];
  return (
    <div className="voice-modal" data-testid="management-panel">
      <div className="voice-modal-card management-card">
        <button className="voice-close" onClick={onClose} data-testid="management-close-button"><X size={18}/></button>
        <span className="eyebrow">CONTROLE VEXOR</span>
        <h2>{title}</h2>
        {mode === "audit" ? (
          <div className="audit-list">{logs.length ? logs.map((l) => <p key={l.id} data-testid="audit-log-entry"><strong>{l.action}</strong><small>{l.reason || "sem motivo"}</small></p>) : <p className="empty-state">Nenhuma ação registrada ainda.</p>}</div>
        ) : (
          <form onSubmit={submit}>
            {(mode === "community" || mode === "channel") && <label>Nome<input value={name} onChange={(e) => setName(e.target.value)} required minLength="2" data-testid={`${mode}-name-input`}/></label>}
            {mode === "moderation" && (<>
              <label>ID do usuário<input value={target} onChange={(e) => setTarget(e.target.value)} required data-testid="moderation-target-input"/></label>
              <label>Ação<select value={action} onChange={(e) => setAction(e.target.value)} data-testid="moderation-action-select">
                <option value="ban">Banir</option><option value="kick">Expulsar</option><option value="unban">Remover banimento</option>
              </select></label>
              <label>Motivo<input value={reason} onChange={(e) => setReason(e.target.value)} data-testid="moderation-reason-input"/></label>
            </>)}
            {mode === "invite" && <p className="empty-state">Gere um link de convite válido por 72 horas para compartilhar com sua comunidade.</p>}
            <button className="button button-primary full" type="submit" data-testid="management-submit-button">
              {mode === "invite" ? <>Gerar convite <UserPlus size={16}/></> : <>Salvar <Shield size={16}/></>}
            </button>
          </form>
        )}
        {result && <p className="form-success" data-testid="management-result">{result}</p>}
      </div>
    </div>
  );
}

function VoiceRoom({ room, onClose }) {
  const [state, setState] = useState("Preparando microfone");
  const [muted, setMuted] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [speakingName, setSpeakingName] = useState("");
  const [peers, setPeers] = useState(0);
  const streamRef = useRef(null);
  const screenRef = useRef(null);
  const socketRef = useRef(null);
  const idRef = useRef(`peer-${Math.random().toString(36).slice(2)}`);
  const peersRef = useRef({});

  useEffect(() => {
    let mounted = true;
    const createPeer = async (peerId) => {
      const peer = new RTCPeerConnection();
      streamRef.current?.getTracks().forEach((t) => peer.addTrack(t, streamRef.current));
      peer.addTransceiver("video", { direction: "sendrecv" });
      peer.ontrack = (event) => {
        const audio = new Audio(); audio.autoplay = true; audio.srcObject = event.streams[0]; audio.play().catch(() => {});
        setPeers((c) => Math.max(c, 1)); setSpeakingName("Participante remoto"); setSpeaking(true);
        window.setTimeout(() => { setSpeaking(false); setSpeakingName(""); }, 900);
      };
      peer.onicecandidate = (event) => { if (event.candidate) socketRef.current?.send(JSON.stringify({ type: "voice-ice", peer_id: idRef.current, target_id: peerId, candidate: event.candidate })); };
      peersRef.current[peerId] = peer;
      return peer;
    };
    const createOffer = async (peerId) => {
      const peer = await createPeer(peerId);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socketRef.current?.send(JSON.stringify({ type: "voice-offer", peer_id: idRef.current, target_id: peerId, description: offer }));
    };
    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        streamRef.current = stream;
        const socket = new WebSocket(websocketUrl(room)); socketRef.current = socket;
        socket.onopen = () => { if (mounted) setState("Conectado"); socket.send(JSON.stringify({ type: "voice-join", peer_id: idRef.current })); };
        socket.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          if (!data.type?.startsWith("voice-")) return;
          if (data.type === "voice-peer-joined" && data.peer_id !== idRef.current) { await createOffer(data.peer_id); setPeers((c) => c + 1); }
          if (data.target_id && data.target_id !== idRef.current) return;
          if (data.type === "voice-offer") {
            const peer = await createPeer(data.peer_id);
            await peer.setRemoteDescription(data.description);
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);
            socket.send(JSON.stringify({ type: "voice-answer", peer_id: idRef.current, target_id: data.peer_id, description: answer }));
          }
          if (data.type === "voice-answer" && peersRef.current[data.peer_id]) await peersRef.current[data.peer_id].setRemoteDescription(data.description);
          if (data.type === "voice-ice" && peersRef.current[data.peer_id]) await peersRef.current[data.peer_id].addIceCandidate(data.candidate);
        };
      } catch (err) { if (mounted) setState(err.name === "NotAllowedError" ? "Microfone bloqueado" : "Microfone indisponível"); }
    };
    start();
    const activePeers = peersRef.current;
    return () => { mounted = false; streamRef.current?.getTracks().forEach((t) => t.stop()); Object.values(activePeers).forEach((p) => p.close()); socketRef.current?.close(); };
  }, [room]);

  const toggleMute = () => { const track = streamRef.current?.getAudioTracks()[0]; if (track) { track.enabled = !track.enabled; setMuted(!track.enabled); } };
  const toggleShare = async () => {
    if (sharing) { screenRef.current?.getTracks().forEach((t) => t.stop()); setSharing(false); socketRef.current?.send(JSON.stringify({ type: "screen-stop", peer_id: idRef.current })); return; }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      screenRef.current = screen;
      const screenTrack = screen.getVideoTracks()[0];
      Object.values(peersRef.current).forEach((peer) => { const sender = peer.getSenders().find((s) => s.track?.kind === "video"); if (sender) sender.replaceTrack(screenTrack); });
      screenTrack.onended = () => { setSharing(false); socketRef.current?.send(JSON.stringify({ type: "screen-stop", peer_id: idRef.current })); };
      setSharing(true);
      socketRef.current?.send(JSON.stringify({ type: "screen-start", peer_id: idRef.current, has_audio: screen.getAudioTracks().length > 0 }));
    } catch (err) { setState("Compartilhamento cancelado"); }
  };

  return (
    <div className="voice-modal" data-testid="voice-room-modal">
      <div className="voice-modal-card">
        <button className="voice-close" onClick={onClose} data-testid="voice-close-button"><X size={18}/></button>
        <span className="eyebrow">SALA DE VOZ · P2P</span>
        <h2>lounge</h2>
        <p className="voice-state"><span className="status-dot"/> {state}</p>
        <div className="voice-meter"><Mic size={22}/><span>{peers + 1} participante{peers !== 0 ? "s" : ""}</span>{speaking && <b className="speaking-label">· {speakingName || "falando"}</b>}</div>
        <div className="voice-controls">
          <button className={muted ? "muted-control" : ""} onClick={toggleMute} data-testid="voice-mute-button"><Mic size={18}/>{muted ? "Ativar microfone" : "Silenciar"}</button>
          <button className={sharing ? "muted-control" : ""} onClick={toggleShare} data-testid="screen-share-button"><MonitorUp size={18}/>{sharing ? "Parar tela" : "Compartilhar tela"}</button>
          <button onClick={onClose} data-testid="voice-leave-button"><LogIn size={18}/> Sair da sala</button>
        </div>
        <small className="voice-note">ÁUDIO REMOTO P2P · ÁUDIO DO SISTEMA CONFORME NAVEGADOR</small>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [user, setUser] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);
  const [previousScreen, setPreviousScreen] = useState("landing");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (window.location.pathname === "/payment/success" && sessionId) { setPaymentSession(sessionId); setScreen("payment-success"); }
    else if (window.location.pathname === "/payment/cancel") setScreen("payment-cancel");
    else {
      const token = localStorage.getItem("vexor_access_token");
      if (token) { api("/auth/me").then((u) => { setUser(u); setScreen("workspace"); }).catch(() => { clearSession(); }); }
    }
  }, []);

  const refreshUser = () => api("/auth/me").then(setUser).catch(() => {});

  const gotoPricing = () => { setPreviousScreen(screen); setScreen("pricing"); };
  const goBack = () => { setScreen(user ? "workspace" : previousScreen); };

  if (screen === "landing") return <Landing onEnter={() => setScreen("auth")} onPricing={gotoPricing}/>;
  if (screen === "pricing") return <Pricing onBack={goBack} onEnter={() => setScreen("auth")} user={user} currentTier={user?.tier}/>;
  if (screen === "auth") return <Auth onBack={() => setScreen(previousScreen)} onSuccess={(u) => { setUser(u); setScreen("workspace"); }}/>;
  if (screen === "payment-success") return <PaymentResult sessionId={paymentSession} onDone={() => { window.history.replaceState({}, "", "/"); refreshUser(); setScreen(user ? "workspace" : "landing"); }}/>;
  if (screen === "payment-cancel") return <PaymentResult sessionId="cancelled" cancelled onDone={() => { window.history.replaceState({}, "", "/"); setScreen(user ? "workspace" : "landing"); }}/>;
  return (<>
    <Workspace user={user} setUser={setUser} onLogout={() => { setUser(null); setScreen("landing"); }} onPricing={gotoPricing}/>
  </>);
}
