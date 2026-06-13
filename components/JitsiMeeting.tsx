"use client";

import { useEffect, useRef, useState } from "react";
import { IconAlertTriangle } from "@/components/SvgIcons";

interface JitsiMeetingProps {
  roomName: string;
  displayName: string;
  onClose?: () => void;
}

interface JitsiApi {
  addListener: (event: string, callback: () => void) => void;
  dispose: () => void;
}

export default function JitsiMeeting({ roomName, displayName, onClose }: JitsiMeetingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const domain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "meet.jit.si";

    function initialize() {
      if (!containerRef.current) return;
      try {
        const Constructor = (window as unknown as {
          JitsiMeetExternalAPI: new (domain: string, options: Record<string, unknown>) => JitsiApi;
        }).JitsiMeetExternalAPI;
        const api = new Constructor(domain, {
          roomName: roomName.replace(/[^a-zA-Z0-9-_]/g, "-"),
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName },
          configOverwrite: {
            startWithAudioMuted: true,
            startWithVideoMuted: false,
            prejoinPageEnabled: true,
            disableDeepLinking: true,
            toolbarButtons: [
              "camera",
              "chat",
              "closedcaptions",
              "desktop",
              "fullscreen",
              "hangup",
              "microphone",
              "participants-pane",
              "raisehand",
              "settings",
              "tileview",
            ],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            DEFAULT_BACKGROUND: "#0a0a0a",
          },
        });
        apiRef.current = api;
        api.addListener("videoConferenceJoined", () => setLoading(false));
        api.addListener("readyToClose", () => onClose?.());
      } catch {
        setError("Failed to initialize the interview room.");
        setLoading(false);
      }
    }

    if ((window as unknown as Record<string, unknown>).JitsiMeetExternalAPI) {
      initialize();
    } else {
      const script = document.createElement("script");
      script.src = `https://${domain}/external_api.js`;
      script.async = true;
      script.onload = initialize;
      script.onerror = () => {
        setError("Could not load video conferencing. Check your connection and try again.");
        setLoading(false);
      };
      document.head.appendChild(script);
    }

    return () => {
      apiRef.current?.dispose();
      apiRef.current = null;
    };
  }, [displayName, onClose, roomName]);

  return (
    <div className="jitsi-container">
      {loading && !error && (
        <div className="jitsi-state">
          <div className="spinner" />
          <p>Connecting to the interview room...</p>
        </div>
      )}
      {error && (
        <div className="jitsi-state error">
          <IconAlertTriangle size={42} color="var(--accent-tertiary)" />
          <p>{error}</p>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      )}
      <div ref={containerRef} className="jitsi-frame" />
    </div>
  );
}
