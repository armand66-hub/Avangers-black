export type Gender = 'male' | 'female';
export type BuildType = 'lean' | 'athletic' | 'heavy';
export type FaceShape = 'oval' | 'angular' | 'broad';
export type NoseType = 'straight' | 'aquiline' | 'broad';
export type MouthType = 'neutral' | 'firm' | 'soft';
export type HairStyle = 'short' | 'fade' | 'long' | 'bun' | 'bald';
export type BeardStyle = 'none' | 'stubble' | 'short' | 'full';
export type OutfitStyle = 'coat' | 'tactical' | 'civilian' | 'shadow_coat';
export type ShoeStyle = 'boots' | 'sneakers' | 'tactical';
export type AccessoryType = 'none' | 'glasses' | 'earpiece' | 'scarf' | 'watch' | 'echo_visor';
export type TattooType = 'none' | 'arm_band' | 'neck_mark';
export type ScarType = 'none' | 'cheek' | 'brow';

export interface CharacterProfile {
  name: string;
  gender: Gender;
  skinTone: string;
  eyeColor: string;
  faceShape: FaceShape;
  noseType: NoseType;
  mouthType: MouthType;
  hairStyle: HairStyle;
  hairColor: string;
  beardStyle: BeardStyle;
  heightScale: number; // 0.90 to 1.12
  buildType: BuildType;
  outfitStyle: OutfitStyle;
  outfitColor: string;
  shoeStyle: ShoeStyle;
  shoeColor: string;
  accessory: AccessoryType;
  tattoo: TattooType;
  scar: ScarType;
  voicePitch: number; // 0.75 to 1.25
  unlockedRewards: string[];
}

export type ItemCategory = 'melee' | 'firearm' | 'defense' | 'tool' | 'clue';

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  description: string;
  quantity: number;
  equippable?: boolean;
  stats?: string;
}

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'uhd4k';
export type WeatherType = 'clear' | 'rain' | 'fog';

export interface GameSettings {
  quality: GraphicsQuality;
  shadowsEnabled: boolean;
  weather: WeatherType;
  timeOfDay: number; // 0..24 hours
  autoTimeCycle: boolean;
  audioEnabled: boolean;
  touchControlsMode: 'auto' | 'always' | 'off';
  cameraSensitivity: number;
}

export interface EchoProfile {
  /** -100 (brutal/menaçant) à +100 (empathique/diplomate) */
  humanity: number;
  /** 0 (discret) à 100 (exposé/combatif) */
  exposure: number;
  /** Points d'analyse débloqués par les énigmes et l'exploration */
  insight: number;
}

export interface MissionProgress {
  chapter: 1 | 2;
  chapterTitle: string;
  activeObjective: string;
  cluesFound: string[];
  /** Chapitre 1 : Sabotage du projecteur */
  spotlightDisabled: boolean;
  nadiaDisposition: 'neutral' | 'allied' | 'suspicious' | 'betrayed';
  safeUnlocked: boolean;
  guardStatus: 'patrol' | 'alert' | 'stunned' | 'bribed';
  chapterCompleted: boolean;
  endingPath: 'ghost' | 'diplomat' | 'enforcer' | null;
  /** Chapitre 2 : Galeries de la Coupure */
  ch2LasersDisabled: boolean;
  ch2JorisDisposition: 'neutral' | 'allied' | 'hostile';
  ch2ValveSolved: boolean;
  ch2ArchiveFound: boolean;
  ch2Completed: boolean;
  decisionsLog: string[];
}

export interface PlayerRuntimeState {
  health: number;
  maxHealth: number;
  stamina: number;
  maxStamina: number;
  focus: number;
  maxFocus: number;
  crouching: boolean;
  echoActive: boolean;
  stealthDetected: number; // 0..100
  equippedWeaponId: string | null;
  equippedDefenseId: string | null;
  position: { x: number; y: number; z: number };
}

export type GameScreen =
  | 'menu'
  | 'creator'
  | 'playing'
  | 'inventory'
  | 'progression'
  | 'settings';

export interface SaveGameData {
  version: number;
  updatedAt: string;
  character: CharacterProfile;
  inventory: InventoryItem[];
  mission: MissionProgress;
  echo: EchoProfile;
  player: PlayerRuntimeState;
  settings: GameSettings;
}

