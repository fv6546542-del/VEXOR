import { useEffect, useState } from "react";
import { Check, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";

export default function Pricing({ onBack, onEnter, user, currentTier }) {
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
                    isCurrent
                      ? <button className="button button-outline full" disabled data-testid={`pricing-cta-${tier.id}`}>Plano atual</button>
                      : <button className="button button-outline full" onClick={() => user ? onBack() : onEnter("pricing")} data-testid={`pricing-cta-${tier.id}`}>{user ? "Voltar ao workspace" : "Começar grátis"}</button>
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
