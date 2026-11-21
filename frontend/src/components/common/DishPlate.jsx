import Icon from './Icon';

/*
 * Visuel d'un plat : photo (`dish.image`, ajoutée par l'admin) ou assiette
 * stylisée de remplacement teintée par `dish.accent`. Même rendu partout
 * (carrousel, accueil, liste) pour que l'arrivée d'une photo change
 * automatiquement l'apparence sans toucher au code.
 */
export default function DishPlate({ dish, size, className = '' }) {
  const label = dish.label || dish.name || `${dish.title} ${dish.subtitle}`.trim();
  const style = { '--dish-accent': dish.accent };
  if (size) { style.width = size; style.height = size; }
  // `image` (maquette) ou `photoUrl` (champ API) : le premier non vide gagne.
  const photo = dish.image || dish.photoUrl;
  return photo ? (
    <img className={`dish-photo ${className}`} style={style} src={photo} alt={label} draggable="false" />
  ) : (
    <span className={`dish-plate ${className}`} style={style} role="img" aria-label={label}>
      <Icon name="bowl" />
    </span>
  );
}
