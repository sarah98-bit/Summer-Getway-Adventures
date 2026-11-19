import { useEffect, useState, type FormEvent } from 'react';
import { ExternalLink, Search, XCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { BookingRecord, CurrencyCode } from '../types/travel';
import { buildWhatsAppLink, formatPrice } from '../utils/trips';

interface MyBookingsSectionProps {
  currency: CurrencyCode;
  sessionBookings: BookingRecord[];
  onCancelBooking: (reference: string) => Promise<void> | void;
  onExploreTrips: () => void;
}

export function MyBookingsSection({
  currency,
  sessionBookings,
  onCancelBooking,
  onExploreTrips,
}: MyBookingsSectionProps) {
  const { user, signInWithGoogle, getToken } = useAuth();
  const [referenceQuery, setReferenceQuery] = useState('');
  const [emailQuery, setEmailQuery] = useState('');
  const [lookupResults, setLookupResults] = useState<BookingRecord[] | null>(null);
  const [accountBookings, setAccountBookings] = useState<BookingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [cancellingRef, setCancellingRef] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchMyAccountBookings() {
      if (!user) {
        setAccountBookings([]);
        return;
      }
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const res = await fetch('/api/my-bookings', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          if (Array.isArray(data.bookings)) {
            setAccountBookings(data.bookings);
          }
        }
      } catch {
        // Non-fatal
      }
    }
    fetchMyAccountBookings();
    return () => {
      cancelled = true;
    };
  }, [user, getToken, sessionBookings]);

  const handleLookup = async (e: FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    if (!referenceQuery.trim() && !emailQuery.trim()) {
      setLookupError('Enter your booking reference (e.g. SGA-2026-1234) or email address.');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (referenceQuery.trim()) params.set('reference', referenceQuery.trim());
      if (emailQuery.trim()) params.set('email', emailQuery.trim());
      const res = await fetch(`/api/bookings/lookup?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not locate booking.');
      }
      setLookupResults(Array.isArray(data.bookings) ? data.bookings : []);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : 'Lookup failed.');
    } finally {
      setLoading(false);
    }
  };

  // Merge deduplicated list: lookupResults (if active) OR account + session bookings
  const displayedBookings = (() => {
    if (lookupResults !== null) return lookupResults;
    const byRef = new Map<string, BookingRecord>();
    for (const b of accountBookings) byRef.set(b.reference, b);
    for (const b of sessionBookings) byRef.set(b.reference, b);
    return Array.from(byRef.values());
  })();

  const handleCancel = async (reference: string) => {
    setCancellingRef(reference);
    try {
      await onCancelBooking(reference);
      if (lookupResults !== null) {
        setLookupResults((prev) =>
          prev
            ? prev.map((b) =>
                b.reference === reference ? { ...b, status: 'Cancelled' } : b,
              )
            : prev,
        );
      }
      setAccountBookings((prev) =>
        prev.map((b) =>
          b.reference === reference ? { ...b, status: 'Cancelled' } : b,
        ),
      );
    } finally {
      setCancellingRef(null);
    }
  };

  return (
    <section
      id="my-bookings"
      aria-labelledby="my-bookings-heading"
      className="py-16 lg:py-20 bg-slate-50 border-t border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-sm font-medium text-teal-800 mb-2">
              Reservations, Balances &amp; Official Receipts
            </p>
            <h2
              id="my-bookings-heading"
              className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900"
            >
              My Bookings &amp; Payment Status
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 max-w-2xl">
              Check your trip confirmation status, amount paid vs. balance due, and download or
              verify payment receipts using your booking reference or Google account.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {!user ? (
              <button
                type="button"
                onClick={() => {
                  signInWithGoogle().catch(() => {});
                }}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              >
                Sign in with Google to Sync Bookings
              </button>
            ) : (
              <span className="text-xs font-mono text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-md">
                Signed in as {user.email}
              </span>
            )}
          </div>
        </div>

        {/* Reference / Email Lookup Form */}
        <form
          onSubmit={handleLookup}
          className="bg-white border border-slate-200 rounded-lg p-5 mb-8 grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
        >
          <div className="md:col-span-4">
            <label
              htmlFor="lookup-ref"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Booking Reference
            </label>
            <input
              id="lookup-ref"
              type="text"
              value={referenceQuery}
              onChange={(e) => setReferenceQuery(e.target.value)}
              placeholder="e.g. SGA-2026-4821"
              className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="md:col-span-5">
            <label
              htmlFor="lookup-email"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Lead Traveler Email
            </label>
            <input
              id="lookup-email"
              type="email"
              value={emailQuery}
              onChange={(e) => setEmailQuery(e.target.value)}
              placeholder="traveler@example.com"
              className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            />
          </div>

          <div className="md:col-span-3 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" aria-hidden="true" />
              <span>{loading ? 'Checking...' : 'Find Booking'}</span>
            </button>
            {lookupResults !== null && (
              <button
                type="button"
                onClick={() => {
                  setLookupResults(null);
                  setReferenceQuery('');
                  setEmailQuery('');
                  setLookupError(null);
                }}
                className="px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {lookupError && (
            <p className="md:col-span-12 text-xs text-red-700">{lookupError}</p>
          )}
        </form>

        {displayedBookings.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3">
            <h3 className="text-base font-semibold text-slate-900">
              {lookupResults !== null
                ? 'No booking matched that reference or email'
                : 'Your recent and linked reservations will appear here'}
            </h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Book any scheduled departure online or enter your Summer Getaway Adventures booking
              reference above to inspect your payment balance and itinerary inclusions.
            </p>
            <button
              type="button"
              onClick={onExploreTrips}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
            >
              Explore Scheduled Departures
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {displayedBookings.map((booking) => {
              const statusLabel = booking.status ?? 'Confirmed';
              const isCancelled = statusLabel === 'Cancelled';
              const waMessage = `Hello Summer Getaway Adventures, I am checking on my booking ${booking.reference} (${booking.tripTitle}, ${booking.dateLabel}).`;

              return (
                <article
                  key={booking.reference}
                  data-testid={`my-booking-${booking.reference}`}
                  className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <span className="font-mono font-semibold text-teal-800">
                            {booking.reference}
                          </span>
                          <span aria-hidden="true" className="text-slate-300">
                            ·
                          </span>
                          <span
                            className={`font-semibold ${
                              isCancelled
                                ? 'text-red-700'
                                : statusLabel === 'Pending Deposit'
                                  ? 'text-amber-800'
                                  : 'text-emerald-800'
                            }`}
                          >
                            {statusLabel}
                          </span>
                          {booking.bookingChannel && (
                            <>
                              <span aria-hidden="true" className="text-slate-300">
                                ·
                              </span>
                              <span className="text-slate-500 capitalize">
                                {booking.bookingChannel}
                              </span>
                            </>
                          )}
                        </div>
                        <h3 className="font-display text-xl font-semibold text-slate-900 mt-1">
                          {booking.tripTitle}
                        </h3>
                        <p className="font-mono text-xs text-slate-600 mt-0.5 tabular-nums">
                          {booking.dateLabel} · {booking.travelers} adults
                          {booking.kids ? ` + ${booking.kids} kids` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs">
                      <div>
                        <span className="block text-slate-500">Package Total</span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatPrice(booking.totalUsd, currency, booking.totalKes)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Amount Paid</span>
                        <span className="font-mono font-semibold text-teal-800 tabular-nums">
                          {formatPrice(booking.amountPaidUsd, currency, booking.amountPaidKes)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-slate-500">Balance Due</span>
                        <span className="font-mono font-semibold text-slate-900 tabular-nums">
                          {formatPrice(booking.balanceDueUsd, currency, booking.balanceDueKes)}
                        </span>
                      </div>
                    </div>

                    <dl className="text-xs space-y-1.5">
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Transport</dt>
                        <dd className="text-slate-800 text-right">{booking.transportMode}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Stay &amp; Meals</dt>
                        <dd className="text-slate-800 text-right">
                          {booking.hotelName ? `${booking.hotelName} · ${booking.mealPlan}` : booking.mealPlan}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-slate-500">Latest Receipt</dt>
                        <dd className="font-mono text-slate-800 text-right">
                          {booking.payment.transactionId} · {booking.payment.maskedAccount}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <a
                      href={buildWhatsAppLink(waMessage)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-900 underline underline-offset-4"
                    >
                      <span>Pay Balance / Support on WhatsApp</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>

                    {!isCancelled && (
                      <button
                        type="button"
                        disabled={cancellingRef === booking.reference}
                        onClick={() => handleCancel(booking.reference)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 border border-red-200 rounded-md transition-colors cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>
                          {cancellingRef === booking.reference ? 'Cancelling...' : 'Cancel Booking'}
                        </span>
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