export const DEFAULT_CHARACTER: CharacterProfile = {
  name: 'Kaelen Noir',
  gender: 'male',
  skinTone: '#c68b67',
  eyeColor: '#3b6e8c',
  faceShape: 'angular',
  noseType: 'straight',
  mouthType: 'firm',
  hairStyle: 'fade',
  hairColor: '#1b1c20',
  beardStyle: 'stubble',
  heightScale: 1.0,
  buildType: 'athletic',
  outfitStyle: 'coat',
  outfitColor: '#1f252d',
  shoeStyle: 'boots',
  shoeColor: '#17181c',
  accessory: 'earpiece',
  tattoo: 'arm_band',
  scar: 'brow',
  voicePitch: 0.95,
  unlockedRewards: [],
};

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'item_flashlight',
    name: 'Lampe tactique UV',
    category: 'tool',
    description: 'Permet de lire les marquages effacés et d’inspecter les zones sombres.',
    quantity: 1,
    equippable: false,
  },
  {
    id: 'item_baton',
    name: 'Matraque rétractable K-2',
    category: 'melee',
    description: 'Arme de mêlée discrète conçue pour neutraliser sans bruit à courte portée.',
    quantity: 1,
    equippable: true,
    stats: 'Dégâts 28 · Silencieuse',
  },
];

export const INITIAL_MISSION: MissionProgress = {
  chapter: 1,
  chapterTitle: 'Chapitre 1 — Nuit sur le Quai 4',
  activeObjective: 'Explorez l’allée de Port-Brume et trouvez un moyen d’ouvrir le coffre du Hangar 4.',
  cluesFound: [],
  spotlightDisabled: false,
  nadiaDisposition: 'neutral',
  safeUnlocked: false,
  guardStatus: 'patrol',
  chapterCompleted: false,
  endingPath: null,
  ch2LasersDisabled: false,
  ch2JorisDisposition: 'neutral',
  ch2ValveSolved: false,
  ch2ArchiveFound: false,
  ch2Completed: false,
  decisionsLog: [],
};

export const INITIAL_ECHO: EchoProfile = {
  humanity: 0,
  exposure: 10,
  insight: 0,
};

export const INITIAL_PLAYER: PlayerRuntimeState = {
  health: 100,
  maxHealth: 100,
  stamina: 100,
  maxStamina: 100,
  focus: 100,
  maxFocus: 100,
  crouching: false,
  echoActive: false,
  stealthDetected: 0,
  equippedWeaponId: null,
  equippedDefenseId: null,
  position: { x: -16, y: 0, z: 14 },
};

export const DEFAULT_SETTINGS: GameSettings = {
  quality: 'high',
  shadowsEnabled: true,
  weather: 'rain',
  timeOfDay: 21.5,
  autoTimeCycle: false,
  audioEnabled: true,
  touchControlsMode: 'auto',
  cameraSensitivity: 1.0,
};

export const CATALOG_ITEMS: Record<string, InventoryItem> = {
  item_knife: {
    id: 'item_knife',
    name: 'Couteau de survie Obsidienne',
    category: 'melee',
    description: 'Lame utilitaire robuste utile pour forcer des sangles ou en combat rapproché.',
    quantity: 1,
    equippable: true,
    stats: 'Dégâts 38 · Rapide',
  },
  item_pistol_k9: {
    id: 'item_pistol_k9',
    name: 'Pistolet K-9 à impulsions',
    category: 'firearm',
    description: 'Arme fictive à munitions neutralisantes subsoniques. Efficace à distance mais attire l’attention.',
    quantity: 1,
    equippable: true,
    stats: 'Portée 18m · Choc 55',
  },
  item_vest: {
    id: 'item_vest',
    name: 'Gilet renforcé léger',
    category: 'defense',
    description: 'Réduit de 35% les dégâts subis lors d’une confrontation.',
    quantity: 1,
    equippable: false,
    stats: 'Armure +35%',
  },
  item_keycard: {
    id: 'item_keycard',
    name: 'Badge magnétique Secteur 4',
    category: 'tool',
    description: 'Carte d’accès chiffrée permettant d’ouvrir la trappe du passage souterrain.',
    quantity: 1,
    equippable: false,
  },
  clue_journal: {
    id: 'clue_journal',
    name: 'Page arrachée du contremaître',
    category: 'clue',
    description: 'Note manuscrite : « Le premier chiffre est le quai d’accostage (4). Le deuxième est le nombre de lampadaires allumés devant le hangar. »',
    quantity: 1,
  },
  clue_manifest: {
    id: 'clue_manifest',
    name: 'Bordereau de cargaison',
    category: 'clue',
    description: 'Archive de la Garde : « Le troisième chiffre correspond aux caisses bleues scellées près de l’entrée. Le dernier est la somme des deux premiers. »',
    quantity: 1,
  },
  clue_valve_note: {
    id: 'clue_valve_note',
    name: 'Schéma des vannes souterraines',
    category: 'clue',
    description: 'Plan technique : « Ordre d’ouverture : Piliers porteurs de la galerie (4), balises ambre allumées (2), conduites rouges de pression (3), total général (9). »',
    quantity: 1,
  },
  item_coupure_drive: {
    id: 'item_coupure_drive',
    name: 'Disque chiffré de la Coupure',
    category: 'tool',
    description: 'Contient la liste des commanditaires responsables du blackout de Port-Brume.',
    quantity: 1,
  },
};
