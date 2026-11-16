import React, { useState } from 'react';
import { Check, Volume2, ArrowLeft, Play } from 'lucide-react';
import {
  AccessoryType,
  BeardStyle,
  BuildType,
  CharacterProfile,
  FaceShape,
  HairStyle,
  NoseType,
  MouthType,
  OutfitStyle,
  ScarType,
  ShoeStyle,
  TattooType,
} from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface CharacterCreatorProps {
  character: CharacterProfile;
  onChange: (next: CharacterProfile) => void;
  onBack: () => void;
  onStartAdventure: () => void;
}

type CreatorTab = 'corps' | 'visage' | 'coiffure' | 'tenue' | 'marques';

const SKIN_TONES = ['#f1c9b1', '#dca684', '#c68b67', '#9b6447', '#6c432e', '#462a1d'];
const EYE_COLORS = ['#3b6e8c', '#4a6b48', '#5e4028', '#2a3038', '#7d6c3e'];
const HAIR_COLORS = ['#1b1c20', '#3d281b', '#6d4c2f', '#a98552', '#8e3824', '#cfd4dc'];
const OUTFIT_COLORS = ['#1f252d', '#2b2220', '#202d26', '#2a2a35', '#42362a'];
const SHOE_COLORS = ['#17181c', '#3c291e', '#2d333b', '#4d4f54'];

