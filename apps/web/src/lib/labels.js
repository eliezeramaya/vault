import { Text } from 'troika-three-text';

export class LabelManager {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
  }
  addLabel({ text, attachTo, color = 0xffffff, fontSize = 0.26, offset = 0.08 }) {
    const label = new Text();
    label.text = text;
    label.color = color;
    label.fontSize = fontSize;
    label.maxWidth = 4;
    label.anchorX = 'center';
    label.anchorY = 'bottom';
    label.sync();
    const n = attachTo.position.clone().normalize();
    label.position.copy(attachTo.position.clone().addScaledVector(n, offset));
    label.material.depthWrite = false;
    label.renderOrder = 3;
    this.scene.add(label);
    const entry = { label, attachTo, offset };
    this.items.push(entry);
    return entry;
  }
  update(camera) {
    for (const it of this.items) {
      const { label, attachTo, offset } = it;
      const n = attachTo.position.clone().normalize();
      label.position.copy(attachTo.position.clone().addScaledVector(n, offset));
      label.lookAt(camera.position);
    }
  }
  dispose() {
    for (const it of this.items) {
      this.scene.remove(it.label);
      it.label.dispose?.();
    }
    this.items = [];
  }
}
