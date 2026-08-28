import { useEffect, useState } from "react";
import { Check, Send, Shield, Sparkles, UserPlus, Users, X } from "lucide-react";
import { api } from "@/lib/api";
import { TierBadge } from "@/components/Brand";

function CommunitySocialPanel({ mode, communityId, onClose }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [rules, setRules] = useState("");
  const [dmTarget, setDmTarget] = useState("");
  const [dmText, setDmText] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => { if (mode === "rules") api(`/communities/${communityId}/rules`).then((d) => setRules(d.rules.join("\n"))).catch((err) => setMessage(err.message)); }, [mode, communityId]);
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
            <span className={`avatar avatar-${user.tier === "ignite" ? "ignite" : user.tier === "pulse" ? "pulse" : "red"}`} style={form.avatar_url ? { background:`url(${form.avatar_url}) center/cover`, color:"transparent"} : {}}>{initials}</span>
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

export default function ManagementPanel({ mode, communityId, user, setUser, onPricing, onClose, onResult }) {
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
