import { useEffect, useState } from "react";
import { Check, ChevronRight, Radio, X } from "lucide-react";
import { api } from "@/lib/api";

export default function PaymentResult({ sessionId, cancelled = false, onDone }) {
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
