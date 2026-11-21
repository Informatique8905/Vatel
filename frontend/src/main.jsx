import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { AuthProvider } from './context/AuthContext';
import { ToastHost } from './components/common/kbr';
import './styles/index.css';

// Après un redéploiement, les anciens fichiers JS n'existent plus : un onglet
// ouvert échoue au chargement d'une page. On recharge une fois la version en ligne.
window.addEventListener('vite:preloadError', (e) => {
  const last = Number(sessionStorage.getItem('vatel:reloaded') || 0);
  if (Date.now() - last < 10000) return;
  e.preventDefault();
  sessionStorage.setItem('vatel:reloaded', String(Date.now()));
  window.location.reload();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <ToastHost />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

// Écran de lancement (logo animé inline dans index.html) : on le retire en
// fondu quand le logo est formé (fin du reflet à ~61 % de 4,8 s ≈ 2,95 s).
const splash = document.getElementById('splash');
if (splash) {
  setTimeout(() => {
    splash.classList.add('bye');
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
    setTimeout(() => splash.remove(), 1000); // filet de sécurité
  }, 3050);
}
