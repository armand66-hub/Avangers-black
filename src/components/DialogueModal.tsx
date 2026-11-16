import React, { useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { CharacterProfile, MissionProgress } from '../types/game';
import { soundEngine } from '../audio/soundEngine';

interface DialogueModalProps {
  npcId: 'nadia' | 'joris';
  character: CharacterProfile;
  mission: MissionProgress;
  onChoice: (choiceId: 'cooperate' | 'hint' | 'intimidate') => void;
  onClose: () => void;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  npcId,
  character,
  mission,
  onChoice,
  onClose,
}) => {
  const [step, setStep] = useState<'root' | 'after_hint' | 'after_ally' | 'after_intimidate'>('root');

  const handleSelect = (choice: 'cooperate' | 'hint' | 'intimidate') => {
    soundEngine.playClick();
    onChoice(choice);
    if (choice === 'hint') setStep('after_hint');
    else if (choice === 'cooperate') setStep('after_ally');
    else setStep('after_intimidate');
  };

  if (npcId === 'joris') {
    const ch1Memory =
      mission.nadiaDisposition === 'allied'
        ? `« Nadia m’a prévenu de votre arrivée, ${character.name}. Elle dit qu’on peut vous faire confiance. »`
        : mission.guardStatus === 'stunned'
        ? `« J’ai entendu ce qui est arrivé à la sentinelle du Quai 4, ${character.name}. Vous réglez vos problèmes à la dure. »`
        : `« Tiens, un visage neuf dans les Galeries. Votre tenue ne trompe personne ici. »`;

    return (
      <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 p-4">
        <div className="w-full max-w-xl bg-[#12151c] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-semibold text-white">Joris le Passeur</h2>
                <p className="text-xs text-zinc-400">
                  Contact souterrain · Relation :{' '}
                  <span className="text-amber-300">
                    {mission.ch2JorisDisposition === 'allied'
                      ? 'Allié'
                      : mission.ch2JorisDisposition === 'hostile'
                      ? 'Hostile'
                      : 'Neutre'}
                  </span>
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

          <div className="bg-[#0b0d12] border border-white/10 rounded-xl p-4 mb-5 text-sm leading-relaxed text-zinc-200 space-y-2">
            {step === 'root' && (
              <>
                <p>{ch1Memory}</p>
                <p className="text-zinc-400">
                  « Le Serveur de la Coupure est derrière la barrière laser au nord. Il y a deux options : résoudre la séquence du tableau des vannes à l’ouest, ou contourner par la brèche de ventilation à l’extrême est du mur. »
                </p>
              </>
            )}
            {step === 'after_hint' && (
              <p>
                « Les ingénieurs comptent toujours la salle : 4 piliers de béton au centre, 2 balises ambre allumées et 3 conduites rouges au mur nord. Additionnez les trois pour le 4e chiffre. »
              </p>
            )}
            {step === 'after_ally' && (
              <p>
                « D’accord. Je lance une surcharge radio sur le communicateur de l’opérateur d’élite — il ne vous cherchera plus. Récupérez le disque du serveur avant que le secteur ne verrouille. »
              </p>
            )}
            {step === 'after_intimidate' && (
              <p>
                « Très bien, jouez en solitaire. Mais si la Garde vous repère dans les galeries, ne comptez pas sur mon passage de sortie. »
              </p>
            )}
          </div>

          {step === 'root' ? (
            <div className="space-y-2.5">
              <button
                onClick={() => handleSelect('hint')}
                className="w-full min-h-[46px] text-left px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-zinc-100"
              >
                « Comment fonctionne la séquence des vannes ? » <span className="text-xs text-amber-400">(Indice)</span>
              </button>
              {mission.guardStatus !== 'bribed' && mission.guardStatus !== 'stunned' && (
                <button
                  onClick={() => handleSelect('cooperate')}
                  className="w-full min-h-[46px] text-left px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-200"
                >
                  « Brouillez les fréquences de l’opérateur d’élite, on expose la Coupure ensemble. » <span className="text-xs text-emerald-400">(Alliance)</span>
                </button>
              )}
              <button
                onClick={() => handleSelect('intimidate')}
                className="w-full min-h-[46px] text-left px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/25 text-sm text-red-200"
              >
                « Pas besoin d’aide. Donnez-moi juste de l’air. »
              </button>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={() => {
                  soundEngine.playClick();
                  onClose();
                }}
                className="min-h-[44px] px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm rounded-lg"
              >
                Reprendre l’infiltration
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Chapter 1: Nadia Vance
  const appearanceReaction = (() => {
    if (character.outfitStyle === 'tactical' || character.outfitStyle === 'shadow_coat') {
      return `« Vu votre équipement${character.scar !== 'none' ? ' et cette cicatrice' : ''}, ${character.name}, vous n’êtes pas un simple docker. La Garde d’Obsidienne vous repérera vite. »`;
    }
    if (character.outfitStyle === 'civilian' && character.accessory === 'glasses') {
      return `« Vous avez l’air d’un inspecteur civil, ${character.name}. Avec cette tenue discrète, vous pouvez encore négocier avant que les sirènes ne sonnent. »`;
    }
    return `« ${character.name}… je ne pensais pas revoir quelqu’un ici après la Coupure. »`;
  })();

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-xl bg-[#12151c] border border-white/15 rounded-2xl p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-amber-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-white">Nadia Vance</h2>
              <p className="text-xs text-zinc-400">
                Informatrice du Port-Brume · Relation :{' '}
                <span className="text-amber-300">
                  {mission.nadiaDisposition === 'allied'
                    ? 'Alliée'
                    : mission.nadiaDisposition === 'suspicious'
                    ? 'Méfiante'
                    : 'Neutre'}
                </span>
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

        <div className="bg-[#0b0d12] border border-white/10 rounded-xl p-4 mb-5 text-sm leading-relaxed text-zinc-200 space-y-2">
          {step === 'root' && (
            <>
              <p>{appearanceReaction}</p>
              <p className="text-zinc-400">
                {mission.spotlightDisabled
                  ? '« Beau travail pour le projecteur du quai. La sentinelle est aveugle côté ouest maintenant. »'
                  : '« Si vous voulez entrer dans le Hangar 4 sans finir repéré, coupez d’abord le boîtier électrique près du camion, ou trouvez le code du coffre. »'}
              </p>
            </>
          )}
          {step === 'after_hint' && (
            <p>
              « Écoutez bien : les hommes de la Garde notent leurs codes avec des repères visuels. Regardez les lampadaires allumés devant le hangar et les caisses bleues scellées près de la porte. »
            </p>
          )}
          {step === 'after_ally' && (
            <p>
              « Marché conclu. Je vais attirer la sentinelle vers la guérite avec un faux appel radio. La voie vers le Hangar 4 et la trappe souterraine est libre. »
            </p>
          )}
          {step === 'after_intimidate' && (
            <p>
              « Gardez vos menaces pour la Garde. Prenez ce que vous voulez dans ce secteur, mais ne comptez pas sur moi pour couvrir vos arrières. »
            </p>
          )}
        </div>

        {step === 'root' ? (
          <div className="space-y-2.5">
            <button
              onClick={() => handleSelect('hint')}
              className="w-full min-h-[46px] text-left px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-zinc-100"
            >
              « Que savez-vous sur le coffre du Hangar 4 ? » <span className="text-xs text-amber-400">(Indice)</span>
            </button>

            {mission.guardStatus !== 'bribed' && mission.guardStatus !== 'stunned' && (
              <button
                onClick={() => handleSelect('cooperate')}
                className="w-full min-h-[46px] text-left px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-sm text-emerald-200"
              >
                « Aidez-moi à éloigner la sentinelle sans violence, je partagerai les preuves. » <span className="text-xs text-emerald-400">(Diplomate)</span>
              </button>
            )}

            <button
              onClick={() => handleSelect('intimidate')}
              className="w-full min-h-[46px] text-left px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/25 text-sm text-red-200"
            >
              « Restez hors de mon chemin, je gère la Garde à ma façon. »
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => {
                soundEngine.playClick();
                onClose();
              }}
              className="min-h-[44px] px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold text-sm rounded-lg"
            >
              Continuer l’exploration
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
