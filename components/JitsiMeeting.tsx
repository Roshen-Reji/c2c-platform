"use client";

import { useEffect, useRef, useState } from "react";

interface JitsiMeetingProps {
  roomName: string;
  displayName: string;
  onClose?: () => void;
}

export default function JitsiMeeting({ roomName, displayName, onClose }: JitsiMeetingProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const apiRef = useRef<unknown>(null);

  useEffect(() => {
    const loadJitsi = async () => {
      try {
        // Dynamically load the Jitsi Meet External API script
        if (!(window as unknown as Record<string, unknown>).JitsiMeetExternalAPI) {
          const script = document.createElement("script");
          script.src = "https://8x8.vc/vpaas-magic-cookie-ef5ce88c523d41a599c8b1dc5b3ab765/external_api.js";
          script.async = true;
          script.onload = () => initJitsi();
          script.onerror = () => {
            // Try fallback to meet.jit.si
            const fallbackScript = document.createElement("script");
            fallbackScript.src = "https://meet.jit.si/external_api.js";
            fallbackScript.async = true;
            fallbackScript.onload = () => initJitsi("meet.jit.si");
            fallbackScript.onerror = () => {
              setError("Could not load video conferencing. Please check your internet connection.");
              setLoading(false);
            };
            document.head.appendChild(fallbackScript);
          };
          document.head.appendChild(script);
        } else {
          initJitsi();
        }
      } catch {
        setError("Failed to initialize video call.");
        setLoading(false);
      }
    };

    const initJitsi = (domain = "8x8.vc") => {
      if (!containerRef.current) return;

      try {
        const JitsiMeetExternalAPI = (window as unknown as Record<string, new (...args: unknown[]) => unknown>).JitsiMeetExternalAPI;

        const api = new JitsiMeetExternalAPI(domain, {
          roomName: domain === "8x8.vc"
            ? `vpaas-magic-cookie-ef5ce88c523d41a599c8b1dc5b3ab765/${roomName}`
            : roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: {
            displayName,
          },
          configOverwrite: {
            startWithAudioMuted: true,
            startWithVideoMuted: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            toolbarButtons: [
              "camera", "chat", "closedcaptions", "desktop",
              "fullscreen", "hangup", "microphone", "participants-pane",
              "raisehand", "settings", "tileview", "toggle-camera",
            ],
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            DEFAULT_BACKGROUND: "#0a0a0a",
            TOOLBAR_BUTTONS: [],
          },
        } as unknown);

        apiRef.current = api;

        // Event listeners
        (api as { addListener: (event: string, cb: () => void) => void }).addListener("videoConferenceJoined", () => {
          setLoading(false);
        });

        (api as { addListener: (event: string, cb: () => void) => void }).addListener("readyToClose", () => {
          onClose?.();
        });
      } catch {
        setError("Failed to start video conference. Trying fallback...");
        if (domain !== "meet.jit.si") {
          initJitsi("meet.jit.si");
        } else {
          setLoading(false);
        }
      }
    };

    loadJitsi();

    return () => {
      if (apiRef.current) {
        (apiRef.current as { dispose: () => void }).dispose();
        apiRef.current = null;
      }
    };
  }, [roomName, displayName, onClose]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: "500px",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        background: "#000",
      }}
    >
      {/* Loading state */}
      {loading && !error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-4)",
            zIndex: 10,
            background: "rgba(0, 0, 0, 0.8)",
          }}
        >
          <div
            className="spinner"
            style={{
              width: 40,
              height: 40,
              borderWidth: 3,
              borderColor: "var(--border-default)",
              borderTopColor: "var(--accent-primary)",
            }}
          />
          <p style={{ color: "var(--text-secondary)", fontSize: "var(--text-sm)" }}>
            Connecting to interview room...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-4)",
            zIndex: 10,
            background: "rgba(0, 0, 0, 0.9)",
            padding: "var(--space-8)",
            textAlign: "center",
          }}
        >
          <span style={{ fontSize: 48 }}>🎥</span>
          <p style={{ color: "var(--accent-tertiary)", fontSize: "var(--text-sm)" }}>{error}</p>
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      )}

      {/* Jitsi container */}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}
