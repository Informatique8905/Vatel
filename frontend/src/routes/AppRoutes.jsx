import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from '../layouts/auth/AuthLayout';
import StudentLayout from '../layouts/student/StudentLayout';
import ParentLayout from '../layouts/parent/ParentLayout';
import AdminLayout from '../layouts/admin/AdminLayout';
import { PageLoader } from '../components/common/Loader';

// Pages chargées à la demande : chaque espace ne télécharge que son code.
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterPage = lazy(() => import('../pages/auth/RegisterPage'));
const ParentLoginPage = lazy(() => import('../pages/auth/ParentLoginPage'));
const ParentRegisterPage = lazy(() => import('../pages/auth/ParentRegisterPage'));
const AdminAuthPage = lazy(() => import('../pages/auth/AdminAuthPage'));
const StudentHomePage = lazy(() => import('../pages/student/HomePage'));
const WeekMenuPage = lazy(() => import('../pages/student/WeekMenuPage'));
const DishDetailPage = lazy(() => import('../pages/student/DishDetailPage'));
const SlotPage = lazy(() => import('../pages/student/SlotPage'));
const TicketPage = lazy(() => import('../pages/student/TicketPage'));
const WalletPage = lazy(() => import('../pages/student/WalletPage'));
const DietaryProfilePage = lazy(() => import('../pages/student/DietaryProfilePage'));
const ChildrenPage = lazy(() => import('../pages/parent/ChildrenPage'));
const TopUpPage = lazy(() => import('../pages/parent/TopUpPage'));
const MealsPage = lazy(() => import('../pages/parent/MealsPage'));
const DashboardPage = lazy(() => import('../pages/admin/DashboardPage'));
const MenusPage = lazy(() => import('../pages/admin/MenusPage'));
const OrdersPage = lazy(() => import('../pages/admin/OrdersPage'));
const ProductionPage = lazy(() => import('../pages/admin/ProductionPage'));
const ScanPage = lazy(() => import('../pages/admin/ScanPage'));
const TabBarDemoPage = lazy(() => import('../pages/common/TabBarDemoPage'));

// Interfaces uniquement (maquettes) : aucune protection de route ni logique métier pour l'instant.
export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader fill="100dvh" />}>
      <Routes>
        <Route path="/" element={<Navigate to="/connexion" replace />} />
        <Route path="/demo" element={<TabBarDemoPage />} />
        <Route element={<AuthLayout />}>
          <Route path="/connexion" element={<LoginPage />} />
          <Route path="/connexion/parent" element={<ParentLoginPage />} />
          <Route path="/inscription" element={<RegisterPage />} />
          <Route path="/inscription/parent" element={<ParentRegisterPage />} />
        </Route>
        {/* Auth du personnel : écran pleine page (split desktop), hors coquille mobile */}
        <Route path="/connexion/admin" element={<AdminAuthPage mode="login" />} />
        <Route path="/inscription/admin" element={<AdminAuthPage mode="register" />} />
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentHomePage />} />
          <Route path="menu" element={<WeekMenuPage />} />
          <Route path="plat" element={<DishDetailPage />} />
          <Route path="creneau" element={<SlotPage />} />
          <Route path="ticket" element={<TicketPage />} />
          <Route path="solde" element={<WalletPage />} />
          <Route path="profil" element={<DietaryProfilePage />} />
        </Route>
        <Route path="/parent" element={<ParentLayout />}>
          <Route index element={<ChildrenPage />} />
          <Route path="recharge" element={<TopUpPage />} />
          <Route path="repas" element={<MealsPage />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="menus" element={<MenusPage />} />
          <Route path="commandes" element={<OrdersPage />} />
          <Route path="production" element={<ProductionPage />} />
          <Route path="scan" element={<ScanPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/connexion" replace />} />
      </Routes>
    </Suspense>
  );
}
