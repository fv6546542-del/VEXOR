import { useEffect, useRef, useState } from "react";
import { LogIn, Mic, MonitorUp, X } from "lucide-react";
import { websocketUrl } from "@/lib/api";

export default function VoiceRoom({ room, onClose }) {
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
