import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Customer } from '../types';
import { Bike, Search, Phone, History, User, ChevronRight, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('phone', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer)));
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filtered = customers.filter(c => 
    c.phone.includes(search) || 
    c.bikeNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
           <Bike className="text-orange-500" /> Customer & Bike Records
        </h1>
        <p className="text-neutral-500 text-sm">Database of all bikes serviced at Afzal Auto</p>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 p-8 rounded-3xl">
         <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-600" size={18} />
            <input 
              type="text" 
              placeholder="Search by phone, bike number or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl py-3.5 pl-12 pr-4 text-sm focus:border-orange-500/50 transition-all shadow-inner"
            />
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {loading ? (
              <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin inline-block text-orange-500" /></div>
            ) : filtered.map(c => (
              <div key={c.id} className="bg-neutral-950/50 border border-neutral-800 p-6 rounded-2xl hover:border-orange-500/30 transition-all cursor-pointer group">
                  <div className="flex items-center justify-between mb-4">
                     <div className="w-10 h-10 rounded-xl bg-neutral-900 flex items-center justify-center text-neutral-500 group-hover:bg-orange-500/10 group-hover:text-orange-500 transition-colors">
                        <User size={20} />
                     </div>
                     <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest border border-neutral-800 px-2.5 py-1 rounded-full">{c.bikeModel}</span>
                  </div>
                  <h3 className="font-bold text-white text-lg mb-1">{c.name || 'Walk-in Customer'}</h3>
                  <div className="space-y-2 mt-4">
                     <div className="flex items-center gap-3 text-xs text-neutral-400">
                        <Phone size={14} className="text-neutral-600" />
                        <span className="font-medium">{c.phone}</span>
                     </div>
                     <div className="flex items-center gap-3 text-xs text-neutral-400">
                        <Bike size={14} className="text-neutral-600" />
                        <span className="font-bold text-orange-500 uppercase tracking-widest">{c.bikeNumber}</span>
                     </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-neutral-800/50 flex items-center justify-between">
                     <span className="text-[10px] uppercase font-bold text-neutral-500 flex items-center gap-1.5"><History size={12}/> View History</span>
                     <ChevronRight size={14} className="text-neutral-700 group-hover:translate-x-1 transition-transform" />
                  </div>
              </div>
            ))}
         </div>
         
         {filtered.length === 0 && !loading && (
           <div className="py-20 text-center opacity-30">
              <Bike size={64} className="mx-auto mb-4" />
              <p className="text-sm font-bold">No records found matching your search</p>
           </div>
         )}
      </div>
    </div>
  );
};

export default Customers;
