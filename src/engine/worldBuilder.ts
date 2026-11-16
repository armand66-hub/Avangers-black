import * as THREE from 'three';
import { buildCharacterRig, CharacterRig } from './characterBuilder';
import { ProceduralTextureSet } from './proceduralTextures';
import { DEFAULT_CHARACTER, WeatherType } from '../types/game';

export interface ColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface WorldInteractable {
  id: string;
  label: string;
  sublabel: string;
  position: THREE.Vector3;
  radius: number;
  mesh: THREE.Object3D;
  echoHighlight: THREE.Mesh;
  completed?: boolean;
}

export interface GuardController {
  rig: CharacterRig;
  position: THREE.Vector3;
  yaw: number;
  waypoints: THREE.Vector3[];
  waypointIndex: number;
  waitTimer: number;
  visionCone: THREE.Mesh;
  status: 'patrol' | 'suspicious' | 'alert' | 'stunned' | 'bribed';
  suspicion: number;
  health: number;
  lastKnownPlayerPos: THREE.Vector3 | null;
  attackCooldown: number;
}

export interface WorldContext {
  chapter: 1 | 2;
  worldGroup: THREE.Group;
  colliders: ColliderBox[];
  interactables: WorldInteractable[];
  npcRig: CharacterRig;
  npcPos: THREE.Vector3;
  guard: GuardController;
  spotlightMesh: THREE.Mesh;
  spotlightBeam: THREE.Mesh;
  laserBarrierGroup: THREE.Group | null;
  rainPoints: THREE.Points;
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  lampLights: THREE.PointLight[];
  lampBulbs: THREE.MeshStandardMaterial[];
  updateEnvironment: (
    timeOfDay: number,
    weather: WeatherType,
    dt: number,
    elapsed: number,
    echoActive: boolean
  ) => void;
  setSpotlightActive: (active: boolean) => void;
  setLasersActive: (active: boolean) => void;
  dispose: () => void;
}

