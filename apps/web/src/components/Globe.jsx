import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

import HeatmapControls from './HeatmapControls';
import { HeatmapPass } from '../lib/heatmap/HeatmapPass';
import { createHeatLayer } from '../lib/heatmap/HeatmapLayer';

const SPHERE_RADIUS = 5;
const ISLAND_OFFSET = 0.35;
const ISLAND_BASE_SIZE = 0.18;
const ARC_LIFT = 0.15;
const ROTATION_SPEED = 0.02;

const d2r = (d)=> (d*Math.PI)/180;
const latLonToV3 = (latDeg, lonDeg, radius) => {
  const lat = d2r(latDeg), lon = d2r(lonDeg);
  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.sin(lon)
  );
};
const v3ToLatLon = (v) => {
  const r = v.length();
  const lat = Math.asin(v.y / r);
  const lon = Math.atan2(v.z, v.x);
  return { latDeg: (lat*180)/Math.PI, lonDeg: (lon*180)/Math.PI };
};
const latLonToUV = (latDeg, lonDeg) => ({
  u: (lonDeg + 180) / 360,
  v: (latDeg + 90) / 180
});
const greatCircleElevated = (a, b, baseRadius, lift = 0.18, segs = 128) => {
  const va = a.clone().normalize(), vb = b.clone().normalize();
  const pts = [];
  for (let i=0;i<=segs;i++){
    const t = i/segs;
    const dir = va.clone().lerp(vb, t).normalize();
    const elev = lift * Math.sin(Math.PI * t);
    pts.push(dir.multiplyScalar(baseRadius + elev));
  }
  return pts;
};

