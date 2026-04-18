import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Purchase, Supplier, InventoryItem } from '../types';
import { Wallet, Plus, Search, Calendar, Package, Loader2, Save, X, Trash2 } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

const Purchases = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<{ itemId: string; name: string; quantity: number; costPrice: number }[]>([]);

  const [newItem, setNewItem] = useState({ itemId: '', quantity: 1, costPrice: 0 });

  useEffect(() => {
    onSnapshot(query(collection(db, 'purchases'), orderBy('createdAt', 'desc')), (snap) => {
      setPurchases(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data().createdAt?.toDate() } as Purchase)));
      setLoading(false);
    });
    onSnapshot(collection(db, 'suppliers'), (snap) => {
      setSuppliers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier)));
    });
    onSnapshot(collection(db, 'inventory'), (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    });
  }, []);

  const addItemToPurchase = () => {
    if (!newItem.itemId || newItem.quantity <= 0) return;
    const inventoryItem = items.find(i => i.id === newItem.itemId);
    if (!inventoryItem) return;

    setPurchaseItems([...purchaseItems, {
      itemId: newItem.itemId,
      name: inventoryItem.name,
      quantity: newItem.quantity,
      costPrice: newItem.costPrice || inventoryItem.costPrice
    }]);
    setNewItem({ itemId: '', quantity: 1, costPrice: 0 });
  };

  const removeItemFromPurchase = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || purchaseItems.length === 0) {
      alert("Please select a supplier and add at least one item.");
      return;
    }

    const supplier = suppliers.find(s => s.id === selectedSupplierId);
    const total = purchaseItems.reduce((acc, curr) => acc + (curr.costPrice * curr.quantity), 0);

    try {
      const { doc, writeBatch } = await import('firebase/firestore');
      const batch = writeBatch(db);

      // 1. Create Purchase record
      const purchaseRef = doc(collection(db, 'purchases'));
      batch.set(purchaseRef, {
        supplierId: selectedSupplierId,
        supplierName: supplier?.name,
        items: purchaseItems,
        total,
        createdAt: Timestamp.now()
      });

      // 2. Update Inventory quantities
      purchaseItems.forEach(item => {
        const itemRef = doc(db, 'inventory', item.itemId);
        const currentItem = items.find(i => i.id === item.itemId);
        if (currentItem) {
          batch.update(itemRef, {
            quantity: currentItem.quantity + item.quantity,
            costPrice: item.costPrice // Update to latest purchase price
          });
        }
      });

      await batch.commit();

      setIsModalOpen(false);
      setPurchaseItems([]);
      setSelectedSupplierId('');
      alert("Purchase recorded and inventory updated successfully.");
    } catch (error) {
      console.error(error);
      alert("Error recording purchase.");
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeletePurchase = async (id: string) => {
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, 'purchases', id));
      setDeletingId(null);
    } catch (error) {
      console.error(error);
      alert("Error deleting purchase.");
    }
  };

  return (
    <div className="space-y-6">
      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
           <div className="bg-neutral-900 border border-red-500/50 p-8 rounded-3xl max-w-sm text-center">
              <Package className="text-red-500 mx-auto mb-4" size={48} />
              <h3 className="text-xl font-bold text-white mb-2">Delete Record?</h3>
              <p className="text-sm text-neutral-500 mb-8">This will delete the purchase history record. Stock quantities already updated will remain as is.</p>
              <div className="flex gap-4">
                 <button onClick={() => setDeletingId(null)} className="flex-1 py-3 text-neutral-500 font-bold border border-neutral-800 rounded-xl">Cancel</button>
                 <button onClick={() => handleDeletePurchase(deletingId)} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-xl shadow-red-500/20">Delete</button>
              </div>
           </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
             <Wallet className="text-emerald-500" /> Inventory Purchases
          </h1>
          <p className="text-neutral-500 text-sm">Record new stock arrivals and supplier payments</p>
        </div>
        <button 
           onClick={() => setIsModalOpen(true)}
           className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-emerald-500/10"
        >
          <Plus size={18} /> Record New Stock
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
         {purchases.map(p => (
           <div key={p.id} className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:border-emerald-500/30">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                    <Package size={24} />
                 </div>
                 <div>
                    <h3 className="font-bold text-white text-lg">{p.supplierName}</h3>
                    <p className="text-[10px] text-neutral-500 flex items-center gap-1.5 uppercase font-black tracking-widest">
                       <Calendar size={12}/> {format(p.createdAt, 'dd MMM yyyy')}
                    </p>
                 </div>
              </div>
              <div className="flex items-center gap-6">
                 <div className="text-right">
                    <p className="text-lg font-bold text-emerald-500">{formatCurrency(p.total)}</p>
                    <p className="text-[10px] text-neutral-500 uppercase font-black tracking-widest">{p.items.length} items recorded</p>
                 </div>
                 <button 
                   onClick={() => setDeletingId(p.id)}
                   className="p-2 text-neutral-600 hover:text-red-500 transition-colors"
                 >
                   <Trash2 size={18} />
                 </button>
              </div>
           </div>
         ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.95, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-2xl p-8 shadow-2xl relative"
            >
               <h2 className="text-xl font-bold text-white mb-6">Record Bulk Stock Entry</h2>
               <form onSubmit={handleAddPurchase} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest pl-1">Supplier Source</label>
                    <select 
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:border-emerald-500"
                    >
                      <option value="">Choose Supplier...</option>
                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  
                  <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-4 space-y-4">
                     <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Add Items to Purchase</p>
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <select 
                            value={newItem.itemId}
                            onChange={(e) => {
                              const item = items.find(i => i.id === e.target.value);
                              setNewItem({...newItem, itemId: e.target.value, costPrice: item?.costPrice || 0});
                            }}
                            className="w-full bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-sm text-white"
                          >
                             <option value="">Select Item...</option>
                             {items.map(i => <option key={i.id} value={i.id}>{i.name} (Stock: {i.quantity})</option>)}
                          </select>
                        </div>
                        <input 
                          type="number" placeholder="Qty"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 0})}
                          className="bg-neutral-900 border border-neutral-800 rounded-lg py-2 px-3 text-sm text-white"
                        />
                        <button 
                          type="button" 
                          onClick={addItemToPurchase}
                          className="bg-neutral-100 hover:bg-white text-black font-bold text-xs rounded-lg py-2 uppercase tracking-widest"
                        >
                          Add
                        </button>
                     </div>

                     <div className="max-h-40 overflow-y-auto space-y-2 mt-4">
                        {purchaseItems.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-xs bg-neutral-900/50 p-2 rounded-lg border border-neutral-800">
                             <div className="flex gap-4">
                               <span className="text-white font-bold">{item.name}</span>
                               <span className="text-neutral-500">Qty: {item.quantity}</span>
                               <span className="text-emerald-500">{formatCurrency(item.costPrice * item.quantity)}</span>
                             </div>
                             <button type="button" onClick={() => removeItemFromPurchase(index)} className="text-neutral-600 hover:text-red-500"><X size={14}/></button>
                          </div>
                        ))}
                     </div>
                  </div>
                  
                  <div className="flex gap-4 pt-4 text-sm">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-neutral-500 font-bold border border-neutral-800 rounded-xl">Discard</button>
                    <button type="submit" className="flex-1 py-3 bg-emerald-500 text-white font-bold rounded-xl shadow-xl shadow-emerald-500/20">Record Bulk Entry</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Purchases;
