# AVANGERS BLACK

Jeu vidéo d'aventure, de survie, d'exploration et d'énigmes 3D où chaque décision façonne votre personnage et votre histoire (*Écho de Conscience*).

## Contenu du dépôt

* **Version Web 3D jouable (`/src`)** — React 19, TypeScript, Three.js (WebGL2 PBR + bump maps procéduraux, cycle jour/nuit, météo pluie/brouillard, audio Web Audio API 100 % procédural, contrôles PC + joystick tactile mobile).
* **Projet mobile Android natif (`/android`)** — Kotlin, Jetpack Compose et moteur de rendu 3D OpenGL ES 3.0 (`OpenGLWorldRenderer.kt`, `PuzzleAndStoryEngine.kt`, `GameModels.kt`, `AvangersBlackScreen.kt`, `MainActivity.kt`).

## Systèmes implémentés

1. **Création personnalisée 3D en direct** : genre, nom, taille, morphologie, peau, yeux, forme du visage, nez, bouche, coiffure, barbe, tenue, chaussures, accessoires, tatouages, cicatrices, timbre de voix et récompenses évolutives débloquées en mission (`Tenue d'Ombre`, `Visière Écho`).
2. **Chapitre 1 — Nuit sur le Quai 4 (Port-Brume)** : exploration portuaire, sabotage du projecteur, dialogue réactif avec Nadia Vance, IA sentinelle avec cône de vision, énigme logique environnementale du coffre (`4327`) et 3 fins possibles (*Alliance*, *Fantôme*, *Force*).
3. **Chapitre 2 — Les Galeries de la Coupure** : appartement sûr visitable, contact Joris le Passeur avec mémoire du Chapitre 1, barrière laser contournable ou désactivable via le tableau des vannes (`4239`), opérateur d'élite et extraction du serveur.
4. **Identité *L'Écho de Conscience*** : axes *Humanité*, *Exposition* et *Perspicacité* + perception Écho révélant les éléments interactifs.

## Lancer la version Web localement

```bash
npm install
npm run dev
```

## Ouvrir la version Android (Kotlin)

Ouvrez le dossier `android/` dans **Android Studio** (AGP 8.5+, Kotlin 2.0, SDK 35).
