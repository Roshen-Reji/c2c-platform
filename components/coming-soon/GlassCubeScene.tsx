"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/* ── Wireframe Geometric Shape ── */
function WireframeShape() {
  const groupRef = useRef<THREE.Group>(null!);
  const innerRef = useRef<THREE.Mesh>(null!);
  const outerRef = useRef<THREE.Mesh>(null!);
  const { pointer } = useThree();

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Slow auto-rotation
    groupRef.current.rotation.x += delta * 0.12;
    groupRef.current.rotation.y += delta * 0.18;
    groupRef.current.rotation.z += delta * 0.05;

    // Counter-rotate inner shape for visual depth
    if (innerRef.current) {
      innerRef.current.rotation.x -= delta * 0.3;
      innerRef.current.rotation.y -= delta * 0.2;
    }

    // Parallax: nudge position toward mouse
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      pointer.x * 1.2,
      0.04
    );
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      pointer.y * 0.8,
      0.04
    );
  });

  return (
    <group ref={groupRef}>
      {/* Outer wireframe icosahedron */}
      <mesh ref={outerRef} scale={2}>
        <icosahedronGeometry args={[1, 1]} />
        <meshBasicMaterial
          color="#A6BB8D"
          wireframe
          transparent
          opacity={0.25}
        />
      </mesh>

      {/* Inner wireframe octahedron */}
      <mesh ref={innerRef} scale={1.2}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial
          color="#EAE7B1"
          wireframe
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Central glow sphere */}
      <mesh scale={0.15}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color="#EAE7B1" transparent opacity={0.6} />
      </mesh>

      {/* Soft glow halo */}
      <mesh scale={0.6}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#3C6255"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

/* ── Floating Grid Dots (background detail) ── */
function GridDots() {
  const count = 150;
  const pointsRef = useRef<THREE.Points>(null!);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = -3 + Math.random() * -8;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return geo;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y += delta * 0.01;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        color="#3C6255"
        size={0.04}
        transparent
        opacity={0.5}
        sizeAttenuation
      />
    </points>
  );
}

/* ── Orbit Ring ── */
function OrbitRing({ radius, speed, opacity }: { radius: number; speed: number; opacity: number }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.x += delta * speed;
    ref.current.rotation.z += delta * speed * 0.5;
  });

  return (
    <mesh ref={ref}>
      <torusGeometry args={[radius, 0.005, 16, 100]} />
      <meshBasicMaterial color="#A6BB8D" transparent opacity={opacity} />
    </mesh>
  );
}

/* ── Main Exported Scene ── */
export default function GlassCubeScene() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!mounted) return null;

  return (
    <Canvas
      className="cs-canvas"
      camera={{ position: [0, 0, 5], fov: 50 }}
      dpr={isMobile ? 1 : Math.min(window.devicePixelRatio, 1.5)}
      gl={{ antialias: !isMobile, alpha: true, powerPreference: "low-power" }}
      style={{ background: "transparent" }}
    >
      <WireframeShape />
      <OrbitRing radius={3.2} speed={0.08} opacity={0.08} />
      <OrbitRing radius={2.5} speed={-0.12} opacity={0.06} />
      <GridDots />
    </Canvas>
  );
}
