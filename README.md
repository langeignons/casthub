# ⬡ CastHub — Minecraft Event Manager

Site web de gestion d'events Minecraft pour casters.  
Stack : HTML + CSS + JavaScript vanilla (modules ES6), stockage localStorage.

---

## 🚀 Démarrage rapide

### Option A — Ouvrir directement
Double-cliquer sur `index.html`.  
**⚠️ Attention :** Les modules ES6 (`type="module"`) nécessitent un serveur HTTP.

### Option B — Serveur local (recommandé)
```bash
# Python 3
python3 -m http.server 8080

# Node.js (npx)
npx serve .

# VS Code → extension "Live Server"
```
Puis ouvrir `http://localhost:8080`

---

## 🔐 Connexion par défaut

| Pseudo | Mot de passe | Rôle  |
|--------|-------------|-------|
| admin  | admin1234   | admin |

> ⚠️ Changer le mot de passe admin en production (voir `js/auth.js` → `DEFAULT_USERS`).

---

## 📁 Structure du projet

```
casthub/
├── index.html          # Page liste des events
├── event.html          # Page détail d'un event
├── css/
│   └── style.css       # Styles gaming / e-sport
└── js/
    ├── auth.js         # Authentification, rôles, comptes
    ├── data.js         # CRUD events, équipes, joueurs
    ├── ui.js           # Modals, toasts, navbar, login overlay
    ├── main.js         # Contrôleur index.html
    └── event.js        # Contrôleur event.html
```

---

## 👥 Rôles

| Rôle     | Voir events | Modifier desc | Modifier scores | Gérer comptes |
|----------|-------------|---------------|-----------------|---------------|
| visiteur | ✅          | ❌            | ❌              | ❌            |
| caster   | ✅          | ✅            | ✅              | ❌            |
| admin    | ✅          | ✅            | ✅              | ✅            |

---

## 🔧 Remplacer localStorage par un vrai backend

### Option 1 — Firebase (Firestore)

**Avantages :** Temps réel, gratuit jusqu'à un certain quota, facile à déployer.

```bash
npm install firebase
```

Dans `js/data.js`, remplacer :
```js
// AVANT (localStorage)
function loadEvents() {
  return JSON.parse(localStorage.getItem('casthub_events') || '[]');
}

// APRÈS (Firestore)
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
const db = getFirestore(app);

async function getEvents() {
  const snap = await getDocs(collection(db, 'events'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function createEvent(data) {
  const ref = await addDoc(collection(db, 'events'), data);
  return { id: ref.id, ...data };
}
```

Pour l'auth (`js/auth.js`), utiliser **Firebase Authentication** :
```js
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
const auth = getAuth();

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}
```

### Option 2 — Supabase (PostgreSQL)

**Avantages :** SQL complet, auth intégrée, open-source, auto-hébergeable.

```bash
npm install @supabase/supabase-js
```

```js
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Récupérer les events
const { data, error } = await supabase.from('events').select('*');

// Créer un event
const { data, error } = await supabase.from('events').insert([{ name, ... }]);
```

### Option 3 — Backend Express.js (Node.js)

Structure API REST minimale :

```
GET    /api/events
POST   /api/events
DELETE /api/events/:id
GET    /api/events/:id/teams
POST   /api/events/:id/teams
...
```

Remplacer dans `js/data.js` chaque fonction par un `fetch()` :
```js
export async function getEvents() {
  const res = await fetch('/api/events', {
    headers: { Authorization: `Bearer ${getToken()}` }
  });
  return res.json();
}
```

---

## 🚀 Déploiement (static)

Le site étant 100% statique (front-end only avec localStorage), il peut être déployé sur :

- **GitHub Pages** : Push + activer Pages sur le repo
- **Netlify** : Drag & drop du dossier
- **Vercel** : `vercel --prod`

Avec un backend Firebase/Supabase, ces hébergements statiques fonctionnent toujours.

---

## 📝 Notes de développement

- Modules ES6 : tous les fichiers JS utilisent `import/export`
- Pas de dépendances externes (npm, bundler, framework)
- Code commenté et organisé par responsabilité
- Les fonctions `escHtml()` protègent contre les injections XSS basiques
