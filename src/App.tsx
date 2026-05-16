import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import UserApp from './UserApp';
import { AdminLogin } from './admin/AdminLogin';
import { AdminLayout } from './admin/AdminLayout';
import { DashboardHome } from './admin/DashboardHome';
import { UsersManagement } from './admin/UsersManagement';
import { WithdrawalManagement } from './admin/WithdrawalManagement';
import { ActivityLogs } from './admin/ActivityLogs';
import { auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { AdminService } from './admin/adminService';

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        const isAdm = await AdminService.isAdmin(user.uid);
        setAuthorized(isAdm);
      } else {
        setAuthorized(false);
      }
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="animate-pulse text-slate-300 font-bold uppercase tracking-widest">Checking Authentication...</div>
    </div>
  );
  
  if (!authorized) return <Navigate to="/admin/login" />;

  return <AdminLayout>{children}</AdminLayout>;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* User App (TMA) */}
        <Route path="/" element={<UserApp />} />
        
        {/* Admin Portal */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route 
          path="/admin" 
          element={
            <AdminRoute>
              <DashboardHome />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/users" 
          element={
            <AdminRoute>
              <UsersManagement />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/withdrawals" 
          element={
            <AdminRoute>
              <WithdrawalManagement />
            </AdminRoute>
          } 
        />
        <Route 
          path="/admin/logs" 
          element={
            <AdminRoute>
              <ActivityLogs />
            </AdminRoute>
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
