import * as THREE from 'three';
import { CharacterProfile } from '../types/game';

export interface CharacterRig {
  root: THREE.Group;
  hips: THREE.Group;
  torso: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  weaponSlot: THREE.Group;
  updateAnimation: (
    dt: number,
    speed: number,
    crouching: boolean,
    strikeTimer: number,
    elapsed: number
  ) => void;
  setEquippedWeapon: (weaponId: string | null) => void;
  dispose: () => void;
}

export function buildCharacterRig(
  profile: CharacterProfile,
  contactShadowMap?: THREE.Texture
): CharacterRig {
  const root = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const buildMul =
    profile.buildType === 'lean' ? 0.88 : profile.buildType === 'heavy' ? 1.16 : 1.0;
  const shoulderMul = profile.gender === 'female' ? 0.88 * buildMul : 1.04 * buildMul;
  const hipMul = profile.gender === 'female' ? 1.02 * buildMul : 0.94 * buildMul;
  const heightScale = profile.heightScale;

  const skinMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: profile.skinTone,
      roughness: 0.6,
      metalness: 0.03,
    })
  );
  const outfitMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: profile.outfitStyle === 'shadow_coat' ? '#12161e' : profile.outfitColor,
      roughness: profile.outfitStyle === 'tactical' || profile.outfitStyle === 'shadow_coat' ? 0.65 : 0.82,
      metalness: profile.outfitStyle === 'shadow_coat' ? 0.25 : profile.outfitStyle === 'tactical' ? 0.14 : 0.05,
    })
  );
  const pantsMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#191d24',
      roughness: 0.85,
      metalness: 0.04,
    })
  );
  const shoeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: profile.shoeColor,
      roughness: profile.shoeStyle === 'boots' ? 0.48 : 0.75,
      metalness: 0.15,
    })
  );
  const hairMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: profile.hairColor,
      roughness: 0.86,
      metalness: 0.02,
    })
  );
  const eyeWhiteMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#e9ecf0', roughness: 0.22 })
  );
  const irisMat = trackMat(
    new THREE.MeshStandardMaterial({ color: profile.eyeColor, roughness: 0.18 })
  );
  const pupilMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#0b0c10', roughness: 0.1 })
  );
  const accentMetalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: '#9aa4b2',
      roughness: 0.25,
      metalness: 0.85,
    })
  );

  if (contactShadowMap) {
    const shadowGeo = trackGeo(new THREE.PlaneGeometry(1.15, 1.15));
    const shadowMat = trackMat(
      new THREE.MeshBasicMaterial({
        map: contactShadowMap,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      })
    );
    const shadowPlane = new THREE.Mesh(shadowGeo, shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = 0.015;
    root.add(shadowPlane);
  }

  const bodyRoot = new THREE.Group();
  bodyRoot.scale.set(1, heightScale, 1);
  root.add(bodyRoot);

  const hips = new THREE.Group();
  hips.position.y = 0.86;
  bodyRoot.add(hips);

  const pelvisMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.34 * hipMul, 0.16, 0.22 * hipMul)),
    pantsMat
  );
  pelvisMesh.castShadow = true;
  hips.add(pelvisMesh);

  const beltMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.35 * hipMul, 0.045, 0.23 * hipMul)),
    trackMat(new THREE.MeshStandardMaterial({ color: '#111317', roughness: 0.4, metalness: 0.3 }))
  );
  beltMesh.position.y = 0.07;
  hips.add(beltMesh);

  const makeLeg = (side: -1 | 1): THREE.Group => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.1 * hipMul, -0.04, 0);

    const thigh = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.082 * buildMul, 0.068 * buildMul, 0.42, 10)),
      pantsMat
    );
    thigh.position.y = -0.21;
    thigh.castShadow = true;
    legGroup.add(thigh);

    // Knee pad detail for tactical/shadow outfits
    if (profile.outfitStyle === 'tactical' || profile.outfitStyle === 'shadow_coat') {
      const knee = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.1, 0.09, 0.05)),
        accentMetalMat
      );
      knee.position.set(0, -0.41, 0.06);
      legGroup.add(knee);
    }

    const shin = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.066 * buildMul, 0.055 * buildMul, 0.36, 10)),
      pantsMat
    );
    shin.position.y = -0.58;
    shin.castShadow = true;
    legGroup.add(shin);

    const shoeHeight = profile.shoeStyle === 'boots' ? 0.13 : 0.08;
    const shoeBase = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.11, shoeHeight, 0.24)),
      shoeMat
    );
    shoeBase.position.set(0, -0.82 + shoeHeight / 2, 0.04);
    shoeBase.castShadow = true;
    legGroup.add(shoeBase);

    if (profile.shoeStyle === 'sneakers') {
      const sole = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(0.115, 0.025, 0.248)),
        trackMat(new THREE.MeshStandardMaterial({ color: '#d8dde6', roughness: 0.7 }))
      );
      sole.position.set(0, -0.805, 0.04);
      legGroup.add(sole);
    }

    return legGroup;
  };

  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  hips.add(leftLeg, rightLeg);

  const torso = new THREE.Group();
  torso.position.y = 0.08;
  hips.add(torso);

  const chestWidth = 0.38 * shoulderMul;
  const chestDepth = 0.23 * buildMul;
  const chestMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(chestWidth, 0.52, chestDepth)),
    outfitMat
  );
  chestMesh.position.y = 0.26;
  chestMesh.castShadow = true;
  chestMesh.receiveShadow = true;
  torso.add(chestMesh);

  if (profile.outfitStyle === 'coat' || profile.outfitStyle === 'shadow_coat') {
    const coatSkirt = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(chestWidth * 1.04, 0.34, chestDepth * 1.08)),
      outfitMat
    );
    coatSkirt.position.y = -0.14;
    coatSkirt.castShadow = true;
    torso.add(coatSkirt);

    const collar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.24, 0.1, 0.21)),
      outfitMat
    );
    collar.position.set(0, 0.53, -0.02);
    torso.add(collar);

    if (profile.outfitStyle === 'shadow_coat') {
      const trim = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(chestWidth * 0.96, 0.03, chestDepth * 1.12)),
        trackMat(new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#f59e0b', emissiveIntensity: 0.45 }))
      );
      trim.position.y = 0.48;
      torso.add(trim);
    }
  } else if (profile.outfitStyle === 'tactical') {
    const vestMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#14171d', roughness: 0.55, metalness: 0.25 })
    );
    const chestPlate = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(chestWidth * 0.92, 0.34, chestDepth * 1.15)),
      vestMat
    );
    chestPlate.position.y = 0.3;
    chestPlate.castShadow = true;
    torso.add(chestPlate);

    const pouch = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.11, 0.09, 0.06)),
      accentMetalMat
    );
    pouch.position.set(-0.09, 0.19, chestDepth * 0.6);
    torso.add(pouch);
  } else {
    const innerShirt = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.14, 0.24, 0.04)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#cfd4dc', roughness: 0.85 }))
    );
    innerShirt.position.set(0, 0.38, chestDepth * 0.47);
    torso.add(innerShirt);
  }

  if (profile.accessory === 'scarf') {
    const scarf = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.13, 0.042, 8, 16)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#7b2424', roughness: 0.9 }))
    );
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 0.53;
    torso.add(scarf);
  }

  const makeArm = (side: -1 | 1): THREE.Group => {
    const armGroup = new THREE.Group();
    armGroup.position.set(side * (chestWidth / 2 + 0.065), 0.47, 0);

    const upperArm = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.056 * buildMul, 0.048 * buildMul, 0.27, 8)),
      outfitMat
    );
    upperArm.position.y = -0.13;
    upperArm.castShadow = true;
    armGroup.add(upperArm);

    const forearmMat = profile.outfitStyle === 'civilian' ? skinMat : outfitMat;
    const forearm = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.046 * buildMul, 0.038 * buildMul, 0.25, 8)),
      forearmMat
    );
    forearm.position.y = -0.37;
    forearm.castShadow = true;
    armGroup.add(forearm);

    const hand = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.068, 0.085, 0.068)),
      skinMat
    );
    hand.position.y = -0.52;
    armGroup.add(hand);

    if (side === -1 && profile.tattoo === 'arm_band') {
      const tatBand = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.049 * buildMul, 0.049 * buildMul, 0.055, 10)),
        trackMat(new THREE.MeshStandardMaterial({ color: '#10151c', roughness: 0.7 }))
      );
      tatBand.position.y = -0.33;
      armGroup.add(tatBand);
    }

    if (side === -1 && profile.accessory === 'watch') {
      const watch = new THREE.Mesh(
        trackGeo(new THREE.CylinderGeometry(0.045 * buildMul, 0.045 * buildMul, 0.03, 12)),
        accentMetalMat
      );
      watch.position.y = -0.46;
      armGroup.add(watch);
    }

    return armGroup;
  };

  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  torso.add(leftArm, rightArm);

  const weaponSlot = new THREE.Group();
  weaponSlot.position.set(0, -0.53, 0.05);
  rightArm.add(weaponSlot);

  const headGroup = new THREE.Group();
  headGroup.position.y = 0.56;
  torso.add(headGroup);

  const neck = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.058, 0.068, 0.1, 10)),
    skinMat
  );
  neck.position.y = 0.03;
  headGroup.add(neck);

  if (profile.tattoo === 'neck_mark') {
    const neckTat = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.035, 0.05, 0.02)),
      trackMat(new THREE.MeshStandardMaterial({ color: '#121820', roughness: 0.7 }))
    );
    neckTat.position.set(0.055, 0.03, 0.02);
    headGroup.add(neckTat);
  }

  const headWidth =
    profile.faceShape === 'broad' ? 1.12 : profile.faceShape === 'angular' ? 0.94 : 1.0;
  const headMesh = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.2 * headWidth, 0.24, 0.22)),
    skinMat
  );
  headMesh.position.y = 0.18;
  headMesh.castShadow = true;
  headGroup.add(headMesh);

  // Expressive Eyes with Sclera + Iris + Pupil + Brows
  [-1, 1].forEach((side) => {
    const sclera = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.044, 0.022, 0.015)),
      eyeWhiteMat
    );
    sclera.position.set(side * 0.044 * headWidth, 0.2, 0.106);
    headGroup.add(sclera);

    const iris = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.022, 0.02, 0.018)),
      irisMat
    );
    iris.position.set(side * 0.044 * headWidth, 0.2, 0.108);
    headGroup.add(iris);

    const pupil = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.01, 0.011, 0.02)),
      pupilMat
    );
    pupil.position.set(side * 0.044 * headWidth, 0.2, 0.109);
    headGroup.add(pupil);

    const brow = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.048, 0.012, 0.018)),
      hairMat
    );
    brow.position.set(side * 0.045 * headWidth, 0.228, 0.11);
    brow.rotation.z = side * -0.09;
    headGroup.add(brow);
  });

  const noseW = profile.noseType === 'broad' ? 0.036 : 0.024;
  const noseLen = profile.noseType === 'aquiline' ? 0.052 : 0.042;
  const nose = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(noseW, noseLen, 0.035)),
    skinMat
  );
  nose.position.set(0, 0.165, 0.118);
  headGroup.add(nose);

  const mouthW = profile.mouthType === 'firm' ? 0.068 : 0.056;
  const mouthMat = trackMat(
    new THREE.MeshStandardMaterial({ color: '#7a4543', roughness: 0.65 })
  );
  const mouth = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(mouthW, 0.014, 0.014)),
    mouthMat
  );
  mouth.position.set(0, 0.112, 0.112);
  headGroup.add(mouth);

  if (profile.scar !== 'none') {
    const scarMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#8f4747', roughness: 0.7 })
    );
    const scar = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.008, 0.052, 0.012)),
      scarMat
    );
    if (profile.scar === 'cheek') {
      scar.position.set(-0.048, 0.155, 0.112);
      scar.rotation.z = 0.28;
    } else {
      scar.position.set(0.044, 0.222, 0.113);
      scar.rotation.z = -0.22;
    }
    headGroup.add(scar);
  }

  if (profile.beardStyle !== 'none') {
    const beardH =
      profile.beardStyle === 'full' ? 0.09 : profile.beardStyle === 'short' ? 0.055 : 0.032;
    const beard = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.205 * headWidth, beardH, 0.12)),
      hairMat
    );
    beard.position.set(0, 0.09 - beardH * 0.22, 0.062);
    headGroup.add(beard);
  }

  if (profile.hairStyle !== 'bald') {
    const hairTop = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.215 * headWidth, 0.075, 0.235)),
      hairMat
    );
    hairTop.position.set(0, 0.3, -0.005);
    hairTop.castShadow = true;
    headGroup.add(hairTop);

    if (profile.hairStyle === 'short' || profile.hairStyle === 'long') {
      const hairBack = new THREE.Mesh(
        trackGeo(
          new THREE.BoxGeometry(
            0.21 * headWidth,
            profile.hairStyle === 'long' ? 0.28 : 0.14,
            0.09
          )
        ),
        hairMat
      );
      hairBack.position.set(0, profile.hairStyle === 'long' ? 0.16 : 0.22, -0.09);
      hairBack.castShadow = true;
      headGroup.add(hairBack);
    } else if (profile.hairStyle === 'bun') {
      const bun = new THREE.Mesh(
        trackGeo(new THREE.SphereGeometry(0.062, 10, 10)),
        hairMat
      );
      bun.position.set(0, 0.31, -0.13);
      headGroup.add(bun);
    }
  }

  if (profile.accessory === 'glasses') {
    const frameMat = trackMat(
      new THREE.MeshStandardMaterial({ color: '#14171c', roughness: 0.2, metalness: 0.7 })
    );
    const lensMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#8db4cf',
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 0.45,
      })
    );
    [-1, 1].forEach((side) => {
      const lens = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.036, 0.01)), lensMat);
      lens.position.set(side * 0.045, 0.2, 0.125);
      headGroup.add(lens);
    });
    const bridge = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.01, 0.012)), frameMat);
    bridge.position.set(0, 0.208, 0.125);
    headGroup.add(bridge);
  } else if (profile.accessory === 'echo_visor') {
    const visorMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: '#06b6d4',
        emissive: '#06b6d4',
        emissiveIntensity: 0.9,
        transparent: true,
        opacity: 0.6,
        roughness: 0.1,
      })
    );
    const visor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.21 * headWidth, 0.045, 0.06)), visorMat);
    visor.position.set(0, 0.2, 0.11);
    headGroup.add(visor);
  } else if (profile.accessory === 'earpiece') {
    const ear = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.018, 0.038, 0.03)),
      accentMetalMat
    );
    ear.position.set(0.105 * headWidth, 0.18, 0.01);
    headGroup.add(ear);
    const led = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.01, 0.01, 0.01)),
      trackMat(
        new THREE.MeshStandardMaterial({
          color: '#f59e0b',
          emissive: '#f59e0b',
          emissiveIntensity: 1.5,
        })
      )
    );
    led.position.set(0.114 * headWidth, 0.185, 0.015);
    headGroup.add(led);
  }

  let weaponMesh: THREE.Group | null = null;
  const setEquippedWeapon = (weaponId: string | null) => {
    if (weaponMesh) {
      weaponSlot.remove(weaponMesh);
      weaponMesh.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          (c as THREE.Mesh).geometry.dispose();
          const m = (c as THREE.Mesh).material;
          if (Array.isArray(m)) m.forEach((x) => x.dispose());
          else m.dispose();
        }
      });
      weaponMesh = null;
    }
    if (!weaponId) return;
    const wg = new THREE.Group();
    const darkMetal = new THREE.MeshStandardMaterial({
      color: '#20242c',
      roughness: 0.3,
      metalness: 0.85,
    });
    const gripMat = new THREE.MeshStandardMaterial({
      color: '#111216',
      roughness: 0.8,
    });
    if (weaponId === 'item_baton') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8), gripMat);
      handle.rotation.x = Math.PI / 2;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.01, 0.38, 8), darkMetal);
      rod.rotation.x = Math.PI / 2;
      rod.position.z = 0.24;
      wg.add(handle, rod);
    } else if (weaponId === 'item_knife') {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.03, 0.11), gripMat);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.028, 0.19), accentMetalMat);
      blade.position.z = 0.15;
      wg.add(handle, blade);
    } else if (weaponId === 'item_pistol_k9') {
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.1, 0.042), gripMat);
      grip.position.set(0, -0.02, 0);
      grip.rotation.x = 0.22;
      const slide = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.04, 0.19), darkMetal);
      slide.position.set(0, 0.03, 0.06);
      const emitter = new THREE.Mesh(
        new THREE.BoxGeometry(0.014, 0.012, 0.04),
        new THREE.MeshStandardMaterial({ color: '#06b6d4', emissive: '#06b6d4', emissiveIntensity: 1.4 })
      );
      emitter.position.set(0, 0.03, 0.155);
      wg.add(grip, slide, emitter);
    }
    weaponSlot.add(wg);
    weaponMesh = wg;
  };

  let walkPhase = 0;

  const updateAnimation = (
    dt: number,
    speed: number,
    crouching: boolean,
    strikeTimer: number,
    elapsed: number
  ) => {
    const isMoving = speed > 0.15;
    if (isMoving) {
      walkPhase += dt * (4.5 + speed * 1.4);
    } else {
      walkPhase = THREE.MathUtils.damp(walkPhase, Math.round(walkPhase / Math.PI) * Math.PI, 8, dt);
    }

    const strideAmp = isMoving ? Math.min(0.65, speed * 0.14) : 0;
    const targetHipY = crouching ? 0.64 : 0.86 + (isMoving ? Math.abs(Math.sin(walkPhase)) * 0.03 : Math.sin(elapsed * 2) * 0.008);
    hips.position.y = THREE.MathUtils.damp(hips.position.y, targetHipY, 12, dt);

    const targetTorsoPitch = crouching ? 0.28 : isMoving ? 0.08 : 0;
    torso.rotation.x = THREE.MathUtils.damp(torso.rotation.x, targetTorsoPitch, 10, dt);

    const legSwing = Math.sin(walkPhase) * strideAmp;
    leftLeg.rotation.x = THREE.MathUtils.damp(leftLeg.rotation.x, legSwing, 14, dt);
    rightLeg.rotation.x = THREE.MathUtils.damp(rightLeg.rotation.x, -legSwing, 14, dt);

    leftArm.rotation.x = THREE.MathUtils.damp(leftArm.rotation.x, -legSwing * 0.8, 14, dt);
    if (strikeTimer > 0) {
      rightArm.rotation.x = -1.6 + Math.sin(strikeTimer * 18) * 0.8;
    } else {
      rightArm.rotation.x = THREE.MathUtils.damp(rightArm.rotation.x, legSwing * 0.8, 14, dt);
    }
  };

  return {
    root,
    hips,
    torso,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    weaponSlot,
    updateAnimation,
    setEquippedWeapon,
    dispose: () => {
      setEquippedWeapon(null);
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
