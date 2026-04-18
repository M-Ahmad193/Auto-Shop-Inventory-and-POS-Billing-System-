import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Bill, Expense } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  Package, 
  ShoppingCart, 
  Receipt,
  Search,
  Bike
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { motion } from 'motion/react';

const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [bills, setBills] = useState<Bill[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState({
    totalSales: 0,
    serviceIncome: 0, // service + labor
    partsProfit: 0,   // profit from item sale - cost
    totalExpenses: 0,
    totalPurchases: 0,
    netProfit: 0,
    serviceNet: 0,     // (service + labor) - expenses
    pendingReceivables: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      const now = new Date();
      const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Bills
      const billsRef = collection(db, 'bills');
      const bQuery = query(billsRef, where('createdAt', '>=', Timestamp.fromDate(startOfCurrentMonth)), orderBy('createdAt', 'desc'));
      const bSnapshot = await getDocs(bQuery);
      const bData = bSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bill));
      setBills(bData);

      // Expenses
      let eData: Expense[] = [];
      if (isAdmin) {
        const expRef = collection(db, 'expenses');
        const eQuery = query(expRef, where('createdAt', '>=', Timestamp.fromDate(startOfCurrentMonth)));
        const eSnapshot = await getDocs(eQuery);
        eData = eSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
        setExpenses(eData);
      }

      // Purchases
      let pHistory: any[] = [];
      if (isAdmin) {
        const purchasesRef = collection(db, 'purchases');
        const pQuery = query(purchasesRef, where('createdAt', '>=', Timestamp.fromDate(startOfCurrentMonth)));
        const pSnapshot = await getDocs(pQuery);
        pHistory = pSnapshot.docs.map(doc => doc.data());
      }

      // Calculations
      let sales = 0;
      let sIncome = 0;
      let pProfit = 0;
      let pending = 0;
      let totalDisc = 0;
      bData.forEach(b => {
        sales += b.total;
        pending += (b.balance || 0);
        totalDisc += (b.discount || 0);
        sIncome += ((b.serviceCharge || 0) + (b.laborCharge || 0));
        b.items.forEach(item => {
          pProfit += ((item.salePrice || 0) - (item.costPrice || 0)) * item.quantity;
        });
      });

      pProfit -= totalDisc;

      const totalExp = eData.reduce((acc, curr) => acc + curr.amount, 0);
      const totalPurchaseVal = pHistory.reduce((acc, curr) => acc + curr.total, 0);
      
      setStats({
        totalSales: sales,
        serviceIncome: sIncome,
        partsProfit: pProfit,
        totalExpenses: totalExp,
        totalPurchases: totalPurchaseVal,
        netProfit: (sIncome + pProfit) - totalExp - totalPurchaseVal, // Subtracting total stock investment
        serviceNet: sIncome - totalExp,
        pendingReceivables: pending
      });
    };

    fetchData();
  }, [isAdmin]);

  const statCards = [
    { title: 'Total Sales', value: stats.totalSales, icon: ShoppingCart, color: 'orange' },
    { title: 'Service + Labor', value: stats.serviceIncome, icon: TrendingUp, color: 'blue' },
    { title: 'Parts Profit', value: stats.partsProfit, icon: Package, color: 'emerald' },
    { title: 'Expenses', value: stats.totalExpenses, icon: Receipt, color: 'red' },
    { title: 'Stock Purchase', value: stats.totalPurchases, icon: Package, color: 'emerald' },
    { title: 'Operational Profit', value: stats.serviceNet, icon: ArrowUpRight, color: 'purple' },
    { title: 'Net Cash Profit', value: stats.netProfit, icon: ArrowUpRight, color: 'accent' },
  ];

  const chartData = bills
    .slice(0, 10)
    .reverse()
    .map(b => ({
      name: b.billNumber.toString(),
      total: b.total,
      profit: b.profit
    }));

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif text-white tracking-tight">Operational Intelligence</h1>
          <p className="text-text-s mt-1 text-sm font-medium uppercase tracking-[0.1em]">Afzal Auto Service — Performance Analytics</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="hidden md:flex flex-col items-end">
              <span className="text-xs text-text-s uppercase tracking-widest font-bold">Welcome, {user?.username}</span>
              <span className="bg-accent text-black px-2 py-0.5 rounded text-[10px] font-black mt-1">ADMINISTRATOR</span>
           </div>
           <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-black font-black">
              {user?.username?.[0].toUpperCase()}
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group bg-card border border-border p-5 rounded-lg hover:border-accent/30 transition-all"
          >
            <p className="text-[10px] font-black text-text-s uppercase tracking-[0.15em] mb-4">{card.title}</p>
            <div className="flex items-end justify-between">
              <h3 className={cn(
                "text-base font-serif mt-1",
                (card.title === 'Net Profit' || card.title === 'Operational Profit') ? "text-accent" : "text-white"
              )}>
                {formatCurrency(card.value)}
              </h3>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-xl">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-serif text-white">Profit Trajectory</h2>
            <div className="flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-accent"></span>
               <span className="text-[10px] text-text-s uppercase font-bold tracking-widest">Growth Curve</span>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d4af37" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#d4af37" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d35" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `Rs ${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#121216', border: '1px solid #2d2d35', borderRadius: '8px' }}
                  itemStyle={{ color: '#d4af37', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="total" stroke="#d4af37" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border p-6 rounded-xl flex flex-col">
          <h2 className="text-lg font-serif text-white mb-6">Recent Invoices</h2>
          <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {bills.slice(0, 6).map((bill) => (
              <div key={bill.id} className="flex items-center justify-between p-4 bg-bg border border-border/50 rounded-lg hover:border-accent/40 transition-colors group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-card flex items-center justify-center text-text-s group-hover:text-accent transition-colors border border-border">
                    <Bike size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-tight">Invoice {bill.billNumber}</p>
                    <p className="text-[9px] text-text-s font-medium uppercase">{bill.bikeNumber}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-accent">{formatCurrency(bill.total)}</p>
                  <p className="text-[8px] text-text-s uppercase tracking-tighter">Verified</p>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-6 w-full py-3 bg-accent text-black rounded-lg text-xs font-black transition-all uppercase tracking-widest hover:bg-white">
            Access Full Ledgers
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
