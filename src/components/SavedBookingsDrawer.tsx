import { useEffect } from 'react';
import { Trash2, X } from 'lucide-react';
import type { BookingRecord, CurrencyCode } from '../types/travel';
import { formatPrice } from '../utils/trips';

interface SavedBookingsDrawerProps {
  isOpen: boolean;
  bookings: BookingRecord[];
  currency: CurrencyCode;
  onClose: () => void;
  onCancelBooking: (reference: string) => void;
  onExploreTrips: () => void;
}

export function SavedBookingsDrawer({
  isOpen,
  bookings,
  currency,
  onClose,
  onCancelBooking,
  onExploreTrips,
}: SavedBookingsDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-[1px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="saved-bookings-title"
        className="w-full max-w-md bg-white h-full border-l border-slate-200 flex flex-col shadow-xl"
      >
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2
              id="saved-bookings-title"
              className="font-display text-xl font-semibold text-slate-900"
            >
              My Session Bookings
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
              {bookings.length} {bookings.length === 1 ? 'reservation' : 'reservations'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close my bookings drawer"
            className="w-10 h-10 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {bookings.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-sm font-medium text-slate-900">No recent reservations in this session</p>
              <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed">
                Select any scheduled trip across Kenya, the Middle East, or South Asia, or look up
                an existing booking in the My Bookings section.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onExploreTrips();
                }}
                className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
              >
                Browse Upcoming Dates
              </button>
            </div>
          ) : (
            bookings.map((booking) => {
              const isCancelled = booking.status === 'Cancelled';
              return (
                <div
                  key={booking.reference}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-semibold text-teal-800">
                          {booking.reference}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span
                          className={`font-semibold ${
                            isCancelled ? 'text-red-700' : 'text-emerald-800'
                          }`}
                        >
                          {booking.status ?? 'Confirmed'}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-900 mt-0.5">
                        {booking.tripTitle}
                      </h3>
                      <p className="font-mono text-xs text-slate-600 mt-0.5 tabular-nums">
                        {booking.dateLabel} · {booking.travelers}{' '}
                        {booking.travelers === 1 ? 'traveler' : 'travelers'}
                      </p>
                    </div>
                    {!isCancelled && (
                      <button
                        type="button"
                        onClick={() => onCancelBooking(booking.reference)}
                        aria-label={`Cancel booking ${booking.reference}`}
                        className="p-2 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <dl className="text-xs space-y-1 pt-2 border-t border-slate-200">
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Transport</dt>
                      <dd className="text-slate-800 text-right">{booking.transportMode}</dd>
                    </div>
                    <div className="flex justify-between gap-2">
                      <dt className="text-slate-500">Stay &amp; Meals</dt>
                      <dd className="text-slate-800 text-right">
                        {booking.hotelName
                          ? `${booking.hotelName} · Half Board`
                          : 'Day Trip (No hotel stay)'}
                      </dd>
                    </div>
                    {booking.payment && (
                      <>
                        <div className="flex justify-between gap-2">
                          <dt className="text-slate-500">Payment Receipt</dt>
                          <dd className="font-mono text-slate-800 text-right">
                            {booking.payment.transactionId} · {booking.payment.maskedAccount}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-2 pt-1 font-medium">
                          <dt className="text-slate-600">Paid / Balance</dt>
                          <dd className="font-mono text-slate-900 tabular-nums">
                            {formatPrice(booking.amountPaidUsd, currency, booking.amountPaidKes)} /{' '}
                            {formatPrice(booking.balanceDueUsd, currency, booking.balanceDueKes)}
                          </dd>
                        </div>
                      </>
                    )}
                  </dl>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
