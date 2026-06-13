"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { IconCamera, IconCheckCircle, IconVideo } from "@/components/SvgIcons";

export interface ExamCameraHandle {
  stop: () => Promise<Blob | null>;
}

interface ExamCameraProps {
  active: boolean;
  required: boolean;
  onReadyChange: (ready: boolean) => void;
}

const ExamCamera = forwardRef<ExamCameraHandle, ExamCameraProps>(function ExamCamera(
  { active, required, onReadyChange },
  ref,
) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const stopPromiseRef = useRef<((blob: Blob | null) => void) | null>(null);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");

  const enable = useCallback(async () => {
    try {
      setError("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 360 }, facingMode: "user" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setReady(true);
      onReadyChange(true);
    } catch {
      setError("Camera and microphone access is required for this monitored test.");
      setReady(false);
      onReadyChange(false);
    }
  }, [onReadyChange]);

  useEffect(() => {
    if (active && required && !ready && !streamRef.current) {
      void enable();
    }
  }, [active, enable, ready, required]);

  useEffect(() => {
    if (!active || !streamRef.current || recorderRef.current) return;
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
      ? "video/webm;codecs=vp8,opus"
      : "video/webm";
    const recorder = new MediaRecorder(streamRef.current, {
      mimeType,
      videoBitsPerSecond: 650_000,
    });
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = chunksRef.current.length
        ? new Blob(chunksRef.current, { type: mimeType })
        : null;
      stopPromiseRef.current?.(blob);
      stopPromiseRef.current = null;
      setRecording(false);
    };
    recorder.start(5_000);
    recorderRef.current = recorder;
    setRecording(true);
  }, [active]);

  useImperativeHandle(ref, () => ({
    stop: () =>
      new Promise<Blob | null>((resolve) => {
        const recorder = recorderRef.current;
        if (!recorder || recorder.state === "inactive") {
          resolve(null);
          return;
        }
        stopPromiseRef.current = resolve;
        recorder.stop();
        recorderRef.current = null;
      }),
  }));

  useEffect(() => {
    return () => {
      const recorder = recorderRef.current;
      if (recorder && recorder.state !== "inactive") recorder.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  if (!required) {
    return (
      <div className="exam-camera-status optional">
        <IconVideo size={16} />
        Camera recording is optional for this test.
      </div>
    );
  }

  return (
    <div className="exam-camera">
      <div className="exam-camera-preview">
        <video ref={videoRef} muted playsInline />
        {!ready && (
          <div className="exam-camera-placeholder">
            <IconCamera size={32} />
            <span>Camera preview</span>
          </div>
        )}
        {recording && <span className="exam-recording-indicator">Recording</span>}
      </div>
      {!ready ? (
        <button className="btn btn-secondary" onClick={enable}>
          <IconCamera size={15} /> Enable camera and microphone
        </button>
      ) : (
        <div className="exam-camera-status">
          <IconCheckCircle size={16} />
          Camera check complete
        </div>
      )}
      {error && <div className="portal-notice error">{error}</div>}
    </div>
  );
});

export default ExamCamera;
