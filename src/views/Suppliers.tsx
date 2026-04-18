import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Supplier } from '../types';
import { Truck, Plus, Search, Edit2, Trash2, X, Save, Phone, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'suppliers'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Supplier)));
    });
    return unsubscribe;
  }, []);

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        phone: supplier.phone || '',
        notes: supplier.notes || ''
      });
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', phone: '', notes: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await updateDoc(doc(db, 'suppliers', editingSupplier.id), formData);
      } else {
        await addDoc(collection(db, 'suppliers'), formData);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'suppliers', id));
      setDeletingId(null);
    } catch (error) {
      console.error(error);
      alert("Error deleting supplier.");
    }
  };

  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
           <div className="bg-neutral-900 border border-red-500/50 p-8 rounded-3xl max-w-sm text-center">
              <Truck className="text-red-500 mx-auto mb-4" size={48} />
              <h3 className="text-xl font-bold text-white mb-2">Delete Supplier?</h3>
              <p className="text-sm text-neutral-500 mb-8">Are you sure you want to remove this supplier? All purchase history will remain but the supplier will be unlinked.</p>
              <div className="flex gap-4">
                 <button onClick={() => setDeletingId(null)} className="flex-1 py-3 text-neutral-500 font-bold border border-neutral-800 rounded-xl">Cancel</button>
                 <button onClick={() => handleDelete(deletingId)} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-xl shadow-red-500/20">Delete</button>
              </div>
           </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
             <Truck className="text-orange-500" /> Suppliers Directory
          </h1>
          <p className="text-neutral-500 text-sm">Manage spare parts suppliers and their contact info</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-500/20 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all"
        >
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl">
         <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
            <input 
              type="text" 
              placeholder="Filter by supplier name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-orange-500/50 transition-all"
            />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(s => (
              <div key={s.id} className="bg-neutral-950/50 border border-neutral-800 p-6 rounded-2xl hover:border-orange-500/30 transition-all group">
                <div className="flex justify-between items-start mb-4">
                   <div className="w-10 h-10 bg-neutral-900 rounded-xl flex items-center justify-center text-neutral-500 group-hover:bg-orange-500/10 group-hover:text-orange-500 transition-all">
                      <Truck size={20} />
                   </div>
                   <div className="flex gap-1">
                      <button onClick={() => handleOpenModal(s)} className="p-1.5 text-neutral-600 hover:text-white"><Edit2 size={14} /></button>
                      <button onClick={() => setDeletingId(s.id)} className="p-1.5 text-neutral-600 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                   </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{s.name}</h3>
                <div className="flex items-center gap-2 text-xs text-neutral-400 mb-4">
                   <Phone size={12} className="text-neutral-600" />
                   <span>{s.phone || 'No phone added'}</span>
                </div>
                {s.notes && <p className="text-xs text-neutral-500 bg-neutral-900 p-3 rounded-lg border border-neutral-800">{s.notes}</p>}
              </div>
            ))}
         </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-8 shadow-2xl"
            >
               <h2 className="text-xl font-bold text-white mb-6 underline decoration-orange-500 underline-offset-8">{editingSupplier ? 'Update Supplier' : 'New Supplier'}</h2>
               <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Supplier Name</label>
                    <input 
                      type="text" required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Phone Number</label>
                    <input 
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:border-orange-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Additional Notes</label>
                    <textarea 
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={3}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:border-orange-500"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-neutral-500 font-bold border border-neutral-800 rounded-xl">Cancel</button>
                    <button type="submit" className="flex-1 py-3 bg-orange-500 text-white font-bold rounded-xl shadow-xl shadow-orange-500/20">Save Details</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Suppliers;
