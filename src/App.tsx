import React, { useCallback, useEffect, useState } from 'react';
import {
  Backpack,
  Compass,
  Eye,
  Heart,
  Menu,
  Play,
  RotateCcw,
  Shield,
  Sliders,
  UserCog,
  Zap,
  Power,
  ArrowRight,
} from 'lucide-react';
import { GameViewport, NearbyInteraction } from './components/GameViewport';
import { CharacterCreator } from './components/CharacterCreator';
import { PuzzleModal } from './components/PuzzleModal';
import { DialogueModal } from './components/DialogueModal';
import { TouchControls } from './components/TouchControls';
import {
  InventoryOverlay,
  ProgressionOverlay,
  SettingsOverlay,
} from './components/MenuOverlays';
import { soundEngine } from './audio/soundEngine';
import {
  CATALOG_ITEMS,
  CharacterProfile,
  DEFAULT_CHARACTER,
  DEFAULT_SETTINGS,
  EchoProfile,
  GameScreen,
  GameSettings,
  INITIAL_ECHO,
  INITIAL_INVENTORY,
  INITIAL_MISSION,
  INITIAL_PLAYER,
  InventoryItem,
  MissionProgress,
  PlayerRuntimeState,
  SaveGameData,
} from './types/game';

const SAVE_KEY = 'avangers_black_save_v1';

function loadSave(): SaveGameData | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveGameData;
    if (parsed && parsed.version === 1 && parsed.character) return parsed;
  } catch {
    // ignore corrupted save
  }
  return null;
}

