import React, { useState, useEffect } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Bike, Lock, User as UserIcon, Loader2, UserPlus, LogIn } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      let msg = 'Authentication failed. Please try again.';
      
      if (err.code === 'auth/invalid-credential') {
        msg = `Access denied. If this is your first time, please use the "Register" tab at the top. If you already have an account, check your password.`;
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already in the system. Use the "Login" tab to access your account.';
      } else if (err.code === 'auth/user-not-found') {
        msg = 'No account detected. Switch to "Register" to create one.';
      } else if (err.code === 'auth/wrong-password') {
        msg = 'Incorrect security key. Please verify and try again.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'For security, your password must be at least 6 characters long.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Terminal sync failed. Check your network connection.';
      } else if (err.message) {
        msg = err.message;
      }
      
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6 selection:bg-accent/30 bg-[radial-gradient(circle_at_center,_var(--color-border)_0%,_transparent_100%)]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative"
      >
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-card border border-border mb-6 shadow-2xl">
             <h1 className="text-3xl font-serif italic text-accent">A</h1>
          </div>
          <h2 className="text-3xl font-serif text-white tracking-tight">Afzal Auto Service</h2>
          <p className="text-text-s mt-2 text-xs uppercase tracking-[0.2em] font-black italic">Operational Intelligence</p>
        </div>

        <div className="bg-card border border-border p-10 rounded-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-accent/50 to-transparent"></div>
          
          <div className="flex bg-black/40 p-1 rounded-lg border border-border/50 mb-8 items-center">
             <button 
               onClick={() => setIsRegistering(false)}
               className={cn(
                 "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded transition-all flex items-center justify-center gap-2",
                 !isRegistering ? "bg-accent text-black" : "text-text-s hover:text-white"
               )}
             >
                <LogIn size={12}/> Login
             </button>
             <button 
               onClick={() => setIsRegistering(true)}
               className={cn(
                 "flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded transition-all flex items-center justify-center gap-2",
                 isRegistering ? "bg-accent text-black" : "text-text-s hover:text-white"
               )}
             >
                <UserPlus size={12}/> Register
             </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-s uppercase tracking-widest ml-1">Access Identity</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black border border-border rounded py-3.5 px-4 text-white focus:border-accent transition-all text-sm outline-none"
                  placeholder="admin@afzalauto.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-text-s uppercase tracking-widest ml-1">Security Key</label>
               <input
                 type="password"
                 required
                 value={password}
                 onChange={(e) => setPassword(e.target.value)}
                 className="w-full bg-black border border-border rounded py-3.5 px-4 text-white focus:border-accent transition-all text-sm outline-none"
                 placeholder="••••••••"
               />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 bg-danger/10 border border-danger/20 rounded text-[10px] text-danger font-black uppercase tracking-widest text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-accent hover:bg-white text-black font-black rounded shadow-xl shadow-accent/10 transition-all uppercase tracking-[0.2em] text-xs disabled:opacity-50"
            >
              {loading ? 'Verifying...' : isRegistering ? 'Initialize Account' : 'Establish Connection'}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-border/30">
             <p className="text-center text-[10px] text-text-s uppercase tracking-widest font-black opacity-30">
               Secure Terminal — System v2.1
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
