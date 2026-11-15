'use client';

import { useMemo } from 'react';
import * as THREE from 'three';

// Dusk: deep blue overhead, a little lighter and warmer at the horizon, and a
// few faint stars. Not affected by fog.

const vertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragment = /* glsl */ `
  varying vec3 vDir;
  void main() {
    float h = clamp(vDir.y, -0.2, 1.0);
    vec3 zenith = vec3(0.006, 0.009, 0.022);
    vec3 horizon = vec3(0.022, 0.028, 0.05);
    vec3 col = mix(horizon, zenith, smoothstep(0.0, 0.55, h));
    // Last of the sunset, low and to the left of the house.
    float glow = pow(max(dot(normalize(vDir), normalize(vec3(-0.8, 0.05, -0.6))), 0.0), 6.0);
    col += vec3(0.05, 0.022, 0.03) * glow * (1.0 - smoothstep(0.0, 0.35, h));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

function Stars() {
  const geometry = useMemo(() => {
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const points = [];
    for (let i = 0; i < 260; i++) {
      const theta = rand() * Math.PI * 2;
      const y = 0.25 + rand() * 0.75; // upper sky only
      const r = Math.sqrt(1 - y * y);
      points.push(Math.cos(theta) * r * 55, y * 55, Math.sin(theta) * r * 55);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return g;
  }, []);
  return (
    <points geometry={geometry}>
      <pointsMaterial color="#cfd6ea" size={1.6} sizeAttenuation={false} transparent opacity={0.55} fog={false} depthWrite={false} />
    </points>
  );
}

export default function Sky() {
  return (
    <group>
      <mesh scale={60}>
        <sphereGeometry args={[1, 32, 16]} />
        <shaderMaterial vertexShader={vertex} fragmentShader={fragment} side={THREE.BackSide} depthWrite={false} fog={false} />
      </mesh>
      <Stars />
    </group>
  );
}
