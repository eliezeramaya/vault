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

export default function Globe() {
  const mountRef = useRef(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const dragging = useRef({ active:false, island:null });

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

    // Nodos ejemplo
    const nodesData = [
      { id:'A', lat: 15, lon:-60, priority:6 },
      { id:'B', lat: -5, lon: 10, priority:3 },
      { id:'C', lat: 32, lon:120, priority:9 },
    ];
    const islandMat = new THREE.MeshStandardMaterial({ color:0x7ad7ff, emissive:0x0a0f1f, roughness:.4, metalness:.2 });
    const ringTex = makeRingTexture();
    const ringMat = new THREE.MeshBasicMaterial({ map:ringTex, transparent:true, depthWrite:false, opacity:.55, side:THREE.DoubleSide });

    const islandsGroup = new THREE.Group();
    const halosGroup = new THREE.Group();
    scene.add(islandsGroup, halosGroup);

    const islands = nodesData.map((n, idx) => {
      const size = ISLAND_BASE_SIZE * (0.6 + 0.4*(n.priority/10));
      const geom = new THREE.SphereGeometry(size, 24, 16);
      const mesh = new THREE.Mesh(geom, islandMat.clone());
      mesh.userData.node = n;
      const base = latLonToV3(n.lat, n.lon, SPHERE_RADIUS);
      const normal = base.clone().normalize();
      const pos = base.clone().addScaledVector(normal, ISLAND_OFFSET);
      mesh.position.copy(pos);
      mesh.userData.bobPhase = idx * 1.37;
      islandsGroup.add(mesh);

      const ringR = size * 1.7;
      const ringGeom = new THREE.RingGeometry(ringR*0.6, ringR, 40);
      const ring = new THREE.Mesh(ringGeom, ringMat.clone());
      const ringPos = base.clone().addScaledVector(normal, 0.01);
      ring.position.copy(ringPos);
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), normal);
      ring.material.opacity = THREE.MathUtils.lerp(0.35, 0.7, n.priority/10);
      halosGroup.add(ring);

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
      const pos = base.clone().addScaledVector(normal, ISLAND_OFFSET);
      mesh.position.copy(pos);

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
    function animate() {
      const t = clock.getElapsedTime();
      scene.rotation.y += ROTATION_SPEED * 0.01;
      islands.forEach((m) => {
        const n = m.position.clone().normalize();
        const base = latLonToV3(m.userData.node.lat, m.userData.node.lon, SPHERE_RADIUS);
        const basePos = base.clone().addScaledVector(n, ISLAND_OFFSET);
        const amp = 0.035; const bob = Math.sin(t * 1.3 + m.userData.bobPhase) * amp;
        m.position.copy(basePos.clone().addScaledVector(n, bob));
      });
      arc.material.dashOffset = -(t * 0.6);
      renderer.render(scene, camera);
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
      <HeatmapControls
        opacity={opacity} sigmaPx={sigmaPx} radiusPx={radiusPx} reverse={reverse}
        onOpacity={setOpacity} onSigma={setSigmaPx} onRadius={setRadiusPx} onReverse={setReverse}
      />
    </div>
  );
}

function makeRingTexture(size = 256) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cx=size/2, cy=size/2, r=size/2;
  const g = ctx.createRadialGradient(cx,cy,r*0.35, cx,cy,r);
  g.addColorStop(0.0,'rgba(255,255,255,0.25)');
  g.addColorStop(0.6,'rgba(255,255,255,0.10)');
  g.addColorStop(1.0,'rgba(255,255,255,0.0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
  const tex = new THREE.CanvasTexture(canvas); tex.anisotropy = 4; return tex;
}
