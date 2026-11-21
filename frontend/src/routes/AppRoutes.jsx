import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from '../layouts/auth/AuthLayout';
import StudentLayout from '../layouts/student/StudentLayout';
import ParentLayout from '../layouts/parent/ParentLayout';
import AdminLayout from '../layouts/admin/AdminLayout';
import { PageLoader } from '../components/common/Loader';
import { GuestOnly, RequireRole } from './guards';

// Pages chargées à la demande, puis préchargées en arrière-plan après le
// démarrage : sinon chaque navigation (connexion → espace, inscription → OTP)
// attend le téléchargement de la page et laisse l'ancien écran affiché.
const loaders = [];
const page = (load) => {
  loaders.push(load);
  return lazy(load);
};
const LoginPage = page(() => import('../pages/auth/LoginPage'));
const RegisterPage = page(() => import('../pages/auth/RegisterPage'));
const VerifyEmailPage = page(() => import('../pages/auth/VerifyEmailPage'));
const ForgotPasswordPage = page(() => import('../pages/auth/ForgotPasswordPage'));
const ParentLoginPage = page(() => import('../pages/auth/ParentLoginPage'));
const ParentRegisterPage = page(() => import('../pages/auth/ParentRegisterPage'));
const AdminAuthPage = page(() => import('../pages/auth/AdminAuthPage'));
const StudentHomePage = page(() => import('../pages/student/HomePage'));
const WeekMenuPage = page(() => import('../pages/student/WeekMenuPage'));
const DishDetailPage = page(() => import('../pages/student/DishDetailPage'));
const SlotPage = page(() => import('../pages/student/SlotPage'));
const TicketPage = page(() => import('../pages/student/TicketPage'));
const WalletPage = page(() => import('../pages/student/WalletPage'));
const DietaryProfilePage = page(() => import('../pages/student/DietaryProfilePage'));
const ChildrenPage = page(() => import('../pages/parent/ChildrenPage'));
const TopUpPage = page(() => import('../pages/parent/TopUpPage'));
const MealsPage = page(() => import('../pages/parent/MealsPage'));
const ParentAccountPage = page(() => import('../pages/parent/AccountPage'));
const DashboardPage = page(() => import('../pages/admin/DashboardPage'));
const MenusPage = page(() => import('../pages/admin/MenusPage'));
const OrdersPage = page(() => import('../pages/admin/OrdersPage'));
const ProductionPage = page(() => import('../pages/admin/ProductionPage'));
const ScanPage = page(() => import('../pages/admin/ScanPage'));
const SlotsPage = page(() => import('../pages/admin/SlotsPage'));
const TabBarDemoPage = page(() => import('../pages/common/TabBarDemoPage'));

// Routes protégées par rôle (confort UX — le backend revérifie tout).
export default function AppRoutes() {
  useEffect(() => {
    const t = setTimeout(() => loaders.forEach((load) => load().catch(() => {})), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <Suspense fallback={<PageLoader fill="100dvh" />}>
      <Routes>
        <Route path="/" element={<Navigate to="/connexion" replace />} />
        <Route path="/demo" element={<TabBarDemoPage />} />
        <Route element={<GuestOnly />}>
          <Route element={<AuthLayout />}>
            <Route path="/connexion" element={<LoginPage />} />
            <Route path="/connexion/parent" element={<ParentLoginPage />} />
            <Route path="/inscription" element={<RegisterPage />} />
            <Route path="/inscription/parent" element={<ParentRegisterPage />} />
            <Route path="/verification" element={<VerifyEmailPage />} />
            <Route path="/mot-de-passe-oublie" element={<ForgotPasswordPage />} />
          </Route>
          {/* Auth du personnel : écran pleine page (split desktop), hors coquille mobile */}
          <Route path="/connexion/admin" element={<AdminAuthPage mode="login" />} />
          <Route path="/inscription/admin" element={<AdminAuthPage mode="register" />} />
        </Route>
        <Route element={<RequireRole roles={['STUDENT']} />}>
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<StudentHomePage />} />
            <Route path="menu" element={<WeekMenuPage />} />
            <Route path="plat" element={<DishDetailPage />} />
            <Route path="plat/:id" element={<DishDetailPage />} />
            <Route path="creneau" element={<SlotPage />} />
            <Route path="ticket" element={<TicketPage />} />
            <Route path="ticket/:id" element={<TicketPage />} />
            <Route path="solde" element={<WalletPage />} />
            <Route path="profil" element={<DietaryProfilePage />} />
          </Route>
        </Route>
        <Route element={<RequireRole roles={['PARENT']} />}>
          <Route path="/parent" element={<ParentLayout />}>
            <Route index element={<ChildrenPage />} />
            <Route path="recharge" element={<TopUpPage />} />
            <Route path="repas" element={<MealsPage />} />
            <Route path="compte" element={<ParentAccountPage />} />
          </Route>
        </Route>
        <Route element={<RequireRole roles={['ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="menus" element={<MenusPage />} />
            <Route path="creneaux" element={<SlotsPage />} />
            <Route path="commandes" element={<OrdersPage />} />
            <Route path="production" element={<ProductionPage />} />
            <Route path="scan" element={<ScanPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/connexion" replace />} />
      </Routes>
    </Suspense>
  );
}
