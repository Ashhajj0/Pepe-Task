import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { AdminLog } from './adminService';
import { safeDate } from '../lib/utils/firestore';
import { 
  Activity, Clock, User, Shield, 
  Terminal, ArrowRight, Zap, Info
} from 'lucide-react';

export const ActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'adminLogs'), orderBy('timestamp', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdminLog)));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const getActionColor = (action: string) => {
    if (action.includes('BAN')) return 'bg-red-100 text-red-600';
    if (action.includes('WITHDRAWAL_COMPLETED')) return 'bg-emerald-100 text-emerald-600';
    if (action.includes('WITHDRAWAL_REJECTED')) return 'bg-orange-100 text-orange-600';
    if (action.includes('BALANCE')) return 'bg-blue-100 text-blue-600';
    return 'bg-slate-100 text-slate-600';
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Activity Logs</h2>
        <p className="text-slate-400 font-medium">Immutable audit trail of administrator actions</p>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
          <Terminal size={18} className="text-slate-400" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Live Stream</span>
        </div>
        
        <div className="divide-y divide-slate-50">
          {logs.length === 0 ? (
            <div className="p-20 text-center opacity-30">
              <Activity size={48} className="mx-auto mb-4" />
              <p className="text-sm font-bold uppercase tracking-widest">No activity recorded</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="p-6 hover:bg-slate-50/50 transition-colors flex items-start gap-6">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getActionColor(log.action)}`}>
                  <Zap size={18} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-sm font-bold text-slate-900">{log.action}</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[9px] font-bold text-slate-500 uppercase tracking-tight">Admin: {log.adminId.slice(0, 8)}</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4">
                    {log.targetUserId && (
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-slate-300" />
                        <span className="text-xs font-medium text-slate-500">Target User:</span>
                        <span className="text-xs font-bold text-slate-900">{log.targetUserId}</span>
                      </div>
                    )}
                    {log.details && (
                      <div className="flex items-center gap-1.5">
                        <Info size={12} className="text-slate-300" />
                        <span className="text-xs font-medium text-slate-500">Info:</span>
                        <span className="text-xs font-mono font-bold text-slate-600 bg-slate-50 px-2 py-0.5 rounded">
                          {JSON.stringify(log.details)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Clock size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-tight">
                        {safeDate(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {safeDate(log.timestamp).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
