# TravelMate - Application de Gestion de Voyages

## 📱 À propos du projet

TravelMate est une application mobile React Native développée dans le cadre du cours **Native Cross Platform Development (5NATVX / E5WMD)** à ESTIAM pour l'année académique 2025/2026.

L'application permet aux utilisateurs de planifier leurs voyages, ajouter des photos, gérer leurs activités et suivre leurs statistiques de voyage.

## 🚀 Installation et démarrage

### Prérequis
- Node.js (v18 ou supérieur)
- npm ou yarn
- Expo CLI
- Un émulateur iOS/Android ou l'application Expo Go sur votre appareil

### Installation du Frontend

```bash
# Cloner le repository
git clone https://github.com/oussamaa29/TravelApp.git
cd TravelApp

nom : chaghil oussama , achraf chergui

# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Mettre à jour l'IP dans .env avec l'IP de votre ordinateur
# EXPO_PUBLIC_MOCK_BACKEND_URL=http://VOTRE_IP:4000
```

### Installation du Backend

```bash
# Cloner le backend
git clone https://github.com/oussamaa29/TravelApp-Backend.git
cd TravelApp-Backend

# Installer les dépendances
npm install

# Démarrer le serveur
npm start
```

Le backend sera disponible sur `http://localhost:4000`

### Démarrage de l'application

```bash
# Dans le dossier TravelApp
npx expo start
```

Scannez le QR code avec Expo Go (Android) ou l'application Appareil photo (iOS).

## 🏗️ Architecture du projet

```
TravelApp/
├── app/                      # Écrans et navigation (Expo Router)
│   ├── (tabs)/              # Navigation par onglets
│   │   ├── index.tsx        # Écran d'accueil
│   │   ├── trips.tsx        # Liste des voyages
│   │   ├── notification.tsx # Notifications
│   │   └── profile.tsx      # Profil utilisateur
│   ├── modal/               # Modales
│   │   └── add-trip.tsx     # Ajout de voyage
│   ├── login.tsx            # Authentification
│   └── _layout.tsx          # Layout principal + Auth Guard
├── components/              # Composants réutilisables
├── contexts/                # Context API (Auth)
├── hooks/                   # Hooks personnalisés
├── services/                # Services (API, Auth, Offline)
├── utils/                   # Utilitaires
└── constants/              # Constantes et thème
```

## 🔧 Améliorations réalisées

### 1. Architecture & Structure ✅

**Problèmes identifiés:**
- Logique métier dispersée dans les composants UI
- Appels API non centralisés
- Gestion d'état incohérente

**Solutions implémentées:**
- ✅ Centralisation de la logique réseau dans `services/api.ts`
- ✅ Service d'authentification unifié (`services/auth.ts` + `contexts/auth-context.tsx`)
- ✅ Hooks personnalisés cohérents (`useAuth`, `useOffline`, `useNotifications`)
- ✅ Séparation claire des responsabilités (UI / Logic / Data)

### 2. Authentification & Sécurité ✅

**Problèmes identifiés:**
- Tokens JWT mal gérés (bug dans `isTokenExpired`)
- Pas de vérification d'authentification avant les appels API
- Redirections incohérentes

**Solutions implémentées:**
- ✅ Correction du bug logique dans `auth.isAuthenticated()` (inversion du `!`)
- ✅ Vérification systématique des tokens avant chaque appel API
- ✅ Stockage sécurisé avec `expo-secure-store`
- ✅ Refresh automatique des tokens expirés
- ✅ Auth Guard dans `_layout.tsx` pour protéger les routes
- ✅ Gestion propre de la déconnexion

### 3. Gestion du réseau & Erreurs ✅

**Problèmes identifiés:**
- Erreur "Access token required" bloquante
- Pas de gestion des états de chargement
- Erreurs non user-friendly

**Solutions implémentées:**
- ✅ Utilisation de `auth.fetch()` pour tous les appels authentifiés
- ✅ Vérification de l'authentification avant chaque requête
- ✅ Retour gracieux (tableaux vides) en cas d'erreur
- ✅ Messages d'erreur clairs pour l'utilisateur
- ✅ Gestion du mode offline avec cache

### 4. Configuration & Environnement ✅

**Problèmes identifiés:**
- URL backend en dur (`localhost`)
- Impossible de tester sur appareil physique

**Solutions implémentées:**
- ✅ Variables d'environnement avec `.env`
- ✅ Configuration centralisée dans `utils/env.ts`
- ✅ Support des adresses IP locales pour tests sur device
- ✅ Fichier `.env.example` pour la documentation

### 5. Qualité du code ✅

**Améliorations:**
- ✅ Typage TypeScript strict sur tous les services
- ✅ Logs cohérents avec préfixes (`[AUTH]`, `[API]`, etc.)
- ✅ Gestion des erreurs avec try-catch systématiques
- ✅ Code commenté en français
- ✅ Respect des conventions de nommage

