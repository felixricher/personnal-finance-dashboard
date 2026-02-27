import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, TrendingUp, ChevronLeft, ChevronRight, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(!isOpen);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Récapitulatif" },
    { to: "/revenues", icon: Banknote, label: "Revenus" },
    { to: "/budget", icon: Wallet, label: "Budget Mensuel" },
    { to: "/investments", icon: TrendingUp, label: "Investissements" },
  ];

  return (
    <div 
      className={cn(
        "flex flex-col h-screen bg-white/5 backdrop-blur-xl border-r border-white/10 transition-all duration-300 ease-in-out relative z-20",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-white/10 h-16">
        {isOpen && <span className="font-bold text-lg truncate text-white tracking-wider">Finance Dash</span>}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={toggle} 
          className={cn("ml-auto text-white/70 hover:text-white hover:bg-white/10", !isOpen && "mx-auto")}
        >
          {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => cn(
              "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200",
              "hover:bg-white/10 text-white/70 hover:text-white",
              isActive && "bg-white/15 text-white font-medium shadow-lg shadow-black/5 backdrop-blur-md border border-white/5",
              !isOpen && "justify-center px-2"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {isOpen && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
