import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  BedDouble,
  CalendarDays,
  Compass,
  CreditCard,
  Inbox,
  LogOut,
  ShieldCheck,
  Ticket,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type {
  AdminReportSummary,
  BookingRecord,
  DestinationRecord,
  FleetVehicle,
  HotelRecord,
  InquiryRecord,
  MealPackageRecord,
  PaymentTransaction,
  Trip,
} from '../types/travel';
import {
  AdminCapacityPanel,
  AdminDestinationsPanel,
  AdminResourcesPanel,
  AdminTripsAndDatesPanel,
} from './admin/AdminCatalogPanels';
import {
  AdminBookingsPanel,
  AdminInquiriesPanel,
  AdminPaymentsPanel,
  AdminReportsPanel,
} from './admin/AdminOperationsPanels';

type AdminTab =
  | 'reports'
  | 'destinations'
  | 'trips'
  | 'capacity'
  | 'bookings'
  | 'payments'
  | 'resources'
  | 'inquiries';

const TAB_ITEMS: Array<{ id: AdminTab; label: string; icon: typeof BarChart3 }> = [
  { id: 'reports', label: 'Overview & Reports', icon: BarChart3 },
  { id: 'destinations', label: 'Destinations & Countries', icon: Compass },
  { id: 'trips', label: 'Trips & Event Dates', icon: CalendarDays },
  { id: 'capacity', label: 'Capacity & Slots', icon: Users },
  { id: 'bookings', label: 'Bookings & Cancellations', icon: Ticket },
  { id: 'payments', label: 'Payments & Balances', icon: CreditCard },
  { id: 'resources', label: 'Hotels, Transport & Meals', icon: BedDouble },
  { id: 'inquiries', label: 'Customer Inquiries', icon: Inbox },
];

