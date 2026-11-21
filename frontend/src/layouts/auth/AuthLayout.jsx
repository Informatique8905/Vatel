import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import VatelLogo from '../../components/common/VatelLogo';
import MobileShell from '../../components/common/MobileShell';
import { PageLoader } from '../../components/common/Loader';

// Photo Vatel en fond (public/images/Fond.jpeg) : les formulaires
// (connexion, inscription) vivent dans une feuille blanche arrondie
// qui la recouvre par le bas ; le logo chevauche son bord supérieur.
export default function AuthLayout() {
  return (
    <MobileShell>
      <div className="relative flex flex-1 min-h-0 flex-col">
        <img
          src="/images/Fond.jpeg"
          alt=""
          aria-hidden="true"
          draggable="false"
          className="absolute inset-x-0 top-0 h-[45dvh] w-full object-cover object-[50%_16%]"
        />
        <div className="auth-sheet absolute inset-x-0 bottom-0 top-[40dvh] overflow-y-auto rounded-t-[30px] bg-white shadow-[0_-12px_32px_rgba(7,42,93,.20)]">
          <div className="flex flex-col min-h-full px-6 pt-12 pb-8">
            <Suspense fallback={<PageLoader fill="40dvh" />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
        <span className="pop-in absolute left-1/2 top-[40dvh] z-10 flex h-[62px] w-[62px] -translate-x-1/2 -translate-y-1/2 items-center justify-center overflow-hidden rounded-full bg-white ring-4 ring-white shadow-[0_4px_14px_rgba(7,42,93,.25)]">
          <VatelLogo size={44} />
        </span>
      </div>
    </MobileShell>
  );
}
