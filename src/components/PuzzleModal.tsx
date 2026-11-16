import React, { useState } from 'react';
import { Lock, Unlock, ChevronUp, ChevronDown, X, HelpCircle } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';

interface PuzzleModalProps {
  chapter: 1 | 2;
  cluesFound: string[];
  hasNpcHint: boolean;
  onUnlock: () => void;
  onClose: () => void;
}

export const PuzzleModal: React.FC<PuzzleModalProps> = ({
  chapter,
  cluesFound,
  hasNpcHint,
  onUnlock,
  onClose,
}) => {
  const targetCode = chapter === 1 ? [4, 3, 2, 7] : [4, 2, 3, 9];
  const [digits, setDigits] = useState<[number, number, number, number]>([0, 0, 0, 0]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  const cycleDigit = (idx: number, delta: number) => {
    if (unlocked) return;
    soundEngine.playClick();
    setErrorMsg(null);
    setDigits((prev) => {
      const next = [...prev] as [number, number, number, number];
      next[idx] = (next[idx] + delta + 10) % 10;
      return next;
    });
  };

  const handleSubmit = () => {
    const match = digits.every((d, i) => d === targetCode[i]);
    if (match) {
      soundEngine.playUnlock();
      setUnlocked(true);
      setErrorMsg(null);
      setTimeout(() => {
        onUnlock();
      }, 950);
    } else {
      soundEngine.playAlert();
      setErrorMsg(
        chapter === 1
          ? 'Combinaison incorrecte. Observez le Hangar 4 et relisez les indices.'
          : 'Séquence de vannes invalide. Comptez les piliers, balises ambre et conduites rouges.'
      );
    }
  };

  const hasJournal = cluesFound.includes('clue_journal');
  const hasManifest = cluesFound.includes('clue_manifest');
  const hasValveNote = cluesFound.includes('clue_valve_note');

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-lg bg-[#12151c] border border-white/15 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              {unlocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-white">
                {chapter === 1 ? 'Coffre blindé du Secteur 4' : 'Tableau des Vannes & Lasers'}
              </h2>
              <p className="text-xs text-zinc-400">
                {chapter === 1
                  ? 'Déduisez le code à 4 chiffres à partir de l’environnement du Quai 4'
                  : 'Entrez la séquence de pression pour désactiver la barrière laser'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="bg-[#0b0d12] border border-white/10 rounded-xl p-3.5 mb-5 space-y-2 text-xs text-zinc-300">
          <p className="font-medium text-zinc-200">Indices recueillis :</p>
          {chapter === 1 ? (
            <>
              {hasJournal ? (
                <p>
                  • <span className="text-amber-300">Carnet du contremaître :</span> 1er chiffre = quai (4). 2e chiffre = lampadaires allumés devant le hangar.
                </p>
              ) : (
                <p className="text-zinc-500">• Carnet non examiné (établi de l’abri ouest).</p>
              )}
              {hasManifest ? (
                <p>
                  • <span className="text-amber-300">Bordereau de cargaison :</span> 3e chiffre = caisses bleues scellées devant l’entrée. 4e = somme des deux premiers.
                </p>
              ) : (
                <p className="text-zinc-500">• Bordereau non examiné (casier du Hangar 4).</p>
              )}
              {hasNpcHint && (
                <p className="text-emerald-300">
                  • Conseil de Nadia : « 3 lampadaires éclairent l’entrée et 2 caisses bleues bloquent le passage. »
                </p>
              )}
            </>
          ) : (
            <>
              {hasValveNote ? (
                <p>
                  • <span className="text-amber-300">Schéma des vannes :</span> Piliers centraux (1er), balises ambre allumées (2e), conduites rouges au mur nord (3e), somme totale (4e).
                </p>
              ) : (
                <p className="text-zinc-500">
                  • Plan non examiné (entrez dans l’appartement sûr au sud-ouest).
                </p>
              )}
              {hasNpcHint && (
                <p className="text-emerald-300">
                  • Conseil de Joris : « 4 piliers, 2 balises ambre, 3 conduites rouges. Additionnez le tout pour la 4e vanne. »
                </p>
              )}
            </>
          )}
        </div>

        <div className="grid grid-cols-4 gap-3 mb-5">
          {digits.map((val, idx) => (
            <div
              key={idx}
              className="flex flex-col items-center bg-[#181c26] border border-white/10 rounded-xl p-2"
            >
              <button
                onClick={() => cycleDigit(idx, 1)}
                aria-label={`Augmenter chiffre ${idx + 1}`}
                className="w-full min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-300"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
              <div className="font-mono-tabular text-3xl font-semibold text-white py-2">{val}</div>
              <button
                onClick={() => cycleDigit(idx, -1)}
                aria-label={`Diminuer chiffre ${idx + 1}`}
                className="w-full min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/10 text-zinc-300"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {errorMsg && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2 mb-4">
            {errorMsg}
          </p>
        )}

        {unlocked && (
          <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 rounded-lg px-3 py-2 mb-4">
            {chapter === 1
              ? 'Mécanisme déverrouillé ! Badge magnétique Secteur 4 et Pistolet K-9 récupérés.'
              : 'Barrière laser désactivée ! Accès au Serveur de la Coupure ouvert.'}
          </p>
        )}

        {showHint && !unlocked && (
          <p className="text-xs text-amber-200 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2 mb-4">
            {chapter === 1
              ? 'Logique : Quai (4) · Lampadaires allumés (3) · Caisses bleues (2) · Somme 4 + 3 (7).'
              : 'Logique : Piliers (4) · Balises ambre (2) · Conduites rouges (3) · Somme 4 + 2 + 3 (9).'}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <button
            onClick={() => {
              soundEngine.playClick();
              setShowHint((v) => !v);
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-lg text-xs text-zinc-300 hover:text-white bg-white/5 hover:bg-white/10 flex items-center gap-2"
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>{showHint ? 'Masquer l’aide' : 'Aide logique'}</span>
          </button>

          <button
            onClick={handleSubmit}
            disabled={unlocked}
            className="min-h-[44px] px-6 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-zinc-950 font-semibold text-sm rounded-lg transition-colors"
          >
            {unlocked ? 'Validé' : 'Valider le code'}
          </button>
        </div>
      </div>
    </div>
  );
};
