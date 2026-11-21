# Ma Cantine — Vatel

Application de cantine scolaire : réservation de repas, portefeuille
prépayé, gestion des allergies et suivi parent — d'après
`docs/spec.md` (cahier des charges complet).

## Structure

- `frontend/` — une application React (Vite + Tailwind v4) qui regroupe les
  trois espaces : élève/employé (`/student`), parent (`/parent`),
  administration (`/admin`).
- `backend/` — API Node/Express + Prisma (structure seule, à implémenter).
- `docs/` — `spec.md` (cahier des charges en markdown) + `.docx` d'origine.

## Démarrer le frontend

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173 → /connexion
npm run build   # build de production dans dist/
```

L'état actuel du frontend reproduit fidèlement les 16 maquettes
(`Maquettes Cantine Vatel-project/`) : écrans seuls, données de démonstration,
sans backend ni logique métier.
