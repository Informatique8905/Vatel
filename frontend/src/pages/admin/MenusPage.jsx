import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/common/Icon';
import { PopoverMenu, toastBus } from '../../components/common/kbr';
import { useData } from '../../hooks/useData';
import {
  getDishes, getMenuItems, getAllergens, createDish, updateDish, createMenuItem, updateMenuItem, uploadDishImage,
  todayKey, fmtDayShort, apiMessage,
} from '../../services/cantine';
import { formatF } from '../../utils/format';

const TAGS = {
  DRAFT: { label: 'Brouillon', cls: 'bg-tint-yellow text-ink' },
  PUBLISHED: { label: 'Publié', cls: 'bg-tint text-marine' },
  CLOSED: { label: 'Clôturé', cls: 'bg-soft text-muted' },
  ARCHIVED: { label: 'Archivé', cls: 'bg-soft text-muted' },
};

const emptyForm = { name: '', description: '', ingredients: '', crossNote: '', verified: false, allergenIds: new Set() };

// Admin-02 : gestion des menus. Offres datées à gauche (statut réel),
// formulaire plat + publication d'offre à droite (API réelles).
export default function MenusPage() {
  const { data: dishes, reload: reloadDishes } = useData(() => getDishes().then((d) => d.dishes), []);
  const { data: items, reload: reloadItems } = useData(
    () => getMenuItems().then((d) => d.items),
    [],
  );
  const { data: allergens } = useData(() => getAllergens().then((d) => d.allergens ?? d), []);

  const [selItem, setSelItem] = useState(null);   // offre sélectionnée
  const [dish, setDish] = useState(null);          // plat édité (null = nouveau)
  const [f, setF] = useState(emptyForm);
  const [offer, setOffer] = useState({ date: todayKey(), price: 1500, quantity: 200, maxPerStudent: 1 });
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  // Sélection d'une offre -> charge son plat dans le formulaire.
  // Le formulaire n'est rechargé qu'au changement d'offre sélectionnée (ou au
  // premier chargement des plats), pas à chaque rafraîchissement de la liste :
  // un upload de photo ou un enregistrement ne doit pas écraser les saisies.
  const dishesRef = useRef(dishes);
  dishesRef.current = dishes;
  const dishesLoaded = Boolean(dishes);
  useEffect(() => {
    const list = dishesRef.current;
    if (!selItem || !list) return;
    const d = list.find((x) => x.id === selItem.dish.id);
    if (!d) return;
    setDish(d);
    setF({
      name: d.name,
      description: d.description ?? '',
      ingredients: d.ingredients ?? '',
      crossNote: d.crossContaminationNote ?? '',
      verified: d.allergenInfoVerified,
      allergenIds: new Set(d.allergens.map((a) => a.id)),
    });
    setOffer((o) => ({ ...o, date: selItem.date.slice(0, 10), price: selItem.price, quantity: selItem.quantity }));
  }, [selItem, dishesLoaded]);

  const toggleAllergen = (id) => {
    const next = new Set(f.allergenIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setF({ ...f, allergenIds: next });
  };

  const saveDish = async () => {
    if (!f.name.trim()) { toastBus.show('Nom du plat requis'); return; }
    setBusy(true);
    try {
      const body = {
        name: f.name.trim(),
        description: f.description || undefined,
        ingredients: f.ingredients || undefined,
        crossContaminationNote: f.crossNote || undefined,
        allergenIds: [...f.allergenIds],
        allergenInfoVerified: f.verified,
      };
      const saved = dish
        ? (await updateDish(dish.id, body)).dish
        : (await createDish(body)).dish;
      setDish(saved);
      toastBus.show(`Plat « ${saved.name} » enregistré`);
      reloadDishes();
    } catch (err) { toastBus.show(apiMessage(err)); }
    finally { setBusy(false); }
  };

  const saveOffer = async (publish) => {
    if (!dish) { toastBus.show('Enregistrez d’abord le plat'); return; }
    setBusy(true);
    try {
      // Une seule offre par plat et par date : on met à jour l'existante.
      const existing = (items ?? []).find((i) => i.dish.id === dish.id && i.date.slice(0, 10) === offer.date);
      const status = publish ? { status: 'PUBLISHED' } : {};
      if (existing) {
        await updateMenuItem(existing.id, {
          price: offer.price, quantity: offer.quantity,
          maxPerStudent: offer.maxPerStudent,
          ...status,
        });
      } else {
        const { item } = await createMenuItem({
          dishId: dish.id, date: offer.date,
          price: offer.price, quantity: offer.quantity,
          maxPerStudent: offer.maxPerStudent,
        });
        if (publish) await updateMenuItem(item.id, status);
      }
      toastBus.show(publish ? 'Offre publiée' : 'Offre enregistrée en brouillon');
      reloadItems();
    } catch (err) { toastBus.show(apiMessage(err)); }
    finally { setBusy(false); }
  };

  const setItemStatus = async (item, status) => {
    try {
      await updateMenuItem(item.id, { status });
      toastBus.show(`« ${item.dish.name} » → ${TAGS[status]?.label ?? status}`);
      reloadItems();
    } catch (err) { toastBus.show(apiMessage(err)); }
  };

  const pickImage = () => {
    if (!dish) { toastBus.show('Enregistrez d’abord le plat'); return; }
    fileRef.current?.click();
  };

  const uploadImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !dish) return;
    setBusy(true);
    try {
      const saved = (await uploadDishImage(dish.id, file)).dish;
      setDish(saved);
      toastBus.show('Photo enregistrée');
      reloadDishes();
      reloadItems();
    } catch (err) { toastBus.show(apiMessage(err)); }
    finally { setBusy(false); }
  };

  const newDish = () => { setDish(null); setSelItem(null); setF(emptyForm); };

  const list = (items ?? []).filter((i) => i.status !== 'ARCHIVED' && i.date.slice(0, 10) >= todayKey());

  return (
    <>
      <div className="head">
        <div><span className="eyebrow">Gestion des menus</span><h1 className="h1">Menus</h1></div>
        <div className="flex gap-2.5 flex-wrap">
          <button type="button" className="btn p" onClick={newDish}><Icon name="plus" />Nouveau plat</button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-10 mt-10 items-start">
        <div className="list">
          {list.map((w) => {
            const isToday = w.date.slice(0, 10) === todayKey();
            const allerg = w.dish.allergens.map((a) => a.name).join(', ') || 'Aucun allergène';
            return (
              <button key={w.id} type="button" onClick={() => setSelItem(w)} className={`li text-left w-full cursor-pointer${selItem?.id === w.id ? ' bg-tint' : ''}`}>
                <div className="w-[52px] text-center flex-none">
                  <div className="text-[12px] font-bold text-muted uppercase">{fmtDayShort(w.date).split(' ')[0]}</div>
                  <div className={`num text-[22px] font-extrabold ${isToday ? 'text-marine' : 'text-ink'}`}>{fmtDayShort(w.date).split(' ')[1]}</div>
                </div>
                <div className="t">
                  <b>{w.dish.name}</b>
                  <small className={`num ${!w.dish.allergenInfoVerified ? 'text-danger' : 'text-muted'}`}>
                    {formatF(w.price)} · {w.dish.allergenInfoVerified ? allerg : 'Allergènes non vérifiés'} · {w.remaining}/{w.quantity}
                  </small>
                </div>
                <span className={`tag ${TAGS[w.status]?.cls ?? 'bg-soft text-muted'}`}>{isToday && w.status === 'PUBLISHED' ? 'Aujourd’hui' : (TAGS[w.status]?.label ?? w.status)}</span>
                <span onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  <PopoverMenu
                    title={w.dish.name}
                    items={w.status === 'PUBLISHED' ? 'Clôturer' : 'Publier,Clôturer'}
                    onSelect={(label) => setItemStatus(w, label === 'Publier' ? 'PUBLISHED' : 'CLOSED')}
                  />
                </span>
              </button>
            );
          })}
          {list.length === 0 && (
            <div className="li"><div className="t"><b>Aucune offre</b><small>Créez un plat puis publiez une offre datée</small></div></div>
          )}
        </div>

        <form className="flex flex-col gap-[22px]" onSubmit={(e) => e.preventDefault()}>
          <div className="flex justify-between items-center">
            <h2 className="h2 text-[26px]">{dish ? dish.name : 'Nouveau plat'}</h2>
            <span className={`tag ${f.verified ? 'bg-ok-bg text-ok' : 'bg-tint-yellow text-ink'}`}>{f.verified ? 'Vérifié' : 'Non vérifié'}</span>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={uploadImage} />
          {dish?.photoUrl
            ? (
              <button type="button" disabled={busy} onClick={pickImage} className="relative p-0 border-0 bg-transparent cursor-pointer" aria-label="Changer la photo">
                <img src={dish.photoUrl} alt={dish.name} className="h-40 w-full object-cover rounded-[16px] border border-line" />
                <span className="absolute right-3 bottom-3 rounded-[12px] bg-white/90 px-3 py-1.5 text-[14px] font-bold text-marine">Changer la photo</span>
              </button>
            )
            : (
              <button type="button" disabled={busy} onClick={pickImage} className="h-40 border border-dashed border-idle rounded-[16px] bg-white text-marine text-[15px] font-bold flex flex-col items-center justify-center gap-2 cursor-pointer">
                <Icon name="camera" />{dish ? 'Ajouter une photo (JPEG, PNG ou WebP)' : 'Enregistrez le plat pour ajouter une photo'}
              </button>
            )}
          <div className="fld"><label htmlFor="n">Nom du plat</label><input id="n" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div className="fld"><label htmlFor="ds">Description</label><textarea id="ds" rows={2} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="fld"><label htmlFor="ing">Ingrédients (séparés par des virgules)</label><input id="ing" value={f.ingredients} onChange={(e) => setF({ ...f, ingredients: e.target.value })} /></div>
          <div className="fld"><label htmlFor="cn">Note de contamination croisée</label><input id="cn" value={f.crossNote} onChange={(e) => setF({ ...f, crossNote: e.target.value })} /></div>

          <fieldset className="flex flex-col gap-2.5">
            <legend className="text-[14px] font-bold text-muted mb-2.5">Allergènes présents</legend>
            <div className="flex flex-wrap gap-2">
              {(allergens ?? []).filter((a) => !a.code.startsWith('custom-')).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={f.allergenIds.has(a.id)}
                  onClick={() => toggleAllergen(a.id)}
                  className={`h-10 px-4 rounded-[20px] text-[15px] font-bold cursor-pointer border ${f.allergenIds.has(a.id) ? 'bg-marine text-white border-marine' : 'bg-white text-ink border-line'}`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex gap-3.5 items-start text-[15px] leading-[22px] cursor-pointer py-4 border-t border-line">
            <input type="checkbox" className="w-[22px] h-[22px] m-0 flex-none accent-marine" checked={f.verified} onChange={(e) => setF({ ...f, verified: e.target.checked })} />
            <span><b>Allergènes vérifiés avec la cuisine.</b> Sans cette case, les élèves voient « informations non vérifiées ».</span>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div className="fld"><label htmlFor="p">Prix (FCFA)</label><input id="p" className="num" type="number" min="1" value={offer.price} onChange={(e) => setOffer({ ...offer, price: Number(e.target.value) })} /></div>
            <div className="fld"><label htmlFor="c">Portions prévues</label><input id="c" className="num" type="number" min="1" value={offer.quantity} onChange={(e) => setOffer({ ...offer, quantity: Number(e.target.value) })} /></div>
          </div>
          <div className="fld"><label htmlFor="dt">Date de l’offre</label><input id="dt" type="date" value={offer.date} onChange={(e) => setOffer({ ...offer, date: e.target.value })} /></div>

          <div className="flex gap-2.5 flex-wrap">
            <button type="button" disabled={busy} className="btn s" onClick={saveDish}>{dish ? 'Enregistrer le plat' : 'Créer le plat'}</button>
            <button type="button" disabled={busy} className="btn s" onClick={() => saveOffer(false)}>Offre (brouillon)</button>
            <button type="button" disabled={busy} className="btn p flex-1 justify-center" onClick={() => saveOffer(true)}>{selItem ? 'Publier / mettre à jour' : 'Créer l’offre'}</button>
          </div>
        </form>
      </div>
    </>
  );
}