## 🎯 Fonctionnalités implémentées

### Obligatoires
- ✅ **Authentification complète** (Login/Register avec JWT)
- ✅ **Liste des voyages** (affichage depuis l'API)
- ✅ **Profil utilisateur** (données dynamiques, déconnexion)
- ✅ **Ajout de voyage** (formulaire avec validation)
- ✅ **Notifications** (gestion des permissions)
- ✅ **Mode offline** (cache et synchronisation)

### En cours / À améliorer
- ⚠️ **Détails d'un voyage** (navigation à compléter)
- ⚠️ **Vue carte** (Maps à intégrer)
- ⚠️ **Recherche et filtres** (UI présente, logique à finaliser)
- ⚠️ **Multilangue** (EN/FR à implémenter)
- ⚠️ **Calendar picker** pour les dates
- ⚠️ **RegEx validation** pour destination (City, Country)

## 📋 Décisions techniques

### Choix d'architecture

**Expo Router (File-based routing)**
- Navigation basée sur la structure de fichiers
- Plus moderne et maintenable que React Navigation classique
- Typage automatique des routes

**Context API pour l'authentification**
- Solution native React, pas de dépendance externe
- État global accessible dans toute l'app
- Évite le prop drilling

**Services séparés (API, Auth, Offline)**
- Séparation des responsabilités claire
- Facilite les tests unitaires
- Réutilisable et maintenable

### Gestion des erreurs

**Approche défensive:**
- Vérification systématique de l'authentification
- Retour de valeurs par défaut ([], null) plutôt que crashes
- Messages d'erreur user-friendly (pas de stack trace)

### Stockage

**expo-secure-store** pour les tokens
- Chiffrement natif (Keychain iOS, KeyStore Android)
- API simple et sécurisée

**AsyncStorage** pour le cache
- Données non sensibles (voyages, photos)
- Permet le mode offline

## 🔍 Tests

### Tests manuels effectués
- ✅ Inscription / Connexion
- ✅ Déconnexion
- ✅ Navigation entre les onglets
- ✅ Ajout d'un voyage
- ✅ Gestion des permissions (caméra, localisation)
- ✅ Mode offline (cache des données)
- ✅ Refresh des tokens

### Tests à implémenter
- ⚠️ Tests unitaires (Jest) pour les services
- ⚠️ Tests d'intégration pour l'authentification
- ⚠️ Tests E2E avec Detox

## 🐛 Bugs connus & Limitations

### Bugs corrigés
- ✅ Erreur "Access token required" au démarrage
- ✅ Bug logique dans `isTokenExpired` (inversé)
- ✅ Double redirection dans le Auth Guard
- ✅ Boucle infinie dans `useEffect` des notifications

### Limitations connues
- ⚠️ Pas de pagination pour la liste des voyages (limite à 50)
- ⚠️ Upload d'images limité à 5MB
- ⚠️ Pas de compression d'images avant upload
- ⚠️ Notifications push non testées en production
- ⚠️ Maps non implémentée (Google Maps API nécessaire)

## 📦 Dépendances principales

```json
{
  "expo": "~52.0.29",
  "expo-router": "~4.0.17",
  "react-native": "0.76.5",
  "expo-secure-store": "~14.0.0",
  "@react-native-async-storage/async-storage": "^2.1.0",
  "expo-image-picker": "~16.0.5",
  "expo-location": "~18.0.6",
  "expo-notifications": "~0.29.15"
}
```

## 🔐 Sécurité

### Mesures implémentées
- ✅ Tokens JWT stockés dans SecureStore (chiffré)
- ✅ `.env` dans `.gitignore` (pas de secrets exposés)
- ✅ Validation des entrées utilisateur
- ✅ HTTPS recommandé en production

### À améliorer
- ⚠️ Rate limiting côté backend
- ⚠️ Validation des fichiers uploadés (type, taille)
- ⚠️ CSRF protection
- ⚠️ Input sanitization plus stricte

## 📱 Compatibilité

- ✅ iOS 13+
- ✅ Android 5.0+ (API 21)
- ✅ Mode portrait et paysage
- ⚠️ Web (non testé)

## 👨‍💻 Auteur

**Oussama**
- GitHub: [@oussamaa29](https://github.com/oussamaa29)
- Projet ESTIAM E5 - Native Cross Platform Development

## 📄 Licence

Ce projet est réalisé dans le cadre d'un projet académique à ESTIAM.

## 🙏 Remerciements

- Odilon HEMA NG pour les consignes et le support
- Équipe Expo pour la documentation
- Communauté React Native

---

**Note:** Ce projet est en cours de développement. Certaines fonctionnalités sont encore en phase d'implémentation conformément aux attendus du projet fil rouge TravelMate.