export default function Globe({ onHelp, onReady }) {
  const mountRef = useRef(null);
  const labelsRef = useRef(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const dragging = useRef({ active:false, island:null });
  const onReadyRef = useRef(onReady);
  useEffect(()=>{ onReadyRef.current = onReady }, [onReady]);

  const [opacity, setOpacity] = useState(0.85);
  const [sigmaPx, setSigmaPx] = useState(28);
  const [radiusPx, setRadiusPx] = useState(32);
  const [reverse, setReverse] = useState(false);

  const heatPassRef = useRef(null);
  const heatLayerRef = useRef(null);
  const islandsRef = useRef([]);
  // Capture initial values in refs so the setup effect doesn't depend on state
  const initialOpacityRef = useRef(0.85);
  const initialSigmaRef = useRef(28);
  const initialReverseRef = useRef(false);

  useEffect(() => {
    // Snapshot the mount element to avoid stale ref warnings in cleanup
    const mountEl = mountRef.current;
    const width = mountEl.clientWidth;
    const height = mountEl.clientHeight;
    const labelLayerEl = labelsRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a15);

    const camera = new THREE.PerspectiveCamera(50, width/height, 0.1, 100);
    camera.position.set(0,0,13);

    const renderer = new THREE.WebGLRenderer({ antialias:true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  mountEl.appendChild(renderer.domElement);

    // Luces
    scene.add(new THREE.AmbientLight(0xffffff, .8));
    const dir = new THREE.DirectionalLight(0xffffff, .6);
    dir.position.set(5,6,8);
    scene.add(dir);

    // Esfera base
    const sphereGeom = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);
    const sphereMat = new THREE.MeshStandardMaterial({ color:0x10162f, roughness:.8, metalness:.1 });
    const sphere = new THREE.Mesh(sphereGeom, sphereMat);
    scene.add(sphere);

    // Grid (paralelos/meridianos)
    const grid = new THREE.GridHelper(SPHERE_RADIUS*2, 24, 0x2a3a7a, 0x1b244a);
    grid.rotation.x = Math.PI/2; grid.material.transparent = true; grid.material.opacity = .35;
    scene.add(grid);

    // Nodos ejemplo (estado vacío con valor)
    const nodesData = [
      { id:'Salud',       lat:  18, lon: -55, priority: 8 },
      { id:'Finanzas',    lat:  -8, lon:  20, priority: 6 },
      { id:'Carrera',     lat:  34, lon: 120, priority: 9 },
      { id:'Relaciones',  lat: -22, lon: -120, priority: 5 },
      { id:'Aprendizaje', lat:  12, lon:  70, priority: 7 },
    ];
  const islandMat = new THREE.MeshStandardMaterial({ roughness:.85, metalness:0.0, vertexColors:true });
  const shadowTex = makeShadowTexture();
  const shadowMat = new THREE.MeshBasicMaterial({ map:shadowTex, transparent:true, depthWrite:false, opacity:.35, side:THREE.DoubleSide, color:0x000000 });

  const islandsGroup = new THREE.Group();
  const halosGroup = new THREE.Group();
    scene.add(islandsGroup, halosGroup);

  const islands = nodesData.map((n, idx) => {
      const size = ISLAND_BASE_SIZE * (0.7 + 0.5*(n.priority/10));
      const geom = makeIslandGeometry(size);
      const mesh = new THREE.Mesh(geom, islandMat.clone());
      mesh.userData.node = n;
      mesh.userData.size = size;
      const base = latLonToV3(n.lat, n.lon, SPHERE_RADIUS);
      const normal = base.clone().normalize();
      const lift = ISLAND_OFFSET + size; // keep island floating above surface
      const pos = base.clone().addScaledVector(normal, lift);
      mesh.position.copy(pos);
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), normal);
      mesh.userData.bobPhase = idx * 1.37;
      mesh.userData.lift = lift;
      islandsGroup.add(mesh);

      // Soft shadow on globe surface
      const ringR = size * 1.9;
      const ringGeom = new THREE.RingGeometry(ringR*0.65, ringR, 48);
      const shadow = new THREE.Mesh(ringGeom, shadowMat.clone());
      const ringPos = base.clone().addScaledVector(normal, 0.012);
      shadow.position.copy(ringPos);
      shadow.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), normal);
      shadow.material.opacity = THREE.MathUtils.lerp(0.22, 0.42, n.priority/10);
      halosGroup.add(shadow);

      // HTML label overlay for concept clarity
      if (labelLayerEl) {
        const lbl = document.createElement('div');
        lbl.textContent = n.id;
        Object.assign(lbl.style, {
          position: 'absolute',
          transform: 'translate(-50%, -100%)',
          padding: '2px 6px',
          fontSize: '11px',
          letterSpacing: '.2px',
          color: '#EAEAEA',
          background: 'rgba(10,12,24,.60)',
          border: '1px solid rgba(255,255,255,.10)',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,.25)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 6,
        });
        labelLayerEl.appendChild(lbl);
        mesh.userData.labelEl = lbl;
      }

      return mesh;
    });
    islandsRef.current = islands;

    // Arco elevado demo (A->C)
    const A = islands[0].position.clone().normalize().multiplyScalar(SPHERE_RADIUS + ISLAND_OFFSET);
    const C = islands[2].position.clone().normalize().multiplyScalar(SPHERE_RADIUS + ISLAND_OFFSET);
    const arcPts = greatCircleElevated(A, C, SPHERE_RADIUS + ISLAND_OFFSET, ARC_LIFT, 160);
    const arcGeom = new THREE.BufferGeometry().setFromPoints(arcPts);
    const arcMat = new THREE.LineDashedMaterial({ color:0xff77aa, transparent:true, opacity:.95, dashSize:.22, gapSize:.15 });
    const arc = new THREE.Line(arcGeom, arcMat);
    arc.computeLineDistances(); arc.renderOrder = 2;
    scene.add(arc);

    // HEATMAP
  const heatPass = new HeatmapPass(renderer, { width:1024, height:512, sigmaPx: initialSigmaRef.current });
    heatPassRef.current = heatPass;
  const heatLayer = createHeatLayer({ radius: SPHERE_RADIUS + 0.02, texture: heatPass.texture, opacity: initialOpacityRef.current, reverse: initialReverseRef.current });
    heatLayerRef.current = heatLayer;
    scene.add(heatLayer);

    function refreshHeat() {
      const pts = islandsRef.current.map(m => {
        const n = m.userData.node;
        const uv = latLonToUV(n.lat, n.lon);
        return { u: uv.u, v: uv.v, weight: THREE.MathUtils.clamp((n.priority ?? 5)/10, 0, 1), radiusPx: 32 };
      });
      heatPass.setPoints(pts, { defaultRadiusPx: 32 });
      heatPass.render();
      heatLayer.material.uniforms.uHeatTex.value = heatPass.texture;
    }
    refreshHeat();

    // Drag
    const onPointerDown = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.current.set(((e.clientX - rect.left)/rect.width) * 2 - 1, -((e.clientY - rect.top)/rect.height) * 2 + 1);
      raycaster.current.setFromCamera(mouse.current, camera);
      const hits = raycaster.current.intersectObjects(islandsGroup.children, true);
      if (hits.length) dragging.current = { active:true, island:hits[0].object };
    };
    const onPointerMove = (e) => {
      if (!dragging.current.active) return;
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.current.set(((e.clientX - rect.left)/rect.width) * 2 - 1, -((e.clientY - rect.top)/rect.height) * 2 + 1);
      raycaster.current.setFromCamera(mouse.current, camera);
      const hit = raycaster.current.intersectObject(sphere, false)[0];
      if (!hit) return;
      const { latDeg, lonDeg } = v3ToLatLon(hit.point);
  const mesh = dragging.current.island;
      mesh.userData.node.lat = latDeg; mesh.userData.node.lon = lonDeg;
      const base = latLonToV3(latDeg, lonDeg, SPHERE_RADIUS);
      const normal = base.clone().normalize();
  const lift = mesh.userData?.lift ?? ISLAND_OFFSET;
  const pos = base.clone().addScaledVector(normal, lift);
      mesh.position.copy(pos);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), normal);

      // recomputar arco demo si corresponde
      const idx = islandsGroup.children.indexOf(mesh);
      if (idx === 0 || idx === 2) {
        const A2 = islands[0].position.clone().normalize().multiplyScalar(SPHERE_RADIUS + ISLAND_OFFSET);
        const C2 = islands[2].position.clone().normalize().multiplyScalar(SPHERE_RADIUS + ISLAND_OFFSET);
        const newPts = greatCircleElevated(A2, C2, SPHERE_RADIUS + ISLAND_OFFSET, ARC_LIFT, 160);
        arc.geometry.setFromPoints(newPts); arc.computeLineDistances();
      }

      refreshHeat();
    };
    const onPointerUp = ()=> { dragging.current = { active:false, island:null }; };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Loop
    const clock = new THREE.Clock();
    let firstFrame = true;
    function animate() {
      const t = clock.getElapsedTime();
      scene.rotation.y += ROTATION_SPEED * 0.01;
      islands.forEach((m) => {
        const n = m.position.clone().normalize();
        const base = latLonToV3(m.userData.node.lat, m.userData.node.lon, SPHERE_RADIUS);
        const lift = m.userData?.lift ?? ISLAND_OFFSET;
        const basePos = base.clone().addScaledVector(n, lift);
        const amp = 0.028; const bob = Math.sin(t * 1.3 + m.userData.bobPhase) * amp;
        m.position.copy(basePos.clone().addScaledVector(n, bob));

        // Update HTML label position/projection
        const lbl = m.userData.labelEl;
        if (lbl) {
          const p = m.position.clone();
          const ndc = p.clone().project(camera);
          const w = renderer.domElement.clientWidth;
          const h = renderer.domElement.clientHeight;
          const x = (ndc.x * 0.5 + 0.5) * w;
          const y = (-ndc.y * 0.5 + 0.5) * h;
          const isVisible = ndc.z > -1 && ndc.z < 1;
          if (isVisible) {
            lbl.style.display = 'block';
            lbl.style.left = `${x}px`;
            lbl.style.top = `${y}px`;
            lbl.style.opacity = '1';
          } else {
            lbl.style.display = 'none';
          }
        }
      });
      arc.material.dashOffset = -(t * 0.6);
      renderer.render(scene, camera);
      if (firstFrame) {
        firstFrame = false;
        // Notify that the scene rendered at least once
        const cb = onReadyRef.current;
        if (typeof cb === 'function') {
          // Defer to next tick to avoid layout thrash
          setTimeout(() => cb(), 0);
        }
      }
      requestAnimationFrame(animate);
    }
    animate();

    const onResize = () => {
      const w = mountEl.clientWidth, h = mountEl.clientHeight;
      renderer.setSize(w, h); camera.aspect = w/h; camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);

    return () => {
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      if (mountEl && mountEl.contains(renderer.domElement)) {
        mountEl.removeChild(renderer.domElement);
      }
      heatPass.dispose();
      [sphereGeom, arcGeom].forEach(g=>g.dispose());
      renderer.dispose();
      // Cleanup labels
      if (labelLayerEl) {
        while (labelLayerEl.firstChild) {
          labelLayerEl.removeChild(labelLayerEl.firstChild);
        }
      }
    };
  }, []);

  // Controles HUD
  useEffect(() => { if (heatLayerRef.current) heatLayerRef.current.material.uniforms.uOpacity.value = opacity; }, [opacity]);
  useEffect(() => { if (heatPassRef.current) { heatPassRef.current.setSigmaPx(sigmaPx); heatPassRef.current.render(); } }, [sigmaPx]);
  useEffect(() => {
    if (!heatPassRef.current || !islandsRef.current.length) return;
    const pts = islandsRef.current.map(m => {
      const n = m.userData.node;
      const uv = latLonToUV(n.lat, n.lon);
      return { u: uv.u, v: uv.v, weight: (n.priority ?? 5)/10, radiusPx };
    });
    heatPassRef.current.setPoints(pts, { defaultRadiusPx: radiusPx });
    heatPassRef.current.render();
  }, [radiusPx]);
  useEffect(() => { if (heatLayerRef.current) heatLayerRef.current.material.uniforms.uReverse.value = reverse; }, [reverse]);

  return (
    <div style={{ width:'100%', height:'100%', position:'relative' }}>
      <div ref={mountRef} style={{ width:'100%', height:'100%' }} />
      <div ref={labelsRef} style={{ position:'absolute', inset:0, pointerEvents:'none' }} />
      <HeatmapControls
        opacity={opacity} sigmaPx={sigmaPx} radiusPx={radiusPx} reverse={reverse}
        onOpacity={setOpacity} onSigma={setSigmaPx} onRadius={setRadiusPx} onReverse={setReverse}
        onHelp={onHelp}
      />
    </div>
  );
}

