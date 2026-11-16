import * as THREE from 'three';

function createCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export interface ProceduralTextureSet {
  asphaltMap: THREE.CanvasTexture;
  asphaltRoughness: THREE.CanvasTexture;
  asphaltBump: THREE.CanvasTexture;
  concreteMap: THREE.CanvasTexture;
  concreteBump: THREE.CanvasTexture;
  brickMap: THREE.CanvasTexture;
  brickBump: THREE.CanvasTexture;
  metalMap: THREE.CanvasTexture;
  metalBump: THREE.CanvasTexture;
  woodMap: THREE.CanvasTexture;
  contactShadowMap: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  // 1. High-Res Wet Asphalt (1024x1024) + Bump + Roughness
  const [aspC, aspCtx] = createCanvas(1024, 1024);
  const [aspBC, aspBCtx] = createCanvas(512, 512);
  aspCtx.fillStyle = '#1b1e24';
  aspCtx.fillRect(0, 0, 1024, 1024);
  aspBCtx.fillStyle = '#808080';
  aspBCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 28000; i++) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const v = 20 + Math.floor(Math.random() * 28);
    aspCtx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
    aspCtx.fillRect(x, y, 2, 2);

    const bv = 90 + Math.floor(Math.random() * 80);
    aspBCtx.fillStyle = `rgb(${bv},${bv},${bv})`;
    aspBCtx.fillRect(x * 0.5, y * 0.5, 2, 2);
  }
  for (let i = 0; i < 24; i++) {
    const gx = Math.random() * 1024;
    const gy = Math.random() * 1024;
    const r = 45 + Math.random() * 95;
    const grad = aspCtx.createRadialGradient(gx, gy, 4, gx, gy, r);
    grad.addColorStop(0, 'rgba(9,11,16,0.48)');
    grad.addColorStop(1, 'rgba(9,11,16,0)');
    aspCtx.fillStyle = grad;
    aspCtx.beginPath();
    aspCtx.arc(gx, gy, r, 0, Math.PI * 2);
    aspCtx.fill();
  }
  const asphaltMap = new THREE.CanvasTexture(aspC);
  asphaltMap.colorSpace = THREE.SRGBColorSpace;
  asphaltMap.wrapS = THREE.RepeatWrapping;
  asphaltMap.wrapT = THREE.RepeatWrapping;
  asphaltMap.repeat.set(16, 16);
  asphaltMap.anisotropy = maxAnisotropy;

  const asphaltBump = new THREE.CanvasTexture(aspBC);
  asphaltBump.wrapS = THREE.RepeatWrapping;
  asphaltBump.wrapT = THREE.RepeatWrapping;
  asphaltBump.repeat.set(16, 16);

  const [aspRC, aspRCtx] = createCanvas(512, 512);
  aspRCtx.fillStyle = '#9e9e9e';
  aspRCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 20; i++) {
    const gx = Math.random() * 512;
    const gy = Math.random() * 512;
    const r = 30 + Math.random() * 68;
    const grad = aspRCtx.createRadialGradient(gx, gy, 4, gx, gy, r);
    grad.addColorStop(0, 'rgba(26,26,26,0.9)');
    grad.addColorStop(1, 'rgba(160,160,160,0)');
    aspRCtx.fillStyle = grad;
    aspRCtx.beginPath();
    aspRCtx.arc(gx, gy, r, 0, Math.PI * 2);
    aspRCtx.fill();
  }
  const asphaltRoughness = new THREE.CanvasTexture(aspRC);
  asphaltRoughness.wrapS = THREE.RepeatWrapping;
  asphaltRoughness.wrapT = THREE.RepeatWrapping;
  asphaltRoughness.repeat.set(16, 16);

  // 2. Concrete + Bump
  const [conC, conCtx] = createCanvas(512, 512);
  const [conBC, conBCtx] = createCanvas(512, 512);
  conCtx.fillStyle = '#484d57';
  conCtx.fillRect(0, 0, 512, 512);
  conBCtx.fillStyle = '#888888';
  conBCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const shade = 54 + Math.floor(Math.random() * 38);
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    conCtx.fillStyle = `rgb(${shade},${shade + 2},${shade + 6})`;
    conCtx.fillRect(x, y, 2, 2);
    const bShade = 100 + Math.floor(Math.random() * 60);
    conBCtx.fillStyle = `rgb(${bShade},${bShade},${bShade})`;
    conBCtx.fillRect(x, y, 2, 2);
  }
  conCtx.strokeStyle = 'rgba(20,22,26,0.42)';
  conCtx.lineWidth = 2;
  conBCtx.strokeStyle = '#303030';
  conBCtx.lineWidth = 3;
  for (let y = 0; y < 512; y += 128) {
    conCtx.beginPath();
    conCtx.moveTo(0, y);
    conCtx.lineTo(512, y);
    conCtx.stroke();
    conBCtx.beginPath();
    conBCtx.moveTo(0, y);
    conBCtx.lineTo(512, y);
    conBCtx.stroke();
  }
  const concreteMap = new THREE.CanvasTexture(conC);
  concreteMap.colorSpace = THREE.SRGBColorSpace;
  concreteMap.wrapS = THREE.RepeatWrapping;
  concreteMap.wrapT = THREE.RepeatWrapping;
  concreteMap.repeat.set(3, 3);
  concreteMap.anisotropy = maxAnisotropy;

  const concreteBump = new THREE.CanvasTexture(conBC);
  concreteBump.wrapS = THREE.RepeatWrapping;
  concreteBump.wrapT = THREE.RepeatWrapping;
  concreteBump.repeat.set(3, 3);

  // 3. Industrial Brick + Mortar Bump
  const [brkC, brkCtx] = createCanvas(512, 512);
  const [brkBC, brkBCtx] = createCanvas(512, 512);
  brkCtx.fillStyle = '#251f1d';
  brkCtx.fillRect(0, 0, 512, 512);
  brkBCtx.fillStyle = '#252525';
  brkBCtx.fillRect(0, 0, 512, 512);
  const bw = 64;
  const bh = 32;
  for (let row = 0; row < 16; row++) {
    const offset = (row % 2) * (bw / 2);
    for (let col = -1; col < 9; col++) {
      const r = 64 + Math.floor(Math.random() * 28);
      const g = 42 + Math.floor(Math.random() * 16);
      const b = 40 + Math.floor(Math.random() * 14);
      brkCtx.fillStyle = `rgb(${r},${g},${b})`;
      brkCtx.fillRect(col * bw + offset + 2, row * bh + 2, bw - 4, bh - 4);
      const bumpVal = 185 + Math.floor(Math.random() * 45);
      brkBCtx.fillStyle = `rgb(${bumpVal},${bumpVal},${bumpVal})`;
      brkBCtx.fillRect(col * bw + offset + 3, row * bh + 3, bw - 6, bh - 6);
    }
  }
  const brickMap = new THREE.CanvasTexture(brkC);
  brickMap.colorSpace = THREE.SRGBColorSpace;
  brickMap.wrapS = THREE.RepeatWrapping;
  brickMap.wrapT = THREE.RepeatWrapping;
  brickMap.repeat.set(4, 3);
  brickMap.anisotropy = maxAnisotropy;

  const brickBump = new THREE.CanvasTexture(brkBC);
  brickBump.wrapS = THREE.RepeatWrapping;
  brickBump.wrapT = THREE.RepeatWrapping;
  brickBump.repeat.set(4, 3);

  // 4. Corrugated Industrial Metal + Ridge Bump
  const [metC, metCtx] = createCanvas(512, 512);
  const [metBC, metBCtx] = createCanvas(512, 512);
  for (let x = 0; x < 512; x += 24) {
    const grad = metCtx.createLinearGradient(x, 0, x + 24, 0);
    grad.addColorStop(0, '#242b33');
    grad.addColorStop(0.5, '#4b5663');
    grad.addColorStop(1, '#20262d');
    metCtx.fillStyle = grad;
    metCtx.fillRect(x, 0, 24, 512);

    const bGrad = metBCtx.createLinearGradient(x, 0, x + 24, 0);
    bGrad.addColorStop(0, '#353535');
    bGrad.addColorStop(0.5, '#efefef');
    bGrad.addColorStop(1, '#353535');
    metBCtx.fillStyle = bGrad;
    metBCtx.fillRect(x, 0, 24, 512);
  }
  const metalMap = new THREE.CanvasTexture(metC);
  metalMap.colorSpace = THREE.SRGBColorSpace;
  metalMap.wrapS = THREE.RepeatWrapping;
  metalMap.wrapT = THREE.RepeatWrapping;
  metalMap.repeat.set(3, 2);
  metalMap.anisotropy = maxAnisotropy;

  const metalBump = new THREE.CanvasTexture(metBC);
  metalBump.wrapS = THREE.RepeatWrapping;
  metalBump.wrapT = THREE.RepeatWrapping;
  metalBump.repeat.set(3, 2);

  // 5. Wooden Crate Planks
  const [wdC, wdCtx] = createCanvas(512, 512);
  wdCtx.fillStyle = '#5c442d';
  wdCtx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y += 64) {
    wdCtx.fillStyle = y % 128 === 0 ? '#654b32' : '#533c27';
    wdCtx.fillRect(0, y + 2, 512, 60);
    wdCtx.fillStyle = 'rgba(20,12,6,0.45)';
    wdCtx.fillRect(0, y, 512, 4);
  }
  wdCtx.strokeStyle = '#3c2a19';
  wdCtx.lineWidth = 24;
  wdCtx.strokeRect(12, 12, 488, 488);
  const woodMap = new THREE.CanvasTexture(wdC);
  woodMap.colorSpace = THREE.SRGBColorSpace;
  woodMap.anisotropy = maxAnisotropy;

  // 6. Soft Radial Contact Shadow
  const [shC, shCtx] = createCanvas(128, 128);
  const shGrad = shCtx.createRadialGradient(64, 64, 8, 64, 64, 60);
  shGrad.addColorStop(0, 'rgba(0,0,0,0.68)');
  shGrad.addColorStop(0.6, 'rgba(0,0,0,0.24)');
  shGrad.addColorStop(1, 'rgba(0,0,0,0)');
  shCtx.fillStyle = shGrad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadowMap = new THREE.CanvasTexture(shC);

  return {
    asphaltMap,
    asphaltRoughness,
    asphaltBump,
    concreteMap,
    concreteBump,
    brickMap,
    brickBump,
    metalMap,
    metalBump,
    woodMap,
    contactShadowMap,
    dispose: () => {
      asphaltMap.dispose();
      asphaltRoughness.dispose();
      asphaltBump.dispose();
      concreteMap.dispose();
      concreteBump.dispose();
      brickMap.dispose();
      brickBump.dispose();
      metalMap.dispose();
      metalBump.dispose();
      woodMap.dispose();
      contactShadowMap.dispose();
    },
  };
}
