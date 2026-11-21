# Rapport de validation de version

**Version validée :** merge `e3b966f` sur `main` (21-22 novembre 2026)

## Résumé

| Domaine | Statut | Commentaire |
|---------|:------:|-------------|
| Build frontend | ✅ | `npm run build` OK (Vite, 419 ms) |
| Tests backend | ✅ | 4 scripts `.mjs` exécutés au fil des modules (voire `08-plan-de-tests.md`) |
| Conflits de merge | ✅ | 4 fichiers résolus : auth = API réelle `main` + mise en page `Alakpone` ; routes = union ; `AGENTS.md` = union |
| QA navigateur | ✅ | Viewport 390×844 et 375×667 |

## Cas exécutés (navigateur, 390×844)

| Parcours | Résultat |
|----------|----------|
| Splash logo Vatel → accueil | ✅ animation ~3 s, fondu propre |
| Menu : scroll + glisser horizontal change de plat | ✅ 60 ips, snapping, vraies photos |
| Plat allergène | ✅ bannière + bouton « Indisponible » |
| Clic « Réserver » → `/student/creneau` | ✅ plat transmis, extras Jus/Fruits/Dessert, totaux dynamiques |
| Solde → « Maintenir pour payer » | ✅ texte roulant, total recalculé |
| `/parent/repas` direct + via onglet | ✅ segmenté Aya/Yao, stats, liste novembre |
| Profil à plat | ✅ layout précédent restauré |

## Anomalies connues

| Anomalie | Sévérité | Statut |
|----------|:--------:|--------|
| 404 favicon | Mineure | Préexistant, non bloquant |
| Pages auth dédiées (parent/admin) : navigation mock, non branchées sur l'API | Moyenne | À brancher (login parent/admin = même `/auth/login`, redirection par rôle déjà gérée) |
| Frontend non consommateur de l'API métier : menus/réservations encore sur `src/data/weekMenu.js` (données fictives) | Majeur | Travail prévu — la couche `services/api.js` et les pages auth réelles sont en place |
| PWA : service worker absent | Moyenne | À implémenter (§ spec) |
| Jeko/Resend/Cloudinary : clés non fournies | Majeur | Dégradation gracieuse (`503` documentée) ; recharger/tester avec les vraies clés avant prod |
| `NOT_COLLECTED_REFUND` : À CONFIRMER | Mineure | Isolée en config |

## Décision de livraison

**Go — environnement de développement.** La fusion `main`/`Alakpone` est
stable : backend complet testé (283+ cas cumulés), frontend validé en
navigateur. **Bloquants avant production** : provisionner les secrets Jeko,
Resend, Cloudinary et VAPID ; brancher le frontend métier sur l'API ;
implémenter le service worker ; décider des règles §19 restantes.