export function buildGameWorld(
  chapter: 1 | 2,
  scene: THREE.Scene,
  textures: ProceduralTextureSet
): WorldContext {
  const worldGroup = new THREE.Group();
  scene.add(worldGroup);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const colliders: ColliderBox[] = [];
  const interactables: WorldInteractable[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const addBoxCollider = (cx: number, cz: number, w: number, d: number) => {
    colliders.push({
      minX: cx - w / 2,
      maxX: cx + w / 2,
      minZ: cz - d / 2,
      maxZ: cz + d / 2,
    });
  };

  // --- LIGHTING RIG ---
  const hemiLight = new THREE.HemisphereLight(
    chapter === 1 ? 0x7c9bc4 : 0x56738c,
    chapter === 1 ? 0x1c1a17 : 0x121418,
    chapter === 1 ? 0.72 : 0.58
  );
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(chapter === 1 ? 0xffdfb8 : 0x9fc2e8, 1.3);
  sunLight.position.set(22, 32, 18);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.near = 2;
  sunLight.shadow.camera.far = 95;
  sunLight.shadow.camera.left = -32;
  sunLight.shadow.camera.right = 32;
  sunLight.shadow.camera.top = 32;
  sunLight.shadow.camera.bottom = -32;
  sunLight.shadow.bias = -0.0005;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);

  // --- SHARED HIGH-DETAIL PBR MATERIALS WITH BUMP MAPS ---
  const asphaltMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.asphaltMap,
      roughnessMap: textures.asphaltRoughness,
      bumpMap: textures.asphaltBump,
      bumpScale: 0.04,
      roughness: 0.7,
      metalness: 0.08,
    })
  );
  const concreteMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.concreteMap,
      bumpMap: textures.concreteBump,
      bumpScale: 0.035,
      roughness: 0.85,
      metalness: 0.06,
    })
  );
  const brickMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.brickMap,
      bumpMap: textures.brickBump,
      bumpScale: 0.06,
      roughness: 0.88,
      metalness: 0.04,
    })
  );
  const metalMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.metalMap,
      bumpMap: textures.metalBump,
      bumpScale: 0.05,
      roughness: 0.42,
      metalness: 0.68,
    })
  );
  const darkIronMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#1b1f26',
      roughness: 0.36,
      metalness: 0.8,
    })
  );
  const woodMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.woodMap,
      roughness: 0.82,
      metalness: 0.05,
    })
  );

  // Extended Ground Plane
  const ground = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(180, 180)),
    chapter === 1 ? asphaltMat : concreteMat
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  worldGroup.add(ground);

  const createInteractable = (
    id: string,
    label: string,
    sublabel: string,
    x: number,
    z: number,
    radius: number,
    buildVisual: (g: THREE.Group) => void
  ) => {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    buildVisual(g);

    const echoRing = new THREE.Mesh(
      trackGeo(new THREE.RingGeometry(0.55, 0.74, 24)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: '#f59e0b',
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.0,
          depthWrite: false,
        })
      )
    );
    echoRing.rotation.x = -Math.PI / 2;
    echoRing.position.y = 0.04;
    g.add(echoRing);

    worldGroup.add(g);
    interactables.push({
      id,
      label,
      sublabel,
      position: new THREE.Vector3(x, 0, z),
      radius,
      mesh: g,
      echoHighlight: echoRing,
    });
  };

  const lampLights: THREE.PointLight[] = [];
  const lampBulbs: THREE.MeshStandardMaterial[] = [];

  // Placeholder defaults overwritten by chapter builders
  let spotlightMesh: THREE.Mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.1, 0.1)), darkIronMat);
  let spotlightBeam: THREE.Mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.1, 0.1, 0.1)), darkIronMat);
  spotlightBeam.visible = false;
  let laserBarrierGroup: THREE.Group | null = null;
  let npcRig: CharacterRig;
  let npcPos = new THREE.Vector3();
  let guard: GuardController;

  if (chapter === 1) {
    // =========================================================================
    // CHAPTER 1 — PORT-BRUME / QUAI 4
    // =========================================================================
    const waterMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#0c1824', roughness: 0.12, metalness: 0.68 })
    );
    const water = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(180, 90)), waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0, -0.9, -68);
    worldGroup.add(water);

    const quayEdge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(64, 1.1, 1.4)), concreteMat);
    quayEdge.position.set(0, 0.35, -22.5);
    quayEdge.receiveShadow = true;
    quayEdge.castShadow = true;
    worldGroup.add(quayEdge);

    const stripeMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#a3905a',
        roughness: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      })
    );
    for (let x = -22; x <= 22; x += 4.5) {
      const dash = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(2.2, 0.22)), stripeMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.025, 4);
      worldGroup.add(dash);
    }

    // Safehouse Alley Building
    const safehouseGroup = new THREE.Group();
    safehouseGroup.position.set(-18, 0, 6);
    const shBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(8, 6.4, 8)), brickMat);
    shBack.position.set(0, 3.2, 0);
    shBack.castShadow = true;
    shBack.receiveShadow = true;
    const shRoof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(8.6, 0.4, 8.6)), concreteMat);
    shRoof.position.set(0, 6.5, 0);
    shRoof.castShadow = true;
    const shAwning = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4, 0.16, 4.5)), metalMat);
    shAwning.position.set(5.6, 3.1, 1.5);
    shAwning.rotation.z = -0.15;
    shAwning.castShadow = true;
    safehouseGroup.add(shBack, shRoof, shAwning);
    worldGroup.add(safehouseGroup);
    addBoxCollider(-18, 6, 8, 8);

    // Hangar 4
    const hangarGroup = new THREE.Group();
    hangarGroup.position.set(12, 0, -13);
    const hBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(15, 7.2, 1)), metalMat);
    hBack.position.set(0, 3.6, -5);
    hBack.castShadow = true;
    hBack.receiveShadow = true;
    hangarGroup.add(hBack);
    addBoxCollider(12, -18, 15, 1.2);

    const hLeft = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1, 7.2, 11)), metalMat);
    hLeft.position.set(-7, 3.6, 0);
    hLeft.castShadow = true;
    hangarGroup.add(hLeft);
    addBoxCollider(5, -13, 1.2, 11);

    const hRight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1, 7.2, 11)), metalMat);
    hRight.position.set(7, 3.6, 0);
    hRight.castShadow = true;
    hangarGroup.add(hRight);
    addBoxCollider(19, -13, 1.2, 11);

    const hFrontL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.5, 7.2, 1)), brickMat);
    hFrontL.position.set(-4.75, 3.6, 5);
    hFrontL.castShadow = true;
    hangarGroup.add(hFrontL);
    addBoxCollider(7.25, -8, 4.5, 1.2);

    const hFrontR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.5, 7.2, 1)), brickMat);
    hFrontR.position.set(4.75, 3.6, 5);
    hFrontR.castShadow = true;
    hangarGroup.add(hFrontR);
    addBoxCollider(16.75, -8, 4.5, 1.2);

    const hRoof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(15.6, 0.5, 11.6)), darkIronMat);
    hRoof.position.set(0, 7.45, 0);
    hRoof.castShadow = true;
    hangarGroup.add(hRoof);

    const hFloor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(14, 0.05, 10)), concreteMat);
    hFloor.position.set(0, 0.025, 0);
    hFloor.receiveShadow = true;
    hangarGroup.add(hFloor);
    worldGroup.add(hangarGroup);

    // 2 Blue Crates (Clue #3 = 2)
    const blueCrateMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#1d4d7a', roughness: 0.45, metalness: 0.25 })
    );
    [
      { x: 5.5, z: -5.4 },
      { x: 7.4, z: -5.1 },
    ].forEach((p, idx) => {
      const crate = new THREE.Group();
      crate.position.set(p.x, 0, p.z);
      crate.rotation.y = idx * 0.22;
      const body = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 1.25, 1.4)), blueCrateMat);
      body.position.y = 0.625;
      body.castShadow = true;
      const latch = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.14, 1.44)), darkIronMat);
      latch.position.y = 0.88;
      crate.add(body, latch);
      worldGroup.add(crate);
      addBoxCollider(p.x, p.z, 1.5, 1.5);
    });

    // Cover crates
    [
      { x: -6, z: 2, w: 1.6, d: 1.6, h: 1.4 },
      { x: -4.2, z: 2.3, w: 1.3, d: 1.3, h: 1.1 },
      { x: 2, z: -2, w: 1.8, d: 1.5, h: 1.45 },
      { x: -9, z: -8, w: 2.2, d: 1.4, h: 1.4 },
    ].forEach((c) => {
      const mesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(c.w, c.h, c.d)), woodMat);
      mesh.position.set(c.x, c.h / 2, c.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      worldGroup.add(mesh);
      addBoxCollider(c.x, c.z, c.w, c.d);
    });

    // Truck
    const truckGroup = new THREE.Group();
    truckGroup.position.set(-10, 0, -14);
    truckGroup.rotation.y = 0.18;
    const truckBodyMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#39424e', roughness: 0.4, metalness: 0.38 })
    );
    const truckCargo = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.4, 2.3, 2.2)), truckBodyMat);
    truckCargo.position.set(-0.6, 1.65, 0);
    truckCargo.castShadow = true;
    const truckCab = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.7, 1.85, 2.1)), truckBodyMat);
    truckCab.position.set(2.55, 1.4, 0);
    truckCab.castShadow = true;
    const windshield = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.1, 0.72, 1.85)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#1b2b3b', roughness: 0.1, metalness: 0.5 }))
    );
    windshield.position.set(3.41, 1.72, 0);
    truckGroup.add(truckCargo, truckCab, windshield);

    const tireMat = trackMat(new THREE.MeshStandardMaterial({ color: '#121316', roughness: 0.88 }));
    [
      [-1.9, 1.08],
      [-1.9, -1.08],
      [2.5, 1.08],
      [2.5, -1.08],
    ].forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.45, 0.45, 0.32, 14)), tireMat);
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(wx, 0.45, wz);
      wheel.castShadow = true;
      truckGroup.add(wheel);
    });
    worldGroup.add(truckGroup);
    addBoxCollider(-10, -14, 6.2, 2.6);

    // Guard Checkpoint & Searchlight
    const boothGroup = new THREE.Group();
    boothGroup.position.set(0, 0, -13);
    const boothBase = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.6, 2.7, 2.6)), concreteMat);
    boothBase.position.y = 1.35;
    boothBase.castShadow = true;
    const boothRoof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.0, 0.25, 3.0)), darkIronMat);
    boothRoof.position.y = 2.82;
    boothGroup.add(boothBase, boothRoof);

    spotlightMesh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.22, 0.28, 0.45, 10)),
      darkIronMat
    );
    spotlightMesh.position.set(0, 3.15, 1.1);
    spotlightMesh.rotation.x = Math.PI / 3;
    boothGroup.add(spotlightMesh);

    spotlightBeam = new THREE.Mesh(
      trackGeo(new THREE.ConeGeometry(3.4, 9.5, 16, 1, true)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: '#fde68a',
          transparent: true,
          opacity: 0.14,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      )
    );
    spotlightBeam.position.set(0, 1.35, 4.6);
    spotlightBeam.rotation.x = -Math.PI / 2.6;
    boothGroup.add(spotlightBeam);
    worldGroup.add(boothGroup);
    addBoxCollider(0, -13, 2.8, 2.8);

    // 3 Lit Streetlamps (Clue #2 = 3)
    [
      { x: 4, z: -2 },
      { x: 11.5, z: -2 },
      { x: 18.5, z: -2 },
    ].forEach((lp) => {
      const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.08, 0.11, 5.2, 8)), darkIronMat);
      pole.position.set(lp.x, 2.6, lp.z);
      pole.castShadow = true;
      const arm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.12, 1.1)), darkIronMat);
      arm.position.set(lp.x, 5.15, lp.z - 0.45);
      const bulbMat = trackMat(
        new THREE.MeshStandardMaterial({ color: '#ffdf9a', emissive: '#f59e0b', emissiveIntensity: 2.0 })
      );
      lampBulbs.push(bulbMat);
      const bulb = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.1, 0.2)), bulbMat);
      bulb.position.set(lp.x, 5.08, lp.z - 0.9);
      const pLight = new THREE.PointLight(0xffb85c, 6.5, 16, 1.6);
      pLight.position.set(lp.x, 4.8, lp.z - 0.9);
      worldGroup.add(pole, arm, bulb, pLight);
      lampLights.push(pLight);
    });

    // Outer silhouettes + Instanced Pines
    const wallMat = trackMat(new THREE.MeshStandardMaterial({ color: '#22262e', roughness: 0.9 }));
    [
      { x: 34, z: 0, w: 8, h: 12, d: 52 },
      { x: -34, z: 0, w: 8, h: 10, d: 52 },
      { x: 0, z: 30, w: 68, h: 8, d: 8 },
      { x: 24, z: 18, w: 10, h: 7, d: 10 },
    ].forEach((b) => {
      const m = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(b.w, b.h, b.d)), wallMat);
      m.position.set(b.x, b.h / 2, b.z);
      worldGroup.add(m);
    });

    const treeCount = 26;
    const trunks = new THREE.InstancedMesh(
      trackGeo(new THREE.CylinderGeometry(0.2, 0.28, 2.4, 7)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#3b2c20', roughness: 0.92 })),
      treeCount
    );
    const crowns = new THREE.InstancedMesh(
      trackGeo(new THREE.ConeGeometry(1.4, 4.2, 7)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#1f3628', roughness: 0.85 })),
      treeCount
    );
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    for (let i = 0; i < treeCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const tx = side * (25 + (i % 4) * 1.8);
      const tz = -18 + Math.floor(i / 2) * 3.4;
      const sc = 0.85 + ((i * 37) % 30) / 100;
      dummy.position.set(tx, 1.2 * sc, tz);
      dummy.scale.set(sc, sc, sc);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      dummy.position.set(tx, 3.6 * sc, tz);
      dummy.updateMatrix();
      crowns.setMatrixAt(i, dummy.matrix);
      tint.setHSL(0.36, 0.28, 0.14 + (i % 5) * 0.02);
      crowns.setColorAt(i, tint);
    }
    trunks.computeBoundingSphere();
    crowns.computeBoundingSphere();
    worldGroup.add(trunks, crowns);

    // Chapter 1 Interactables
    createInteractable('clue_bench', 'Établi du contremaître', 'Examiner le carnet et récupérer le couteau', -12.5, 8.2, 2.6, (g) => {
      const table = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.7, 0.9, 0.9)), woodMat);
      table.position.y = 0.45;
      table.castShadow = true;
      const paper = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.38, 0.02, 0.48)),
        trackMat(new THREE.MeshStandardMaterial({ color: '#e4decb', roughness: 0.9 }))
      );
      paper.position.set(-0.25, 0.92, 0.1);
      const knife = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.06, 0.03, 0.34)),
        trackMat(new THREE.MeshStandardMaterial({ color: '#aeb8c4', metalness: 0.85, roughness: 0.25 }))
      );
      knife.position.set(0.32, 0.92, -0.05);
      g.add(table, paper, knife);
    });
    addBoxCollider(-12.5, 8.2, 1.7, 0.9);

    createInteractable('terminal_power', 'Boîtier électrique du Quai', 'Couper le projecteur de la Garde', -4.5, -10.5, 2.5, (g) => {
      const box = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.75, 1.55, 0.45)), darkIronMat);
      box.position.y = 0.775;
      box.castShadow = true;
      const indicator = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.14, 0.14, 0.04)),
        trackMat(new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 1.8 }))
      );
      indicator.position.set(0, 1.2, 0.24);
      g.add(box, indicator);
    });
    addBoxCollider(-4.5, -10.5, 0.8, 0.5);

    createInteractable('clue_locker', 'Casier technique du Hangar', 'Fouiller les archives et l’équipement', 8.2, -15.6, 2.6, (g) => {
      const locker = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.1, 1.9, 0.7)), metalMat);
      locker.position.y = 0.95;
      locker.castShadow = true;
      const doc = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.3, 0.03, 0.36)),
        trackMat(new THREE.MeshStandardMaterial({ color: '#d6e2ed', roughness: 0.85 }))
      );
      doc.position.set(0, 1.0, 0.37);
      g.add(locker, doc);
    });
    addBoxCollider(8.2, -15.6, 1.1, 0.7);

    createInteractable('hangar_safe', 'Coffre blindé Secteur 4', 'Déchiffrer la combinaison à 4 chiffres', 16.2, -15.6, 2.8, (g) => {
      const safe = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.3, 1.45, 1.1)), darkIronMat);
      safe.position.y = 0.725;
      safe.castShadow = true;
      const dial = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 16)),
        trackMat(new THREE.MeshStandardMaterial({ color: '#cbd5e1', metalness: 0.9, roughness: 0.2 }))
      );
      dial.rotation.x = Math.PI / 2;
      dial.position.set(0, 0.82, 0.57);
      const keypad = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.24, 0.32, 0.05)),
        trackMat(new THREE.MeshStandardMaterial({ color: '#06b6d4', emissive: '#06b6d4', emissiveIntensity: 0.9 }))
      );
      keypad.position.set(0.32, 0.82, 0.56);
      g.add(safe, dial, keypad);
    });
    addBoxCollider(16.2, -15.6, 1.3, 1.1);

    createInteractable('exit_hatch', 'Trappe du Passage Souterrain', 'Évacuer le Quai 4 vers les Galeries', 21.5, -19.5, 2.8, (g) => {
      const frame = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.2, 0.25, 2.2)), concreteMat);
      frame.position.y = 0.125;
      const door = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.8, 0.12, 1.8)), darkIronMat);
      door.position.y = 0.27;
      const beacon = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.22, 0.22, 0.22)),
        trackMat(new THREE.MeshStandardMaterial({ color: '#10b981', emissive: '#10b981', emissiveIntensity: 1.4 }))
      );
      beacon.position.set(1.15, 0.45, 0);
      g.add(frame, door, beacon);
    });

    // NPC Nadia
    npcRig = buildCharacterRig(
      {
        ...DEFAULT_CHARACTER,
        name: 'Nadia Vance',
        gender: 'female',
        skinTone: '#d4a183',
        eyeColor: '#4c7a5b',
        hairStyle: 'bun',
        hairColor: '#3a2218',
        beardStyle: 'none',
        outfitStyle: 'coat',
        outfitColor: '#4a2124',
        accessory: 'scarf',
        scar: 'none',
        tattoo: 'none',
        heightScale: 0.96,
        buildType: 'lean',
      },
      textures.contactShadowMap
    );
    npcPos = new THREE.Vector3(-11.5, 0, 12.2);
    npcRig.root.position.copy(npcPos);
    npcRig.root.rotation.y = Math.PI * 0.65;
    worldGroup.add(npcRig.root);
    createInteractable('npc_nadia', 'Nadia Vance', 'Parler à l’informatrice du Port', npcPos.x, npcPos.z, 2.8, () => {});

    // Guard
    const guardRig = buildCharacterRig(
      {
        ...DEFAULT_CHARACTER,
        name: 'Sentinelle Obsidienne',
        gender: 'male',
        skinTone: '#b07b5a',
        hairStyle: 'short',
        beardStyle: 'short',
        outfitStyle: 'tactical',
        outfitColor: '#1a2029',
        accessory: 'glasses',
        scar: 'cheek',
        tattoo: 'none',
        heightScale: 1.05,
        buildType: 'heavy',
      },
      textures.contactShadowMap
    );
    guardRig.setEquippedWeapon('item_pistol_k9');
    const guardStart = new THREE.Vector3(4, 0, -6);
    guardRig.root.position.copy(guardStart);
    worldGroup.add(guardRig.root);

    const visionCone = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(7.5, 24, -Math.PI / 4, Math.PI / 2)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: '#f59e0b',
          transparent: true,
          opacity: 0.16,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      )
    );
    visionCone.rotation.x = -Math.PI / 2;
    visionCone.rotation.z = -Math.PI / 2;
    visionCone.position.y = 0.04;
    guardRig.root.add(visionCone);

    guard = {
      rig: guardRig,
      position: guardStart.clone(),
      yaw: 0,
      waypoints: [
        new THREE.Vector3(3.5, 0, -6.5),
        new THREE.Vector3(14.5, 0, -6.5),
        new THREE.Vector3(14.5, 0, 1.5),
        new THREE.Vector3(3.5, 0, 1.5),
      ],
      waypointIndex: 1,
      waitTimer: 0,
      visionCone,
      status: 'patrol',
      suspicion: 0,
      health: 100,
      lastKnownPlayerPos: null,
      attackCooldown: 0,
    };
  } else {
    // =========================================================================
    // CHAPTER 2 — LES GALERIES DE LA COUPURE & APPARTEMENT SÛR
    // =========================================================================
    // 1. Accessible Safehouse Apartment (West-South, walk right inside!)
    const aptX = -15;
    const aptZ = 9;
    const aptBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(9, 4.8, 0.8)), brickMat);
    aptBack.position.set(aptX, 2.4, aptZ + 4.5);
    aptBack.castShadow = true;
    const aptLeft = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.8, 4.8, 9)), brickMat);
    aptLeft.position.set(aptX - 4.5, 2.4, aptZ);
    aptLeft.castShadow = true;
    const aptFrontL = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.2, 4.8, 0.8)), brickMat);
    aptFrontL.position.set(aptX - 2.9, 2.4, aptZ - 4.5);
    const aptFrontR = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(3.2, 4.8, 0.8)), brickMat);
    aptFrontR.position.set(aptX + 2.9, 2.4, aptZ - 4.5);
    const aptRoof = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(9.8, 0.4, 9.8)), concreteMat);
    aptRoof.position.set(aptX, 4.9, aptZ);
    const aptFloor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(8.6, 0.06, 8.6)), woodMat);
    aptFloor.position.set(aptX, 0.03, aptZ);
    aptFloor.receiveShadow = true;
    const aptLight = new THREE.PointLight(0xffb454, 5.5, 13, 1.5);
    aptLight.position.set(aptX, 3.6, aptZ);
    worldGroup.add(aptBack, aptLeft, aptFrontL, aptFrontR, aptRoof, aptFloor, aptLight);
    lampLights.push(aptLight);
    addBoxCollider(aptX, aptZ + 4.5, 9, 0.9);
    addBoxCollider(aptX - 4.5, aptZ, 0.9, 9);
    addBoxCollider(aptX - 2.9, aptZ - 4.5, 3.2, 0.9);
    addBoxCollider(aptX + 2.9, aptZ - 4.5, 3.2, 0.9);

    // 2. 4 Structural Concrete Pillars in Central Gallery (Clue #1 = 4)
    const pillarCoords = [
      [-4, -2],
      [4, -2],
      [-4, -10],
      [4, -10],
    ];
    pillarCoords.forEach(([px, pz]) => {
      const pil = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 6.2, 1.4)), concreteMat);
      pil.position.set(px, 3.1, pz);
      pil.castShadow = true;
      pil.receiveShadow = true;
      worldGroup.add(pil);
      addBoxCollider(px, pz, 1.4, 1.4);
    });

    // 3. 2 Amber Emergency Beacons (Clue #2 = 2)
    [
      [-7, -14],
      [7, -14],
    ].forEach(([bx, bz]) => {
      const post = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.12, 0.16, 3.8, 10)), darkIronMat);
      post.position.set(bx, 1.9, bz);
      const bulbMat = trackMat(
        new THREE.MeshStandardMaterial({ color: '#fbbf24', emissive: '#f59e0b', emissiveIntensity: 2.2 })
      );
      lampBulbs.push(bulbMat);
      const beacon = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.24, 12, 12)), bulbMat);
      beacon.position.set(bx, 3.9, bz);
      const bLight = new THREE.PointLight(0xf59e0b, 6.0, 14, 1.6);
      bLight.position.set(bx, 3.7, bz);
      worldGroup.add(post, beacon, bLight);
      lampLights.push(bLight);
    });

    // 4. 3 Red High-Pressure Conduit Pipes along North Wall (Clue #3 = 3)
    const redPipeMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#9e2a2b', roughness: 0.35, metalness: 0.55 })
    );
    [1.6, 2.5, 3.4].forEach((py) => {
      const pipe = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.22, 0.22, 22, 12)), redPipeMat);
      pipe.rotation.z = Math.PI / 2;
      pipe.position.set(0, py, -19.5);
      worldGroup.add(pipe);
    });

    // Vault / Archive Room & Laser Security Gate (with East Secret Bypass Passage!)
    const vaultBack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(16, 6, 1)), metalMat);
    vaultBack.position.set(8, 3, -20.5);
    const vaultLeft = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1, 6, 8)), metalMat);
    vaultLeft.position.set(0.5, 3, -17);
    const vaultRight = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1, 6, 5.5)), metalMat);
    vaultRight.position.set(15.5, 3, -18.2);
    // Secret east gap between z = -15.4 and -12.5!
    const vaultFront = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(6, 6, 1)), concreteMat);
    vaultFront.position.set(12.5, 3, -13);
    worldGroup.add(vaultBack, vaultLeft, vaultRight, vaultFront);
    addBoxCollider(8, -20.5, 16, 1);
    addBoxCollider(0.5, -17, 1, 8);
    addBoxCollider(15.5, -18.2, 1, 5.5);
    addBoxCollider(12.5, -13, 6, 1);

    // Laser Barrier across main Vault Entrance (x = 1..9.5, z = -13)
    laserBarrierGroup = new THREE.Group();
    const laserMat = trackMat(
      new THREE.MeshBasicMaterial({ color: '#ef4444', transparent: true, opacity: 0.72 })
    );
    for (let ly = 0.6; ly <= 2.4; ly += 0.6) {
      const beam = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.03, 0.03, 8.2, 8)), laserMat);
      beam.rotation.z = Math.PI / 2;
      beam.position.set(5.1, ly, -13);
      laserBarrierGroup.add(beam);
    }
    worldGroup.add(laserBarrierGroup);

    // Chapter 2 Interactables
    createInteractable('ch2_desk_note', 'Bureau de l’Appartement Sûr', 'Lire le schéma des vannes souterraines', aptX - 1.8, aptZ + 1.5, 2.5, (g) => {
      const desk = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.8, 0.85, 0.9)), woodMat);
      desk.position.y = 0.425;
      desk.castShadow = true;
      const plan = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.45, 0.02, 0.36)),
        trackMat(new THREE.MeshStandardMaterial({ color: '#dbeafe', roughness: 0.8 }))
      );
      plan.position.set(0, 0.87, 0);
      g.add(desk, plan);
    });
    addBoxCollider(aptX - 1.8, aptZ + 1.5, 1.8, 0.9);

    createInteractable('ch2_valve_panel', 'Tableau des Vannes & Sécurité', 'Résoudre l’énigme de pression pour couper les lasers', -7.2, -6.5, 2.6, (g) => {
      const panel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.2, 1.7, 0.5)), darkIronMat);
      panel.position.y = 0.85;
      panel.castShadow = true;
      const screen = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.6, 0.42, 0.04)),
        trackMat(new THREE.MeshStandardMaterial({ color: '#06b6d4', emissive: '#06b6d4', emissiveIntensity: 1.0 }))
      );
      screen.position.set(0, 1.2, 0.27);
      g.add(panel, screen);
    });
    addBoxCollider(-7.2, -6.5, 1.2, 0.5);

    createInteractable('ch2_archive_core', 'Serveur de la Coupure', 'Extraire le disque chiffré des commanditaires', 8, -17.8, 2.8, (g) => {
      const rack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.4, 2.2, 1.0)), darkIronMat);
      rack.position.y = 1.1;
      rack.castShadow = true;
      const core = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.4, 0.5, 0.08)),
        trackMat(new THREE.MeshStandardMaterial({ color: '#10b981', emissive: '#10b981', emissiveIntensity: 1.5 }))
      );
      core.position.set(0, 1.3, 0.52);
      g.add(rack, core);
    });
    addBoxCollider(8, -17.8, 1.4, 1.0);

    // Outer gallery enclosure
    const galWallMat = trackMat(new THREE.MeshStandardMaterial({ color: '#1b1f27', roughness: 0.9 }));
    [
      { x: 28, z: 0, w: 6, h: 9, d: 52 },
      { x: -28, z: 0, w: 6, h: 9, d: 52 },
      { x: 0, z: 26, w: 60, h: 9, d: 6 },
      { x: 0, z: -26, w: 60, h: 9, d: 6 },
    ].forEach((b) => {
      const m = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(b.w, b.h, b.d)), galWallMat);
      m.position.set(b.x, b.h / 2, b.z);
      worldGroup.add(m);
    });

    // NPC Joris (underground broker)
    npcRig = buildCharacterRig(
      {
        ...DEFAULT_CHARACTER,
        name: 'Joris',
        gender: 'male',
        skinTone: '#9b6447',
        eyeColor: '#7d6c3e',
        hairStyle: 'bald',
        beardStyle: 'full',
        hairColor: '#2c2927',
        outfitStyle: 'civilian',
        outfitColor: '#2b2220',
        accessory: 'glasses',
        scar: 'brow',
        tattoo: 'neck_mark',
        heightScale: 0.98,
        buildType: 'athletic',
      },
      textures.contactShadowMap
    );
    npcPos = new THREE.Vector3(10.5, 0, 8.5);
    npcRig.root.position.copy(npcPos);
    npcRig.root.rotation.y = -Math.PI * 0.6;
    worldGroup.add(npcRig.root);
    createInteractable('npc_joris', 'Joris le Passeur', 'Négocier l’accès au serveur de la Coupure', npcPos.x, npcPos.z, 2.8, () => {});

    // Elite Guard
    const guardRig = buildCharacterRig(
      {
        ...DEFAULT_CHARACTER,
        name: 'Opérateur Élite',
        gender: 'female',
        skinTone: '#dca684',
        hairStyle: 'short',
        beardStyle: 'none',
        outfitStyle: 'shadow_coat',
        outfitColor: '#12161e',
        accessory: 'echo_visor',
        scar: 'none',
        tattoo: 'none',
        heightScale: 1.02,
        buildType: 'athletic',
      },
      textures.contactShadowMap
    );
    guardRig.setEquippedWeapon('item_pistol_k9');
    const guardStart = new THREE.Vector3(-1, 0, -6);
    guardRig.root.position.copy(guardStart);
    worldGroup.add(guardRig.root);

    const visionCone = new THREE.Mesh(
      trackGeo(new THREE.CircleGeometry(8.2, 24, -Math.PI / 4, Math.PI / 2)),
      trackMat(
        new THREE.MeshBasicMaterial({
          color: '#f59e0b',
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide,
          depthWrite: false,
        })
      )
    );
    visionCone.rotation.x = -Math.PI / 2;
    visionCone.rotation.z = -Math.PI / 2;
    visionCone.position.y = 0.04;
    guardRig.root.add(visionCone);

    guard = {
      rig: guardRig,
      position: guardStart.clone(),
      yaw: 0,
      waypoints: [
        new THREE.Vector3(-8, 0, -4),
        new THREE.Vector3(8, 0, -4),
        new THREE.Vector3(8, 0, -10.5),
        new THREE.Vector3(-8, 0, -10.5),
      ],
      waypointIndex: 1,
      waitTimer: 0,
      visionCone,
      status: 'patrol',
      suspicion: 0,
      health: 120,
      lastKnownPlayerPos: null,
      attackCooldown: 0,
    };
  }

  // --- WEATHER / ATMOSPHERIC PARTICLES ---
  const rainCount = 900;
  const rainPositions = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3] = (Math.random() - 0.5) * 60;
    rainPositions[i * 3 + 1] = Math.random() * 18;
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  const rainGeo = trackGeo(new THREE.BufferGeometry());
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = trackMat(
    new THREE.PointsMaterial({
      color: chapter === 1 ? '#a8c2da' : '#d6b48a',
      size: chapter === 1 ? 0.12 : 0.08,
      transparent: true,
      opacity: chapter === 1 ? 0.55 : 0.35,
    })
  );
  const rainPoints = new THREE.Points(rainGeo, rainMat);
  worldGroup.add(rainPoints);

  const skyNight = new THREE.Color(chapter === 1 ? '#090d16' : '#0b0c10');
  const skyDawn = new THREE.Color('#3b3342');
  const skyDay = new THREE.Color(chapter === 1 ? '#5a758f' : '#252c36');
  const tempSky = new THREE.Color();

  const updateEnvironment = (
    timeOfDay: number,
    weather: WeatherType,
    dt: number,
    elapsed: number,
    echoActive: boolean
  ) => {
    const norm = ((timeOfDay % 24) / 24) * Math.PI * 2;
    const sunElev = Math.sin(norm - Math.PI / 2);
    const daylight = chapter === 2 ? 0.15 : THREE.MathUtils.clamp((sunElev + 0.25) / 1.25, 0, 1);

    sunLight.position.set(Math.cos(norm) * 28, Math.max(8, 22 + sunElev * 16), 18);
    sunLight.intensity = THREE.MathUtils.lerp(0.65, 1.85, daylight);
    sunLight.color.setHex(daylight > 0.45 ? 0xfff1d6 : 0x8bb4e8);
    hemiLight.intensity = THREE.MathUtils.lerp(0.45, 0.9, daylight);

    if (daylight < 0.25) {
      tempSky.copy(skyNight).lerp(skyDawn, daylight / 0.25);
    } else {
      tempSky.copy(skyDawn).lerp(skyDay, (daylight - 0.25) / 0.75);
    }
    if (echoActive) {
      tempSky.lerp(new THREE.Color('#0c1b28'), 0.45);
    }

    scene.background = tempSky.clone();
    const fogDensity = weather === 'fog' ? 0.042 : weather === 'rain' ? 0.024 : 0.016;
    if (!scene.fog || !(scene.fog instanceof THREE.FogExp2)) {
      scene.fog = new THREE.FogExp2(tempSky.getHex(), fogDensity);
    } else {
      scene.fog.color.copy(tempSky);
      scene.fog.density = fogDensity;
    }

    const lampStrength = daylight < 0.65 || weather !== 'clear' ? 7.0 : 2.5;
    for (let i = 0; i < lampLights.length; i++) {
      lampLights[i].intensity = lampStrength;
    }
    for (let i = 0; i < lampBulbs.length; i++) {
      lampBulbs[i].emissiveIntensity = daylight < 0.65 ? 2.2 : 0.9;
    }

    rainPoints.visible = chapter === 1 ? weather === 'rain' : true;
    if (rainPoints.visible) {
      const posAttr = rainGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const fallSpeed = chapter === 1 ? 19 : 1.4;
      for (let i = 0; i < rainCount; i++) {
        arr[i * 3 + 1] -= dt * fallSpeed;
        if (arr[i * 3 + 1] < 0) arr[i * 3 + 1] = 18;
      }
      posAttr.needsUpdate = true;
    }

    for (let i = 0; i < interactables.length; i++) {
      const item = interactables[i];
      const mat = item.echoHighlight.material as THREE.MeshBasicMaterial;
      if (item.completed) mat.opacity = 0;
      else if (echoActive) mat.opacity = 0.55 + Math.sin(elapsed * 5) * 0.25;
      else mat.opacity = 0.14;
    }
  };

  return {
    chapter,
    worldGroup,
    colliders,
    interactables,
    npcRig,
    npcPos,
    guard,
    spotlightMesh,
    spotlightBeam,
    laserBarrierGroup,
    rainPoints,
    sunLight,
    hemiLight,
    lampLights,
    lampBulbs,
    updateEnvironment,
    setSpotlightActive: (active: boolean) => {
      spotlightBeam.visible = active;
    },
    setLasersActive: (active: boolean) => {
      if (laserBarrierGroup) laserBarrierGroup.visible = active;
    },
    dispose: () => {
      npcRig.dispose();
      guard.rig.dispose();
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      scene.remove(worldGroup, hemiLight, sunLight);
    },
  };
}
