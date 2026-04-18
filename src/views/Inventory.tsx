import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { InventoryItem } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { 
  Package, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  X, 
  Save, 
  FileUp, 
  FileDown, 
  Download,
  Loader2,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';

const Inventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    costPrice: '',
    salePrice: '',
    quantity: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'inventory'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setItems(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        costPrice: item.costPrice.toString(),
        salePrice: item.salePrice.toString(),
        quantity: item.quantity.toString()
      });
    } else {
      setEditingItem(null);
      setFormData({ name: '', costPrice: '', salePrice: '', quantity: '' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: formData.name,
      costPrice: Number(formData.costPrice),
      salePrice: Number(formData.salePrice),
      quantity: Number(formData.quantity)
    };

    try {
      if (editingItem) {
        await updateDoc(doc(db, 'inventory', editingItem.id), data);
      } else {
        await addDoc(collection(db, 'inventory'), data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving item:", error);
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'inventory', id));
      setDeletingId(null);
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Error deleting inventory item.");
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(items.map(i => ({
      Name: i.name,
      CostPrice: i.costPrice,
      SalePrice: i.salePrice,
      Quantity: i.quantity
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
    XLSX.writeFile(workbook, "Inventory_Backup.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws) as any[];

      for (const row of data) {
        if (row.Name && row.CostPrice !== undefined && row.SalePrice !== undefined && row.Quantity !== undefined) {
          await addDoc(collection(db, 'inventory'), {
            name: row.Name,
            costPrice: Number(row.CostPrice),
            salePrice: Number(row.SalePrice),
            quantity: Number(row.Quantity)
          });
        }
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {deletingId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
           <div className="bg-neutral-900 border border-red-500/50 p-8 rounded-3xl max-w-sm text-center">
              <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
              <h3 className="text-xl font-bold text-white mb-2">Delete Item?</h3>
              <p className="text-sm text-neutral-500 mb-8">This will permanently remove the item from inventory records. This action cannot be undone.</p>
              <div className="flex gap-4">
                 <button onClick={() => setDeletingId(null)} className="flex-1 py-3 text-neutral-500 font-bold border border-neutral-800 rounded-xl">Cancel</button>
                 <button onClick={() => handleDelete(deletingId)} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl shadow-xl shadow-red-500/20">Delete</button>
              </div>
           </div>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="text-orange-500" />
            Inventory Management
          </h1>
          <p className="text-neutral-500 text-sm">Add, update, or track your shop inventory records</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white rounded-xl py-2.5 px-4 text-xs font-bold transition-all flex items-center gap-2">
            <FileUp size={16} className="text-blue-400" />
            Bulk Upload
            <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleFileUpload} />
          </label>
          <button 
            onClick={exportToExcel}
            className="bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-white rounded-xl py-2.5 px-4 text-xs font-bold transition-all flex items-center gap-2"
          >
            <FileDown size={16} className="text-emerald-400" />
            Export Data
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20 text-white rounded-xl py-2.5 px-4 text-xs font-bold transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Add New Item
          </button>
        </div>
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-3xl overflow-hidden p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={18} />
            <input 
              type="text" 
              placeholder="Search items by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-orange-500/50 transition-all font-medium" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead>
              <tr className="text-neutral-500 text-[10px] uppercase font-bold tracking-widest">
                <th className="pb-4 pl-4 border-b border-neutral-800/50">Item Details</th>
                <th className="pb-4 border-b border-neutral-800/50">Cost Price</th>
                <th className="pb-4 border-b border-neutral-800/50">Sale Price</th>
                <th className="pb-4 border-b border-neutral-800/50">Stock Quantity</th>
                <th className="pb-4 border-b border-neutral-800/50">Profit Margin</th>
                <th className="pb-4 pr-4 border-b border-neutral-800/50 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 className="animate-spin text-orange-500 mx-auto" size={32} />
                  </td>
                </tr>
              ) : filteredItems.map((item) => (
                <tr key={item.id} className="group hover:bg-neutral-800/20 transition-colors">
                  <td className="py-4 pl-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-neutral-400 group-hover:text-orange-500 transition-colors">
                        <Package size={20} />
                      </div>
                      <span className="font-bold text-sm text-white">{item.name}</span>
                    </div>
                  </td>
                  <td className="py-4 text-neutral-400 text-sm">{formatCurrency(item.costPrice)}</td>
                  <td className="py-4 text-orange-500 font-bold text-sm">{formatCurrency(item.salePrice)}</td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                       <span className={cn(
                         "text-xs font-bold px-2.5 py-1 rounded-lg border",
                         item.quantity < 5 
                           ? "bg-red-500/10 text-red-500 border-red-500/20" 
                           : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                       )}>
                         {item.quantity} in stock
                       </span>
                       {item.quantity < 5 && <AlertCircle size={14} className="text-red-500 animate-pulse" />}
                    </div>
                  </td>
                  <td className="py-4 text-emerald-500 text-xs font-bold uppercase">
                     +{formatCurrency(item.salePrice - item.costPrice)} item
                  </td>
                  <td className="py-4 pr-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(item)}
                        className="p-2 text-neutral-500 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setDeletingId(item.id)}
                        className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredItems.length === 0 && !loading && (
            <div className="py-20 text-center text-neutral-500">
               <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                  <Search size={32} />
               </div>
               <p className="text-lg font-bold text-white mb-2">No items found</p>
               <p className="text-sm">Try adjusting your search or add a new inventory item</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl p-8 overflow-hidden relative"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-red-500" />
              
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-bold text-white">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-neutral-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Item Name</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Castrol Edge 10W-40"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all shadow-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Cost Price (Rs)</label>
                    <input 
                      type="number" 
                      required
                      value={formData.costPrice}
                      onChange={(e) => setFormData({...formData, costPrice: e.target.value})}
                      placeholder="0"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all shadow-xl"
                    />
                  </div>
                   <div className="space-y-2">
                    <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Sale Price (Rs)</label>
                    <input 
                      type="number" 
                      required
                      value={formData.salePrice}
                      onChange={(e) => setFormData({...formData, salePrice: e.target.value})}
                      placeholder="0"
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all shadow-xl"
                    />
                  </div>
                </div>

                 <div className="space-y-2">
                  <label className="text-xs font-bold text-neutral-500 uppercase tracking-widest ml-1">Current Quantity</label>
                  <input 
                    type="number" 
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    placeholder="0"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-orange-500 transition-all shadow-xl"
                  />
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-3.5 border border-neutral-800 text-neutral-400 hover:text-white font-bold rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-[2] py-3.5 bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-500/20 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    {editingItem ? 'Update Item' : 'Save Item'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Inventory;
