import * as THREE from 'three';

/**
 * HeatmapPass: splatting + blur separable en un render target UV (equirectangular).
 */
export class HeatmapPass {
  constructor(renderer, { width = 1024, height = 512, sigmaPx = 28, maxPoints = 4096 } = {}) {
    this.renderer = renderer;
    this.baseSize = new THREE.Vector2(width, height); // logical (pre-DPR)
    this.dpr = (typeof renderer.getPixelRatio === 'function') ? renderer.getPixelRatio() : 1;
    const scaledW = Math.max(1, Math.round(width * this.dpr));
    const scaledH = Math.max(1, Math.round(height * this.dpr));
    this.size = new THREE.Vector2(scaledW, scaledH); // physical RT size
    this.sigmaPx = sigmaPx;
    this.maxPoints = maxPoints;

  const pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.FloatType, depthBuffer: false, stencilBuffer: false };
  this.rtA = new THREE.WebGLRenderTarget(scaledW, scaledH, pars);
  this.rtB = new THREE.WebGLRenderTarget(scaledW, scaledH, pars);

    this.orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.fsScene = new THREE.Scene();
    this.fsQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    this.fsScene.add(this.fsQuad);

    // Splat instanciado
    const plane = new THREE.PlaneGeometry(1, 1);
    const splatGeom = new THREE.InstancedBufferGeometry().copy(plane);
    splatGeom.instanceCount = this.maxPoints;

    const offsets = new Float32Array(this.maxPoints * 2);
    const radiiPx = new Float32Array(this.maxPoints);
    const weights = new Float32Array(this.maxPoints);
    splatGeom.setAttribute('iOffset', new THREE.InstancedBufferAttribute(offsets, 2));
    splatGeom.setAttribute('iRadiusPx', new THREE.InstancedBufferAttribute(radiiPx, 1));
    splatGeom.setAttribute('iWeight', new THREE.InstancedBufferAttribute(weights, 1));

    this.pointsCount = 0;

    const splatVert = `
      precision highp float;
      attribute vec2 iOffset;
      attribute float iRadiusPx;
      varying vec2 vUvQuad;
      uniform vec2 uTexSize;
      void main() {
        vUvQuad = uv;
        vec2 center = iOffset * 2.0 - 1.0;
        center.y = 1.0 - center.y;
        vec2 rNDC = (iRadiusPx / uTexSize) * 2.0;
        vec2 pos = center + vec2(position.x * rNDC.x, position.y * rNDC.y);
        gl_Position = vec4(pos, 0.0, 1.0);
      }
    `;

    const splatFrag = `
      precision highp float;
      varying vec2 vUvQuad;
      uniform float uSigmaNorm;
      uniform float uAlpha;
      attribute float iWeight;
      void main() {
        float d = distance(vUvQuad, vec2(0.5));
        float dn = d / 0.5;
        float sigma = max(uSigmaNorm, 0.001);
        float k = exp(- (dn*dn) / (2.0*sigma*sigma));
        k *= smoothstep(1.0, 0.98, dn);
        float w = iWeight;
        gl_FragColor = vec4(k * w, 0.0, 0.0, uAlpha);
      }
    `;

