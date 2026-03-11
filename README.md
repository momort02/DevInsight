# DevInsight — GitHub Pages

Version 100% statique de DevInsight, sans backend.  
Appels directs à l'API GitHub REST depuis le navigateur.

## Déployer sur GitHub Pages

### 1. Créer le repository

```bash
git init devinsight-pages
cd devinsight-pages
# Copier tous les fichiers de ce dossier ici
git add .
git commit -m "Initial DevInsight"
git remote add origin https://github.com/TON_USERNAME/devinsight.git
git push -u origin main
```

### 2. Activer GitHub Pages

1. Aller dans **Settings** → **Pages**
2. Source : **Deploy from a branch**
3. Branch : **main** / **(root)**
4. Cliquer **Save**

Le site sera accessible sur :  
`https://TON_USERNAME.github.io/devinsight/`

---

## Rate Limits API GitHub

| Situation | Limite |
|-----------|--------|
| Sans token | **60 requêtes/heure** |
| Avec token | **5 000 requêtes/heure** |

### Ajouter un token (optionnel)

1. Aller sur https://github.com/settings/tokens
2. **Generate new token (classic)**
3. Cocher uniquement `public_repo` (lecture seule)
4. Sur le site DevInsight, cliquer **⚙ Token** en haut à droite
5. Coller le token → il est sauvegardé dans `localStorage`

> Le token n'est jamais envoyé ailleurs que vers `api.github.com`.

---

## Fichiers

```
/
├── index.html    ← Interface (HTML statique)
├── style.css     ← Dark theme
├── script.js     ← Logique + appels API GitHub directs
└── toolbox.js    ← 16 outils développeur (100% client)
```
