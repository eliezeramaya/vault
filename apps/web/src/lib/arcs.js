import * as THREE from 'three';
import { latLonToVector3, greatCircleElevatedPoints } from './spherical';

/** Crea un arco elevado con animación de dash */
export function createGreatCircleArc({
  start, end,
  baseRadius,
  lift = 0.15,
  segments = 128,
  color = 0xff77aa,
  dashed = true,
  dashSize = 0.2,
  gapSize = 0.15,
}) {
  const a = latLonToVector3(start.lat, start.lon, 1);
  const b = latLonToVector3(end.lat, end.lon, 1);
  const points = greatCircleElevatedPoints(a, b, baseRadius, lift, segments);
  const geom = new THREE.BufferGeometry().setFromPoints(points);
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, transparent:true, opacity:.95, dashSize, gapSize })
    : new THREE.LineBasicMaterial({ color, transparent:true, opacity:.95 });
  const line = new THREE.Line(geom, mat);
  if (dashed) line.computeLineDistances();

  const state = { t: 0, speed: 0.6 };
  const update = (delta) => { if (dashed) mat.dashOffset = -(state.t += delta * state.speed); };

  const recompute = (newStart, newEnd) => {
    const a2 = latLonToVector3(newStart.lat, newStart.lon, 1);
    const b2 = latLonToVector3(newEnd.lat, newEnd.lon, 1);
    const pts = greatCircleElevatedPoints(a2, b2, baseRadius, lift, segments);
    line.geometry.setFromPoints(pts);
    if (dashed) line.computeLineDistances();
  };

  return { line, update, recompute };
}
