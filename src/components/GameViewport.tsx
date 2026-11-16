import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildCharacterRig, CharacterRig } from '../engine/characterBuilder';
import { createProceduralTextures, ProceduralTextureSet } from '../engine/proceduralTextures';
import { buildGameWorld, ColliderBox, WorldContext } from '../engine/worldBuilder';
import { soundEngine } from '../audio/soundEngine';
import {
  CharacterProfile,
  GameSettings,
  MissionProgress,
  PlayerRuntimeState,
} from '../types/game';

const _moveDir = new THREE.Vector3();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();
const _guardFwd = new THREE.Vector3();

export interface NearbyInteraction {
  id: string;
  label: string;
  sublabel: string;
}

interface GameViewportProps {
  mode: 'menu' | 'creator' | 'playing';
  character: CharacterProfile;
  settings: GameSettings;
  mission: MissionProgress;
  playerState: PlayerRuntimeState;
  joystickVector: { x: number; y: number };
  strikeNonce: number;
  onNearbyChange: (nearby: NearbyInteraction | null) => void;
  onPlayerTick: (patch: Partial<PlayerRuntimeState>) => void;
  onGuardStatusChange: (status: MissionProgress['guardStatus']) => void;
  onInteractRequest: (id: string) => void;
  onToggleEcho: () => void;
  onToggleCrouch: () => void;
  onRendererInfo?: (info: { width: number; height: number; isSoftwareGl: boolean }) => void;
}

function clampToColliders(
  pos: THREE.Vector3,
  radius: number,
  colliders: ColliderBox[],
  laserActive: boolean
) {
  pos.x = THREE.MathUtils.clamp(pos.x, -26, 26);
  pos.z = THREE.MathUtils.clamp(pos.z, -21.2, 23);

  const checkBox = (c: ColliderBox) => {
    const closestX = THREE.MathUtils.clamp(pos.x, c.minX, c.maxX);
    const closestZ = THREE.MathUtils.clamp(pos.z, c.minZ, c.maxZ);
    const dx = pos.x - closestX;
    const dz = pos.z - closestZ;
    const distSq = dx * dx + dz * dz;
    if (distSq < radius * radius) {
      const dist = Math.sqrt(distSq);
      if (dist > 0.0001) {
        const overlap = radius - dist;
        pos.x += (dx / dist) * overlap;
        pos.z += (dz / dist) * overlap;
      } else {
        pos.z = c.maxZ + radius;
      }
    }
  };

  for (let i = 0; i < colliders.length; i++) {
    checkBox(colliders[i]);
  }
  if (laserActive) {
    checkBox({ minX: 0.9, maxX: 9.4, minZ: -13.4, maxZ: -12.6 });
  }
}