  this.splatMat = new THREE.ShaderMaterial({
      vertexShader: splatVert,
      fragmentShader: splatFrag,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
  uTexSize: { value: this.size.clone() },
        uSigmaNorm: { value: 0.45 },
        uAlpha: { value: 1.0 },
      }
    });

    this.splatMesh = new THREE.Mesh(splatGeom, this.splatMat);
    this.splatScene = new THREE.Scene();
    this.splatScene.add(this.splatMesh);

    const blurFrag = `
      precision highp float;
      uniform sampler2D uTex;
      uniform vec2 uInvTexSize;
      uniform vec2 uDir;
      uniform float uSigmaPx;
      vec4 sampleGaussian(vec2 uv) {
        float sigma = max(uSigmaPx, 0.001);
        float o1 = 1.3846153846;
        float o2 = 3.2307692308;
        float w0 = 0.2270270270;
        float w1 = 0.3162162162;
        float w2 = 0.0702702703;
        vec2 step1 = uDir * o1 * uInvTexSize;
        vec2 step2 = uDir * o2 * uInvTexSize;
        vec4 c = texture2D(uTex, uv) * w0;
        c += texture2D(uTex, uv + step1) * w1;
        c += texture2D(uTex, uv - step1) * w1;
        c += texture2D(uTex, uv + step2) * w2;
        c += texture2D(uTex, uv - step2) * w2;
        return c;
      }
      void main() { gl_FragColor = sampleGaussian(gl_FragCoord.xy * uInvTexSize); }
    `;

  this.blurMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
      `,
      fragmentShader: blurFrag,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        uTex: { value: null },
        uInvTexSize: { value: new THREE.Vector2(1/scaledW, 1/scaledH) },
        uDir: { value: new THREE.Vector2(1,0) },
        uSigmaPx: { value: sigmaPx }
      }
    });
  }

  setDPR(dpr){
    const newDpr = Math.max(0.5, Math.min(4, dpr || 1));
    if (Math.abs(newDpr - this.dpr) < 1e-3) return;
    this.dpr = newDpr;
    const sw = Math.max(1, Math.round(this.baseSize.x * this.dpr));
    const sh = Math.max(1, Math.round(this.baseSize.y * this.dpr));
    this._resizeRenderTargets(sw, sh);
  }

  setSize(width, height){
    this.baseSize.set(width, height);
    const sw = Math.max(1, Math.round(width * this.dpr));
    const sh = Math.max(1, Math.round(height * this.dpr));
    this._resizeRenderTargets(sw, sh);
  }

  _resizeRenderTargets(sw, sh){
    // Dispose old RTs and create new with updated size
    if (this.rtA) this.rtA.dispose();
    if (this.rtB) this.rtB.dispose();
    const pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.FloatType, depthBuffer: false, stencilBuffer: false };
    this.rtA = new THREE.WebGLRenderTarget(sw, sh, pars);
    this.rtB = new THREE.WebGLRenderTarget(sw, sh, pars);
    this.size.set(sw, sh);
    // Update uniforms that depend on texture size
    if (this.splatMat?.uniforms?.uTexSize) this.splatMat.uniforms.uTexSize.value.set(sw, sh);
    if (this.blurMat?.uniforms?.uInvTexSize) this.blurMat.uniforms.uInvTexSize.value.set(1/sw, 1/sh);
  }

  setPoints(points, { defaultRadiusPx = 28 } = {}) {
    const n = Math.min(points.length, this.maxPoints);
    const offs = this.splatMesh.geometry.getAttribute('iOffset');
    const rads = this.splatMesh.geometry.getAttribute('iRadiusPx');
    const wgts = this.splatMesh.geometry.getAttribute('iWeight');
    for (let i=0;i<n;i++){
      const p = points[i];
      offs.setXY(i, p.u, p.v);
      rads.setX(i, p.radiusPx ?? defaultRadiusPx);
      wgts.setX(i, THREE.MathUtils.clamp(p.weight ?? 1, 0, 1));
    }
    this.pointsCount = n;
    this.splatMesh.geometry.instanceCount = n;
    offs.needsUpdate = true; rads.needsUpdate = true; wgts.needsUpdate = true;
  }

  setSigmaPx(px) { this.sigmaPx = px; this.blurMat.uniforms.uSigmaPx.value = px; }

  render() {
    const r = this.renderer;
    r.setRenderTarget(this.rtA);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, true);
    r.state.setBlending(THREE.AdditiveBlending);
    r.setRenderTarget(this.rtA);
    r.render(this.splatScene, this.orthoCam);
    this.blurMat.uniforms.uTex.value = this.rtA.texture;
    this.blurMat.uniforms.uDir.value.set(1, 0);
    this.fsQuad.material = this.blurMat;
    r.setRenderTarget(this.rtB);
    r.render(this.fsScene, this.orthoCam);
    this.blurMat.uniforms.uTex.value = this.rtB.texture;
    this.blurMat.uniforms.uDir.value.set(0, 1);
    r.setRenderTarget(this.rtA);
    r.render(this.fsScene, this.orthoCam);
    r.setRenderTarget(null);
  }

  get texture(){ return this.rtA.texture; }

  dispose(){
    this.rtA.dispose(); this.rtB.dispose();
    this.fsQuad.geometry.dispose(); this.fsQuad.material.dispose();
    this.splatMesh.geometry.dispose(); this.splatMesh.material.dispose();
  }
}
