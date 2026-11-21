import Icon from './Icon';
import { Field } from './kbr';

/*
 * Parrainage : le parent déclare le ou les e-mails de ses enfants.
 * Chaque enfant recevra une demande à valider pour lier les comptes
 * (lien ParentStudent du cahier des charges — interface seule ici).
 */
export default function ChildEmailsField({ emails, onChange }) {
  const set = (i, v) => onChange(emails.map((e, j) => (j === i ? v : e)));
  const remove = (i) => onChange(emails.filter((_, j) => j !== i));
  return (
    <div className="fld">
      <span className="text-[15px] font-bold">E-mail de votre enfant</span>
      {emails.map((em, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex-1"><Field type="email" placeholder="prenom.nom@eleve.vatel.ci" autoComplete="off" value={em} onChange={(e) => set(i, e.target.value)} /></div>
          {emails.length > 1 && (
            <button type="button" aria-label="Retirer cet enfant" onClick={() => remove(i)} className="flex-none w-12 h-12 rounded-[14px] border border-line bg-white text-muted flex items-center justify-center">
              <Icon name="x" />
            </button>
          )}
        </div>
      ))}
      {emails.length < 5 && (
        <button type="button" onClick={() => onChange([...emails, ''])} className="self-start inline-flex items-center gap-1.5 text-[14px] font-bold text-marine">
          <Icon name="plus" size={16} />Ajouter un enfant
        </button>
      )}
      <small className="text-[13px] leading-[18px] text-muted">Il recevra une demande à valider pour lier vos comptes (parrainage).</small>
    </div>
  );
}
