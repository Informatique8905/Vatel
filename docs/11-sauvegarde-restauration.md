# Guide de sauvegarde et restauration

## Données à sauvegarder

| Donnée | Emplacement | Criticité |
|--------|-------------|-----------|
| Base PostgreSQL | Volume `vatel_pgdata` (dev) / instance Railway (prod) | **Critique** — finances, utilisateurs, réservations |
| Images des plats | Cloudinary (hors base : `photoPublicId` en base) | Moyenne — régénérable par l'admin |
| Configuration | `.env` (hors Git, sauvegarder séparément de façon sécurisée) | Critique pour la reprise |

Tout ce qui est financier, identitaire ou de liaison vit dans PostgreSQL —
c'est le seul élément irremplaçable.

## Sauvegarde en développement

```bash
# Dump logique (le conteneur Docker doit tourner)
docker exec vatel-postgres pg_dump -U vatel -d vatel -Fc > vatel_$(date +%Y%m%d_%H%M).dump

# Sauvegarde du volume (à froid, pour une copie complète)
docker compose -f backend/docker-compose.yml stop postgres
# copier le volume vatel_pgdata
docker compose -f backend/docker-compose.yml start postgres
```

## Sauvegarde en production (Railway)

- **Recommandé** : activer les sauvegardes automatiques / snapshots de
  Railway PostgreSQL, rétention 7–30 jours.
- Complément : `pg_dump` planifié (cron externe ou Railway scheduled job)
  `pg_dump $DATABASE_URL -Fc > backup.dump` vers un stockage externe.

| Paramètre | Recommandation |
|-----------|----------------|
| Fréquence | Quotidienne (incrémentale si possible) |
| Rétention | 30 jours glissants + 1 mensuelle conservée 12 mois |
| Chiffrement | Sauvegardes hors-site chiffrées |
| Accès | Limité aux administrateurs |

## Restauration

### En développement

```bash
# 1. Recréer une base propre
docker compose -f backend/docker-compose.yml up -d postgres
docker exec vatel-postgres dropdb -U vatel --if-exists vatel
docker exec vatel-postgres createdb -U vatel vatel

# 2. Restaurer le dump
cat vatel_20261122_1200.dump | docker exec -i vatel-postgres \
  pg_restore -U vatel -d vatel --clean --if-exists

# 3. Vérifier
docker exec vatel-postgres psql -U vatel -d vatel -c "select count(*) from \"User\";"
```

### En production

1. Arrêter le backend (évite les écritures pendant la restauration).
2. Restaurer le snapshot Railway ou `pg_restore` dans une nouvelle base.
3. Repointer `DATABASE_URL`, redémarrer le service.
4. Appliquer les migrations éventuelles : `npx prisma migrate deploy`.
5. Vérifier : connexion, `Wallet`/`CanteenAccount`, dernières `Transaction`.

## Test de restauration

- **Fréquence** : mensuelle (dev) / trimestrielle (prod).
- **Procédure** : restaurer le dernier dump dans un environnement isolé,
  vérifier les compteurs de tables clés (`User`, `Reservation`,
  `Transaction`, `Wallet`), puis supprimer l'environnement de test.
- **À consigner** : date, durée, résultat dans un journal — alimente
  l'objectif de reprise (`18-continuite-reprise.md`).

## Points d'attention

- Les jetons et OTP sont éphémères : inutile de les restaurer.
- Les images Cloudinary ont leur propre réplication ; `photoPublicId`
  suffit à retrouver chaque image.
- `.env` n'est **pas** dans la sauvegarde de base : le conserver séparément
  (gestionnaire de secrets), sinon la reprise sera impossible (clés Jeko,
  VAPID…).