export const CharacterCreator: React.FC<CharacterCreatorProps> = ({
  character,
  onChange,
  onBack,
  onStartAdventure,
}) => {
  const [tab, setTab] = useState<CreatorTab>('corps');

  const update = <K extends keyof CharacterProfile>(key: K, value: CharacterProfile[K]) => {
    soundEngine.playClick();
    onChange({ ...character, [key]: value });
  };

  const hasShadowCoat = character.unlockedRewards?.includes('shadow_coat');
  const hasEchoVisor = character.unlockedRewards?.includes('echo_visor');

  const socialPerception = (() => {
    if (character.outfitStyle === 'shadow_coat') {
      return 'Tenue d’Ombre évolutive · Vous intimidez la Garde et gagnez le respect des contacts clandestins.';
    }
    if (character.outfitStyle === 'tactical' || character.scar !== 'none') {
      return 'Présence intimidante · Les gardes restent méfiants mais les informateurs vous respectent.';
    }
    if (character.outfitStyle === 'civilian' && character.accessory === 'glasses') {
      return 'Profil discret · Vous passez plus facilement inaperçu dans les quartiers civils.';
    }
    return 'Allure équilibrée · Vous inspirez confiance aux habitants sans alerter immédiatement la Garde.';
  })();

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 md:p-6">
      <div className="pointer-events-auto flex items-center justify-between gap-4 bg-[#101217]/90 border border-white/10 rounded-xl px-4 py-3 max-w-5xl w-full mx-auto">
        <button
          onClick={() => {
            soundEngine.playClick();
            onBack();
          }}
          className="min-h-[44px] px-3 py-2 flex items-center gap-2 text-sm text-zinc-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Menu</span>
        </button>

        <div className="text-center truncate">
          <h1 className="font-display text-xl md:text-2xl font-semibold tracking-wide text-white">
            Création du personnage
          </h1>
          <p className="text-xs text-zinc-400 truncate hidden sm:block">
            Glissez sur l’aperçu 3D pour inspecter · Vos choix influencent les dialogues
          </p>
        </div>

        <button
          onClick={() => {
            soundEngine.playUnlock();
            onStartAdventure();
          }}
          className="min-h-[44px] px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Lancer l’aventure</span>
        </button>
      </div>

      <div className="pointer-events-auto w-full max-w-4xl mx-auto bg-[#101217]/92 border border-white/10 rounded-2xl p-4 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10 text-xs">
          <span className="text-zinc-300">{socialPerception}</span>
          <span className="text-amber-400 font-medium tabular-nums">
            Identité : {character.name || 'Sans nom'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-white/10">
          {(
            [
              ['corps', 'Identité & Corps'],
              ['visage', 'Visage'],
              ['coiffure', 'Cheveux & Barbe'],
              ['tenue', 'Tenue & Chaussures'],
              ['marques', 'Accessoires & Marques'],
            ] as [CreatorTab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              onClick={() => {
                soundEngine.playClick();
                setTab(id);
              }}
              className={`min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                tab === id
                  ? 'bg-amber-500 text-zinc-950 font-semibold'
                  : 'bg-white/5 text-zinc-300 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[34vh] overflow-y-auto pr-1">
          {tab === 'corps' && (
            <>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Nom du personnage</label>
                <input
                  type="text"
                  maxLength={24}
                  value={character.name}
                  onChange={(e) => onChange({ ...character, name: e.target.value })}
                  className="w-full min-h-[44px] bg-[#181c24] border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-amber-500"
                  placeholder="Entrez un nom..."
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Genre</label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ['male', 'Masculin'],
                      ['female', 'Féminin'],
                    ] as const
                  ).map(([g, label]) => (
                    <button
                      key={g}
                      onClick={() => update('gender', g)}
                      className={`min-h-[44px] rounded-lg text-sm font-medium border transition-colors ${
                        character.gender === g
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-[#181c24] border-white/10 text-zinc-300 hover:bg-white/5'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Taille ({Math.round(character.heightScale * 175)} cm)
                </label>
                <input
                  type="range"
                  min={0.9}
                  max={1.12}
                  step={0.01}
                  value={character.heightScale}
                  onChange={(e) => update('heightScale', parseFloat(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Morphologie</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['lean', 'Mince'],
                      ['athletic', 'Athlétique'],
                      ['heavy', 'Robuste'],
                    ] as [BuildType, string][]
                  ).map(([b, label]) => (
                    <button
                      key={b}
                      onClick={() => update('buildType', b)}
                      className={`min-h-[44px] rounded-lg text-xs font-medium border transition-colors ${
                        character.buildType === b
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-[#181c24] border-white/10 text-zinc-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'visage' && (
            <>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Couleur de peau</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {SKIN_TONES.map((tone) => (
                    <button
                      key={tone}
                      onClick={() => update('skinTone', tone)}
                      aria-label={`Peau ${tone}`}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-transform ${
                        character.skinTone === tone ? 'border-amber-400 scale-105' : 'border-white/15'
                      }`}
                      style={{ backgroundColor: tone }}
                    >
                      {character.skinTone === tone && <Check className="w-4 h-4 text-zinc-900" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Couleur des yeux</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {EYE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => update('eyeColor', c)}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${
                        character.eyeColor === c ? 'border-amber-400 scale-105' : 'border-white/15'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {character.eyeColor === c && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Forme du visage</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['oval', 'Ovale'],
                      ['angular', 'Anguleux'],
                      ['broad', 'Large'],
                    ] as [FaceShape, string][]
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => update('faceShape', val)}
                      className={`min-h-[44px] rounded-lg text-xs font-medium border ${
                        character.faceShape === val
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-[#181c24] border-white/10 text-zinc-300'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Nez</label>
                  <select
                    value={character.noseType}
                    onChange={(e) => update('noseType', e.target.value as NoseType)}
                    className="w-full min-h-[44px] bg-[#181c24] border border-white/10 rounded-lg px-2.5 text-xs text-white"
                  >
                    <option value="straight">Droit</option>
                    <option value="aquiline">Aquilin</option>
                    <option value="broad">Large</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5">Bouche</label>
                  <select
                    value={character.mouthType}
                    onChange={(e) => update('mouthType', e.target.value as MouthType)}
                    className="w-full min-h-[44px] bg-[#181c24] border border-white/10 rounded-lg px-2.5 text-xs text-white"
                  >
                    <option value="firm">Déterminée</option>
                    <option value="neutral">Neutre</option>
                    <option value="soft">Douce</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {tab === 'coiffure' && (
            <>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Coiffure</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(
                    [
                      ['fade', 'Dégradé'],
                      ['short', 'Court'],
                      ['long', 'Long'],
                      ['bun', 'Chignon'],
                      ['bald', 'Rasé'],
                    ] as [HairStyle, string][]
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => update('hairStyle', val)}
                      className={`min-h-[44px] rounded-lg text-xs font-medium border ${
                        character.hairStyle === val
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-[#181c24] border-white/10 text-zinc-300'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Couleur des cheveux</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {HAIR_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => update('hairColor', c)}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${
                        character.hairColor === c ? 'border-amber-400 scale-105' : 'border-white/15'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {character.hairColor === c && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-zinc-400 mb-1.5">Barbe</label>
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      ['none', 'Rasé'],
                      ['stubble', '3 jours'],
                      ['short', 'Courte'],
                      ['full', 'Complète'],
                    ] as [BeardStyle, string][]
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => update('beardStyle', val)}
                      className={`min-h-[44px] rounded-lg text-xs font-medium border ${
                        character.beardStyle === val
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-[#181c24] border-white/10 text-zinc-300'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'tenue' && (
            <>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Style de tenue</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(
                    [
                      ['coat', 'Manteau long'],
                      ['tactical', 'Tactique'],
                      ['civilian', 'Civil'],
                      ...(hasShadowCoat ? [['shadow_coat', 'Ombre (Débloqué)']] : []),
                    ] as [OutfitStyle, string][]
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => update('outfitStyle', val)}
                      className={`min-h-[44px] rounded-lg text-xs font-medium border ${
                        character.outfitStyle === val
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-[#181c24] border-white/10 text-zinc-300'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Couleur principale</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {OUTFIT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => update('outfitColor', c)}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${
                        character.outfitColor === c ? 'border-amber-400 scale-105' : 'border-white/15'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {character.outfitColor === c && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Chaussures</label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['boots', 'Bottes'],
                      ['sneakers', 'Baskets'],
                      ['tactical', 'Rangers'],
                    ] as [ShoeStyle, string][]
                  ).map(([val, lbl]) => (
                    <button
                      key={val}
                      onClick={() => update('shoeStyle', val)}
                      className={`min-h-[44px] rounded-lg text-xs font-medium border ${
                        character.shoeStyle === val
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300'
                          : 'bg-[#181c24] border-white/10 text-zinc-300'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Couleur chaussures</label>
                <div className="flex items-center gap-2">
                  {SHOE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => update('shoeColor', c)}
                      className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center ${
                        character.shoeColor === c ? 'border-amber-400 scale-105' : 'border-white/15'
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {character.shoeColor === c && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'marques' && (
            <>
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Accessoire</label>
                <select
                  value={character.accessory}
                  onChange={(e) => update('accessory', e.target.value as AccessoryType)}
                  className="w-full min-h-[44px] bg-[#181c24] border border-white/10 rounded-lg px-3 text-sm text-white"
                >
                  <option value="none">Aucun</option>
                  <option value="earpiece">Oreillette tactique</option>
                  <option value="glasses">Lunettes fumées</option>
                  <option value="scarf">Écharpe sombre</option>
                  <option value="watch">Montre acier</option>
                  {hasEchoVisor && <option value="echo_visor">Visière Écho (Débloquée)</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Tatouage</label>
                <select
                  value={character.tattoo}
                  onChange={(e) => update('tattoo', e.target.value as TattooType)}
                  className="w-full min-h-[44px] bg-[#181c24] border border-white/10 rounded-lg px-3 text-sm text-white"
                >
                  <option value="none">Aucun</option>
                  <option value="arm_band">Bracelet géométrique (avant-bras)</option>
                  <option value="neck_mark">Symbole sur la nuque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">Cicatrice</label>
                <select
                  value={character.scar}
                  onChange={(e) => update('scar', e.target.value as ScarType)}
                  className="w-full min-h-[44px] bg-[#181c24] border border-white/10 rounded-lg px-3 text-sm text-white"
                >
                  <option value="none">Aucune</option>
                  <option value="brow">Arcade sourcilière</option>
                  <option value="cheek">Joue gauche</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1.5">
                  Timbre de voix ({character.voicePitch.toFixed(2)}x)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0.75}
                    max={1.25}
                    step={0.05}
                    value={character.voicePitch}
                    onChange={(e) => update('voicePitch', parseFloat(e.target.value))}
                    className="flex-1 accent-amber-500"
                  />
                  <button
                    onClick={() => soundEngine.playEchoPulse(character.voicePitch)}
                    className="min-h-[44px] px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-zinc-200 flex items-center gap-1.5 shrink-0"
                  >
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    <span>Tester</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