export function AdminDashboard({
  onBackToWebsite,
  onCatalogMutated,
}: {
  onBackToWebsite: () => void;
  onCatalogMutated: () => Promise<void> | void;
}) {
  const { user, role, loading, authError, signInWithGoogle, logout, getToken } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('reports');

  const [report, setReport] = useState<AdminReportSummary | null>(null);
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [hotels, setHotels] = useState<HotelRecord[]>([]);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>([]);
  const [mealPackages, setMealPackages] = useState<MealPackageRecord[]>([]);
  const [inquiries, setInquiries] = useState<InquiryRecord[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const adminFetch = useCallback(
    async <T = unknown,>(url: string, options: RequestInit = {}): Promise<T> => {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required.');
      }
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(options.headers ?? {}),
        },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Request failed.');
      }
      return data as T;
    },
    [getToken],
  );

  const loadAllAdminData = useCallback(async () => {
    if (!user || role !== 'admin') return;
    setFetchError(null);
    try {
      const [repRes, destRes, tripRes, bookRes, payRes, resRes, inqRes] = await Promise.all([
        adminFetch<{ report: AdminReportSummary }>('/api/admin/reports'),
        adminFetch<{ destinations: DestinationRecord[] }>('/api/admin/destinations'),
        adminFetch<{ trips: Trip[] }>('/api/admin/trips'),
        adminFetch<{ bookings: BookingRecord[] }>('/api/admin/bookings'),
        adminFetch<{ payments: PaymentTransaction[] }>('/api/admin/payments'),
        adminFetch<{
          hotels: HotelRecord[];
          vehicles: FleetVehicle[];
          mealPackages: MealPackageRecord[];
        }>('/api/admin/resources'),
        adminFetch<{ inquiries: InquiryRecord[] }>('/api/admin/inquiries'),
      ]);

      setReport(repRes.report);
      setDestinations(destRes.destinations);
      setTrips(tripRes.trips);
      setBookings(bookRes.bookings);
      setPayments(payRes.payments);
      setHotels(resRes.hotels);
      setVehicles(resRes.vehicles);
      setMealPackages(resRes.mealPackages);
      setInquiries(inqRes.inquiries);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
    }
  }, [adminFetch, user, role]);

  useEffect(() => {
    loadAllAdminData();
  }, [loadAllAdminData]);

  const handleMutationRefresh = useCallback(async () => {
    await loadAllAdminData();
    await onCatalogMutated();
  }, [loadAllAdminData, onCatalogMutated]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 px-4">
        <p className="text-sm text-slate-600">Verifying staff session...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center bg-slate-50 px-4 py-16">
        <div
          data-testid="admin-signin-gate"
          className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-8 space-y-5 text-center"
        >
          <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6 text-teal-700" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-mono uppercase tracking-wide text-teal-800">
              Summer Getaway Adventures · Nairobi HQ
            </p>
            <h1 className="font-display text-2xl font-semibold text-slate-900 mt-1">
              Company Administration Sign-In
            </h1>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              Sign in with your Google staff account to manage destinations, departure dates,
              seat capacity, customer bookings, Paybill balance settlements, and financial reports.
            </p>
          </div>

          {authError && (
            <p role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2.5">
              {authError}
            </p>
          )}

          <div className="space-y-3 pt-1">
            <button
              type="button"
              onClick={() => {
                signInWithGoogle().catch(() => {});
              }}
              className="w-full px-5 py-3 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
            >
              Sign in with Google
            </button>
            <button
              type="button"
              onClick={onBackToWebsite}
              className="w-full px-5 py-2.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
            >
              Return to Customer Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-slate-50 px-4 py-16">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-8 space-y-4 text-center">
          <h1 className="font-display text-2xl font-semibold text-slate-900">
            Staff Permissions Required
          </h1>
          <p className="text-sm text-slate-600">
            You are signed in as <span className="font-mono text-slate-900">{user.email}</span>{' '}
            (Customer role). Company Administrator privileges are required to open the operations
            dashboard.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={onBackToWebsite}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md cursor-pointer"
            >
              Customer Website
            </button>
            <button
              type="button"
              onClick={() => logout()}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeTabMeta = TAB_ITEMS.find((t) => t.id === activeTab)!;

  return (
    <div className="bg-slate-50 min-h-[82vh]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3 bg-white border border-slate-200 rounded-lg p-4 space-y-4 lg:sticky lg:top-24">
            <div className="pb-3 border-b border-slate-100">
              <p className="text-xs font-mono text-teal-800">Cianda House Dispatch</p>
              <p className="text-sm font-semibold text-slate-900 mt-0.5 truncate">
                {user.displayName || user.email}
              </p>
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>

            <nav aria-label="Company administration sections" className="space-y-1">
              {TAB_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-colors text-left cursor-pointer ${
                      isActive
                        ? 'bg-teal-50 text-teal-900 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => logout()}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* Main Workspace */}
          <section className="lg:col-span-9 space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">
                  Company Admin / <span className="text-teal-800">{activeTabMeta.label}</span>
                </p>
                <h1 className="font-display text-2xl font-semibold text-slate-900 mt-0.5">
                  {activeTabMeta.label}
                </h1>
              </div>

              <button
                type="button"
                onClick={handleMutationRefresh}
                className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
              >
                Refresh Data
              </button>
            </div>

            {fetchError && (
              <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800">
                {fetchError}
              </div>
            )}

            {activeTab === 'reports' && (
              <AdminReportsPanel report={report} bookings={bookings} />
            )}
            {activeTab === 'destinations' && (
              <AdminDestinationsPanel
                destinations={destinations}
                trips={trips}
                adminFetch={adminFetch}
                onRefresh={handleMutationRefresh}
              />
            )}
            {activeTab === 'trips' && (
              <AdminTripsAndDatesPanel
                trips={trips}
                adminFetch={adminFetch}
                onRefresh={handleMutationRefresh}
              />
            )}
            {activeTab === 'capacity' && (
              <AdminCapacityPanel
                trips={trips}
                adminFetch={adminFetch}
                onRefresh={handleMutationRefresh}
              />
            )}
            {activeTab === 'bookings' && (
              <AdminBookingsPanel
                bookings={bookings}
                trips={trips}
                adminFetch={adminFetch}
                onRefresh={handleMutationRefresh}
              />
            )}
            {activeTab === 'payments' && (
              <AdminPaymentsPanel
                bookings={bookings}
                payments={payments}
                adminFetch={adminFetch}
                onRefresh={handleMutationRefresh}
              />
            )}
            {activeTab === 'resources' && (
              <AdminResourcesPanel
                hotels={hotels}
                vehicles={vehicles}
                mealPackages={mealPackages}
                adminFetch={adminFetch}
                onRefresh={handleMutationRefresh}
              />
            )}
            {activeTab === 'inquiries' && (
              <AdminInquiriesPanel
                inquiries={inquiries}
                adminFetch={adminFetch}
                onRefresh={handleMutationRefresh}
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
