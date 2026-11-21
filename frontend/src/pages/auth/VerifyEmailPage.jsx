import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import Icon from '../../components/common/Icon';
import { CodeInput, AppButton, toastBus } from '../../components/common/kbr';
import { useActionLoader } from '../../components/common/Loader';
import { api, apiMessage } from '../../services/api';

// Vérification de l'e-mail par code OTP à 6 chiffres, envoyé à l'inscription
// ou via « Renvoyer le code » (Resend côté backend).
export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { run, overlay } = useActionLoader('Vérification…');
  const email = params.get('email') ?? '';
  const to = params.get('to') ?? '/connexion';

  const verify = async (detail) => {
    const code = typeof detail === 'string' ? detail : detail?.code ?? '';
    try {
      await api('/auth/verify-email', { method: 'POST', body: { email, code } });
      run(() => navigate(to));
    } catch (err) {
      toastBus.show(apiMessage(err));
    }
  };

  const resend = async () => {
    try {
      await api('/auth/resend-otp', { method: 'POST', body: { email, purpose: 'verify' } });
      toastBus.show('Un nouveau code a été envoyé');
    } catch (err) {
      toastBus.show(apiMessage(err));
    }
  };

  return (
    <div className="flex flex-1 flex-col px-5 pt-[52px] pb-10">
      <span className="pop-in w-[60px] h-[60px] rounded-[30px] bg-marine text-white flex items-center justify-center"><Icon name="logo" size={30} /></span>
      <h1 className="mt-7 text-[34px] leading-[40px] font-black tracking-[-1px]">Vérifiez votre e-mail</h1>
      <p className="mt-2.5 text-[16px] leading-[24px] text-muted">
        Un code à 6 chiffres vient d’être envoyé à <b className="text-ink">{email}</b>. Il expire dans 10 minutes.
      </p>

      <div className="stagger flex flex-col gap-[18px] mt-9">
        <div className="fld">
          <label>Code de vérification</label>
          <CodeInput length="6" label="Entrez le code reçu par e-mail" onComplete={verify} />
        </div>
        <button type="button" onClick={resend} className="self-center bg-transparent text-marine font-bold text-[15px]">
          Renvoyer le code
        </button>
      </div>

      <p className="mt-auto pt-7 text-center text-[15px] text-muted">Mauvaise adresse ? <Link to="/inscription" className="font-bold no-underline">Recommencer</Link></p>
      {overlay}
    </div>
  );
}
