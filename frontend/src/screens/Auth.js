import { useState } from "react";
import { LogIn, X } from "lucide-react";
import { Brand, Mascot } from "@/components/Brand";
import { api, saveSession } from "@/lib/api";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
const startGoogleFlow = () => {
  const redirectUrl = `${window.location.origin}/`;
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
};

export default function Auth({ onBack, onSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
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
        <Mascot size={190} className="auth-mascot" testId="auth-mascot"/>
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
          <button className="google-btn" onClick={startGoogleFlow} data-testid="google-auth-button">
            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continuar com Google
          </button>
        </>)}
        <p className="auth-switch">
          {recovery ? "Lembrou a senha?" : isLogin ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
          <button type="button" onClick={() => { setRecovery(!recovery); setIsLogin(true); setError(""); }} data-testid="auth-recovery-toggle">{recovery ? "Entrar" : "Esqueci minha senha"}</button>
          {!recovery && <>{" · "}<button type="button" onClick={() => { setIsLogin(!isLogin); setError(""); }} data-testid="auth-mode-toggle">{isLogin ? "Criar agora" : "Entrar"}</button></>}
        </p>
      </section>
    </div>
  );
}
