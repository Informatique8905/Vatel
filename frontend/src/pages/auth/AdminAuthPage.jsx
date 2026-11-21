import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GrainGradient } from '@paper-design/shaders-react';
import VatelLogo from '../../components/common/VatelLogo';
import { PasswordInput, AppButton, Field, toastBus } from '../../components/common/kbr';
import { useActionLoader } from '../../components/common/Loader';
import { apiMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

/*
 * Auth du personnel de cantine — modèle « auth-section » (panneau
 * formulaire + panneau visuel GrainGradient) adapté au cahier des charges :
 * couleurs Vatel (marine #072A5D, bleu #87c1eb, noir #1D1D1B) et champs
 * e-mail + mot de passe. L'inscription est une « demande d'accès » :
 * le rôle ADMIN n'est jamais attribuable côté client (§12.2).
 */
export default function AdminAuthPage({ mode }) {
  const login = mode !== 'register';
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const { run, overlay } = useActionLoader(login ? 'Connexion en cours…' : 'Envoi de la demande…');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    if (!login) {
      // Aucun endpoint d'auto-inscription admin (§12.2) : la direction
      // provisionne le compte côté serveur.
      toastBus.show('Demande transmise à la direction — aucun accès automatique');
      return;
    }
    return run(async () => {
      try {
        const user = await authLogin({ email, password });
        if (user.role !== 'ADMIN') {
          toastBus.show('Cet espace est réservé au personnel de la cantine');
          navigate(user.role === 'PARENT' ? '/parent' : '/student');
          return;
        }
        navigate('/admin');
      } catch (err) {
        toastBus.show(apiMessage(err));
        return false;
      }
    });
  };
  return (
    <section className="admin min-h-dvh bg-[#F9F9F9] p-3 text-[#1D1D1B] antialiased">
      <div className="grid min-h-[calc(100dvh-1.5rem)] gap-4 lg:grid-cols-[0.94fr_1.06fr]">
        <div className="flex items-start rounded-[20px] border border-line bg-white px-6 py-10 sm:px-10 lg:items-center lg:px-16">
          <div className="mx-auto w-full max-w-[440px]">
            <VatelLogo size={86} />
            <h1 className="mt-7 text-[30px] leading-[36px] font-black tracking-[-0.8px]">{login ? 'Espace cantine' : 'Demande d’accès'}</h1>
            <p className="mt-2 text-[15px] leading-[22px] text-muted">
              {login
                ? 'Réservé au personnel de la cantine Vatel.'
                : 'Le compte est créé par la direction après validation — aucun accès automatique.'}
            </p>

            <form className="mt-8 flex flex-col gap-[18px]">
              {!login && (
                <div className="fld"><label htmlFor="nm">Nom complet</label><Field id="nm" type="text" autoComplete="name" /></div>
              )}
              <div className="fld"><label htmlFor="em">E-mail professionnel</label><Field id="em" type="email" autoComplete="email" placeholder="prenom.nom@vatel.ci" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              {login ? (
                <div className="fld"><label htmlFor="pw">Mot de passe</label><PasswordInput id="pw" autoComplete="current-password" onChange={setPassword} /></div>
              ) : (
                <div className="fld"><label htmlFor="fn">Fonction</label><Field id="fn" type="text" placeholder="ex. Responsable de service" /></div>
              )}
            </form>

            <div className="mt-6">
              <AppButton
                label={login ? 'Se connecter' : 'Envoyer la demande'}
                busyLabel={login ? 'Connexion…' : 'Envoi…'}
                doneLabel={login ? 'Connecté' : 'Demande envoyée'}
                className="btn p w-full h-[56px] justify-center"
                onDone={submit}
              />
            </div>
            <p className="mt-4 text-center text-[15px] text-muted">
              {login
                ? <>Pas d’accès ? <Link to="/inscription/admin" className="font-bold no-underline">Demander un compte</Link></>
                : <>Déjà un accès ? <Link to="/connexion/admin" className="font-bold no-underline">Se connecter</Link></>}
            </p>
            <p className="mt-2 text-center text-[14px]"><Link to="/connexion" className="font-semibold no-underline text-muted">← Retour à l’application</Link></p>
          </div>
        </div>

        <div className="relative flex min-h-[300px] overflow-hidden rounded-[20px] bg-[#1D1D1B] p-8 text-white sm:p-12 lg:min-h-0">
          <GrainGradient
            speed={1} scale={1} rotation={0} offsetX={0} offsetY={0}
            softness={0.5} intensity={0.5} noise={0.25} shape="corners" frame={2854.5}
            colors={['#87c1eb', '#0B3D91', '#072A5D', '#87c1eb']}
            colorBack="#00000000"
            className="absolute inset-0"
          />
          <div className="relative z-10 flex h-full w-full flex-col justify-between">
            <h2 className="max-w-[560px] pt-0 text-[38px] font-black leading-[1.05] tracking-[-0.04em] lg:pt-14 lg:text-[56px]">
              La cantine,<br />en toute maîtrise.
            </h2>
            <p className="text-[15px] font-semibold text-white/70">Ma Cantine · Vatel, Hotel &amp; Tourism Business School</p>
          </div>
        </div>
      </div>
      {overlay}
    </section>
  );
}
