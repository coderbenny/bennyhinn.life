'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// The living painting at the end of the gallery: generative art, never the
// same twice, in the house's colours. It drifts slowly by itself; the cursor
// (or a finger) stirs it, swirling the paint around where it points. Signed
// "B.H." in the corner. It hangs in the frame modelled in walkway.py
// (gallery(): HallPrint), just in front of the canvas there.

export const PAINTING = { centre: [-0.6, 2.25, -12.343], width: 0.7, height: 0.9 };
const CLICK_SLOP_PX = 6;

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  uniform float uTime;
  uniform vec2 uPointer;
  uniform float uStir;
  uniform float uAspect;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    // Stir: turn the paint around the pointer, more the closer it is.
    vec2 d = (uv - uPointer) * vec2(uAspect, 1.0);
    float near = uStir * exp(-dot(d, d) * 14.0);
    float a = near * 2.6;
    mat2 turn = mat2(cos(a), -sin(a), sin(a), cos(a));
    uv = uPointer + (turn * ((uv - uPointer) * vec2(uAspect, 1.0))) / vec2(uAspect, 1.0);

    vec2 p = uv * vec2(uAspect, 1.0) * 2.6;
    float t = uTime * 0.035;
    vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - t));
    vec2 r = vec2(fbm(p + 3.5 * q + vec2(1.7, 9.2) + t * 1.4), fbm(p + 3.5 * q + vec2(8.3, 2.8) - t));
    float f = fbm(p + 3.5 * r);

    vec3 cream = vec3(0.937, 0.902, 0.824);
    vec3 terracotta = vec3(0.784, 0.416, 0.271);
    vec3 teal = vec3(0.184, 0.365, 0.384);
    vec3 mustard = vec3(0.769, 0.604, 0.247);
    vec3 ink = vec3(0.12, 0.13, 0.16);
    vec3 col = mix(cream, terracotta, smoothstep(0.35, 0.75, f));
    col = mix(col, teal, smoothstep(0.45, 0.95, length(q)) * 0.85);
    col = mix(col, mustard, smoothstep(0.55, 0.9, r.x) * 0.6);
    col = mix(col, ink, smoothstep(0.78, 0.95, f) * 0.55);
    // Brush grain, and a little light where the pointer is.
    col *= 0.93 + 0.07 * noise(vUv * vec2(240.0, 300.0));
    col += near * 0.06;
    // The colours above are display colours already, so they go out as they are.
    gl_FragColor = vec4(col * 0.9, 1.0);
  }
`;

function signatureTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(31, 26, 20, 0.75)';
  ctx.font = 'italic 600 54px "Snell Roundhand", "Brush Script MT", cursive';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('B.H.', 240, 52);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * interactive    the painting answers the pointer (in the gallery, or up close)
 * onSelect       a click from down the gallery walks up to it
 * reducedMotion  it holds still unless stirred
 */
export default function LivingPainting({ visible, interactive, reducedMotion, onSelect }) {
  const pointer = useRef(new THREE.Vector2(0.5, 0.5));
  const stir = useRef(0);
  const [hover, setHover] = useState(false);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 37.0 }, // starts part-way in, so the first look is already rich
          uPointer: { value: new THREE.Vector2(0.5, 0.5) },
          uStir: { value: 0 },
          uAspect: { value: PAINTING.width / PAINTING.height },
        },
        vertexShader: vertex,
        fragmentShader: fragment,
      }),
    []
  );
  useEffect(() => () => material.dispose(), [material]);
  const signature = useMemo(() => signatureTexture(), []);
  useEffect(() => () => signature.dispose(), [signature]);

  useFrame((_, dt) => {
    const u = material.uniforms;
    if (!reducedMotion) u.uTime.value += dt;
    // The stir eases in under the pointer and settles slowly when it leaves.
    stir.current += ((hover && interactive ? 1 : 0) - stir.current) * (1 - Math.exp(-dt * (hover ? 3 : 0.8)));
    u.uStir.value = stir.current;
    u.uPointer.value.lerp(pointer.current, 1 - Math.exp(-dt * 6));
  });

  const { gl } = useThree();
  useEffect(() => {
    if (!interactive || !hover || !onSelect) return undefined;
    const el = gl.domElement;
    const before = el.style.cursor;
    el.style.cursor = 'pointer';
    return () => {
      el.style.cursor = before;
    };
  }, [gl, interactive, hover, onSelect]);

  return (
    <group position={PAINTING.centre} visible={visible}>
      <mesh
        material={material}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerMove={(e) => {
          if (e.uv) pointer.current.copy(e.uv);
        }}
        onPointerOut={() => setHover(false)}
        onClick={(e) => {
          e.stopPropagation();
          if (interactive && onSelect && e.delta <= CLICK_SLOP_PX) onSelect();
        }}
      >
        <planeGeometry args={[PAINTING.width, PAINTING.height]} />
      </mesh>
      <mesh position={[PAINTING.width / 2 - 0.09, -PAINTING.height / 2 + 0.045, 0.001]}>
        <planeGeometry args={[0.14, 0.0525]} />
        <meshBasicMaterial map={signature} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}
