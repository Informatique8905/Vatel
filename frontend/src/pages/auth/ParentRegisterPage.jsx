import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PasswordInput, AppButton, Field, toastBus } from '../../components/common/kbr';
import { useActionLoader } from '../../components/common/Loader';
import { api, apiMessage } from '../../services/api';

// Inscription parent : compte PARENT, puis vérification e-mail par OTP.
// La liaison aux enfants se fait ensuite par invitation (QR/lien) —
// jamais par simple saisie d'e-mail (sécurité liaison).
export default function ParentRegisterPage() {
  const [password, setPassword] = useState('');
  const formRef = useRef(null);
  const navigate = useNavigate();
  const { run, overlay } = useActionLoader('Création du compte…');

  const submit = () => {
    const fd = new FormData(formRef.current);
    const name = (fd.get('nm') ?? '').trim();
    const sp = name.lastIndexOf(' ');
    const body = {
      firstName: sp > 0 ? name.slice(0, sp) : name,
      lastName: sp > 0 ? name.slice(sp + 1) : '-',
      email: fd.get('em'),
      phone: String(fd.get('ph') ?? '').replace(/[\s.-]/g, ''),
      password,
      role: 'PARENT',
    };
    return run(async () => {
      try {
        await api('/auth/register', { method: 'POST', body });
        navigate(`/verification?email=${encodeURIComponent(body.email)}&to=/parent`);
      } catch (err) {
        toastBus.show(apiMessage(err));
        return false;
      }
    });
  };

  return (
    <form ref={formRef} onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-1 flex-col">
      <h1 className="mt-4 text-[36px] leading-[40px] font-black tracking-[-1px]">Compte parent</h1>

      <div className="stagger flex flex-col gap-[18px] mt-7">
        <div className="fld"><label htmlFor="nm">Nom complet</label><Field id="nm" name="nm" type="text" autoComplete="name" /></div>
        <div className="fld"><label htmlFor="em">E-mail</label><Field id="em" name="em" type="email" autoComplete="email" /></div>
        <div className="fld"><label htmlFor="ph">Numéro de téléphone</label><Field id="ph" name="ph" type="tel" autoComplete="tel" placeholder="+2250700000000" /></div>
        <div className="fld"><label htmlFor="pw">Mot de passe</label><PasswordInput id="pw" autoComplete="new-password" meter onChange={setPassword} /></div>
      </div>

      <div className="mt-6">
        <AppButton label="Créer mon compte" busyLabel="Création…" doneLabel="Compte créé !" onDone={submit} />
      </div>
      <p className="mt-4 text-center text-[15px] text-muted">Déjà un compte ? <Link to="/connexion/parent" className="font-bold no-underline">Se connecter</Link></p>
      {overlay}
    </form>
  );
}
