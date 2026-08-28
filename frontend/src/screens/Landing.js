import { ChevronRight, Cpu, LogIn, Radio, Users, Zap } from "lucide-react";
import { Brand, Mascot } from "@/components/Brand";

export default function Landing({ onEnter, onPricing, onGoogle }) {
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
          <span className="eyebrow">SINAL ABERTO · V0.4</span>
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
          <Mascot size={340} className="hero-mascot" testId="landing-mascot"/>
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
