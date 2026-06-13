"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { IconCamera, IconCheckCircle, IconLiveDot, IconVideo } from "@/components/SvgIcons";

interface VideoRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  maxDurationSeconds?: number;
}

export default function VideoRecorder({
  onRecordingComplete,
  maxDurationSeconds = 300,
}: VideoRecorderProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<"idle" | "preview" | "recording" | "recorded">("idle");
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (timerRef.current) clearInterval(timerRef.current);
      if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    };
  }, [recordedUrl]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }

      setStatus("preview");
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera/microphone. Please check permissions.");
    }
  }, []);

  const startRecording = useCallback(() => {
    if (!streamRef.current) return;

    chunksRef.current = [];

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";

    const recorder = new MediaRecorder(streamRef.current, {
      mimeType,
      videoBitsPerSecond: 2500000,
    });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      setRecordedUrl(url);

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.muted = false;
      }

      // Stop the camera
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      onRecordingComplete(blob);
      setStatus("recorded");
    };

    recorder.start(1000);
    mediaRecorderRef.current = recorder;
    setStatus("recording");
    setTimeElapsed(0);

    // Timer
    timerRef.current = setInterval(() => {
      setTimeElapsed((prev) => {
        const next = prev + 1;
        if (next >= maxDurationSeconds) {
          stopRecording();
        }
        return next;
      });
    }, 1000);
  }, [maxDurationSeconds, onRecordingComplete]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const resetRecording = useCallback(() => {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl);
    setRecordedUrl(null);
    setTimeElapsed(0);
    setStatus("idle");
  }, [recordedUrl]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div>
      {/* Video Preview */}
      <div
        style={{
          position: "relative",
          background: "#000",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          aspectRatio: "16/9",
          marginBottom: "var(--space-4)",
        }}
      >
        {status === "idle" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-3)",
              color: "var(--text-tertiary)",
            }}
          >
            <IconVideo size={46} />
            <p style={{ fontSize: "var(--text-sm)" }}>Click below to open camera</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            playsInline
            controls={status === "recorded"}
          />
        )}

        {/* Recording indicator */}
        {status === "recording" && (
          <div
            style={{
              position: "absolute",
              top: "var(--space-4)",
              left: "var(--space-4)",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-4)",
              background: "rgba(255, 40, 40, 0.9)",
              borderRadius: "var(--radius-full)",
              color: "#fff",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#fff",
                animation: "pulse-glow 1s infinite",
              }}
            />
            REC {formatTime(timeElapsed)}
          </div>
        )}

        {/* Time remaining */}
        {status === "recording" && (
          <div
            style={{
              position: "absolute",
              top: "var(--space-4)",
              right: "var(--space-4)",
              padding: "var(--space-2) var(--space-4)",
              background: "rgba(0, 0, 0, 0.7)",
              borderRadius: "var(--radius-full)",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
            }}
          >
            Max: {formatTime(maxDurationSeconds)}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="login-error" style={{ marginBottom: "var(--space-4)" }}>
          {error}
        </div>
      )}

      {/* Controls */}
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        {status === "idle" && (
          <button className="btn btn-secondary w-full" onClick={startCamera}>
            <IconCamera size={15} /> Open Camera
          </button>
        )}
        {status === "preview" && (
          <button className="btn btn-primary w-full" onClick={startRecording}>
            <IconLiveDot size={15} /> Start Recording
          </button>
        )}
        {status === "recording" && (
          <button
            className="btn btn-primary w-full"
            onClick={stopRecording}
            style={{ background: "var(--accent-tertiary)", borderColor: "var(--accent-tertiary)" }}
          >
            Stop Recording
          </button>
        )}
        {status === "recorded" && (
          <>
            <button className="btn btn-secondary" onClick={resetRecording}>
              Re-record
            </button>
            <button className="btn btn-primary" style={{ flex: 1 }} disabled>
              <IconCheckCircle size={15} /> Video Captured ({formatTime(timeElapsed)})
            </button>
          </>
        )}
      </div>

      {/* Timer bar */}
      {status === "recording" && (
        <div
          style={{
            height: 4,
            background: "var(--bg-secondary)",
            borderRadius: "var(--radius-full)",
            marginTop: "var(--space-3)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${(timeElapsed / maxDurationSeconds) * 100}%`,
              background:
                timeElapsed / maxDurationSeconds > 0.8
                  ? "var(--accent-tertiary)"
                  : "var(--accent-secondary)",
              borderRadius: "var(--radius-full)",
              transition: "width 1s linear",
            }}
          />
        </div>
      )}
    </div>
  );
}