export default function App() {
  const initialSave = loadSave();

  const [hasExistingSave, setHasExistingSave] = useState<boolean>(!!initialSave);
  const [screen, setScreen] = useState<GameScreen>('menu');
  const [returnToScreen, setReturnToScreen] = useState<GameScreen>('menu');

  const [character, setCharacter] = useState<CharacterProfile>(
    initialSave?.character ?? DEFAULT_CHARACTER
  );
  const [inventory, setInventory] = useState<InventoryItem[]>(
    initialSave?.inventory ?? INITIAL_INVENTORY
  );
  const [mission, setMission] = useState<MissionProgress>(
    initialSave?.mission ?? INITIAL_MISSION
  );
  const [echo, setEcho] = useState<EchoProfile>(initialSave?.echo ?? INITIAL_ECHO);
  const [player, setPlayer] = useState<PlayerRuntimeState>(
    initialSave?.player ?? INITIAL_PLAYER
  );
  const [settings, setSettings] = useState<GameSettings>(
    initialSave?.settings ?? DEFAULT_SETTINGS
  );

  const [nearby, setNearby] = useState<NearbyInteraction | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [activeModal, setActiveModal] = useState<
    'none' | 'puzzle' | 'nadia' | 'joris' | 'ending' | 'quit'
  >('none');
  const [hasNpcHint, setHasNpcHint] = useState(false);
  const [joystickVec, setJoystickVec] = useState({ x: 0, y: 0 });
  const [strikeNonce, setStrikeNonce] = useState(0);
  const [rendererInfo, setRendererInfo] = useState<{
    width: number;
    height: number;
    isSoftwareGl: boolean;
  } | null>(null);

  const isTouchDevice =
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const showTouchControls =
    settings.touchControlsMode === 'always' ||
    (settings.touchControlsMode === 'auto' && isTouchDevice);

  useEffect(() => {
    const payload: SaveGameData = {
      version: 1,
      updatedAt: new Date().toISOString(),
      character,
      inventory,
      mission,
      echo,
      player,
      settings,
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      setHasExistingSave(true);
    } catch {
      // ignore storage quota errors
    }
  }, [character, inventory, mission, echo, player, settings]);

  useEffect(() => {
    soundEngine.setEnabled(settings.audioEnabled);
    if (
      screen === 'playing' &&
      mission.chapter === 1 &&
      settings.weather === 'rain' &&
      settings.audioEnabled
    ) {
      soundEngine.startRain();
    } else {
      soundEngine.stopRain();
    }
    return () => soundEngine.stopRain();
  }, [screen, mission.chapter, settings.weather, settings.audioEnabled]);

  const showNotice = useCallback((msg: string) => {
    setToast(msg);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);

  const addItemIfMissing = useCallback((item: InventoryItem) => {
    setInventory((prev) => {
      if (prev.some((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });
  }, []);

  const handlePlayerTick = useCallback((patch: Partial<PlayerRuntimeState>) => {
    setPlayer((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleGuardStatusChange = useCallback(
    (status: MissionProgress['guardStatus']) => {
      setMission((prev) => {
        if (prev.guardStatus === status) return prev;
        const log = [...prev.decisionsLog];
        if (status === 'stunned') {
          log.push(`Sentinelle neutralisée physiquement (Chapitre ${prev.chapter}).`);
          setEcho((e) => ({ ...e, exposure: Math.min(100, e.exposure + 20) }));
          showNotice('Sentinelle neutralisée.');
        } else if (status === 'alert') {
          log.push(`Alerte déclenchée au Chapitre ${prev.chapter}.`);
          setEcho((e) => ({ ...e, exposure: Math.min(100, e.exposure + 15) }));
          showNotice('Alerte ! Un opérateur vous poursuit.');
        }
        return { ...prev, guardStatus: status, decisionsLog: log };
      });
    },
    [showNotice]
  );

  const handleToggleCrouch = useCallback(() => {
    soundEngine.playClick();
    setPlayer((prev) => ({ ...prev, crouching: !prev.crouching }));
  }, []);

  const handleToggleEcho = useCallback(() => {
    setPlayer((prev) => {
      if (!prev.echoActive && prev.focus < 15) {
        showNotice('Sang-froid insuffisant pour activer l’Écho.');
        return prev;
      }
      if (!prev.echoActive) {
        soundEngine.playEchoPulse(character.voicePitch);
      } else {
        soundEngine.playClick();
      }
      return { ...prev, echoActive: !prev.echoActive };
    });
  }, [character.voicePitch, showNotice]);

  const handleInteract = useCallback(
    (id: string) => {
      // Chapter 1
      if (id === 'clue_bench') {
        soundEngine.playClueFound();
        addItemIfMissing(CATALOG_ITEMS.clue_journal);
        addItemIfMissing(CATALOG_ITEMS.item_knife);
        setMission((prev) => ({
          ...prev,
          cluesFound: prev.cluesFound.includes('clue_journal')
            ? prev.cluesFound
            : [...prev.cluesFound, 'clue_journal'],
          decisionsLog: [
            ...prev.decisionsLog,
            'Carnet du contremaître et Couteau Obsidienne récupérés à l’établi.',
          ],
        }));
        setEcho((e) => ({ ...e, insight: e.insight + 15 }));
        showNotice('Indice trouvé : Page du contremaître + Couteau de survie.');
      } else if (id === 'clue_locker') {
        soundEngine.playClueFound();
        addItemIfMissing(CATALOG_ITEMS.clue_manifest);
        addItemIfMissing(CATALOG_ITEMS.item_vest);
        setMission((prev) => ({
          ...prev,
          cluesFound: prev.cluesFound.includes('clue_manifest')
            ? prev.cluesFound
            : [...prev.cluesFound, 'clue_manifest'],
          decisionsLog: [
            ...prev.decisionsLog,
            'Bordereau de cargaison et Gilet renforcé récupérés dans le Hangar 4.',
          ],
        }));
        setEcho((e) => ({ ...e, insight: e.insight + 15 }));
        showNotice('Indice trouvé : Bordereau de cargaison + Gilet renforcé.');
      } else if (id === 'terminal_power') {
        soundEngine.playUnlock();
        setMission((prev) => ({
          ...prev,
          spotlightDisabled: true,
          decisionsLog: [...prev.decisionsLog, 'Projecteur du quai saboté pour faciliter l’infiltration.'],
        }));
        setEcho((e) => ({ ...e, insight: e.insight + 10 }));
        showNotice('Projecteur désactivé ! La zone centrale est maintenant dans l’ombre.');
      } else if (id === 'hangar_safe') {
        soundEngine.playClick();
        setActiveModal('puzzle');
      } else if (id === 'npc_nadia') {
        soundEngine.playClick();
        setActiveModal('nadia');
      } else if (id === 'exit_hatch') {
        if (!mission.safeUnlocked) {
          soundEngine.playAlert();
          showNotice('La trappe exige le Badge magnétique Secteur 4 (coffre du Hangar 4).');
        } else {
          soundEngine.playUnlock();
          const endingPath: MissionProgress['endingPath'] =
            mission.guardStatus === 'bribed' || mission.nadiaDisposition === 'allied'
              ? 'diplomat'
              : mission.guardStatus === 'patrol' && echo.exposure < 30
              ? 'ghost'
              : 'enforcer';

          // Evolutionary character unlock reward!
          setCharacter((c) => {
            const unlocked = new Set(c.unlockedRewards || []);
            unlocked.add('shadow_coat');
            unlocked.add('echo_visor');
            return { ...c, unlockedRewards: Array.from(unlocked) };
          });

          setMission((prev) => ({
            ...prev,
            chapterCompleted: true,
            endingPath,
            activeObjective: 'Chapitre 1 terminé — Descente vers les Galeries de la Coupure.',
            decisionsLog: [...prev.decisionsLog, 'Extraction réussie par le Passage Souterrain.'],
          }));
          setActiveModal('ending');
        }
      }
      // Chapter 2
      else if (id === 'ch2_desk_note') {
        soundEngine.playClueFound();
        addItemIfMissing(CATALOG_ITEMS.clue_valve_note);
        setMission((prev) => ({
          ...prev,
          cluesFound: prev.cluesFound.includes('clue_valve_note')
            ? prev.cluesFound
            : [...prev.cluesFound, 'clue_valve_note'],
          decisionsLog: [...prev.decisionsLog, 'Schéma des vannes trouvé dans l’appartement sûr.'],
        }));
        setEcho((e) => ({ ...e, insight: e.insight + 15 }));
        showNotice('Indice trouvé : Schéma des vannes souterraines.');
      } else if (id === 'ch2_valve_panel') {
        soundEngine.playClick();
        setActiveModal('puzzle');
      } else if (id === 'npc_joris') {
        soundEngine.playClick();
        setActiveModal('joris');
      } else if (id === 'ch2_archive_core') {
        soundEngine.playUnlock();
        addItemIfMissing(CATALOG_ITEMS.item_coupure_drive);
        const endingPath: MissionProgress['endingPath'] =
          mission.ch2JorisDisposition === 'allied' || mission.nadiaDisposition === 'allied'
            ? 'diplomat'
            : echo.exposure < 35
            ? 'ghost'
            : 'enforcer';
        setMission((prev) => ({
          ...prev,
          ch2ArchiveFound: true,
          ch2Completed: true,
          endingPath,
          activeObjective: 'Preuves de la Coupure extraites — Chapitre 2 terminé.',
          decisionsLog: [...prev.decisionsLog, 'Disque chiffré des commanditaires extrait du Serveur.'],
        }));
        setEcho((e) => ({ ...e, insight: e.insight + 40 }));
        setActiveModal('ending');
      }
    },
    [
      addItemIfMissing,
      echo.exposure,
      mission.ch2JorisDisposition,
      mission.guardStatus,
      mission.nadiaDisposition,
      mission.safeUnlocked,
      showNotice,
    ]
  );

  const handlePuzzleUnlock = () => {
    if (mission.chapter === 1) {
      addItemIfMissing(CATALOG_ITEMS.item_keycard);
      addItemIfMissing(CATALOG_ITEMS.item_pistol_k9);
      setMission((prev) => ({
        ...prev,
        safeUnlocked: true,
        activeObjective: 'Rejoignez la trappe du Passage Souterrain au nord-est du Hangar 4.',
        decisionsLog: [...prev.decisionsLog, 'Énigme du coffre blindé résolue (code 4327).'],
      }));
      setEcho((e) => ({ ...e, insight: e.insight + 30 }));
      setActiveModal('none');
      showNotice('Coffre ouvert ! Badge magnétique Secteur 4 et Pistolet K-9 ajoutés.');
    } else {
      setMission((prev) => ({
        ...prev,
        ch2LasersDisabled: true,
        ch2ValveSolved: true,
        activeObjective: 'Accédez au Serveur de la Coupure au nord pour extraire les preuves.',
        decisionsLog: [...prev.decisionsLog, 'Barrière laser désactivée via le tableau des vannes (4239).'],
      }));
      setEcho((e) => ({ ...e, insight: e.insight + 30 }));
      setActiveModal('none');
      showNotice('Barrière laser désactivée ! Le serveur est accessible.');
    }
  };

  const handleNpcChoice = (choice: 'cooperate' | 'hint' | 'intimidate') => {
    if (activeModal === 'nadia') {
      if (choice === 'hint') {
        setHasNpcHint(true);
        setEcho((e) => ({ ...e, humanity: e.humanity + 5, insight: e.insight + 10 }));
      } else if (choice === 'cooperate') {
        setMission((prev) => ({
          ...prev,
          nadiaDisposition: 'allied',
          guardStatus: 'bribed',
          decisionsLog: [...prev.decisionsLog, 'Alliance avec Nadia Vance : elle a détourné la sentinelle.'],
        }));
        setEcho((e) => ({ ...e, humanity: e.humanity + 25 }));
        showNotice('Nadia détourne l’attention de la sentinelle !');
      } else {
        setMission((prev) => ({
          ...prev,
          nadiaDisposition: 'suspicious',
          decisionsLog: [...prev.decisionsLog, 'Vous avez refusé l’aide de Nadia Vance.'],
        }));
        setEcho((e) => ({ ...e, humanity: e.humanity - 20, exposure: Math.min(100, e.exposure + 15) }));
      }
    } else if (activeModal === 'joris') {
      if (choice === 'hint') {
        setHasNpcHint(true);
        setEcho((e) => ({ ...e, insight: e.insight + 10 }));
      } else if (choice === 'cooperate') {
        setMission((prev) => ({
          ...prev,
          ch2JorisDisposition: 'allied',
          guardStatus: 'bribed',
          decisionsLog: [...prev.decisionsLog, 'Alliance avec Joris : fréquences de l’opérateur d’élite brouillées.'],
        }));
        setEcho((e) => ({ ...e, humanity: e.humanity + 20 }));
        showNotice('Joris neutralise les communications de l’opérateur d’élite !');
      } else {
        setMission((prev) => ({
          ...prev,
          ch2JorisDisposition: 'hostile',
          decisionsLog: [...prev.decisionsLog, 'Rupture avec Joris dans les Galeries.'],
        }));
        setEcho((e) => ({ ...e, humanity: e.humanity - 15, exposure: Math.min(100, e.exposure + 10) }));
      }
    }
  };

  const enterChapter2 = () => {
    soundEngine.playUnlock();
    setHasNpcHint(false);
    setActiveModal('none');
    setMission((prev) => ({
      ...prev,
      chapter: 2,
      chapterTitle: 'Chapitre 2 — Les Galeries de la Coupure',
      activeObjective:
        'Explorez l’appartement sûr, parlez à Joris et atteignez le Serveur de la Coupure au nord.',
      guardStatus: 'patrol',
    }));
    setPlayer((prev) => ({
      ...prev,
      health: 100,
      stamina: 100,
      focus: 100,
      stealthDetected: 0,
      position: { x: -12, y: 0, z: 16 },
    }));
    setScreen('playing');
    showNotice('Chapitre 2 commencé — Tenue d’Ombre & Visière Écho débloquées dans la création de personnage !');
  };

  const startNewGame = () => {
    soundEngine.playUnlock();
    setInventory(INITIAL_INVENTORY);
    setMission(INITIAL_MISSION);
    setEcho(INITIAL_ECHO);
    setPlayer(INITIAL_PLAYER);
    setHasNpcHint(false);
    setActiveModal('none');
    setScreen('creator');
  };

  const openSubScreen = (target: GameScreen) => {
    soundEngine.playClick();
    setReturnToScreen(screen === 'playing' ? 'playing' : 'menu');
    setScreen(target);
  };

  const respawnCheckpoint = () => {
    soundEngine.playClick();
    setPlayer((prev) => ({
      ...prev,
      health: 100,
      stamina: 100,
      focus: 100,
      stealthDetected: 0,
      position: mission.chapter === 1 ? { x: -16, y: 0, z: 14 } : { x: -12, y: 0, z: 16 },
    }));
    showNotice('Reprise au point sûr.');
  };

  const viewportMode =
    screen === 'creator' ? 'creator' : screen === 'playing' ? 'playing' : 'menu';

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0a0b0e]">
      <GameViewport
        mode={viewportMode}
        character={character}
        settings={settings}
        mission={mission}
        playerState={player}
        joystickVector={joystickVec}
        strikeNonce={strikeNonce}
        onNearbyChange={setNearby}
        onPlayerTick={handlePlayerTick}
        onGuardStatusChange={handleGuardStatusChange}
        onInteractRequest={handleInteract}
        onToggleEcho={handleToggleEcho}
        onToggleCrouch={handleToggleCrouch}
        onRendererInfo={setRendererInfo}
      />

      {/* MAIN MENU */}
      {screen === 'menu' && (
        <div className="fixed inset-0 z-20 flex items-center justify-center sm:justify-start p-5 sm:p-12 bg-gradient-to-r from-[#090b10]/92 via-[#090b10]/70 to-transparent">
          <div className="w-full max-w-md bg-[#101217]/92 border border-white/12 rounded-2xl p-6 sm:p-8 shadow-2xl">
            <p className="text-xs font-medium tracking-widest text-amber-400 uppercase mb-2">
              Aventure · Survie · Énigmes
            </p>
            <h1 className="font-display text-5xl sm:text-6xl font-bold tracking-tight text-white leading-none mb-3">
              AVANGERS BLACK
            </h1>
            <p className="text-sm text-zinc-300 leading-relaxed mb-6">
              Façonnez votre personnage, infiltrez Port-Brume et les Galeries de la Coupure. Chaque décision laisse un écho.
            </p>

            <nav className="space-y-2.5">
              {hasExistingSave && (
                <button
                  onClick={() => {
                    soundEngine.playUnlock();
                    setScreen('playing');
                  }}
                  className="w-full min-h-[48px] px-4 py-3 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm rounded-xl flex items-center justify-between transition-colors"
                >
                  <span>Continuer ({mission.chapterTitle.split('—')[0].trim()})</span>
                  <Play className="w-4 h-4 fill-current" />
                </button>
              )}

              <button
                onClick={startNewGame}
                className={`w-full min-h-[48px] px-4 py-3 rounded-xl text-sm font-semibold flex items-center justify-between transition-colors ${
                  hasExistingSave
                    ? 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                    : 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                }`}
              >
                <span>Nouvelle partie</span>
                <Play className="w-4 h-4" />
              </button>

              <button
                onClick={() => openSubScreen('creator')}
                className="w-full min-h-[44px] px-4 py-2.5 bg-[#161922] hover:bg-white/10 border border-white/10 text-zinc-100 text-sm rounded-xl flex items-center justify-between"
              >
                <span>Création du personnage</span>
                <UserCog className="w-4 h-4 text-zinc-400" />
              </button>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => openSubScreen('inventory')}
                  className="min-h-[44px] px-3 py-2.5 bg-[#161922] hover:bg-white/10 border border-white/10 text-zinc-200 text-sm rounded-xl flex items-center justify-center gap-2"
                >
                  <Backpack className="w-4 h-4 text-zinc-400" />
                  <span>Inventaire</span>
                </button>
                <button
                  onClick={() => openSubScreen('progression')}
                  className="min-h-[44px] px-3 py-2.5 bg-[#161922] hover:bg-white/10 border border-white/10 text-zinc-200 text-sm rounded-xl flex items-center justify-center gap-2"
                >
                  <Compass className="w-4 h-4 text-zinc-400" />
                  <span>Progression</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  onClick={() => openSubScreen('settings')}
                  className="min-h-[44px] px-3 py-2.5 bg-[#161922] hover:bg-white/10 border border-white/10 text-zinc-200 text-sm rounded-xl flex items-center justify-center gap-2"
                >
                  <Sliders className="w-4 h-4 text-zinc-400" />
                  <span>Paramètres</span>
                </button>
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    setActiveModal('quit');
                  }}
                  className="min-h-[44px] px-3 py-2.5 bg-[#161922] hover:bg-red-500/15 border border-white/10 text-zinc-300 text-sm rounded-xl flex items-center justify-center gap-2"
                >
                  <Power className="w-4 h-4 text-zinc-400" />
                  <span>Quitter</span>
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* CHARACTER CREATOR */}
      {screen === 'creator' && (
        <CharacterCreator
          character={character}
          onChange={setCharacter}
          onBack={() => setScreen('menu')}
          onStartAdventure={() => setScreen('playing')}
        />
      )}

      {/* IN-GAME HUD */}
      {screen === 'playing' && (
        <>
          <div className="pointer-events-none fixed inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-3 sm:p-5">
            <div className="pointer-events-auto bg-[#101217]/88 border border-white/12 rounded-xl p-3 max-w-xs sm:max-w-sm shadow-lg">
              <div className="flex items-center justify-between gap-3 mb-2">
                <span className="text-xs font-semibold text-white truncate">
                  {character.name} · Ch.{mission.chapter}
                </span>
                <span className="font-mono-tabular text-[11px] text-zinc-400 shrink-0">
                  {player.crouching ? 'Discret' : 'Debout'} · {player.echoActive ? 'Écho actif' : 'Normal'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-2.5 text-[11px] font-mono-tabular">
                <div className="flex items-center gap-1.5 text-red-300">
                  <Heart className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span>{player.health}</span>
                </div>
                <div className="flex items-center gap-1.5 text-amber-300">
                  <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{player.stamina}</span>
                </div>
                <div className="flex items-center gap-1.5 text-cyan-300">
                  <Eye className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{player.focus}</span>
                </div>
              </div>

              {player.stealthDetected > 5 && (
                <div className="mb-2">
                  <div className="flex justify-between text-[11px] text-amber-300 mb-0.5">
                    <span>Vigilance Garde</span>
                    <span className="font-mono-tabular">{player.stealthDetected}%</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        player.stealthDetected > 70 ? 'bg-red-500' : 'bg-amber-400'
                      }`}
                      style={{ width: `${player.stealthDetected}%` }}
                    />
                  </div>
                </div>
              )}

              <p className="text-xs text-zinc-300 leading-snug border-t border-white/10 pt-2">
                <span className="text-amber-400 font-medium">Objectif : </span>
                {mission.activeObjective}
              </p>
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5 bg-[#101217]/88 border border-white/12 rounded-xl p-1.5 shadow-lg">
              <button
                onClick={() => openSubScreen('inventory')}
                title="Inventaire"
                className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg hover:bg-white/10 text-zinc-200 flex items-center gap-1.5 text-xs"
              >
                <Backpack className="w-4 h-4 text-amber-400" />
                <span className="hidden md:inline">Inventaire</span>
              </button>
              <button
                onClick={() => openSubScreen('progression')}
                title="Progression"
                className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg hover:bg-white/10 text-zinc-200 flex items-center gap-1.5 text-xs"
              >
                <Compass className="w-4 h-4 text-zinc-300" />
                <span className="hidden md:inline">Écho</span>
              </button>
              <button
                onClick={() => openSubScreen('settings')}
                title="Paramètres"
                className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg hover:bg-white/10 text-zinc-200 flex items-center gap-1.5 text-xs"
              >
                <Sliders className="w-4 h-4 text-zinc-300" />
              </button>
              <button
                onClick={() => {
                  soundEngine.playClick();
                  setScreen('menu');
                }}
                title="Menu principal"
                className="min-h-[40px] min-w-[40px] px-2.5 rounded-lg hover:bg-white/10 text-zinc-200 flex items-center gap-1.5 text-xs"
              >
                <Menu className="w-4 h-4 text-zinc-300" />
              </button>
            </div>
          </div>

          {toast && (
            <div className="pointer-events-none fixed top-24 left-1/2 -translate-x-1/2 z-30 bg-[#141821]/95 border border-amber-500/40 text-amber-100 text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xl max-w-md text-center">
              {toast}
            </div>
          )}

          {nearby && activeModal === 'none' && (
            <div className="fixed bottom-32 sm:bottom-16 left-1/2 -translate-x-1/2 z-20">
              <button
                onClick={() => handleInteract(nearby.id)}
                className="min-h-[46px] px-4 py-2.5 bg-[#12151c]/95 hover:bg-[#1a1f29] border border-amber-500/50 rounded-xl shadow-2xl flex items-center gap-3 text-left transition-colors"
              >
                <span className="px-2 py-0.5 rounded bg-amber-500 text-zinc-950 font-mono-tabular text-xs font-bold">
                  E
                </span>
                <div>
                  <p className="text-sm font-semibold text-white leading-tight">{nearby.label}</p>
                  <p className="text-xs text-zinc-400 leading-tight">{nearby.sublabel}</p>
                </div>
              </button>
            </div>
          )}

          {!showTouchControls && (
            <div className="pointer-events-none fixed bottom-3 left-1/2 -translate-x-1/2 z-10 hidden sm:flex items-center gap-3 bg-[#101217]/80 border border-white/10 rounded-xl px-4 py-1.5 text-[11px] text-zinc-300">
              <span>WASD / Flèches : Bouger</span>
              <span aria-hidden="true">·</span>
              <span>Glisser souris : Caméra</span>
              <span aria-hidden="true">·</span>
              <span>E : Interagir</span>
              <span aria-hidden="true">·</span>
              <span>C : Discret</span>
              <span aria-hidden="true">·</span>
              <span>Q : Écho</span>
              <span aria-hidden="true">·</span>
              <span>F : Neutraliser</span>
            </div>
          )}

          {showTouchControls && activeModal === 'none' && (
            <TouchControls
              crouching={player.crouching}
              echoActive={player.echoActive}
              hasNearby={!!nearby}
              onJoystickMove={setJoystickVec}
              onInteract={() => nearby && handleInteract(nearby.id)}
              onToggleCrouch={handleToggleCrouch}
              onToggleEcho={handleToggleEcho}
              onStrike={() => setStrikeNonce((n) => n + 1)}
            />
          )}

          {player.health <= 0 && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
              <div className="max-w-md w-full bg-[#12151c] border border-red-500/30 rounded-2xl p-6 text-center">
                <Shield className="w-10 h-10 text-red-400 mx-auto mb-3" />
                <h2 className="font-display text-3xl font-semibold text-white mb-2">
                  Vous avez été neutralisé
                </h2>
                <p className="text-sm text-zinc-400 mb-5">
                  La Garde d’Obsidienne a pris l’avantage. Utilisez la posture discrète, les angles morts ou la négociation.
                </p>
                <button
                  onClick={respawnCheckpoint}
                  className="min-h-[46px] px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm rounded-xl inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reprendre au point de contrôle</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* SUB-SCREENS */}
      {screen === 'inventory' && (
        <InventoryOverlay
          inventory={inventory}
          player={player}
          onEquipWeapon={(id) => setPlayer((p) => ({ ...p, equippedWeaponId: id }))}
          onEquipDefense={(id) => setPlayer((p) => ({ ...p, equippedDefenseId: id }))}
          onBack={() => setScreen(returnToScreen)}
        />
      )}

      {screen === 'progression' && (
        <ProgressionOverlay
          mission={mission}
          echo={echo}
          onBack={() => setScreen(returnToScreen)}
        />
      )}

      {screen === 'settings' && (
        <SettingsOverlay
          settings={settings}
          rendererInfo={rendererInfo}
          onChange={setSettings}
          onBack={() => setScreen(returnToScreen)}
        />
      )}

      {/* MODALS */}
      {activeModal === 'puzzle' && (
        <PuzzleModal
          chapter={mission.chapter}
          cluesFound={mission.cluesFound}
          hasNpcHint={hasNpcHint}
          onUnlock={handlePuzzleUnlock}
          onClose={() => setActiveModal('none')}
        />
      )}

      {(activeModal === 'nadia' || activeModal === 'joris') && (
        <DialogueModal
          npcId={activeModal}
          character={character}
          mission={mission}
          onChoice={handleNpcChoice}
          onClose={() => setActiveModal('none')}
        />
      )}

      {activeModal === 'ending' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-w-lg w-full bg-[#12151c] border border-amber-500/35 rounded-2xl p-6 shadow-2xl">
            <p className="text-xs text-amber-400 font-medium mb-1">
              {mission.chapter === 1 ? 'Chapitre 1 terminé' : 'Chapitre 2 terminé — Fin de l’acte'}
            </p>
            <h2 className="font-display text-3xl font-semibold text-white mb-3">
              {mission.endingPath === 'diplomat'
                ? 'Voie de l’Alliance — L’Ombre Partagée'
                : mission.endingPath === 'ghost'
                ? 'Voie du Fantôme — Zéro Trace'
                : 'Voie de la Force — Survie Brute'}
            </h2>
            <p className="text-sm text-zinc-300 leading-relaxed mb-4">
              {mission.chapter === 1
                ? `${character.name} quitte le Quai 4 par le passage souterrain. Vous avez débloqué la Tenue d’Ombre et la Visière Écho dans la création de personnage.`
                : `${character.name} détient désormais le Disque chiffré de la Coupure. La vérité sur les commanditaires de Port-Brume va éclater au grand jour.`}
            </p>
            <div className="bg-[#0b0d12] border border-white/10 rounded-xl p-3.5 mb-5 text-xs text-zinc-300 space-y-1">
              <p>Humanité : <span className="font-mono-tabular text-emerald-400">{echo.humanity}</span></p>
              <p>Exposition : <span className="font-mono-tabular text-amber-400">{echo.exposure}%</span></p>
              <p>Perspicacité : <span className="font-mono-tabular text-cyan-400">{echo.insight} pts</span></p>
            </div>
            <div className="flex flex-wrap justify-end gap-2.5">
              <button
                onClick={() => {
                  setActiveModal('none');
                  setScreen('progression');
                }}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-zinc-200"
              >
                Voir le journal
              </button>
              {mission.chapter === 1 ? (
                <button
                  onClick={enterChapter2}
                  className="min-h-[44px] px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm inline-flex items-center gap-2"
                >
                  <span>Continuer vers le Chapitre 2</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setActiveModal('none');
                    setScreen('menu');
                  }}
                  className="min-h-[44px] px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm"
                >
                  Retour au menu
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeModal === 'quit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="max-w-sm w-full bg-[#12151c] border border-white/15 rounded-2xl p-6">
            <h2 className="font-display text-2xl font-semibold text-white mb-2">
              Réinitialiser la session ?
            </h2>
            <p className="text-sm text-zinc-400 mb-5">
              Votre progression actuelle est sauvegardée localement. Souhaitez-vous effacer la sauvegarde pour repartir à zéro ?
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                onClick={() => setActiveModal('none')}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-zinc-200"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem(SAVE_KEY);
                  setHasExistingSave(false);
                  setCharacter(DEFAULT_CHARACTER);
                  setInventory(INITIAL_INVENTORY);
                  setMission(INITIAL_MISSION);
                  setEcho(INITIAL_ECHO);
                  setPlayer(INITIAL_PLAYER);
                  setActiveModal('none');
                }}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-red-500/85 hover:bg-red-500 text-white text-sm font-semibold"
              >
                Effacer la sauvegarde
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
