import { useState, type FormEvent } from 'react';
import { Download, Plus, Printer } from 'lucide-react';
import type {
  AdminReportSummary,
  BookingChannel,
  BookingRecord,
  BookingStatus,
  InquiryRecord,
  PaymentMethod,
  PaymentTransaction,
  Trip,
} from '../../types/travel';

interface AdminFetchFn {
  <T = unknown>(url: string, options?: RequestInit): Promise<T>;
}

export function AdminReportsPanel({
  report,
  bookings,
}: {
  report: AdminReportSummary | null;
  bookings: BookingRecord[];
}) {
  if (!report) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-600">
        Loading financial and booking analytics...
      </div>
    );
  }

  const exportCsv = () => {
    const header = [
      'Reference',
      'Customer',
      'Email',
      'Phone',
      'Trip',
      'Departure',
      'Channel',
      'Status',
      'Travelers',
      'Total USD',
      'Paid USD',
      'Balance USD',
      'Total KES',
      'Paid KES',
      'Balance KES',
    ];
    const rows = bookings.map((b) => [
      b.reference,
      `"${b.customerName.replace(/"/g, '""')}"`,
      b.customerEmail,
      b.customerPhone,
      `"${b.tripTitle.replace(/"/g, '""')}"`,
      `"${b.dateLabel.replace(/"/g, '""')}"`,
      b.bookingChannel ?? 'online',
      b.status ?? 'Confirmed',
      b.travelers + (b.kids ?? 0),
      b.totalUsd,
      b.amountPaidUsd,
      b.balanceDueUsd,
      b.totalKes ?? 0,
      b.amountPaidKes ?? 0,
      b.balanceDueKes ?? 0,
    ]);
    const csv = [header.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `summer-getaway-financial-report-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Booking &amp; Financial Performance Summary
          </h3>
          <p className="text-xs text-slate-600">
            Live revenue collected, outstanding receivables, occupancy, and channel mix.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Export CSV Report</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-md cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Print Summary</span>
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Revenue Collected</p>
          <p className="font-mono text-2xl font-semibold text-teal-800 tabular-nums mt-1">
            ${report.totalCollectedUsd.toLocaleString('en-US')}
          </p>
          <p className="font-mono text-xs text-slate-500 tabular-nums mt-1">
            KES {report.totalCollectedKes.toLocaleString('en-US')}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Outstanding Balances</p>
          <p className="font-mono text-2xl font-semibold text-amber-800 tabular-nums mt-1">
            ${report.outstandingBalanceUsd.toLocaleString('en-US')}
          </p>
          <p className="font-mono text-xs text-slate-500 tabular-nums mt-1">
            KES {report.outstandingBalanceKes.toLocaleString('en-US')}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Active / Cancelled Bookings</p>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1">
            {report.activeBookings}{' '}
            <span className="text-sm font-normal text-slate-500">
              / {report.cancelledBookings} cancelled
            </span>
          </p>
          <p className="text-xs text-slate-500 tabular-nums mt-1">
            {report.totalTravelers} confirmed travelers
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Fleet &amp; Departure Occupancy</p>
          <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums mt-1">
            {report.occupancyRatePct}%
          </p>
          <p className="text-xs text-slate-500 tabular-nums mt-1">
            {report.openInquiriesCount} open quote inquiries
          </p>
        </div>
      </div>

      {/* Breakdown by Channel & Region */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <h4 className="text-sm font-semibold text-slate-900">Bookings by Channel</h4>
          {report.byChannel.length === 0 ? (
            <p className="text-xs text-slate-500">No active bookings recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {report.byChannel.map((row) => (
                <div key={row.channel} className="py-2 flex justify-between">
                  <span className="capitalize font-medium text-slate-800">{row.channel}</span>
                  <span className="font-mono tabular-nums text-slate-700">
                    {row.count} bookings · ${row.collectedUsd.toLocaleString('en-US')} collected
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <h4 className="text-sm font-semibold text-slate-900">Revenue by Region</h4>
          {report.byRegion.length === 0 ? (
            <p className="text-xs text-slate-500">No regional bookings recorded yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {report.byRegion.map((row) => (
                <div key={row.region} className="py-2 flex justify-between">
                  <span className="uppercase font-medium text-slate-800">{row.region}</span>
                  <span className="font-mono tabular-nums text-slate-700">
                    {row.bookings} bookings · {row.travelers} pax · $
                    {row.collectedUsd.toLocaleString('en-US')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Departure Occupancy Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900">
            Departure Slot Occupancy Report
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-2.5 px-4">Trip</th>
                <th className="py-2.5 px-4">Departure Date</th>
                <th className="py-2.5 px-4">Booked / Total</th>
                <th className="py-2.5 px-4">Remaining</th>
                <th className="py-2.5 px-4">Occupancy</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {report.departureOccupancy.map((row) => (
                <tr key={row.departureId}>
                  <td className="py-2.5 px-4 font-medium text-slate-900">{row.tripTitle}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">{row.dateLabel}</td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-800">
                    {row.seatsBooked} / {row.seatsTotal}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-800">
                    {row.seatsRemaining}
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-teal-800">
                    {row.occupancyPct}%
                  </td>
                  <td className="py-2.5 px-4 text-slate-700">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminBookingsPanel({
  bookings,
  trips,
  adminFetch,
  onRefresh,
}: {
  bookings: BookingRecord[];
  trips: Trip[];
  adminFetch: AdminFetchFn;
  onRefresh: () => Promise<void>;
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | BookingStatus>('all');
  const [showManualForm, setShowManualForm] = useState(false);

  const [tripId, setTripId] = useState(trips[0]?.id ?? '');
  const selectedTrip = trips.find((t) => t.id === tripId) ?? trips[0];
  const [departureId, setDepartureId] = useState(selectedTrip?.departures[0]?.id ?? '');
  const [channel, setChannel] = useState<BookingChannel>('whatsapp');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [travelers, setTravelers] = useState(2);
  const [kids, setKids] = useState(0);
  const [amountPaidKes, setAmountPaidKes] = useState(10000);
  const [maskedAccount, setMaskedAccount] = useState('Paybill 709 8495');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered =
    statusFilter === 'all'
      ? bookings
      : bookings.filter((b) => (b.status ?? 'Confirmed') === statusFilter);

  const handleManualSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const activeDepId = departureId || selectedTrip?.departures[0]?.id || '';
    if (!selectedTrip || !activeDepId || !customerName.trim()) {
      setError('Select trip, departure date, and enter guest name.');
      return;
    }
    setSaving(true);
    try {
      await adminFetch('/api/admin/bookings/manual', {
        method: 'POST',
        body: JSON.stringify({
          tripId: selectedTrip.id,
          departureId: activeDepId,
          bookingChannel: channel,
          customerName,
          customerEmail,
          customerPhone,
          travelers,
          kids,
          amountPaidKes,
          paymentMethod: 'paybill_manual',
          maskedAccount,
        }),
      });
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setShowManualForm(false);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create manual booking.');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (reference: string, status: BookingStatus) => {
    await adminFetch(`/api/admin/bookings/${encodeURIComponent(reference)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    await onRefresh();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
          {(['all', 'Confirmed', 'Pending Deposit', 'Completed', 'Cancelled'] as const).map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded cursor-pointer ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'all' ? 'All Bookings' : st}
              </button>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowManualForm((prev) => !prev)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{showManualForm ? 'Close Manual Form' : 'Log WhatsApp / Phone Booking'}</span>
        </button>
      </div>

      {showManualForm && (
        <form
          onSubmit={handleManualSubmit}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
        >
          <h3 className="text-sm font-semibold text-slate-900">
            Create Manual Booking (WhatsApp / Phone / Walk-In)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Trip</label>
              <select
                value={selectedTrip?.id ?? ''}
                onChange={(e) => {
                  const next = trips.find((t) => t.id === e.target.value);
                  setTripId(e.target.value);
                  setDepartureId(next?.departures[0]?.id ?? '');
                }}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md"
              >
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Scheduled Date
              </label>
              <select
                value={departureId || selectedTrip?.departures[0]?.id || ''}
                onChange={(e) => setDepartureId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md"
              >
                {(selectedTrip?.departures ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.dateLabel} ({d.seatsRemaining} left)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Channel</label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value as BookingChannel)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md"
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Phone Call</option>
                <option value="walk-in">Cianda House Walk-In</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer full name"
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md"
            />
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              placeholder="Email address"
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md"
            />
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Phone / WhatsApp (+254...)"
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Adults</label>
              <input
                type="number"
                min={1}
                value={travelers}
                onChange={(e) => setTravelers(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Kids</label>
              <input
                type="number"
                min={0}
                value={kids}
                onChange={(e) => setKids(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Deposit Paid (KES)
              </label>
              <input
                type="number"
                min={0}
                value={amountPaidKes}
                onChange={(e) => setAmountPaidKes(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Paybill / Receipt Ref
              </label>
              <input
                type="text"
                value={maskedAccount}
                onChange={(e) => setMaskedAccount(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md cursor-pointer"
          >
            {saving ? 'Recording...' : 'Save Manual Booking & Reserve Slots'}
          </button>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Trip &amp; Date</th>
                <th className="py-3 px-4">Pax</th>
                <th className="py-3 px-4">Paid / Balance</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No bookings in this view yet.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.reference} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4 font-mono">
                      <p className="font-semibold text-teal-800">{b.reference}</p>
                      <p className="text-slate-500 capitalize">{b.bookingChannel ?? 'online'}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{b.customerName}</p>
                      <p className="text-slate-500">{b.customerPhone}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{b.tripTitle}</p>
                      <p className="font-mono text-slate-500">{b.dateLabel}</p>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                      {b.travelers}A{b.kids ? `+${b.kids}K` : ''}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums">
                      <p className="text-teal-800 font-semibold">
                        ${b.amountPaidUsd} (KES {(b.amountPaidKes ?? 0).toLocaleString('en-US')})
                      </p>
                      <p className="text-slate-500">
                        Bal: ${b.balanceDueUsd} (KES {(b.balanceDueKes ?? 0).toLocaleString('en-US')})
                      </p>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {b.status ?? 'Confirmed'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <select
                        aria-label={`Update status for ${b.reference}`}
                        value={b.status ?? 'Confirmed'}
                        onChange={(e) =>
                          handleStatusChange(b.reference, e.target.value as BookingStatus)
                        }
                        className="px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded"
                      >
                        <option value="Confirmed">Confirmed</option>
                        <option value="Pending Deposit">Pending Deposit</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled (Restore Slots)</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminPaymentsPanel({
  bookings,
  payments,
  adminFetch,
  onRefresh,
}: {
  bookings: BookingRecord[];
  payments: PaymentTransaction[];
  adminFetch: AdminFetchFn;
  onRefresh: () => Promise<void>;
}) {
  const [targetRef, setTargetRef] = useState<string | null>(null);
  const [payAmountUsd, setPayAmountUsd] = useState(50);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('paybill_manual');
  const [payAccount, setPayAccount] = useState('Paybill 709 8495');
  const [payTxRef, setPayTxRef] = useState('');
  const [saving, setSaving] = useState(false);

  const outstandingBookings = bookings.filter(
    (b) => b.status !== 'Cancelled' && b.balanceDueUsd > 0,
  );

  const handleRecordPayment = async (e: FormEvent) => {
    e.preventDefault();
    if (!targetRef) return;
    setSaving(true);
    try {
      await adminFetch(`/api/admin/bookings/${encodeURIComponent(targetRef)}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amountUsd: payAmountUsd,
          method: payMethod,
          maskedAccount: payAccount,
          transactionRef: payTxRef || undefined,
        }),
      });
      setTargetRef(null);
      setPayTxRef('');
      await onRefresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Outstanding Balance Receivables */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            Outstanding Customer Balances ({outstandingBookings.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-2.5 px-4">Reference</th>
                <th className="py-2.5 px-4">Guest</th>
                <th className="py-2.5 px-4">Paid</th>
                <th className="py-2.5 px-4">Balance Due</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {outstandingBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    All active bookings are fully paid.
                  </td>
                </tr>
              ) : (
                outstandingBookings.map((b) => (
                  <tr key={b.reference}>
                    <td className="py-2.5 px-4 font-mono font-semibold text-teal-800">
                      {b.reference}
                    </td>
                    <td className="py-2.5 px-4">
                      {b.customerName} · <span className="text-slate-500">{b.tripTitle}</span>
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">
                      ${b.amountPaidUsd}
                    </td>
                    <td className="py-2.5 px-4 font-mono tabular-nums font-semibold text-amber-800">
                      ${b.balanceDueUsd} (KES {(b.balanceDueKes ?? 0).toLocaleString('en-US')})
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setTargetRef(b.reference);
                          setPayAmountUsd(b.balanceDueUsd);
                        }}
                        className="px-3 py-1 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded cursor-pointer"
                      >
                        Record Payment
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {targetRef && (
        <form
          onSubmit={handleRecordPayment}
          className="bg-slate-50 border border-teal-300 rounded-lg p-5 space-y-3"
        >
          <h4 className="text-sm font-semibold text-slate-900">
            Record Balance Payment for {targetRef}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Amount (USD)
              </label>
              <input
                type="number"
                min={1}
                value={payAmountUsd}
                onChange={(e) => setPayAmountUsd(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs font-mono tabular-nums bg-white border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded"
              >
                <option value="paybill_manual">M-Pesa Paybill 709 8495</option>
                <option value="mpesa">M-Pesa STK</option>
                <option value="cash">Cash (Cianda House)</option>
                <option value="card">Card</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Account / Phone
              </label>
              <input
                type="text"
                value={payAccount}
                onChange={(e) => setPayAccount(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                M-Pesa / Receipt Code
              </label>
              <input
                type="text"
                value={payTxRef}
                onChange={(e) => setPayTxRef(e.target.value)}
                placeholder="Optional (auto-generated)"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded cursor-pointer"
            >
              {saving ? 'Recording...' : 'Apply Payment'}
            </button>
            <button
              type="button"
              onClick={() => setTargetRef(null)}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Payment Ledger */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Payment Transaction Ledger ({payments.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <th className="py-2.5 px-4">Transaction ID</th>
                <th className="py-2.5 px-4">Booking</th>
                <th className="py-2.5 px-4">Method &amp; Account</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-500">
                    No payment transactions recorded yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.transactionId}>
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">
                      {p.transactionId}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono text-teal-800">{p.bookingReference}</span> ·{' '}
                      {p.customerName}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {p.method} · {p.maskedAccount}
                    </td>
                    <td className="py-2.5 px-4 capitalize text-slate-700">
                      {p.paymentOption.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-teal-800">
                      ${p.amountUsd} (KES {p.amountKes.toLocaleString('en-US')})
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function AdminInquiriesPanel({
  inquiries,
  adminFetch,
  onRefresh,
}: {
  inquiries: InquiryRecord[];
  adminFetch: AdminFetchFn;
  onRefresh: () => Promise<void>;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900">
          Customer Support &amp; Custom Charter Inquiries ({inquiries.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
              <th className="py-2.5 px-4">Reference</th>
              <th className="py-2.5 px-4">Customer</th>
              <th className="py-2.5 px-4">Destination &amp; Vehicle</th>
              <th className="py-2.5 px-4">Month / Pax</th>
              <th className="py-2.5 px-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {inquiries.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-slate-500">
                  No customer inquiries submitted yet.
                </td>
              </tr>
            ) : (
              inquiries.map((inq) => (
                <tr key={inq.id}>
                  <td className="py-2.5 px-4 font-mono font-semibold text-teal-800">
                    {inq.reference}
                  </td>
                  <td className="py-2.5 px-4">
                    <p className="font-medium text-slate-900">{inq.name}</p>
                    <p className="text-slate-500">
                      {inq.phone} · {inq.email}
                    </p>
                  </td>
                  <td className="py-2.5 px-4">
                    <p className="text-slate-900">
                      {inq.destinationInterest || inq.region}
                    </p>
                    <p className="text-slate-500">{inq.vehiclePreference}</p>
                  </td>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-700">
                    {inq.preferredMonth} · {inq.groupSize} pax
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <select
                      value={inq.status}
                      onChange={async (e) => {
                        await adminFetch(`/api/admin/inquiries/${inq.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ status: e.target.value }),
                        });
                        await onRefresh();
                      }}
                      className="px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded"
                    >
                      <option value="New">New</option>
                      <option value="Contacted">Contacted</option>
                      <option value="Quoted">Quoted</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