export const GameViewport: React.FC<GameViewportProps> = ({
  mode,
  character,
  settings,
  mission,
  playerState,
  joystickVector,
  strikeNonce,
  onNearbyChange,
  onPlayerTick,
  onGuardStatusChange,
  onInteractRequest,
  onToggleEcho,
  onToggleCrouch,
  onRendererInfo,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [contextLost, setContextLost] = useState(false);

  const modeRef = useRef(mode);
  const characterRef = useRef(character);
  const settingsRef = useRef(settings);
  const missionRef = useRef(mission);
  const playerRef = useRef(playerState);
  const joystickRef = useRef(joystickVector);
  const callbacksRef = useRef({
    onNearbyChange,
    onPlayerTick,
    onGuardStatusChange,
    onInteractRequest,
    onToggleEcho,
    onToggleCrouch,
    onRendererInfo,
  });

  modeRef.current = mode;
  characterRef.current = character;
  settingsRef.current = settings;
  missionRef.current = mission;
  playerRef.current = playerState;
  joystickRef.current = joystickVector;
  callbacksRef.current = {
    onNearbyChange,
    onPlayerTick,
    onGuardStatusChange,
    onInteractRequest,
    onToggleEcho,
    onToggleCrouch,
    onRendererInfo,
  };

  const sceneRefs = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    world: WorldContext;
    textures: ProceduralTextureSet;
    playerRig: CharacterRig;
    creatorRig: CharacterRig;
    creatorPedestal: THREE.Group;
    isSoftwareGl: boolean;
    playerPos: THREE.Vector3;
    playerYaw: number;
    camYaw: number;
    camPitch: number;
    strikeTimer: number;
  } | null>(null);

  const lastStrikeRef = useRef(strikeNonce);
  useEffect(() => {
    if (strikeNonce !== lastStrikeRef.current) {
      lastStrikeRef.current = strikeNonce;
      if (sceneRefs.current && modeRef.current === 'playing') {
        sceneRefs.current.strikeTimer = 0.42;
        soundEngine.playStrike();
        const { world, playerPos } = sceneRefs.current;
        const dist = playerPos.distanceTo(world.guard.position);
        if (dist < 2.6 && world.guard.status !== 'stunned' && world.guard.status !== 'bribed') {
          const weaponDmg =
            playerRef.current.equippedWeaponId === 'item_pistol_k9'
              ? 60
              : playerRef.current.equippedWeaponId === 'item_knife'
              ? 45
              : 35;
          world.guard.health -= weaponDmg;
          if (world.guard.health <= 0 || playerRef.current.crouching) {
            world.guard.status = 'stunned';
            world.guard.visionCone.visible = false;
            callbacksRef.current.onGuardStatusChange('stunned');
          } else {
            world.guard.status = 'alert';
            world.guard.lastKnownPlayerPos = playerPos.clone();
            callbacksRef.current.onGuardStatusChange('alert');
          }
        } else if (playerRef.current.equippedWeaponId === 'item_pistol_k9') {
          const distRanged = playerPos.distanceTo(world.guard.position);
          if (distRanged < 14 && world.guard.status !== 'stunned') {
            _toPlayer.subVectors(world.guard.position, playerPos).normalize();
            _guardFwd.set(
              Math.sin(sceneRefs.current.playerYaw),
              0,
              Math.cos(sceneRefs.current.playerYaw)
            );
            if (_toPlayer.dot(_guardFwd) > 0.72) {
              world.guard.health -= 55;
              if (world.guard.health <= 0) {
                world.guard.status = 'stunned';
                world.guard.visionCone.visible = false;
                callbacksRef.current.onGuardStatusChange('stunned');
              } else {
                world.guard.status = 'alert';
                world.guard.lastKnownPlayerPos = playerPos.clone();
                callbacksRef.current.onGuardStatusChange('alert');
              }
            }
          }
        }
      }
    }
  }, [strikeNonce]);

  // Rebuild world if chapter changes
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    if (refs.world.chapter === mission.chapter) return;

    refs.world.dispose();
    refs.world = buildGameWorld(mission.chapter, refs.scene, refs.textures);
    refs.playerPos.set(
      playerRef.current.position.x,
      0,
      playerRef.current.position.z
    );
    refs.playerRig.root.position.copy(refs.playerPos);
  }, [mission.chapter]);

  // Rebuild character rigs when character profile changes
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;

    const oldPlayer = refs.playerRig;
    const oldCreator = refs.creatorRig;

    const newPlayer = buildCharacterRig(character, refs.textures.contactShadowMap);
    newPlayer.root.position.copy(refs.playerPos);
    newPlayer.root.rotation.y = refs.playerYaw;
    newPlayer.setEquippedWeapon(playerRef.current.equippedWeaponId);
    refs.scene.add(newPlayer.root);
    refs.playerRig = newPlayer;
    refs.scene.remove(oldPlayer.root);
    oldPlayer.dispose();

    const newCreator = buildCharacterRig(character, refs.textures.contactShadowMap);
    newCreator.root.position.set(0, 0.12, 0);
    refs.creatorPedestal.add(newCreator.root);
    refs.creatorRig = newCreator;
    refs.creatorPedestal.remove(oldCreator.root);
    oldCreator.dispose();
  }, [character]);

  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.playerRig.setEquippedWeapon(playerState.equippedWeaponId);
  }, [playerState.equippedWeaponId]);

  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    const { renderer, isSoftwareGl, world } = refs;
    const w = mountRef.current?.clientWidth || window.innerWidth;
    const h = mountRef.current?.clientHeight || window.innerHeight;

    let targetRatio = 1;
    if (!isSoftwareGl) {
      if (settings.quality === 'low') targetRatio = 0.75;
      else if (settings.quality === 'medium') targetRatio = 1.0;
      else if (settings.quality === 'high') targetRatio = Math.min(window.devicePixelRatio || 1, 1.75);
      else if (settings.quality === 'uhd4k') {
        const scaleFor4K = Math.min(3840 / Math.max(w, 1), 2160 / Math.max(h, 1));
        targetRatio = Math.min(Math.max(window.devicePixelRatio || 1, scaleFor4K), 3.0);
      }
    }
    renderer.setPixelRatio(targetRatio);
    renderer.setSize(w, h, false);
    renderer.shadowMap.enabled = !isSoftwareGl && settings.shadowsEnabled && settings.quality !== 'low';
    world.sunLight.castShadow = renderer.shadowMap.enabled;

    callbacksRef.current.onRendererInfo?.({
      width: Math.round(w * targetRatio),
      height: Math.round(h * targetRatio),
      isSoftwareGl,
    });
  }, [settings.quality, settings.shadowsEnabled]);

  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    refs.world.setSpotlightActive(!mission.spotlightDisabled);
    refs.world.setLasersActive(!mission.ch2LasersDisabled);
    if (mission.guardStatus === 'bribed' || mission.guardStatus === 'stunned') {
      refs.world.guard.status = mission.guardStatus;
      refs.world.guard.visionCone.visible = false;
    }
    refs.world.interactables.forEach((it) => {
      if (it.id === 'clue_bench' && mission.cluesFound.includes('clue_journal')) it.completed = true;
      if (it.id === 'clue_locker' && mission.cluesFound.includes('clue_manifest')) it.completed = true;
      if (it.id === 'terminal_power' && mission.spotlightDisabled) it.completed = true;
      if (it.id === 'hangar_safe' && mission.safeUnlocked) it.completed = true;
      if (it.id === 'ch2_desk_note' && mission.cluesFound.includes('clue_valve_note')) it.completed = true;
      if (it.id === 'ch2_valve_panel' && mission.ch2ValveSolved) it.completed = true;
      if (it.id === 'ch2_archive_core' && mission.ch2ArchiveFound) it.completed = true;
    });
  }, [mission]);

  // Reset player position when respawn or chapter change updates position explicitly
  useEffect(() => {
    const refs = sceneRefs.current;
    if (!refs) return;
    const dist = Math.hypot(
      refs.playerPos.x - playerState.position.x,
      refs.playerPos.z - playerState.position.z
    );
    if (dist > 3.5) {
      refs.playerPos.set(playerState.position.x, 0, playerState.position.z);
      refs.playerRig.root.position.copy(refs.playerPos);
    }
  }, [playerState.position.x, playerState.position.z]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleRestored = () => setContextLost(false);
    renderer.domElement.addEventListener('webglcontextlost', handleLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleRestored);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(56, width / height, 0.1, 140);
    const textures = createProceduralTextures(
      isSoftwareGl ? 1 : Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
    );
    const world = buildGameWorld(missionRef.current.chapter, scene, textures);

    const playerPos = new THREE.Vector3(
      playerRef.current.position.x,
      0,
      playerRef.current.position.z
    );
    const playerRig = buildCharacterRig(characterRef.current, textures.contactShadowMap);
    playerRig.root.position.copy(playerPos);
    playerRig.setEquippedWeapon(playerRef.current.equippedWeaponId);
    scene.add(playerRig.root);

    const creatorPedestal = new THREE.Group();
    creatorPedestal.position.set(0, 40, 0);
    const stageBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.28, 0.24, 32),
      new THREE.MeshStandardMaterial({ color: '#1b1f27', roughness: 0.3, metalness: 0.75 })
    );
    const stageRim = new THREE.Mesh(
      new THREE.TorusGeometry(1.16, 0.025, 10, 48),
      new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#f59e0b', emissiveIntensity: 0.9 })
    );
    stageRim.rotation.x = Math.PI / 2;
    stageRim.position.y = 0.12;
    creatorPedestal.add(stageBase, stageRim);

    const creatorRig = buildCharacterRig(characterRef.current, textures.contactShadowMap);
    creatorRig.root.position.set(0, 0.12, 0);
    creatorPedestal.add(creatorRig.root);
    scene.add(creatorPedestal);

    const state = {
      renderer,
      scene,
      camera,
      world,
      textures,
      playerRig,
      creatorRig,
      creatorPedestal,
      isSoftwareGl,
      playerPos,
      playerYaw: 0,
      camYaw: 0.4,
      camPitch: 0.34,
      strikeTimer: 0,
    };
    sceneRefs.current = state;

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    callbacksRef.current.onRendererInfo?.({
      width: Math.round(width * renderer.getPixelRatio()),
      height: Math.round(height * renderer.getPixelRatio()),
      isSoftwareGl,
    });

    const keys: Record<string, boolean> = {};
    let draggingLook = false;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let creatorSpinYaw = 0.35;
    let nearbyId: string | null = null;
    let footstepCooldown = 0;
    let hudSyncTimer = 0;
    let timeAcc = settingsRef.current.timeOfDay;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      keys[e.code] = true;
      if (modeRef.current === 'playing') {
        if (e.code === 'KeyE' && nearbyId) {
          callbacksRef.current.onInteractRequest(nearbyId);
        } else if (e.code === 'KeyC') {
          callbacksRef.current.onToggleCrouch();
        } else if (e.code === 'KeyQ') {
          callbacksRef.current.onToggleEcho();
        } else if (e.code === 'KeyF') {
          state.strikeTimer = 0.42;
          soundEngine.playStrike();
          const curWorld = state.world;
          const dist = state.playerPos.distanceTo(curWorld.guard.position);
          if (dist < 2.6 && curWorld.guard.status !== 'stunned' && curWorld.guard.status !== 'bribed') {
            curWorld.guard.health -= 45;
            if (curWorld.guard.health <= 0 || playerRef.current.crouching) {
              curWorld.guard.status = 'stunned';
              curWorld.guard.visionCone.visible = false;
              callbacksRef.current.onGuardStatusChange('stunned');
            } else {
              curWorld.guard.status = 'alert';
              curWorld.guard.lastKnownPlayerPos = state.playerPos.clone();
              callbacksRef.current.onGuardStatusChange('alert');
            }
          }
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.target !== renderer.domElement) return;
      draggingLook = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!draggingLook) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      const sens = 0.0055 * settingsRef.current.cameraSensitivity;
      if (modeRef.current === 'creator') {
        creatorSpinYaw += dx * 0.01;
      } else if (modeRef.current === 'playing') {
        state.camYaw -= dx * sens;
        state.camPitch = THREE.MathUtils.clamp(state.camPitch + dy * sens, 0.12, 0.85);
      }
    };
    const onPointerUp = () => {
      draggingLook = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || window.innerWidth;
      const h = mountRef.current.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const s = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (s === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.08);
      const elapsed = clock.elapsedTime;
      const curMode = modeRef.current;
      const curWorld = state.world;

      if (settingsRef.current.autoTimeCycle) {
        timeAcc = (timeAcc + dt * 0.18) % 24;
      } else {
        timeAcc = settingsRef.current.timeOfDay;
      }

      curWorld.updateEnvironment(
        timeAcc,
        settingsRef.current.weather,
        dt,
        elapsed,
        playerRef.current.echoActive && curMode === 'playing'
      );

      if (curMode === 'creator') {
        state.playerRig.root.visible = false;
        creatorPedestal.visible = true;
        if (!draggingLook) creatorSpinYaw += dt * 0.35;
        state.creatorRig.root.rotation.y = creatorSpinYaw;
        state.creatorRig.updateAnimation(dt, 0, false, 0, elapsed);

        _camTarget.set(0, 41.05, 0);
        _camDesired.set(0, 41.3, 3.15);
        camera.position.lerp(_camDesired, 1 - Math.exp(-8 * dt));
        camera.lookAt(_camTarget);
      } else if (curMode === 'menu') {
        state.playerRig.root.visible = true;
        creatorPedestal.visible = false;
        const orbit = elapsed * 0.12;
        _camDesired.set(Math.sin(orbit) * 16, 6.2, Math.cos(orbit) * 16 - 4);
        _camTarget.set(2, 1.5, -8);
        camera.position.lerp(_camDesired, 1 - Math.exp(-3 * dt));
        camera.lookAt(_camTarget);
      } else {
        state.playerRig.root.visible = true;
        creatorPedestal.visible = false;

        let inX = joystickRef.current.x;
        let inZ = joystickRef.current.y;
        if (keys['KeyW'] || keys['KeyZ'] || keys['ArrowUp']) inZ -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) inZ += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) inX -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) inX += 1;

        const isSprinting =
          (keys['ShiftLeft'] || keys['ShiftRight']) &&
          playerRef.current.stamina > 8 &&
          !playerRef.current.crouching;
        const baseSpeed = playerRef.current.crouching ? 2.5 : isSprinting ? 6.6 : 4.2;

        _camForward.set(-Math.sin(state.camYaw), 0, -Math.cos(state.camYaw)).normalize();
        _camRight.set(Math.cos(state.camYaw), 0, -Math.sin(state.camYaw)).normalize();

        _moveDir.set(0, 0, 0);
        _moveDir.addScaledVector(_camForward, -inZ);
        _moveDir.addScaledVector(_camRight, inX);

        let actualSpeed = 0;
        const laserActive = curWorld.chapter === 2 && !missionRef.current.ch2LasersDisabled;
        if (_moveDir.lengthSq() > 0.01) {
          _moveDir.normalize();
          actualSpeed = baseSpeed;
          state.playerPos.addScaledVector(_moveDir, baseSpeed * dt);
          clampToColliders(state.playerPos, 0.42, curWorld.colliders, laserActive);

          const targetYaw = Math.atan2(_moveDir.x, _moveDir.z);
          let diff = targetYaw - state.playerYaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          state.playerYaw += diff * Math.min(1, dt * 12);

          footstepCooldown -= dt;
          if (footstepCooldown <= 0) {
            soundEngine.playFootstep(playerRef.current.crouching);
            footstepCooldown = playerRef.current.crouching ? 0.56 : isSprinting ? 0.28 : 0.4;
          }
        }

        if (state.strikeTimer > 0) state.strikeTimer = Math.max(0, state.strikeTimer - dt);

        state.playerRig.root.position.copy(state.playerPos);
        state.playerRig.root.rotation.y = state.playerYaw;
        state.playerRig.updateAnimation(
          dt,
          actualSpeed,
          playerRef.current.crouching,
          state.strikeTimer,
          elapsed
        );

        const distNpc = state.playerPos.distanceTo(curWorld.npcPos);
        if (distNpc < 6) {
          const lookYaw = Math.atan2(
            state.playerPos.x - curWorld.npcPos.x,
            state.playerPos.z - curWorld.npcPos.z
          );
          curWorld.npcRig.root.rotation.y = THREE.MathUtils.damp(
            curWorld.npcRig.root.rotation.y,
            lookYaw,
            5,
            dt
          );
        }
        curWorld.npcRig.updateAnimation(dt, 0, false, 0, elapsed + 1.2);

        const g = curWorld.guard;
        if (g.status === 'stunned') {
          g.rig.root.rotation.x = THREE.MathUtils.damp(g.rig.root.rotation.x, -Math.PI / 2, 8, dt);
          g.rig.root.position.y = THREE.MathUtils.damp(g.rig.root.position.y, 0.22, 8, dt);
        } else if (g.status === 'bribed') {
          g.rig.updateAnimation(dt, 0, false, 0, elapsed);
        } else {
          let guardSpeed = 0;
          if (g.status === 'alert' && g.lastKnownPlayerPos) {
            _toPlayer.subVectors(state.playerPos, g.position);
            const dPlayer = _toPlayer.length();
            if (dPlayer > 1.7 && dPlayer < 18) {
              _toPlayer.normalize();
              guardSpeed = 3.9;
              g.position.addScaledVector(_toPlayer, guardSpeed * dt);
              clampToColliders(g.position, 0.45, curWorld.colliders, laserActive);
              g.yaw = Math.atan2(_toPlayer.x, _toPlayer.z);
            } else if (dPlayer <= 1.85) {
              g.attackCooldown -= dt;
              if (g.attackCooldown <= 0) {
                g.attackCooldown = 1.4;
                soundEngine.playStrike();
                const armorMul = playerRef.current.equippedDefenseId === 'item_vest' ? 0.65 : 1.0;
                const nextHp = Math.max(0, playerRef.current.health - Math.round(16 * armorMul));
                callbacksRef.current.onPlayerTick({ health: nextHp });
              }
            } else {
              g.status = 'patrol';
              callbacksRef.current.onGuardStatusChange('patrol');
            }
          } else {
            const wp = g.waypoints[g.waypointIndex];
            _toPlayer.subVectors(wp, g.position);
            const distWp = _toPlayer.length();
            if (distWp < 0.4) {
              g.waitTimer += dt;
              if (g.waitTimer > 1.4) {
                g.waitTimer = 0;
                g.waypointIndex = (g.waypointIndex + 1) % g.waypoints.length;
              }
            } else {
              _toPlayer.normalize();
              guardSpeed = 2.0;
              g.position.addScaledVector(_toPlayer, guardSpeed * dt);
              g.yaw = Math.atan2(_toPlayer.x, _toPlayer.z);
            }
          }

          g.rig.root.position.copy(g.position);
          g.rig.root.rotation.y = g.yaw;
          g.rig.updateAnimation(dt, guardSpeed, false, 0, elapsed);

          _toPlayer.subVectors(state.playerPos, g.position);
          const distToGuard = _toPlayer.length();
          _guardFwd.set(Math.sin(g.yaw), 0, Math.cos(g.yaw));
          const angleDot =
            distToGuard > 0.01 ? _toPlayer.clone().divideScalar(distToGuard).dot(_guardFwd) : 1;

          const maxVision = playerRef.current.crouching ? 5.2 : 8.5;
          const inSpotlight =
            curWorld.chapter === 1 &&
            !missionRef.current.spotlightDisabled &&
            Math.abs(state.playerPos.x) < 3.8 &&
            state.playerPos.z > -11 &&
            state.playerPos.z < -3.5;

          const spotted =
            (distToGuard < maxVision && angleDot > 0.65) ||
            (distToGuard < 2.1 && !playerRef.current.crouching) ||
            inSpotlight;

          if (spotted) {
            g.suspicion = Math.min(100, g.suspicion + dt * (inSpotlight ? 75 : 52));
            if (g.suspicion >= 100 && g.status !== 'alert') {
              g.status = 'alert';
              g.lastKnownPlayerPos = state.playerPos.clone();
              soundEngine.playAlert();
              callbacksRef.current.onGuardStatusChange('alert');
            }
          } else {
            g.suspicion = Math.max(0, g.suspicion - dt * 22);
          }

          const coneMat = g.visionCone.material as THREE.MeshBasicMaterial;
          coneMat.color.setHex(g.status === 'alert' || g.suspicion > 50 ? 0xef4444 : 0xf59e0b);
        }

        let bestId: string | null = null;
        let bestDist = Infinity;
        let bestLabel = '';
        let bestSub = '';
        for (let i = 0; i < curWorld.interactables.length; i++) {
          const it = curWorld.interactables[i];
          if (it.completed) continue;
          const d = state.playerPos.distanceTo(it.position);
          if (d < it.radius && d < bestDist) {
            bestDist = d;
            bestId = it.id;
            bestLabel = it.label;
            bestSub = it.sublabel;
          }
        }
        if (bestId !== nearbyId) {
          nearbyId = bestId;
          callbacksRef.current.onNearbyChange(
            bestId ? { id: bestId, label: bestLabel, sublabel: bestSub } : null
          );
        }

        const camDist = playerRef.current.crouching ? 4.2 : 5.0;
        const camHeight = playerRef.current.crouching ? 1.8 : 2.35;
        _camTarget.set(state.playerPos.x, 1.32, state.playerPos.z);
        _camDesired.set(
          state.playerPos.x + Math.sin(state.camYaw) * Math.cos(state.camPitch) * camDist,
          camHeight + Math.sin(state.camPitch) * camDist * 0.65,
          state.playerPos.z + Math.cos(state.camYaw) * Math.cos(state.camPitch) * camDist
        );
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _camDesired.x, 9, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _camDesired.y, 9, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _camDesired.z, 9, dt);
        camera.lookAt(_camTarget);

        hudSyncTimer += dt;
        if (hudSyncTimer > 0.12) {
          hudSyncTimer = 0;
          const nextStamina =
            isSprinting && actualSpeed > 0.5
              ? Math.max(0, playerRef.current.stamina - 3.5)
              : Math.min(100, playerRef.current.stamina + 2.2);
          const nextFocus = playerRef.current.echoActive
            ? Math.max(0, playerRef.current.focus - 2.6)
            : Math.min(100, playerRef.current.focus + 1.4);

          callbacksRef.current.onPlayerTick({
            stamina: Math.round(nextStamina),
            focus: Math.round(nextFocus),
            echoActive: nextFocus <= 0 ? false : playerRef.current.echoActive,
            stealthDetected: Math.round(curWorld.guard.suspicion),
            position: { x: state.playerPos.x, y: 0, z: state.playerPos.z },
          });
        }
      }

      renderer.render(scene, camera);
      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', handleLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleRestored);
      playerRig.dispose();
      creatorRig.dispose();
      state.world.dispose();
      textures.dispose();
      renderer.dispose();
      sceneRefs.current = null;
    };
  }, []);

  if (contextLost) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0b0e] text-zinc-200 p-6 text-center">
        <div>
          <p className="font-display text-2xl tracking-wide mb-2">Contexte WebGL suspendu</p>
          <p className="text-sm text-zinc-400">
            Le rendu 3D est en cours de réinitialisation par votre navigateur.
          </p>
        </div>
      </div>
    );
  }

  return <div ref={mountRef} className="w-full h-full relative select-none" />;
};
