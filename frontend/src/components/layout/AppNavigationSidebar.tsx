import React, { useState } from 'react';
import { 
  Globe, 
  Compass, 
  Layers, 
  Clock, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  ShieldAlert,
  Activity
} from 'lucide-react';
import { AppPage } from '../../types/geography';

interface AppNavigationSidebarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  isBackendOnline?: boolean;
}

export const AppNavigationSidebar: React.FC<AppNavigationSidebarProps> = ({
  activePage,
  onNavigate,
  isBackendOnline = true,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const navItems: Array<{
    id: AppPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { id: 'home', label: 'India Map', icon: Globe },
    { id: 'monitor', label: 'Change Monitor', icon: Layers, badge: 'ACTIVE' },
    { id: 'datasets', label: 'Datasets & Upload', icon: Compass },
    { id: 'history', label: 'Analysis History', icon: Clock },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <aside
      className={`h-screen bg-[#111B2A] border-r border-[#263449] flex flex-col justify-between transition-all duration-300 z-50 select-none ${
        isExpanded ? 'w-56' : 'w-16'
      }`}
    >
      {/* Top Section: Branding & Toggle */}
      <div>
        {/* App Brand Header */}
        <div className="h-14 border-b border-[#263449] px-3.5 flex items-center justify-between">
          <div
            onClick={() => onNavigate('home')}
            className="flex items-center gap-3 cursor-pointer overflow-hidden"
          >
            <div className="w-9 h-9 rounded-xl bg-[#070D17] border border-[#38BDF8] flex items-center justify-center text-[#38BDF8] shadow-[0_0_12px_rgba(56,189,248,0.25)] shrink-0">
              <ShieldAlert className="w-5 h-5 text-[#38BDF8]" />
            </div>
            {isExpanded && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-sm tracking-wider text-[#F3F6FC] uppercase truncate">
                  GeoSentinel <span className="text-[#38BDF8]">AI</span>
                </span>
                <span className="text-[9px] text-[#94A3B8] tracking-widest uppercase font-mono truncate">
                  FUSION 2026
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-2 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                title={!isExpanded ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all cursor-pointer group relative ${
                  isActive
                    ? 'bg-[#070D17] text-[#38BDF8] border border-[#38BDF8]/50 shadow-[0_0_15px_rgba(56,189,248,0.15)]'
                    : 'text-[#94A3B8] hover:text-[#F3F6FC] hover:bg-[#070D17]/50 border border-transparent'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-[#38BDF8]' : 'text-[#94A3B8]'
                  }`}
                />
                {isExpanded && (
                  <span className="truncate text-left flex-1">{item.label}</span>
                )}
                {isExpanded && item.badge && (
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-[#38BDF8]/15 text-[#38BDF8] border border-[#38BDF8]/30">
                    {item.badge}
                  </span>
                )}

                {/* Active side indicator */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-[#38BDF8]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section: Health Status & Collapse Toggle */}
      <div className="p-2 border-t border-[#263449] space-y-2">
        {/* Backend Connectivity Status */}
        <div
          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#070D17]/80 border border-[#263449] text-[10px] font-mono ${
            isExpanded ? 'justify-between' : 'justify-center'
          }`}
          title={isBackendOnline ? 'Backend Engine Online (FastAPI)' : 'Backend Engine Standalone'}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isBackendOnline ? 'bg-[#22C55E] animate-pulse' : 'bg-[#F59E0B]'
              }`}
            />
            {isExpanded && (
              <span className="text-[#94A3B8]">
                {isBackendOnline ? 'STAGE 3 READY' : 'OFFLINE'}
              </span>
            )}
          </div>
          {isExpanded && (
            <Activity className="w-3 h-3 text-[#38BDF8]" />
          )}
        </div>

        {/* Sidebar Expand / Collapse Toggle Button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full py-2 px-3 rounded-xl bg-[#070D17] hover:bg-[#070D17]/80 text-[#94A3B8] hover:text-[#F3F6FC] border border-[#263449] flex items-center justify-center transition-colors cursor-pointer"
          aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isExpanded ? (
            <div className="flex items-center gap-2 text-xs font-semibold">
              <ChevronLeft className="w-4 h-4" />
              <span>Collapse</span>
            </div>
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
};
