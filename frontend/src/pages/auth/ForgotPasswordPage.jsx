import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import { CodeInput, PasswordInput, AppButton, Field, toastBus } from '../../components/common/kbr';
import { useActionLoader } from '../../components/common/Loader';
import { api, apiMessage } from '../../services/api';

// Mot de passe oublié : e-mail → code OTP + nouveau mot de passe → connexion.
export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { run, overlay } = useActionLoader('Traitement…');
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  const sendCode = async () => {
    if (!email) return toastBus.show('Entrez votre adresse e-mail');
    return run(async () => {
      try {
        await api('/auth/forgot-password', { method: 'POST', body: { email } });
        toastBus.show('Si le compte existe, un code a été envoyé');
        setStep(2);
      } catch (err) {
        toastBus.show(apiMessage(err));
        return false;
      }
    });
  };

  const reset = async () => {
    if (code.length !== 6) return toastBus.show('Entrez le code à 6 chiffres');
    if (password.length < 8) return toastBus.show('Mot de passe : 8 caractères minimum');
    return run(async () => {
      try {
        await api('/auth/reset-password', { method: 'POST', body: { email, code, password } });
        navigate('/connexion');
      } catch (err) {
        toastBus.show(apiMessage(err));
        return false;
      }
    });
  };

  return (
    <div className="flex flex-1 flex-col px-5 pt-[52px] pb-10">
      <span className="pop-in w-[60px] h-[60px] rounded-[30px] bg-marine text-white flex items-center justify-center"><Icon name="logo" size={30} /></span>
      <h1 className="mt-7 text-[34px] leading-[40px] font-black tracking-[-1px]">Mot de passe oublié</h1>

      {step === 1 ? (
        <>
          <p className="mt-2.5 text-[16px] leading-[24px] text-muted">Entrez votre e-mail : nous vous enverrons un code à 6 chiffres pour réinitialiser votre mot de passe.</p>
          <div className="stagger flex flex-col gap-[18px] mt-9">
            <div className="fld"><label htmlFor="em">E-mail</label><Field id="em" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          </div>
          <div className="mt-7"><AppButton label="Recevoir le code" busyLabel="Envoi…" doneLabel="Code envoyé" onDone={sendCode} /></div>
        </>
      ) : (
        <>
          <p className="mt-2.5 text-[16px] leading-[24px] text-muted">Code envoyé à <b className="text-ink">{email}</b> — entrez-le puis choisissez un nouveau mot de passe.</p>
          <div className="stagger flex flex-col gap-[18px] mt-9">
            <div className="fld"><label>Code à 6 chiffres</label><CodeInput length="6" label="Code reçu par e-mail" onComplete={(d) => setCode(typeof d === 'string' ? d : d?.code ?? '')} /></div>
            <div className="fld"><label htmlFor="np">Nouveau mot de passe</label><PasswordInput id="np" autoComplete="new-password" meter onChange={setPassword} /></div>
          </div>
          <div className="mt-7"><AppButton label="Réinitialiser" busyLabel="Réinitialisation…" doneLabel="Mot de passe changé" onDone={reset} /></div>
          <button type="button" onClick={() => setStep(1)} className="mt-5 self-center bg-transparent text-marine font-bold text-[15px]">Renvoyer le code</button>
        </>
      )}

      <p className="mt-auto pt-7 text-center text-[15px] text-muted"><Link to="/connexion" className="font-bold no-underline">Retour à la connexion</Link></p>
      {overlay}
    </div>
  );
}
