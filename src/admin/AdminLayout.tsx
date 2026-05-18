import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, Users, CreditCard, LogOut, 
  Menu, X, Shield, Activity, Share2 
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: <BarChart3 size={20} /> },
    { label: 'Users', path: '/admin/users', icon: <Users size={20} /> },
    { label: 'Withdrawals', path: '/admin/withdrawals', icon: <CreditCard size={20} /> },
    { label: 'Logs', path: '/admin/logs', icon: <Activity size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Sticky on desktop */}
      <aside className={`bg-white border-r border-slate-200 transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} hidden md:flex flex-col sticky top-0 h-[100dvh] overflow-y-auto shrink-0 z-30`}>
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white shrink-0">
            <Shield size={24} />
          </div>
          {isSidebarOpen && (
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 tracking-tight">Pepe Admin</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Management Console</span>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                location.pathname === item.path 
                  ? 'bg-black text-white shadow-lg shadow-black/10' 
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {item.icon}
              {isSidebarOpen && <span className="text-sm font-semibold">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-xl text-red-500 hover:bg-red-50 transition-all"
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="text-sm font-semibold">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-8 shrink-0 sticky top-0 z-20">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 md:block hidden"
          >
            <Menu size={20} />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900">{auth.currentUser?.email}</p>
              <p className="text-[10px] text-emerald-500 font-bold uppercase">Authorized Administrator</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200" />
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
