import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

import HeatmapControls from './HeatmapControls';
import { HeatmapPass } from '../lib/heatmap/HeatmapPass';
import { createHeatLayer } from '../lib/heatmap/HeatmapLayer';

const SPHERE_RADIUS = 5;
const LABEL_OFFSET = 0.3; // distancia sobre la superficie para ubicar los chips
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

export default function Globe({ onHelp, onReady, onApi }) {
  const mountRef = useRef(null);
  const labelsRef = useRef(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const dragging = useRef({ active:false, nodeIndex:-1 });
  const onReadyRef = useRef(onReady);
  useEffect(()=>{ onReadyRef.current = onReady }, [onReady]);

  const [opacity, setOpacity] = useState(0.85);
  const [sigmaPx, setSigmaPx] = useState(28);
  const [radiusPx, setRadiusPx] = useState(32);
  const [reverse, setReverse] = useState(false);
  // Vista
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const gridRef = useRef(null);
  // Camera orbit state (yaw/pitch in radians) and distance/target offset
  const yawRef = useRef(0); // horizontal angle
  const pitchRef = useRef(0); // vertical angle
  const camDistRef = useRef(13);
  const targetOffsetRef = useRef(new THREE.Vector3(0,0,0));
  const [toast, setToast] = useState(false);
  const userInteractingRef = useRef(false);

  const autoRotateRef = useRef(true);
  useEffect(()=>{ autoRotateRef.current = autoRotate }, [autoRotate]);
  const showLabelsRef = useRef(true);
  useEffect(()=>{ showLabelsRef.current = showLabels }, [showLabels]);
  const onApiRef = useRef(onApi);
  useEffect(()=>{ onApiRef.current = onApi }, [onApi]);

  const heatPassRef = useRef(null);
  const heatLayerRef = useRef(null);
  const nodesRef = useRef([]); // [{ id, lat, lon, priority, el }]
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
  camera.position.set(0,0,camDistRef.current);
  camera.lookAt(0,0,0);

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
  gridRef.current = grid;

    // Nodos ejemplo (estado vacío con valor)
    const nodesData = [
      { id:'Salud',       lat:  18, lon: -55, priority: 8 },
      { id:'Finanzas',    lat:  -8, lon:  20, priority: 6 },
      { id:'Carrera',     lat:  34, lon: 120, priority: 9 },
      { id:'Relaciones',  lat: -22, lon: -120, priority: 5 },
      { id:'Aprendizaje', lat:  12, lon:  70, priority: 7 },
    ];
    // Crear chips circulares (HTML) para cada nodo
    const nodes = nodesData.map((n, idx) => {
      if (!labelLayerEl) return n;
      const chip = document.createElement('div');
      chip.textContent = n.id;
      chip.setAttribute('data-node-index', String(idx));
      Object.assign(chip.style, {
        position: 'absolute',
        transform: 'translate(-50%, -100%)',
        padding: '8px 12px',
        minHeight: '36px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        letterSpacing: '.2px',
        color: '#EAEAEA',
        background: 'rgba(10,12,24,.72)',
        border: '1px solid rgba(255,255,255,.10)',
        borderRadius: '9999px',
        boxShadow: '0 6px 20px rgba(0,0,0,.35)',
        pointerEvents: 'auto',
        whiteSpace: 'nowrap',
        zIndex: 7,
        cursor: 'grab',
        userSelect: 'none'
      });
      labelLayerEl.appendChild(chip);
      return { ...n, el: chip };
    });
    nodesRef.current = nodes;

    // Arco elevado demo (A->C)
    const A = latLonToV3(nodesData[0].lat, nodesData[0].lon, SPHERE_RADIUS + LABEL_OFFSET);
    const C = latLonToV3(nodesData[2].lat, nodesData[2].lon, SPHERE_RADIUS + LABEL_OFFSET);
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
      const pts = nodesRef.current.map(n => {
        const uv = latLonToUV(n.lat, n.lon);
        return { u: uv.u, v: uv.v, weight: THREE.MathUtils.clamp((n.priority ?? 5)/10, 0, 1), radiusPx: 32 };
      });
      heatPass.setPoints(pts, { defaultRadiusPx: 32 });
      heatPass.render();
      heatLayer.material.uniforms.uHeatTex.value = heatPass.texture;
    }
    refreshHeat();

    // Public API: add an island from outside
    function zoneToLatLon(zone){
      switch(zone){
        case 'Américas': return { lat: 12, lon: -70 };
        case 'Europa/África': return { lat: 18, lon: 20 };
        case 'Asia/Oceanía': return { lat: 24, lon: 120 };
        case 'Pacífico': return { lat: 4, lon: -150 };
        case 'Atlántico Sur': return { lat: -24, lon: -20 };
        default: return { lat: 8, lon: 0 };
      }
    }
    function addIsland({ title='Idea', emoji='', zone='Américas', priority=6 }){
      const idText = `${emoji ? (emoji + ' ') : ''}${title}`.trim();
      const { lat, lon } = zoneToLatLon(zone);
      const node = { id: idText, lat, lon, priority };
      const labelLayerEl = labelsRef.current;
      if (labelLayerEl) {
        const idx = nodesRef.current.length;
        const chip = document.createElement('div');
        chip.textContent = node.id;
        chip.setAttribute('data-node-index', String(idx));
        Object.assign(chip.style, {
          position: 'absolute', transform: 'translate(-50%, -100%)', padding: '8px 12px', minHeight: '36px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', letterSpacing: '.2px',
          color: '#EAEAEA', background: 'rgba(10,12,24,.72)', border: '1px solid rgba(255,255,255,.10)', borderRadius: '9999px',
          boxShadow: '0 6px 20px rgba(0,0,0,.35)', pointerEvents: 'auto', whiteSpace: 'nowrap', zIndex: 7, cursor: 'grab', userSelect: 'none'
        });
        labelLayerEl.appendChild(chip);
        nodesRef.current.push({ ...node, el: chip });
      } else {
        nodesRef.current.push(node);
      }
      refreshHeat();
    }

    // Expose API once
    if (typeof onApiRef.current === 'function') {
      onApiRef.current({ addIsland });
    }

  // Drag y gestos
  // Gesture tracking
    const pointers = new Map(); // pointerId -> {x,y}
  const gesture = { mode:'none', last:{x:0,y:0}, startDist:0, startRadius: camDistRef.current, startMid:{x:0,y:0}, startTarget: targetOffsetRef.current.clone(), startYaw:0, startPitch:0 };

    function addPointer(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointers.set(e.pointerId, { x: (e.clientX - rect.left), y: (e.clientY - rect.top) });
    }
    function updatePointer(e) {
      const rect = renderer.domElement.getBoundingClientRect();
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: (e.clientX - rect.left), y: (e.clientY - rect.top) });
    }
    function removePointer(e) { pointers.delete(e.pointerId); }

    const onPointerDown = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.current.set(((e.clientX - rect.left)/rect.width) * 2 - 1, -((e.clientY - rect.top)/rect.height) * 2 + 1);
      raycaster.current.setFromCamera(mouse.current, camera);
      addPointer(e);
      userInteractingRef.current = true;
      // First-time toast for touch
      if (e.pointerType === 'touch' && !sessionStorage.getItem('tip_touch_rotate')) {
        sessionStorage.setItem('tip_touch_rotate','1');
        setToast(true);
        setTimeout(()=> setToast(false), 2600);
      }
      if (e.pointerType === 'touch') {
        if (pointers.size === 1) {
          gesture.mode = 'rotate';
          const p = Array.from(pointers.values())[0];
          gesture.last = { x: p.x, y: p.y };
          gesture.startYaw = yawRef.current;
          gesture.startPitch = pitchRef.current;
        } else if (pointers.size === 2) {
          // Initialize pinch/pan
          const [p1, p2] = Array.from(pointers.values());
          const dx = p2.x - p1.x, dy = p2.y - p1.y;
          gesture.startDist = Math.hypot(dx, dy);
          gesture.startRadius = camDistRef.current;
          gesture.startYaw = yawRef.current;
          gesture.startPitch = pitchRef.current;
          gesture.startTarget = targetOffsetRef.current.clone();
          gesture.startMid = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };
          gesture.mode = 'pinch';
          // Cancel drag if any
          dragging.current = { active:false, nodeIndex:-1 };
        }
      }
    };
    const onPointerMove = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      updatePointer(e);
      if (dragging.current.active) {
        mouse.current.set(((e.clientX - rect.left)/rect.width) * 2 - 1, -((e.clientY - rect.top)/rect.height) * 2 + 1);
        raycaster.current.setFromCamera(mouse.current, camera);
        const hit = raycaster.current.intersectObject(sphere, false)[0];
        if (!hit) return;
        const { latDeg, lonDeg } = v3ToLatLon(hit.point);
        const idx = dragging.current.nodeIndex;
        if (idx >= 0 && nodesRef.current[idx]) {
          nodesRef.current[idx].lat = latDeg;
          nodesRef.current[idx].lon = lonDeg;
        }
        // recomputar arco demo si corresponde (si movemos 0 o 2)
        if (idx === 0 || idx === 2) {
          const A2 = latLonToV3(nodesRef.current[0].lat, nodesRef.current[0].lon, SPHERE_RADIUS + LABEL_OFFSET);
          const C2 = latLonToV3(nodesRef.current[2].lat, nodesRef.current[2].lon, SPHERE_RADIUS + LABEL_OFFSET);
          const newPts = greatCircleElevated(A2, C2, SPHERE_RADIUS + ISLAND_OFFSET, ARC_LIFT, 160);
          arc.geometry.setFromPoints(newPts); arc.computeLineDistances();
        }
        refreshHeat();
        return;
      }
      if (e.pointerType === 'touch') {
        if (pointers.size === 1 && gesture.mode === 'rotate') {
          const p = Array.from(pointers.values())[0];
          const dx = p.x - gesture.last.x;
          const dy = p.y - gesture.last.y;
          gesture.last = { x: p.x, y: p.y };
          const sens = 0.005;
          yawRef.current = gesture.startYaw + dx * sens;
          pitchRef.current = THREE.MathUtils.clamp(gesture.startPitch + dy * sens, -0.9, 0.9);
        } else if (pointers.size === 2 && gesture.mode === 'pinch') {
          const [p1, p2] = Array.from(pointers.values());
          const dx = p2.x - p1.x, dy = p2.y - p1.y;
          const dist = Math.hypot(dx, dy);
          if (gesture.startDist > 0) {
            const scale = dist / gesture.startDist;
            const newDist = THREE.MathUtils.clamp(gesture.startRadius / scale, 6, 24);
            camDistRef.current = newDist;
          }
          // Pan by midpoint move
          const mid = { x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2 };
          const mdx = mid.x - gesture.startMid.x;
          const mdy = mid.y - gesture.startMid.y;
          // Convert pixels to world-space using camera basis vectors
          const panScale = 0.0025 * camDistRef.current;
          const vRight = new THREE.Vector3();
          const vUp = new THREE.Vector3();
          camera.getWorldDirection(vRight).cross(camera.up).normalize(); // right
          vUp.copy(camera.up).normalize();
          const offset = gesture.startTarget.clone()
            .addScaledVector(vRight, -mdx * panScale)
            .addScaledVector(vUp, mdy * panScale);
          targetOffsetRef.current.copy(offset);
        }
      }
    };
    const onPointerUp = (e)=> {
      removePointer(e);
      if (pointers.size < 2 && gesture.mode === 'pinch') gesture.mode = 'none';
      if (pointers.size === 0) gesture.mode = 'none';
      dragging.current = { active:false, nodeIndex:-1 };
      if (pointers.size === 0) userInteractingRef.current = false;
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Delegación de eventos para chips: iniciar drag al tocar/clicar un chip
    function onChipPointerDown(e) {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const indexAttr = target.getAttribute('data-node-index');
      if (indexAttr == null) return;
      const idx = parseInt(indexAttr, 10);
      if (!Number.isFinite(idx)) return;
      e.preventDefault();
      e.stopPropagation();
      // calcular coords vs. canvas
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.current.set(((e.clientX - rect.left)/rect.width) * 2 - 1, -((e.clientY - rect.top)/rect.height) * 2 + 1);
      addPointer(e);
      userInteractingRef.current = true;
      dragging.current = { active:true, nodeIndex: idx };
      // feedback cursor
      target.style.cursor = 'grabbing';
    }
    function onChipPointerUp(e){
      const target = e.target;
      if (target instanceof HTMLElement) target.style.cursor = 'grab';
    }
    if (labelLayerEl) {
      labelLayerEl.addEventListener('pointerdown', onChipPointerDown);
      labelLayerEl.addEventListener('pointerup', onChipPointerUp);
    }

    // Loop
    const clock = new THREE.Clock();
    let firstFrame = true;
    function animate() {
      const t = clock.getElapsedTime();
  if (autoRotateRef.current && !userInteractingRef.current) yawRef.current += ROTATION_SPEED * 0.01;
      // Update camera from orbit params
      const r = camDistRef.current;
      const yaw = yawRef.current; const pitch = pitchRef.current;
      const dir = new THREE.Vector3(
        Math.cos(pitch) * Math.cos(yaw),
        Math.sin(pitch),
        Math.cos(pitch) * Math.sin(yaw)
      ).normalize();
      const camPos = dir.clone().multiplyScalar(r).add(targetOffsetRef.current);
      camera.position.copy(camPos);
      camera.lookAt(targetOffsetRef.current);
      // Proyectar y ubicar chips
      nodesRef.current.forEach((n, idx) => {
        const base = latLonToV3(n.lat, n.lon, SPHERE_RADIUS + LABEL_OFFSET);
        const ndc = base.clone().project(camera);
        const w = renderer.domElement.clientWidth;
        const h = renderer.domElement.clientHeight;
        const x = (ndc.x * 0.5 + 0.5) * w;
        const y = (-ndc.y * 0.5 + 0.5) * h;
        const isVisible = ndc.z > -1 && ndc.z < 1;
        const el = n.el;
        if (el) {
          if (!showLabelsRef.current || !isVisible) {
            el.style.display = 'none';
          } else {
            el.style.display = 'inline-flex';
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            // opcional: escalar ligeramente según distancia a borde para mayor legibilidad
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
      if (labelLayerEl) {
        labelLayerEl.removeEventListener('pointerdown', onChipPointerDown);
        labelLayerEl.removeEventListener('pointerup', onChipPointerUp);
      }
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
    if (!heatPassRef.current || !nodesRef.current.length) return;
    const pts = nodesRef.current.map(n => {
      const uv = latLonToUV(n.lat, n.lon);
      return { u: uv.u, v: uv.v, weight: (n.priority ?? 5)/10, radiusPx };
    });
    heatPassRef.current.setPoints(pts, { defaultRadiusPx: radiusPx });
    heatPassRef.current.render();
  }, [radiusPx]);
  useEffect(() => { if (heatLayerRef.current) heatLayerRef.current.material.uniforms.uReverse.value = reverse; }, [reverse]);
  // Vista: grid visible toggle
  useEffect(()=>{ if (gridRef.current) gridRef.current.visible = showGrid; }, [showGrid]);

  return (
    <div style={{ width:'100%', height:'100%', position:'relative' }}>
      <div ref={mountRef} style={{ width:'100%', height:'100%' }} />
  <div ref={labelsRef} style={{ position:'absolute', inset:0, pointerEvents:'auto', zIndex:5 }} />
      {toast && (
        <div style={{position:'absolute', left:'50%', transform:'translateX(-50%)', bottom:'max(80px, calc(56px + env(safe-area-inset-bottom)))', background:'rgba(10,12,24,.7)', color:'#EAEAEA', border:'1px solid rgba(255,255,255,.12)', padding:'10px 14px', borderRadius:10, fontSize:12, zIndex:12, boxShadow:'0 8px 24px rgba(0,0,0,.35)'}}>
          Usa 1 dedo para rotar · 2 dedos para mover · Pinza para zoom
        </div>
      )}
      <HeatmapControls
        // Calor
        opacity={opacity} sigmaPx={sigmaPx} radiusPx={radiusPx} reverse={reverse}
        onOpacity={setOpacity} onSigma={setSigmaPx} onRadius={setRadiusPx} onReverse={setReverse}
        // Vista
        autoRotate={autoRotate} showGrid={showGrid} showLabels={showLabels}
        onAutoRotate={setAutoRotate} onShowGrid={setShowGrid} onShowLabels={setShowLabels}
        onHelp={onHelp}
      />
    </div>
  );
}
// se eliminaron helpers de islas; ahora usamos chips HTML proyectados
