import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase'; // Note: auth creation is restricted in rules, usually done via admin SDK or specific flow
import { User, UserRole } from '../types';
import { cn } from '../lib/utils';
import { Users, Plus, Shield, ShieldAlert, Trash2, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createUserWithEmailAndPassword } from 'firebase/auth';

const Staff = () => {
  const [staff, setStaff] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Note: Creating actual Firebase Auth users in a client-side POC 
  // without a backend function is limited because only the current signed-in 
  // user session can create other users usually, unless using specialized flows.
  // For this POC, we'll maintain a 'users' collection.

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'staff' as UserRole
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setStaff(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Use email as doc ID for manual creation so AuthContext can find them when they register
      const email = formData.email.toLowerCase();
      await setDoc(doc(db, 'users', email), {
        username: formData.username,
        role: formData.role,
        email: email
      });
      setIsModalOpen(false);
      setFormData({ username: '', email: '', password: '', role: 'staff' });
      alert("Staff record saved. They can now register with this email to access the system.");
    } catch (err) {
      console.error(err);
      alert("Error creating staff record.");
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteStaff = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', id));
      setDeletingId(null);
    } catch (err) {
      console.error(err);
      alert("Error deleting staff record.");
    }
  };

  return (
    <div className="space-y-6">
      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
           <div className="bg-neutral-900 border border-red-500/50 p-8 rounded-3xl max-w-sm text-center">
              <ShieldAlert className="text-red-500 mx-auto mb-4" size={48} />
              <h3 className="text-xl font-bold text-white mb-2">Confirm Removal</h3>
              <p className="text-sm text-neutral-500 mb-8">Are you sure you want to remove this staff member? Their access will be revoked immediately.</p>
              <div className="flex gap-4">
                 <button onClick={() => setDeletingId(null)} className="flex-1 py-3 text-neutral-500 font-bold border border-neutral-800 rounded-xl">Cancel</button>
                 <button onClick={() => handleDeleteStaff(deletingId)} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-xl shadow-red-500/20">Remove</button>
              </div>
           </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
             <Users className="text-orange-500" /> Staff & Roles
          </h1>
          <p className="text-neutral-500 text-sm">Manage employee access levels and login accounts</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-neutral-100 hover:bg-white text-neutral-900 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all"
        >
          <Plus size={18} /> New Staff Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {staff.map(u => (
           <div key={u.id} className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl relative overflow-hidden group">
              <div className={cn(
                "absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110",
                u.role === 'admin' ? "bg-orange-500" : "bg-blue-500"
              )} />
              
              <div className="flex items-center gap-4 mb-6">
                 <div className={cn(
                   "w-12 h-12 rounded-2xl flex items-center justify-center border",
                   u.role === 'admin' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                 )}>
                    {u.role === 'admin' ? <Shield size={24} /> : <ShieldAlert size={24} />}
                 </div>
                 <div>
                    <h3 className="font-bold text-white text-lg">{u.username}</h3>
                    <p className="text-[10px] text-neutral-500 uppercase tracking-widest bg-neutral-950 px-2 py-0.5 rounded-md inline-block border border-neutral-800">{u.role}</p>
                 </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-neutral-800/50">
                 <span className="text-xs text-neutral-500">ID: {u.id.slice(-6)}</span>
                 <button 
                   onClick={() => setDeletingId(u.id)}
                   className="p-2 text-neutral-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 size={16}/>
                  </button>
              </div>
           </div>
         ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-8 shadow-2xl"
            >
               <h2 className="text-xl font-bold text-white mb-6">Create Staff Member</h2>
               <form onSubmit={handleCreateStaff} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Full Name / Username</label>
                    <input 
                      type="text" required
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Email Address</label>
                    <input 
                      type="email" required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Initial Password</label>
                    <input 
                      type="password" required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">System Role</label>
                    <select 
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:border-orange-500"
                    >
                       <option value="staff">Staff (Limited Access)</option>
                       <option value="admin">Administrator (Full Access)</option>
                    </select>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-neutral-500 font-bold border border-neutral-800 rounded-xl">Cancel</button>
                    <button type="submit" className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl shadow-xl shadow-orange-500/20">Create Member</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Staff;
