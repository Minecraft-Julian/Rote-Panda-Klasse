# 🐼 Roter-Panda-Klasse

Eine Web-App für die Klasse, gebaut mit React, TypeScript und Firebase.

## Features

### 1. Anmeldung
- 🔐 **Google-Anmeldung** mit einem Klick
- 📧 **E-Mail/Passwort** Registrierung mit Benutzername, Passwort-Bestätigung und E-Mail-Verifizierung
- Integration mit **Roter-Panda-Server** (konfigurierbar)

### 2. Messenger
- 💬 **Gruppen erstellen** (jeder darf Gruppen erstellen und suchen)
- 👥 **Mitglieder hinzufügen** per E-Mail
- 🗑️ **Gruppen löschen** (nur Ersteller)
- 🚫 **Schimpfwort-Filter** für alle Nachrichten
- ⏱️ **Spam-Schutz**: max. 1 Nachricht pro 10 Sekunden, max. 30 Nachrichten pro Tag
- 📎 **Dateien, Bilder & Videos** bis 1 GB
- ↩️ **Auf Nachrichten antworten**
- 🗑️ **Nachrichten löschen** (nur für sich)
- 🚨 **Nachrichten melden** – Admin sieht die letzten 10 Nachrichten und kann löschen/stummschalten

### 3. Klassenliste
- 👀 Für alle sichtbar
- ✏️ Jeder kann optional Kontaktdaten eintragen (E-Mail, Telefon, Adresse)
- 🤒 Tagesanzeige ob man heute krank ist

### 4. Stundenplan
- 🗓️ Zeigt externen Stundenplan per iFrame an
- URL über Umgebungsvariable konfigurierbar

### 5. Hausaufgaben
- 📚 Jeder kann Hausaufgaben eintragen (Fach, Beschreibung, Anmerkungen, Fälligkeitsdatum)
- 🔍 **Suche** nach Fach und Text
- ✅ **Korrekturvorschläge** – wenn genug Personen zustimmen, wird die Hausaufgabe automatisch korrigiert

## Setup

### Voraussetzungen
- Node.js 18+
- Ein [Firebase-Projekt](https://console.firebase.google.com/) mit aktiviertem:
  - Authentication (Email/Password + Google)
  - Firestore Database
  - Storage

### Installation

```bash
# Dependencies installieren
npm install

# Konfiguration erstellen
cp .env.example .env
# Trage deine Firebase-Zugangsdaten in .env ein

# Entwicklungsserver starten
npm run dev
```

### Firebase Firestore Regeln (Empfohlen)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /groups/{groupId} {
      allow read: if request.auth != null && 
        request.auth.uid in resource.data.members;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && 
        request.auth.uid == resource.data.createdBy;
    }
    match /groups/{groupId}/messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    match /classlist/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    match /homework/{entryId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
    }
    match /reports/{reportId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Routing**: React Router v7
