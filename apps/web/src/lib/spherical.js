import * as THREE from 'three';

export const degToRad = d => (d * Math.PI) / 180;

export function latLonToVector3(latDeg, lonDeg, radius) {
  const lat = degToRad(latDeg);
  const lon = degToRad(lonDeg);
  const x = radius * Math.cos(lat) * Math.cos(lon);
  const y = radius * Math.sin(lat);
  const z = radius * Math.cos(lat) * Math.sin(lon);
  return new THREE.Vector3(x, y, z);
}

export function vector3ToLatLon(v) {
  const r = v.length();
  const lat = Math.asin(v.y / r);
  const lon = Math.atan2(v.z, v.x);
  return { latDeg: (lat * 180) / Math.PI, lonDeg: (lon * 180) / Math.PI };
}

export function greatCircleElevatedPoints(aVec, bVec, baseRadius, lift = 0.1, segments = 128) {
  const va = aVec.clone().normalize();
  const vb = bVec.clone().normalize();
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const dir = new THREE.Vector3().copy(va).lerp(vb, t).normalize();
    const elev = lift * Math.sin(Math.PI * t);
    const r = baseRadius + elev;
    pts.push(dir.multiplyScalar(r));
  }
  return pts;
}
