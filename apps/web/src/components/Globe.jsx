import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

import HeatmapControls from './HeatmapControls';
import EditIslandSheet from './EditIslandSheet';
import { HeatmapPass } from '../lib/heatmap/HeatmapPass';
import { createHeatLayer } from '../lib/heatmap/HeatmapLayer';

// Plano 2D (relación 2:1, como proyección equirectangular 360x180)
const PLANE_WIDTH = 10;
const PLANE_HEIGHT = PLANE_WIDTH / 2;
const LABEL_Z = 0.06; // altura leve sobre el plano para los chips
const ROTATION_SPEED = 0.0; // sin auto-rotación en modo plano

const d2r = (d)=> (d*Math.PI)/180;
// Plano: mapear lat/lon a XY (equirectangular). Centro (0,0) en el centro del plano.
const latLonToPlane = (latDeg, lonDeg, z = LABEL_Z) => {
  const x = (lonDeg / 180) * (PLANE_WIDTH / 2);
  const y = (latDeg / 90) * (PLANE_HEIGHT / 2);
  return new THREE.Vector3(x, y, z);
};
const planePointToLatLon = (uv) => {
  // uv de PlaneGeometry está en [0,1]
  const lonDeg = uv.x * 360 - 180;
  const latDeg = uv.y * 180 - 90;
  return { latDeg, lonDeg };
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

function createRectGrid(width, height, meridians = 12, parallels = 12, { color = 0x2a3a7a, opacity = 0.35 } = {}) {
  const group = new THREE.Group();
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  // Líneas horizontales (latitudes)
  for (let i = 1; i < parallels; i++) {
    const y = -height/2 + (i * height / parallels);
    const pts = [
      new THREE.Vector3(-width/2, y, 0.0),
      new THREE.Vector3( width/2, y, 0.0)
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(geo, mat));
  }
  // Líneas verticales (longitudes)
  for (let j = 1; j < meridians; j++) {
    const x = -width/2 + (j * width / meridians);
    const pts = [
      new THREE.Vector3(x, -height/2, 0.0),
      new THREE.Vector3(x,  height/2, 0.0)
    ];
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(geo, mat));
  }
  return group;
}
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
  // Hover/selección
  const [hoveredIdx, setHoveredIdx] = useState(-1);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const hoveredIdxRef = useRef(-1);
  const selectedIdxRef = useRef(-1);

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

  // Plano base
  const planeGeom = new THREE.PlaneGeometry(PLANE_WIDTH, PLANE_HEIGHT, 1, 1);
  const planeMat = new THREE.MeshStandardMaterial({ color:0x10162f, roughness:.8, metalness:.1, side: THREE.DoubleSide });
  const plane = new THREE.Mesh(planeGeom, planeMat);
  scene.add(plane);

    // Grid rectangular (lat/lon)
    const rectGrid = createRectGrid(PLANE_WIDTH, PLANE_HEIGHT, 15, 15, {
      color: 0x2a3a7a,
      opacity: 0.35
    });
    scene.add(rectGrid);
    gridRef.current = rectGrid;

    // Nodos ejemplo (estado vacío con valor)
    const nodesData = [
      { id:'Salud',       lat:  18, lon: -55, priority: 8 },
      { id:'Finanzas',    lat:  -8, lon:  20, priority: 6 },
      { id:'Carrera',     lat:  34, lon: 120, priority: 9 },
      { id:'Relaciones',  lat: -22, lon: -120, priority: 5 },
      { id:'Aprendizaje', lat:  12, lon:  70, priority: 7 },
    ];
    // Helper para símbolo dentro del círculo (emoji inicial o primera letra)
    function chipSymbol(text){
      if (!text) return '?';
      const first = text.trim().split(/\s+/)[0];
      // Si empieza con un emoji (heurística simple: contiene símbolos no alfanuméricos)
      if (/^[\p{Emoji}\p{So}]/u.test(first)) return first;
      return first.charAt(0).toUpperCase();
    }

    // Crear chips circulares (HTML) para cada nodo
    const nodes = nodesData.map((n, idx) => {
      if (!labelLayerEl) return n;
      const chip = document.createElement('div');
      chip.textContent = chipSymbol(n.id);
      chip.setAttribute('data-node-index', String(idx));
      chip.title = n.id;
      Object.assign(chip.style, {
        position: 'absolute',
        transform: 'translate(-50%, -50%)',
        width: '44px',
        height: '44px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px',
        letterSpacing: '.2px',
        color: '#EAEAEA',
        background: 'rgba(10,12,24,.72)',
        border: '1px solid rgba(255,255,255,.10)',
        borderRadius: '50%',
        boxShadow: '0 6px 20px rgba(0,0,0,.35)',
        pointerEvents: 'auto',
        whiteSpace: 'nowrap',
        zIndex: 7,
        cursor: 'grab',
        userSelect: 'none',
        touchAction: 'none'
      });
      chip.addEventListener('mouseenter', ()=> { setHoveredIdx(idx); hoveredIdxRef.current = idx; });
      chip.addEventListener('mouseleave', ()=> { setHoveredIdx(v => v===idx ? -1 : v); if (hoveredIdxRef.current === idx) hoveredIdxRef.current = -1; });
      chip.addEventListener('click', (e)=> { e.stopPropagation(); setSelectedIdx(idx); selectedIdxRef.current = idx; });
      labelLayerEl.appendChild(chip);
      // sombra de contacto (círculo) sobre el plano
      const circR = 0.22;
      const circGeom = new THREE.CircleGeometry(circR, 48);
      const shadowMat = new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.22, side:THREE.DoubleSide, depthWrite:false });
      const shadow = new THREE.Mesh(circGeom, shadowMat);
      scene.add(shadow);
      return { ...n, el: chip, shadow };
    });
    nodesRef.current = nodes;

    // Línea demo (A->C) en plano
    const A = latLonToPlane(nodesData[0].lat, nodesData[0].lon, LABEL_Z + 0.01);
    const C = latLonToPlane(nodesData[2].lat, nodesData[2].lon, LABEL_Z + 0.01);
    const arcGeom = new THREE.BufferGeometry().setFromPoints([A, C]);
    const arcMat = new THREE.LineDashedMaterial({ color:0xff77aa, transparent:true, opacity:.95, dashSize:.22, gapSize:.15 });
    const arc = new THREE.Line(arcGeom, arcMat);
    arc.computeLineDistances(); arc.renderOrder = 2;
    scene.add(arc);

    // HEATMAP
  const heatPass = new HeatmapPass(renderer, { width:1024, height:512, sigmaPx: initialSigmaRef.current });
    heatPassRef.current = heatPass;
  const heatLayer = createHeatLayer({ width: PLANE_WIDTH, height: PLANE_HEIGHT, texture: heatPass.texture, opacity: initialOpacityRef.current, reverse: initialReverseRef.current });
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
        chip.textContent = chipSymbol(node.id);
        chip.setAttribute('data-node-index', String(idx));
        chip.title = node.id;
        Object.assign(chip.style, {
          position: 'absolute', transform: 'translate(-50%, -50%)', width: '44px', height: '44px',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', letterSpacing: '.2px',
          color: '#EAEAEA', background: 'rgba(10,12,24,.72)', border: '1px solid rgba(255,255,255,.10)', borderRadius: '50%',
          boxShadow: '0 6px 20px rgba(0,0,0,.35)', pointerEvents: 'auto', whiteSpace: 'nowrap', zIndex: 7, cursor: 'grab', userSelect: 'none', touchAction: 'none'
        });
        chip.addEventListener('mouseenter', ()=> { setHoveredIdx(idx); hoveredIdxRef.current = idx; });
        chip.addEventListener('mouseleave', ()=> { setHoveredIdx(v => v===idx ? -1 : v); if (hoveredIdxRef.current === idx) hoveredIdxRef.current = -1; });
        chip.addEventListener('click', (e)=> { e.stopPropagation(); setSelectedIdx(idx); selectedIdxRef.current = idx; });
        labelLayerEl.appendChild(chip);
        // sombra (círculo)
        const circR = 0.22; const circGeom = new THREE.CircleGeometry(circR, 48);
        const shadowMat = new THREE.MeshBasicMaterial({ color:0x000000, transparent:true, opacity:0.22, side:THREE.DoubleSide, depthWrite:false });
        const shadow = new THREE.Mesh(circGeom, shadowMat); scene.add(shadow);
        nodesRef.current.push({ ...node, el: chip, shadow });
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
          // en plano: pan con un dedo
          gesture.mode = 'pan';
          const p = Array.from(pointers.values())[0];
          gesture.last = { x: p.x, y: p.y };
          gesture.startTarget = targetOffsetRef.current.clone();
        } else if (pointers.size === 2) {
          // Initialize pinch/pan
          const [p1, p2] = Array.from(pointers.values());
          const dx = p2.x - p1.x, dy = p2.y - p1.y;
          gesture.startDist = Math.hypot(dx, dy);
          gesture.startRadius = camDistRef.current;
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
        const hit = raycaster.current.intersectObject(plane, false)[0];
        if (!hit) return;
        const { latDeg, lonDeg } = planePointToLatLon(hit.uv);
        const idx = dragging.current.nodeIndex;
        if (idx >= 0 && nodesRef.current[idx]) {
          nodesRef.current[idx].lat = latDeg;
          nodesRef.current[idx].lon = lonDeg;
        }
        // recomputar línea demo si corresponde (si movemos 0 o 2)
        if (idx === 0 || idx === 2) {
          const A2 = latLonToPlane(nodesRef.current[0].lat, nodesRef.current[0].lon, LABEL_Z + 0.01);
          const C2 = latLonToPlane(nodesRef.current[2].lat, nodesRef.current[2].lon, LABEL_Z + 0.01);
          arc.geometry.setFromPoints([A2, C2]); arc.computeLineDistances();
        }
        refreshHeat();
        return;
      }
      if (e.pointerType === 'touch') {
        if (pointers.size === 1 && gesture.mode === 'pan') {
          const p = Array.from(pointers.values())[0];
          const dx = p.x - gesture.last.x;
          const dy = p.y - gesture.last.y;
          gesture.last = { x: p.x, y: p.y };
          const panScale = 0.003 * camDistRef.current;
          const vRight = new THREE.Vector3(1,0,0);
          const vUp = new THREE.Vector3(0,1,0);
          const offset = gesture.startTarget.clone()
            .addScaledVector(vRight, -dx * panScale)
            .addScaledVector(vUp, dy * panScale);
          targetOffsetRef.current.copy(offset);
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
          // Convert pixels to world-space along plane axes
          const panScale = 0.003 * camDistRef.current;
          const vRight = new THREE.Vector3(1,0,0);
          const vUp = new THREE.Vector3(0,1,0);
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
      // Cámara mirando ortogonalmente al plano (eje Z)
      camera.position.set(targetOffsetRef.current.x, targetOffsetRef.current.y, r);
      camera.lookAt(targetOffsetRef.current.x, targetOffsetRef.current.y, 0);
      // Proyectar y ubicar chips
      nodesRef.current.forEach((n, idx) => {
  const lift = (idx===hoveredIdxRef.current ? 0.02 : 0) + (idx===selectedIdxRef.current ? 0.03 : 0);
  const base = latLonToPlane(n.lat, n.lon, LABEL_Z + lift);
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
            el.style.boxShadow = (idx===hoveredIdxRef.current || idx===selectedIdxRef.current)
              ? '0 10px 30px rgba(0,0,0,.55), 0 0 0 2px rgba(159,180,255,.8)'
              : '0 6px 20px rgba(0,0,0,.35)';
            el.style.border = (idx===selectedIdxRef.current)
              ? '1px solid rgba(159,180,255,.85)'
              : '1px solid rgba(255,255,255,.10)';
            // opcional: escalar ligeramente según distancia a borde para mayor legibilidad
          }
        }
        // sombra de contacto en el plano
        if (n.shadow) {
          const baseSurf = latLonToPlane(n.lat, n.lon, 0.002);
          n.shadow.position.copy(baseSurf);
          n.shadow.rotation.set(0,0,0);
          n.shadow.material.opacity = (idx===hoveredIdxRef.current || idx===selectedIdxRef.current) ? 0.36 : 0.22;
        }
      });
      // Guía desde superficie hasta chip seleccionado
      if (selectedIdxRef.current >= 0 && nodesRef.current[selectedIdxRef.current]) {
        if (!guideRef) guideRef = { current: null };
        if (!guideRef.current) {
          const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
          const m = new THREE.LineBasicMaterial({ color: 0x9fb4ff, transparent:true, opacity:0.85 });
          guideRef.current = new THREE.Line(g, m); guideRef.current.renderOrder = 3; scene.add(guideRef.current);
        }
        const n = nodesRef.current[selectedIdxRef.current];
        const p0 = latLonToPlane(n.lat, n.lon, 0.002);
        const p1 = latLonToPlane(n.lat, n.lon, LABEL_Z + 0.03);
        guideRef.current.geometry.setFromPoints([p0, p1]);
      } else if (guideRef && guideRef.current) {
        if (guideRef.current.parent) guideRef.current.parent.remove(guideRef.current);
        guideRef.current = null;
      }
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
  [planeGeom, arcGeom].forEach(g=>g.dispose());
      renderer.dispose();
      // Cleanup labels
      if (labelLayerEl) {
        while (labelLayerEl.firstChild) {
          labelLayerEl.removeChild(labelLayerEl.firstChild);
        }
      }
      // limpiar sombras y guía
      nodesRef.current.forEach(n=>{ if (n.shadow && n.shadow.parent) n.shadow.parent.remove(n.shadow); });
      if (guideRef && guideRef.current && guideRef.current.parent) guideRef.current.parent.remove(guideRef.current);
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
      <EditIslandSheet
        open={selectedIdx>=0}
        node={selectedIdx>=0 ? nodesRef.current[selectedIdx] : null}
        onClose={()=> setSelectedIdx(-1)}
        onSave={({ title, zone, priority })=>{
          const idx = selectedIdx; if (idx<0) return;
          // lightweight update: only title and priority; lat/lon by zone TBD
          const node = nodesRef.current[idx];
          if (title != null) { node.id = title; if (node.el) { node.el.textContent = (title||'').trim().charAt(0).toUpperCase(); node.el.title = title; } }
          if (priority != null) node.priority = priority;
          setSelectedIdx(-1);
        }}
        onConnect={()=>{/* will be wired in next step */}}
        onDuplicate={()=>{/* next step */}}
        onDelete={()=>{/* next step */}}
        onFocus={()=>{
          const idx = selectedIdx; if (idx<0) return;
          const n = nodesRef.current[idx];
          const v = latLonToV3(n.lat, n.lon, 1).normalize();
          const yaw = Math.atan2(v.z, v.x);
          const pitch = Math.asin(v.y);
          yawRef.current = yaw; pitchRef.current = pitch;
          setSelectedIdx(-1);
        }}
      />
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
