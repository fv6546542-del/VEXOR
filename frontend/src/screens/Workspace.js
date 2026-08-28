import { useEffect, useRef, useState } from "react";
import {
  Bell, Hash, Headphones, LogIn, Menu, MoreHorizontal, Play, Plus, Search,
  Send, Settings, Shield, Smile, UserPlus, Users, Volume2, Wallet, Zap
} from "lucide-react";
import { Brand, TierAvatar, TierBadge } from "@/components/Brand";
import { api, clearSession, websocketUrl } from "@/lib/api";
import ManagementPanel from "@/screens/ManagementPanel";
import VoiceRoom from "@/screens/VoiceRoom";

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

export default function Workspace({ user, setUser, onLogout, onPricing }) {
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
            <button key={item.id} onClick={() => { setActiveChannel(item.id); setMobileChannels(false); }} className={`channel-item ${item.id === activeChannel ? "active" : ""}`} data-testid={`channel-${item.id}-button`}>
              <Hash size={16}/>{item.name}{item.count && <small>{item.count}</small>}
            </button>
          ))}
        </div>
        <div className="channel-section">
          <div className="section-label">SALAS DE VOZ<button onClick={() => setShowVoice(true)} data-testid="add-voice-room-button"><Plus size={14}/></button></div>
          <button className="channel-item voice-ready" onClick={() => setShowVoice(true)} data-testid="voice-room-lounge-button"><Volume2 size={16}/> lounge <span className="ready-pill">AO VIVO</span></button>
        </div>
        <div className="user-dock">
          <TierAvatar initials={initials} tier={user?.tier} size={36} data-testid="user-dock-avatar"/>
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
