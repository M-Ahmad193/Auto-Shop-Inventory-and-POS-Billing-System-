import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Expense } from '../types';
import { formatCurrency } from '../lib/utils';
import { Receipt, Plus, Search, Trash2, X, Save, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

const Expenses = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    category: 'Shop Utilities'
  });

  useEffect(() => {
    const q = query(collection(db, 'expenses'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      } as Expense)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'expenses'), {
        amount: Number(formData.amount),
        description: formData.description,
        category: formData.category,
        createdAt: Timestamp.now()
      });
      setIsModalOpen(false);
      setFormData({ amount: '', description: '', category: 'Shop Utilities' });
    } catch (error) {
      console.error(error);
    }
  };

  const categories = ['Shop Utilities', 'Staff Salary', 'Maintenance', 'Marketing', 'Rent', 'Misc'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
             <Receipt className="text-orange-500" /> Shop Expenses
          </h1>
          <p className="text-neutral-500 text-sm">Track your daily costs and recurring shop expenses</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-red-500 hover:bg-red-600 shadow-xl shadow-red-500/20 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all"
        >
          <Plus size={18} /> Add Expense
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-neutral-950 text-neutral-500 text-[10px] font-black uppercase tracking-widest">
                    <th className="px-6 py-4">Expense Desc</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-neutral-800">
                  {loading ? (
                    <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin inline-block" /></td></tr>
                  ) : expenses.map(e => (
                    <tr key={e.id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-white leading-tight">{e.description}</p>
                      </td>
                      <td className="px-6 py-4">
                         <span className="text-[10px] font-bold text-neutral-400 bg-neutral-800 px-2 py-0.5 rounded-full uppercase tracking-tighter">{e.category}</span>
                      </td>
                      <td className="px-6 py-4">
                         <p className="text-xs text-neutral-500 flex items-center gap-2"><Calendar size={12}/> {format(e.createdAt, 'dd MMM yyyy')}</p>
                      </td>
                      <td className="px-6 py-4">
                         <p className="text-sm font-black text-red-500">{formatCurrency(e.amount)}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                         <button onClick={async () => { if(confirm('Delete?')) await deleteDoc(doc(db, 'expenses', e.id))}} className="text-neutral-600 hover:text-red-500"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-8 shadow-2xl relative"
            >
               <h2 className="text-xl font-bold text-white mb-6">New Expense Entry</h2>
               <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Amount (Rs)</label>
                    <input 
                      type="number" required
                      value={formData.amount}
                      onChange={(e) => setFormData({...formData, amount: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:border-red-500 transition-all font-black text-lg"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Category</label>
                    <select 
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:border-red-500"
                    >
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Description</label>
                    <input 
                      type="text" required
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="e.g. Electric bill for April"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:border-red-500"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-neutral-500 font-bold border border-neutral-800 rounded-xl">Cancel</button>
                    <button type="submit" className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-xl shadow-red-500/20">Record Expense</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Expenses;
