# TravelMate : application mobile de gestion de voyages

[![CI](https://github.com/oussamaa29/TravelApp/actions/workflows/ci.yml/badge.svg)](https://github.com/oussamaa29/TravelApp/actions/workflows/ci.yml)

Application React Native (Expo) pour planifier ses voyages : création de voyages avec photos, liste et statistiques, profil, notifications, et fonctionnement hors ligne avec synchronisation au retour du réseau.

Projet fil rouge du cours **Native Cross Platform Development** (5NATVX / E5WMD), ESTIAM, 2025/2026.

**Équipe** : Oussama Chaghil et Achraf Chergui.

## Stack

| Couche | Techno |
|---|---|
| Application | Expo SDK 54, React Native 0.81, React 19, TypeScript |
| Navigation | Expo Router 6 (routes par fichiers, onglets) |
| Stockage | `expo-secure-store` pour les jetons (Keychain / Keystore), AsyncStorage pour le cache hors ligne |
| Fonctions natives | Photos depuis la galerie (`expo-image-picker`), notifications, détection du réseau |
| Backend de démonstration | Node.js + Express (`mock-backend/`), JWT, données en mémoire |

## Lancer le projet

### 1. Backend de démonstration

```bash
cd mock-backend
npm install
npm start            # http://localhost:4000
```

Il gère les comptes, les jetons (accès de 15 min + rafraîchissement à usage unique), les voyages de chaque utilisateur et l'envoi des photos (images de 5 Mo maximum). Les données sont en mémoire : elles disparaissent au redémarrage.

### 2. Application

```bash
npm install
cp .env.example .env
npx expo start
```

Dans `.env`, `EXPO_PUBLIC_MOCK_BACKEND_URL` doit pointer vers le backend :
- simulateur iOS ou web : `http://localhost:4000` ;
- émulateur Android : `http://10.0.2.2:4000` ;
- téléphone avec Expo Go : `http://<IP de l'ordinateur>:4000` (même réseau Wi-Fi).

Scanner ensuite le QR code avec Expo Go (Android) ou l'appareil photo (iOS), puis créer un compte depuis l'écran de connexion.

## Architecture

```
TravelApp/
├── app/                  # Écrans (Expo Router)
│   ├── (tabs)/           # Accueil, voyages, notifications, profil
│   ├── modal/add-trip.tsx
│   ├── login.tsx
│   └── _layout.tsx       # Garde d'authentification + bandeau hors ligne / synchronisation
├── contexts/             # Contexte d'authentification (useAuth)
├── services/             # API (voyages, photos), file d'attente hors ligne, notifications
├── utils/                # Jetons JWT (stockage, rafraîchissement), configuration
├── hooks/                # useOffline, useNotifications, thème
└── mock-backend/         # API de démonstration + tests
```

## Choix techniques

**Jetons.** Le jeton d'accès et le jeton de rafraîchissement sont dans SecureStore, jamais dans AsyncStorage. `auth.fetch()` ajoute le jeton à chaque appel, le rafraîchit s'il expire dans moins d'une minute, et réessaie une fois après un 401. Les rafraîchissements simultanés sont regroupés en une seule requête.

**Hors ligne.** Les voyages sont mis en cache. Créé sans réseau, un voyage part dans une file d'attente, rejouée au retour du réseau. Le bandeau en haut de l'écran indique le nombre d'actions en attente.

**Services séparés de l'interface.** Les écrans n'appellent jamais `fetch` directement : tout passe par `services/` et `utils/auth.ts`, avec une configuration centralisée dans `utils/env.ts`.

## Corrections récentes

- La synchronisation hors ligne rejouait les créations de voyage **sans jeton** : le backend les refusait et elles restaient bloquées dans la file. Elle passe maintenant par `auth.fetch()`, et un refus compte comme un échec au lieu d'être ignoré.
- Le backend dont dépendait l'application n'était pas publié. Il est maintenant dans `mock-backend/`, avec ses tests.
- `.gitignore` réparé : la règle `.env` avait été enregistrée dans un mauvais encodage et n'avait aucun effet.
- Fichiers d'exemple du modèle Expo retirés, application renommée (`MyFirstApp` → `TravelMate`).

## Tests et CI

```bash
cd mock-backend && npm test     # 12 tests : auth, rotation des jetons, isolation des voyages, photos
npx tsc --noEmit                # typage de l'application
npx expo lint
```

La CI GitHub Actions exécute les trois.

## Fonctionnalités

Réalisées : inscription et connexion, liste et ajout de voyages avec photos, statistiques, profil et déconnexion, notifications (permissions), mode hors ligne avec synchronisation.

À venir : page de détail d'un voyage, carte, recherche et filtres, sélecteur de dates, traduction anglaise, tests des écrans.

## Licence

Projet académique réalisé à ESTIAM.
