import React from 'react';
import {
  ArrowLeft,
  Check,
  Volume2,
  VolumeX,
  Shield,
  Sword,
  Compass,
  Sliders,
  Backpack,
} from 'lucide-react';
import {
  EchoProfile,
  GameSettings,
  GraphicsQuality,
  InventoryItem,
  MissionProgress,
  PlayerRuntimeState,
  WeatherType,
} from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface SubScreenProps {
  onBack: () => void;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

const SubScreenLayout: React.FC<SubScreenProps> = ({
  onBack,
  title,
  subtitle,
  icon,
  children,
}) => (
  <div className="fixed inset-0 z-30 flex items-center justify-center bg-[#0a0b0e]/90 p-4 md:p-8">
    <div className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-[#12151c] border border-white/12 rounded-2xl shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold text-white truncate">{title}</h2>
            <p className="text-xs text-zinc-400 truncate">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => {
            soundEngine.playClick();
            onBack();
          }}
          className="min-h-[44px] px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-zinc-200 flex items-center gap-2 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour</span>
        </button>
      </div>
      <div className="p-5 overflow-y-auto flex-1">{children}</div>
    </div>
  </div>
);

interface InventoryOverlayProps {
  inventory: InventoryItem[];
  player: PlayerRuntimeState;
  onEquipWeapon: (id: string | null) => void;
  onEquipDefense: (id: string | null) => void;
  onBack: () => void;
}

export const InventoryOverlay: React.FC<InventoryOverlayProps> = ({
  inventory,
  player,
  onEquipWeapon,
  onEquipDefense,
  onBack,
}) => (
  <SubScreenLayout
    onBack={onBack}
    title="Inventaire & Équipement"
    subtitle="Équipez vos armes, protections et consultez les documents récupérés"
    icon={<Backpack className="w-5 h-5" />}
  >
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {inventory.map((item) => {
        const isWeaponEquipped = player.equippedWeaponId === item.id;
        const isDefenseEquipped = player.equippedDefenseId === item.id;
        const equipped = isWeaponEquipped || isDefenseEquipped;

        return (
          <div
            key={item.id}
            className={`p-4 rounded-xl border transition-colors ${
              equipped
                ? 'bg-amber-500/10 border-amber-500/40'
                : 'bg-[#0c0e13] border-white/10'
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {item.category === 'melee'
                    ? 'Arme de mêlée'
                    : item.category === 'firearm'
                    ? 'Arme à impulsions'
                    : item.category === 'defense'
                    ? 'Protection'
                    : item.category === 'clue'
                    ? 'Indice d’enquête'
                    : 'Équipement'}
                  {item.stats ? ` · ${item.stats}` : ''}
                </p>
              </div>

              {(item.equippable || item.category === 'defense') && (
                <button
                  onClick={() => {
                    soundEngine.playClick();
                    if (item.category === 'defense') {
                      onEquipDefense(isDefenseEquipped ? null : item.id);
                    } else {
                      onEquipWeapon(isWeaponEquipped ? null : item.id);
                    }
                  }}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 ${
                    equipped
                      ? 'bg-amber-500 text-zinc-950 font-semibold'
                      : 'bg-white/10 text-zinc-200 hover:bg-white/15'
                  }`}
                >
                  {equipped ? <Check className="w-3.5 h-3.5" /> : item.category === 'defense' ? <Shield className="w-3.5 h-3.5" /> : <Sword className="w-3.5 h-3.5" />}
                  <span>{equipped ? 'Équipé' : 'Équiper'}</span>
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">{item.description}</p>
          </div>
        );
      })}
    </div>
  </SubScreenLayout>
);

interface ProgressionOverlayProps {
  mission: MissionProgress;
  echo: EchoProfile;
  onBack: () => void;
}

export const ProgressionOverlay: React.FC<ProgressionOverlayProps> = ({
  mission,
  echo,
  onBack,
}) => (
  <SubScreenLayout
    onBack={onBack}
    title="Progression & Écho de Conscience"
    subtitle={mission.chapterTitle}
    icon={<Compass className="w-5 h-5" />}
  >
    <div className="space-y-6">
      {/* Objective */}
      <div className="bg-[#0c0e13] border border-white/10 rounded-xl p-4">
        <p className="text-xs text-amber-400 font-medium mb-1">Objectif actuel</p>
        <p className="text-sm text-white">{mission.activeObjective}</p>
      </div>

      {/* Echo Axes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-[#0c0e13] border border-white/10 rounded-xl p-4">
          <p className="text-xs text-zinc-400 mb-1">Humanité & Confiance</p>
          <p className="font-mono-tabular text-2xl font-semibold text-emerald-400">
            {echo.humanity >= 0 ? `+${echo.humanity}` : echo.humanity}
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Influence l’aide des alliés et les fins narratives.
          </p>
        </div>

        <div className="bg-[#0c0e13] border border-white/10 rounded-xl p-4">
          <p className="text-xs text-zinc-400 mb-1">Exposition tactique</p>
          <p className="font-mono-tabular text-2xl font-semibold text-amber-400">
            {echo.exposure}%
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Mesure la vigilance et l’agressivité de la Garde.
          </p>
        </div>

        <div className="bg-[#0c0e13] border border-white/10 rounded-xl p-4">
          <p className="text-xs text-zinc-400 mb-1">Perspicacité</p>
          <p className="font-mono-tabular text-2xl font-semibold text-cyan-400">
            {echo.insight} pts
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Acquise par l’observation et la résolution d’énigmes.
          </p>
        </div>
      </div>

      {/* Decisions Log */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-2.5">Journal des décisions</h3>
        {mission.decisionsLog.length === 0 ? (
          <p className="text-xs text-zinc-500 bg-[#0c0e13] border border-white/10 rounded-xl p-4">
            Aucune décision majeure enregistrée pour l’instant. Vos actes à Port-Brume apparaîtront ici.
          </p>
        ) : (
          <ul className="space-y-2">
            {mission.decisionsLog.map((entry, idx) => (
              <li
                key={idx}
                className="text-xs text-zinc-300 bg-[#0c0e13] border border-white/10 rounded-lg px-3.5 py-2.5"
              >
                {entry}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </SubScreenLayout>
);

interface SettingsOverlayProps {
  settings: GameSettings;
  rendererInfo: { width: number; height: number; isSoftwareGl: boolean } | null;
  onChange: (next: GameSettings) => void;
  onBack: () => void;
}

export const SettingsOverlay: React.FC<SettingsOverlayProps> = ({
  settings,
  rendererInfo,
  onChange,
  onBack,
}) => {
  const update = <K extends keyof GameSettings>(k: K, v: GameSettings[K]) => {
    soundEngine.playClick();
    onChange({ ...settings, [k]: v });
  };

  return (
    <SubScreenLayout
      onBack={onBack}
      title="Paramètres graphiques & contrôles"
      subtitle="Ajustez la qualité visuelle, l’atmosphère et l’ergonomie mobile/PC"
      icon={<Sliders className="w-5 h-5" />}
    >
      <div className="space-y-5">
        {/* Quality Levels */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <label className="text-sm font-medium text-white">Qualité de rendu</label>
            {rendererInfo && (
              <span className="font-mono-tabular text-xs text-zinc-400">
                Résolution active : {rendererInfo.width} × {rendererInfo.height} px
                {rendererInfo.isSoftwareGl ? ' (Rendu logiciel)' : ''}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                ['low', 'Basse (0.75x)'],
                ['medium', 'Moyenne (1x)'],
                ['high', 'Haute'],
                ['uhd4k', '4K UHD (cible)'],
              ] as [GraphicsQuality, string][]
            ).map(([q, label]) => (
              <button
                key={q}
                onClick={() => update('quality', q)}
                className={`min-h-[44px] rounded-xl text-xs font-medium border transition-colors ${
                  settings.quality === q
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 font-semibold'
                    : 'bg-[#0c0e13] border-white/10 text-zinc-300 hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-1.5">
            Le mode 4K UHD augmente la densité de pixels jusqu’à 3840 × 2160 sur écrans et GPU compatibles.
          </p>
        </div>

        {/* Weather & Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">Météo dynamique</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['clear', 'Clair'],
                  ['rain', 'Pluie'],
                  ['fog', 'Brouillard'],
                ] as [WeatherType, string][]
              ).map(([w, lbl]) => (
                <button
                  key={w}
                  onClick={() => update('weather', w)}
                  className={`min-h-[44px] rounded-xl text-xs font-medium border ${
                    settings.weather === w
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-[#0c0e13] border-white/10 text-zinc-300'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Heure du jour ({Math.floor(settings.timeOfDay)}:00)
            </label>
            <input
              type="range"
              min={0}
              max={23.5}
              step={0.5}
              value={settings.timeOfDay}
              onChange={(e) => update('timeOfDay', parseFloat(e.target.value))}
              className="w-full accent-amber-500"
            />
            <label className="flex items-center gap-2 mt-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoTimeCycle}
                onChange={(e) => update('autoTimeCycle', e.target.checked)}
                className="accent-amber-500 w-4 h-4"
              />
              <span>Cycle jour/nuit automatique</span>
            </label>
          </div>
        </div>

        {/* Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => update('shadowsEnabled', !settings.shadowsEnabled)}
            className="min-h-[46px] px-4 rounded-xl bg-[#0c0e13] border border-white/10 flex items-center justify-between text-xs text-zinc-200"
          >
            <span>Ombres dynamiques</span>
            <span className={settings.shadowsEnabled ? 'text-amber-400 font-semibold' : 'text-zinc-500'}>
              {settings.shadowsEnabled ? 'Activées' : 'Désactivées'}
            </span>
          </button>

          <button
            onClick={() => {
              const next = !settings.audioEnabled;
              soundEngine.setEnabled(next);
              update('audioEnabled', next);
            }}
            className="min-h-[46px] px-4 rounded-xl bg-[#0c0e13] border border-white/10 flex items-center justify-between text-xs text-zinc-200"
          >
            <span className="flex items-center gap-2">
              {settings.audioEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-zinc-500" />}
              Audio procédural
            </span>
            <span className={settings.audioEnabled ? 'text-amber-400 font-semibold' : 'text-zinc-500'}>
              {settings.audioEnabled ? 'Actif' : 'Muet'}
            </span>
          </button>

          <select
            value={settings.touchControlsMode}
            onChange={(e) => update('touchControlsMode', e.target.value as GameSettings['touchControlsMode'])}
            className="min-h-[46px] px-3 rounded-xl bg-[#0c0e13] border border-white/10 text-xs text-zinc-200"
          >
            <option value="auto">Commandes tactiles : Auto</option>
            <option value="always">Commandes tactiles : Toujours</option>
            <option value="off">Commandes tactiles : Masquées</option>
          </select>
        </div>
      </div>
    </SubScreenLayout>
  );
};
