import { Navigate, Route, Routes } from 'react-router-dom';
import AuthLayout from '../layouts/auth/AuthLayout';
import StudentLayout from '../layouts/student/StudentLayout';
import ParentLayout from '../layouts/parent/ParentLayout';
import AdminLayout from '../layouts/admin/AdminLayout';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import StudentHomePage from '../pages/student/HomePage';
import WeekMenuPage from '../pages/student/WeekMenuPage';
import DishDetailPage from '../pages/student/DishDetailPage';
import SlotPage from '../pages/student/SlotPage';
import TicketPage from '../pages/student/TicketPage';
import WalletPage from '../pages/student/WalletPage';
import DietaryProfilePage from '../pages/student/DietaryProfilePage';
import ChildrenPage from '../pages/parent/ChildrenPage';
import TopUpPage from '../pages/parent/TopUpPage';
import MealsPage from '../pages/parent/MealsPage';
import DashboardPage from '../pages/admin/DashboardPage';
import MenusPage from '../pages/admin/MenusPage';
import OrdersPage from '../pages/admin/OrdersPage';
import ProductionPage from '../pages/admin/ProductionPage';
import ScanPage from '../pages/admin/ScanPage';

// Interfaces uniquement (maquettes) : aucune protection de route ni logique métier pour l'instant.
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/connexion" replace />} />
      <Route element={<AuthLayout />}>
        <Route path="/connexion" element={<LoginPage />} />
        <Route path="/inscription" element={<RegisterPage />} />
      </Route>
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
  );
}