function makeShadowTexture(size = 256) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx=size/2, cy=size/2, r=size/2;
  const g = ctx.createRadialGradient(cx,cy, r*0.1, cx,cy, r*1.0);
  g.addColorStop(0.0,'rgba(0,0,0,0.35)');
  g.addColorStop(0.6,'rgba(0,0,0,0.15)');
  g.addColorStop(1.0,'rgba(0,0,0,0.00)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
  const tex = new THREE.CanvasTexture(canvas); tex.anisotropy = 2; return tex;
}

function makeIslandGeometry(size = 0.2) {
  // Start with icosahedron for faceted look and then displace vertices
  const geo = new THREE.IcosahedronGeometry(size, 1);
  const pos = geo.attributes.position;
  const colors = [];
  const color = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(pos, i).normalize();
    // Slight displacement to create rocky island shape
    const noise = (Math.sin(v.x*7.1)+Math.sin(v.y*5.7)+Math.sin(v.z*6.3)) * 0.04;
    const scale = 1.0 + noise + Math.random()*0.015;
    v.multiplyScalar(size*scale);
    pos.setXYZ(i, v.x, v.y, v.z);
    // Vertex colors: lighter on top, darker on sides/bottom
    const dot = Math.max(0, v.clone().normalize().y);
    color.setHSL(0.55, 0.45, 0.45 + dot*0.35); // teal-cyan tones
    colors.push(color.r, color.g, color.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return geo;
}
