import { useEffect, useRef, useState } from "react";
import "@/App.css";
import "@/Voice.css";
import Auth from "@/screens/Auth";
import Landing from "@/screens/Landing";
import PaymentResult from "@/screens/PaymentResult";
import Pricing from "@/screens/Pricing";
import Workspace from "@/screens/Workspace";
import { api, clearSession, saveSession } from "@/lib/api";

function GoogleCallback({ sessionId, onSuccess, onError }) {
  const [state, setState] = useState("Concluindo login com Google...");
  const processedRef = useRef(false);
  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;
    const controller = new AbortController();
    (async () => {
      try {
        const data = await api("/auth/google/session", { method: "POST", body: JSON.stringify({ session_id: sessionId }), signal: controller.signal });
        saveSession(data);
        onSuccess(data.user);
      } catch (err) {
        if (err.name === "AbortError") return;
        setState(err.message);
        onError(err.message);
      }
    })();
    return () => controller.abort();
  }, [sessionId, onSuccess, onError]);
  return (
    <div className="payment-result" data-testid="google-callback">
      <div className="payment-result-card">
        <div className="payment-icon"><span className="status-dot"/></div>
        <h1>Conectando</h1>
        <p>{state}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("landing");
  const [user, setUser] = useState(null);
  const [paymentSession, setPaymentSession] = useState(null);
  const [googleSessionId, setGoogleSessionId] = useState(null);
  const [previousScreen, setPreviousScreen] = useState("landing");

  useEffect(() => {
    const hash = window.location.hash || "";
    const hashMatch = hash.match(/session_id=([^&]+)/);
    if (hashMatch) {
      const sid = decodeURIComponent(hashMatch[1]);
      window.history.replaceState({}, "", window.location.pathname);
      setGoogleSessionId(sid);
      setScreen("google-callback");
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (window.location.pathname === "/payment/success" && sessionId) { setPaymentSession(sessionId); setScreen("payment-success"); return; }
    if (window.location.pathname === "/payment/cancel") { setScreen("payment-cancel"); return; }
    const token = localStorage.getItem("vexor_access_token");
    if (token) {
      api("/auth/me")
        .then((u) => { setUser(u); setScreen("workspace"); })
        .catch(() => { clearSession(); });
    }
  }, []);

  const refreshUser = () => api("/auth/me").then(setUser).catch(() => {});
  const gotoPricing = () => { setPreviousScreen(screen); setScreen("pricing"); };
  const goBack = () => { setScreen(user ? "workspace" : previousScreen); };

  if (screen === "google-callback") return <GoogleCallback sessionId={googleSessionId} onSuccess={(u) => { setUser(u); setScreen("workspace"); }} onError={() => setScreen("auth")}/>;
  if (screen === "landing") return <Landing onEnter={() => setScreen("auth")} onPricing={gotoPricing}/>;
  if (screen === "pricing") return <Pricing onBack={goBack} onEnter={() => setScreen("auth")} user={user} currentTier={user?.tier}/>;
  if (screen === "auth") return <Auth onBack={() => setScreen(previousScreen)} onSuccess={(u) => { setUser(u); setScreen("workspace"); }}/>;
  if (screen === "payment-success") return <PaymentResult sessionId={paymentSession} onDone={() => { window.history.replaceState({}, "", "/"); refreshUser(); setScreen(user ? "workspace" : "landing"); }}/>;
  if (screen === "payment-cancel") return <PaymentResult sessionId="cancelled" cancelled onDone={() => { window.history.replaceState({}, "", "/"); setScreen(user ? "workspace" : "landing"); }}/>;
  return <Workspace user={user} setUser={setUser} onLogout={() => { setUser(null); setScreen("landing"); }} onPricing={gotoPricing}/>;
}
