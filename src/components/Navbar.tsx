import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  activeSegment: 'customer' | 'admin';
  onNavigateSegment: (segment: 'customer' | 'admin', sectionId?: string) => void;
  onReserveClick: () => void;
}

export function Navbar({
  activeSegment,
  onNavigateSegment,
  onReserveClick,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigateSegment('customer', 'top');
          }}
          className="font-display text-lg sm:text-xl font-semibold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
        >
          Summer Getaway Adventures
        </a>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
        >
          <a
            href="#trips"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSegment('customer', 'trips');
            }}
            className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 ${
              activeSegment === 'customer' ? 'text-slate-900' : ''
            }`}
          >
            Explore
          </a>
          <a
            href="#my-bookings"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSegment('customer', 'my-bookings');
            }}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            My Bookings
          </a>
          <a
            href="#about"
            onClick={(e) => {
              e.preventDefault();
              onNavigateSegment('customer', 'about');
            }}
            className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
          >
            Support
          </a>
          <button
            type="button"
            onClick={() => onNavigateSegment('admin')}
            className={`hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSegment === 'admin' ? 'text-teal-800 font-semibold underline' : ''
            }`}
          >
            Admin
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-2 shrink-0">
          {activeSegment === 'admin' ? (
            <button
              type="button"
              onClick={() => onNavigateSegment('customer', 'top')}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Customer Site
            </button>
          ) : (
            <button
              type="button"
              onClick={onReserveClick}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
            >
              Reserve Trip
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileOpen}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
          <a
            href="#trips"
            onClick={(e) => {
              e.preventDefault();
              setMobileOpen(false);
              onNavigateSegment('customer', 'trips');
            }}
            className="block py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Explore Trips
          </a>
          <a
            href="#my-bookings"
            onClick={(e) => {
              e.preventDefault();
              setMobileOpen(false);
              onNavigateSegment('customer', 'my-bookings');
            }}
            className="block py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            My Bookings
          </a>
          <a
            href="#about"
            onClick={(e) => {
              e.preventDefault();
              setMobileOpen(false);
              onNavigateSegment('customer', 'about');
            }}
            className="block py-2.5 text-sm font-medium text-slate-700 hover:text-slate-900"
          >
            Contact &amp; Support
          </a>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onNavigateSegment('admin');
            }}
            className="block w-full text-left py-2.5 text-sm font-medium text-teal-800 hover:text-teal-900 cursor-pointer"
          >
            Company Admin Dashboard
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              if (activeSegment === 'admin') {
                onNavigateSegment('customer', 'top');
              } else {
                onReserveClick();
              }
            }}
            className="w-full mt-2 px-4 py-2.5 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
          >
            {activeSegment === 'admin' ? 'Back to Customer Site' : 'Reserve Trip'}
          </button>
        </div>
      )}
    </header>
  );
}
