import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AdminService } from './adminService';
import { Shield, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const isAuthorized = await AdminService.isAdmin(userCredential.user.uid);
      
      if (isAuthorized) {
        navigate('/admin');
      } else {
        await auth.signOut();
        setError('Unauthorized access. This account is not in the whitelist.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-[32px] shadow-2xl shadow-slate-200 border border-slate-100 p-8 sm:p-12">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center text-white mb-6 shadow-xl shadow-black/20">
            <Shield size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">Admin Portal</h1>
          <p className="text-slate-400 text-sm font-medium">Please enter your credentials to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full h-14 bg-slate-50 border-transparent rounded-2xl pl-12 pr-6 text-sm font-semibold focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none"
                placeholder="admin@pepetask.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full h-14 bg-slate-50 border-transparent rounded-2xl pl-12 pr-6 text-sm font-semibold focus:ring-2 focus:ring-black focus:bg-white transition-all outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-start gap-3">
              <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
              <p className="text-xs font-bold text-red-600 leading-relaxed uppercase tracking-tight">{error}</p>
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-black text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-black/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              'Sign In to Console'
            )}
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-slate-50 flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-slate-200" />
            ))}
          </div>
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em]">Secure Zero-Trust Environment</p>
        </div>
      </div>
    </div>
  );
};
