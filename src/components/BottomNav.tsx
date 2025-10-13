'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { FC } from 'react';
import type { Route } from 'next';

interface NavItem {
  to: Route;
  icon: string;
  label: string;
}

const navItems: NavItem[] = [
  { to: '/documents/scan', icon: 'camera_alt', label: 'Scan' },
  { to: '/documents/search', icon: 'folder', label: 'Documents' },
  { to: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/profile', icon: 'settings', label: 'Settings' }
];
 
const BottomNav: FC = () => {
  const pathname = usePathname();

  return (
    <div className="sticky bottom-0 bg-[#1F2937]">
      <nav className="flex justify-around border-t border-[#1F2937] bg-[#1F2937] py-2">
        {navItems.map((item) => {
          const isActive = pathname === item.to;
          return (
            <Link
              key={item.to}
              href={item.to}
              className={`flex flex-col items-center justify-end gap-1 ${isActive ? 'text-white' : 'text-gray-400'}`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <p className="text-xs font-medium">{item.label}</p>
            </Link>
          );
        })}
      </nav>
      <div className="h-3 bg-[#1F2937]" />
    </div>
  );
};

export default BottomNav;
