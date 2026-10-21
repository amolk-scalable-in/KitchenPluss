import React, { useEffect, useRef } from 'react';
import {
  Flame,
  Layers,
  UtensilsCrossed,
  Sparkles,
  ClipboardList,
  Users,
  Menu,
  X,
  Plus,
  ChevronRight,
  Building2,
  Crown,
  Shield,
  Activity,
  AlertTriangle,
  ArrowRight,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import type { AppTab } from './Header.js';

export interface NavigationMenuProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  ticketCounts?: { queue: number; firing: number; lowStock: number };
  isMobileDrawerOpen: boolean;
  setIsMobileDrawerOpen: (open: boolean) => void;
  onOpenNewTicket: () => void;
  alertsCount?: number;
}

interface NavItemConfig {
  id: AppTab;
  label: string;
  shortLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  badgeType?: 'info' | 'warning' | 'accent';
  gradient: string;
  activeBorder: string;
  glowShadow: string;
  adminOnly?: boolean;
}

export const NavigationMenu: React.FC<NavigationMenuProps> = ({
  activeTab,
  setActiveTab,
  ticketCounts,
  isMobileDrawerOpen,
  setIsMobileDrawerOpen,
  onOpenNewTicket,
  alertsCount = 0,
}) => {
  const { user, organization, hasAdminAccess, isOwner, isAdmin, logout } = useAuth();
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const totalActiveTickets = (ticketCounts?.queue ?? 0) + (ticketCounts?.firing ?? 0);

  // Configuration of all available modules in KitchenPulse
  const navItems: NavItemConfig[] = [
    {
      id: 'kds',
      label: 'Live KDS',
      shortLabel: 'KDS',
      description: 'Real-time kitchen order queue & station wait timers',
      icon: Flame,
      badge: totalActiveTickets,
      badgeType: 'info',
      gradient: 'from-sky-500 to-sky-600',
      activeBorder: 'border-sky-400/40',
      glowShadow: 'shadow-glow-sky',
    },
    {
      id: 'inventory',
      label: 'Stock & Pantry',
      shortLabel: 'Stock',
      description: 'Pantry inventory levels, safety thresholds & auto-POs',
      icon: Layers,
      badge: ticketCounts?.lowStock,
      badgeType: 'warning',
      gradient: 'from-indigo-500 to-indigo-600',
      activeBorder: 'border-indigo-400/40',
      glowShadow: 'shadow-[0_0_20px_rgba(99,102,241,0.3)]',
    },
    {
      id: 'menu',
      label: 'Dishes & BOM',
      shortLabel: 'Dishes',
      description: 'Recipes, prep stations & bill-of-materials cost breakdown',
      icon: UtensilsCrossed,
      gradient: 'from-pink-600 to-rose-600',
      activeBorder: 'border-pink-400/40',
      glowShadow: 'shadow-[0_0_20px_rgba(236,72,153,0.3)]',
    },
    {
      id: 'ai-prep',
      label: 'Prep AI',
      shortLabel: 'Prep AI',
      description: 'Gemini autonomous prep recommendations & cost intelligence',
      icon: Sparkles,
      gradient: 'from-purple-500 to-indigo-600',
      activeBorder: 'border-purple-400/40',
      glowShadow: 'shadow-glow-purple',
    },
    {
      id: 'waste-log',
      label: 'Scrap Log',
      shortLabel: 'Scrap',
      description: 'Shift scrap logging, waste analytics & portion tracking',
      icon: ClipboardList,
      gradient: 'from-slate-700 to-slate-800',
      activeBorder: 'border-white/20',
      glowShadow: 'shadow-glass',
    },
    {
      id: 'team',
      label: 'Team & Roles',
      shortLabel: 'Team',
      description: 'Staff permissions, team invitations & multi-tenant access',
      icon: Users,
      gradient: 'from-emerald-600 to-teal-600',
      activeBorder: 'border-emerald-400/40',
      glowShadow: 'shadow-glow-emerald',
      adminOnly: true,
    },
  ];

  // Filter items according to permissions
  const visibleNavItems = navItems.filter((item) => !item.adminOnly || hasAdminAccess);

  // Auto-scroll active tab into view on smaller screens
  useEffect(() => {
    if (activeTabRef.current && scrollContainerRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      });
    }
  }, [activeTab]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (isMobileDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileDrawerOpen]);

  return (
    <>
      {/* ============================================================ */}
      {/* 1. Dedicated Sub-Header Navigation Bar (Web, Tablet & Mobile) */}
      {/* Sits cleanly beneath the top header, separated from utility   */}
      {/* ============================================================ */}
      <nav
        aria-label="Kitchen Operations Navigation"
        className="sticky top-14 sm:top-16 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-white/10 transition-all duration-200"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-2 sm:py-2.5 gap-2">
            
            {/* Scrollable Segmented Bar for all screen sizes */}
            <div className="relative flex-1 min-w-0">
              <div
                ref={scrollContainerRef}
                role="tablist"
                className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto scrollbar-none scroll-smooth py-0.5 px-0.5"
              >
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      ref={isActive ? activeTabRef : null}
                      role="tab"
                      aria-selected={isActive}
                      aria-controls={`panel-${item.id}`}
                      onClick={() => setActiveTab(item.id)}
                      className={`group relative flex items-center space-x-1.5 sm:space-x-2 px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 whitespace-nowrap min-h-[42px] select-none flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                        isActive
                          ? `bg-gradient-to-r ${item.gradient} text-white ${item.glowShadow} border ${item.activeBorder}`
                          : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 transition-transform flex-shrink-0 ${
                          isActive ? 'scale-110 text-white' : 'text-slate-400 group-hover:text-slate-200 group-hover:scale-105'
                        }`}
                      />
                      {/* Short label on mobile, full label on tablet/desktop */}
                      <span className="inline sm:hidden">{item.shortLabel}</span>
                      <span className="hidden sm:inline">{item.label}</span>

                      {/* Live Badge Counters */}
                      {typeof item.badge === 'number' && item.badge > 0 && (
                        <span
                          className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold flex-shrink-0 transition-all ${
                            isActive
                              ? 'bg-black/30 text-white border border-white/20'
                              : item.badgeType === 'warning'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/40 animate-pulse'
                              : 'bg-slate-800 text-sky-300 border border-sky-500/30'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick "All Modules" / Menu Drawer Toggle on Tablet & Mobile */}
            <div className="flex items-center space-x-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(true)}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white border border-white/10 hover:border-white/20 text-xs font-semibold transition-all active:scale-95 min-h-[42px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                aria-label="Open All Modules Menu"
                title="View All Operations"
              >
                <Menu className="w-4 h-4 text-sky-400" />
                <span className="hidden md:inline text-xs font-medium text-slate-300">All Modules</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* ============================================================ */}
      {/* 2. Slide-Over Full Modules Drawer (Mobile & Tablet)           */}
      {/* Shows rich detailed cards for all modules so user is never   */}
      {/* confused about what each section does                         */}
      {/* ============================================================ */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-200">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-md transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div className="relative w-full max-w-sm sm:max-w-md bg-slate-950/95 border-l border-white/15 h-full flex flex-col shadow-2xl z-10 overflow-hidden backdrop-blur-2xl">
            {/* Ambient Top Glow */}
            <div className="h-1 w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-500" />

            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg border border-white/20">
                  <Flame className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-white leading-tight">KitchenPulse</h2>
                  {organization ? (
                    <div className="flex items-center space-x-1 text-xs text-sky-400 font-semibold mt-0.5">
                      <Building2 className="w-3 h-3 text-sky-400 flex-shrink-0" />
                      <span className="truncate max-w-[180px]">{organization.name}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400">Operations Control</span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 border border-white/10 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                aria-label="Close menu drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Info Strip inside Drawer */}
            {user && (
              <div className="mx-4 sm:mx-5 mt-4 p-3 rounded-2xl bg-slate-900/70 border border-white/10 flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.name}
                      className="w-8 h-8 rounded-xl object-cover ring-1 ring-sky-500/50 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-sm flex-shrink-0">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white truncate">{user.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">{user.email}</div>
                  </div>
                </div>

                <span
                  className={`text-[9px] uppercase px-2 py-0.5 rounded-md font-mono font-bold flex-shrink-0 ${
                    isOwner
                      ? 'bg-amber-950/70 text-amber-300 border border-amber-500/40 shadow-glow-amber'
                      : isAdmin
                      ? 'bg-sky-950/70 text-sky-300 border border-sky-500/40 shadow-glow-sky'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {isOwner && <Crown className="w-2.5 h-2.5 inline mr-1 text-amber-400" />}
                  {isAdmin && <Shield className="w-2.5 h-2.5 inline mr-1 text-sky-400" />}
                  {user.role}
                </span>
              </div>
            )}

            {/* Module Cards List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5 custom-scrollbar">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-1">
                Kitchen Modules
              </div>

              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileDrawerOpen(false);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 flex items-start space-x-3 group min-h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                      isActive
                        ? `bg-slate-900 border-sky-500/50 shadow-glass ${item.glowShadow}`
                        : 'bg-slate-900/40 border-white/10 hover:bg-slate-900/80 hover:border-white/20'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                        isActive
                          ? `bg-gradient-to-tr ${item.gradient} text-white shadow-md`
                          : 'bg-slate-800/80 text-slate-300 group-hover:bg-slate-800 group-hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-sm font-bold truncate ${
                            isActive ? 'text-white' : 'text-slate-200 group-hover:text-white'
                          }`}
                        >
                          {item.label}
                        </span>

                        {typeof item.badge === 'number' && item.badge > 0 && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                              item.badgeType === 'warning'
                                ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                : 'bg-sky-950 text-sky-300 border border-sky-500/40'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5 leading-tight">
                        {item.description}
                      </p>
                    </div>

                    <ChevronRight
                      className={`w-4 h-4 flex-shrink-0 self-center transition-transform ${
                        isActive ? 'text-sky-400 translate-x-0.5' : 'text-slate-600 group-hover:text-slate-400'
                      }`}
                    />
                  </button>
                );
              })}

              {/* Quick Action: Fire New Ticket */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    onOpenNewTicket();
                  }}
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-500 to-sky-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs shadow-glow-sky border border-sky-300/30 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create / Fire New Ticket</span>
                </button>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[11px] font-mono">KitchenPulse v1.0</span>
              <button
                type="button"
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  logout();
                }}
                className="flex items-center space-x-1.5 text-rose-400 hover:text-rose-300 py-1.5 px-2.5 rounded-lg hover:bg-rose-950/30 transition-colors font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. Floating Mobile Bottom Dock (< md)                        */}
      {/* Fast, thumb-friendly navigation bar for immediate one-tap    */}
      {/* switching on phones with zero layout clutter                 */}
      {/* ============================================================ */}
      <nav
        aria-label="Mobile Quick Dock"
        className="md:hidden fixed bottom-3 inset-x-3 z-40 bg-slate-950/90 backdrop-blur-2xl rounded-2xl p-1.5 flex justify-around items-center border border-white/15 shadow-glass-lg"
      >
        {/* KDS */}
        <button
          type="button"
          onClick={() => setActiveTab('kds')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 min-h-[46px] min-w-[50px] ${
            activeTab === 'kds'
              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-glow-sky'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
          aria-label="Kitchen Display System"
        >
          <div className="relative">
            <Flame className="w-5 h-5" />
            {totalActiveTickets > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-sky-500 text-white leading-none shadow-[0_0_6px_#38bdf8]">
                {totalActiveTickets}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1">KDS</span>
        </button>

        {/* Stock */}
        <button
          type="button"
          onClick={() => setActiveTab('inventory')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 min-h-[46px] min-w-[50px] ${
            activeTab === 'inventory'
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.3)]'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
          aria-label="Stock and Pantry"
        >
          <div className="relative">
            <Layers className="w-5 h-5" />
            {ticketCounts && ticketCounts.lowStock > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-500 text-slate-950 leading-none animate-pulse">
                {ticketCounts.lowStock}
              </span>
            )}
          </div>
          <span className="text-[10px] font-bold mt-1">Stock</span>
        </button>

        {/* Dishes & BOM */}
        <button
          type="button"
          onClick={() => setActiveTab('menu')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 min-h-[46px] min-w-[50px] ${
            activeTab === 'menu'
              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/40 shadow-[0_0_15px_rgba(236,72,153,0.3)]'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
          aria-label="Dishes and Recipe BOM"
        >
          <UtensilsCrossed className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Dishes</span>
        </button>

        {/* Prep AI */}
        <button
          type="button"
          onClick={() => setActiveTab('ai-prep')}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 min-h-[46px] min-w-[50px] ${
            activeTab === 'ai-prep'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-glow-purple'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
          aria-label="Prep AI Intelligence"
        >
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span className="text-[10px] font-bold mt-1">Prep AI</span>
        </button>

        {/* All Modules Drawer Trigger ("More") */}
        <button
          type="button"
          onClick={() => setIsMobileDrawerOpen(true)}
          className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 active:scale-95 min-h-[46px] min-w-[50px] ${
            isMobileDrawerOpen || activeTab === 'waste-log' || activeTab === 'team'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
          aria-label="Open More Operations"
        >
          <div className="relative">
            <Menu className="w-5 h-5" />
            {(activeTab === 'waste-log' || activeTab === 'team') && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            )}
          </div>
          <span className="text-[10px] font-bold mt-1">
            {activeTab === 'waste-log' ? 'Scrap' : activeTab === 'team' ? 'Team' : 'More'}
          </span>
        </button>
      </nav>
    </>
  );
};

export default NavigationMenu;