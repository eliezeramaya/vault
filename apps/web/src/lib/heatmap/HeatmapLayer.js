import * as THREE from 'three';

export function createHeatLayer({ radius = 5.02, texture, opacity = 0.85, reverse = false } = {}) {
  const geom = new THREE.SphereGeometry(radius, 64, 32);

  const frag = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uHeatTex;
    uniform float uOpacity;
    uniform bool uReverse;
    vec3 paletteRPB(float t) {
      vec3 c0 = vec3(0.063, 0.224, 0.361);
      vec3 c1 = vec3(0.984, 0.435, 0.710);
      vec3 c2 = vec3(0.941, 0.208, 0.365);
      if (t < 0.5) {
        float k = smoothstep(0.0, 0.5, t);
        return mix(c0, c1, k);
      } else {
        float k = smoothstep(0.5, 1.0, t);
        return mix(c1, c2, k);
      }
    }
    void main() {
      float h = texture2D(uHeatTex, vUv).r;
      h = clamp(h, 0.0, 1.0);
      if (uReverse) h = 1.0 - h;
      float hh = smoothstep(0.05, 0.95, h);
      vec3 col = paletteRPB(hh);
      gl_FragColor = vec4(col * hh, uOpacity * hh);
    }
  `;

  const mat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
    `,
    fragmentShader: frag,
    uniforms: {
      uHeatTex: { value: texture },
      uOpacity: { value: opacity },
      uReverse: { value: reverse },
    },
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
  });

  const mesh = new THREE.Mesh(geom, mat);
  mesh.renderOrder = 3;
  return mesh;
}
