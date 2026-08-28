import { Crown, Flame } from "lucide-react";

export function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`} data-testid="vexor-brand">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 5 L12 20 L21 5" /></svg>
      </span>
      <span className="brand-text"><strong>VEXOR</strong><small>CONNECT · TALK · SHARE</small></span>
    </div>
  );
}

export function TierBadge({ tier }) {
  if (!tier || tier === "free") return null;
  const Icon = tier === "ignite" ? Crown : Flame;
  const label = tier === "ignite" ? "IGNITE" : "PULSE";
  return <span className={`tier-badge ${tier}`} data-testid={`tier-badge-${tier}`}><Icon size={11}/> {label}</span>;
}

export function Mascot({ size = 120, className = "", testId = "vexor-mascot" }) {
  return (
    <img
      src="/mascot/vexor-mascot.png"
      alt="VEXOR mascot"
      className={`vexor-mascot ${className}`}
      style={{ width: size, height: size }}
      data-testid={testId}
    />
  );
}

export function TierAvatar({ initials, tier, size = 34, style = {}, ...rest }) {
  const tone = tier === "ignite" ? "avatar-ignite" : tier === "pulse" ? "avatar-pulse" : "avatar-red";
  return (
    <span className={`avatar ${tone}`} style={{ width: size, height: size, ...style }} data-tier={tier || "free"} {...rest}>
      {initials}
    </span>
  );
}
