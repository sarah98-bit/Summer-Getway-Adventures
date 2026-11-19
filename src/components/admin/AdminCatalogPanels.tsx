import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type {
  DepartureDate,
  DestinationRecord,
  FleetVehicle,
  HotelRecord,
  MealPackageRecord,
  Region,
  Trip,
} from '../../types/travel';

interface AdminFetchFn {
  <T = unknown>(url: string, options?: RequestInit): Promise<T>;
}

interface DestinationsPanelProps {
  destinations: DestinationRecord[];
  trips: Trip[];
  adminFetch: AdminFetchFn;
  onRefresh: () => Promise<void>;
}

export function AdminDestinationsPanel({
  destinations,
  trips,
  adminFetch,
  onRefresh,
}: DestinationsPanelProps) {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('Kenya');
  const [region, setRegion] = useState('kenya');
  const [category, setCategory] = useState('Kenya Coast');
  const [description, setDescription] = useState('');
  const [linkedTripId, setLinkedTripId] = useState('');
  const [isFeatured, setIsFeatured] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !country.trim()) {
      setError('Destination name and country are required.');
      return;
    }
    setSaving(true);
    try {
      await adminFetch('/api/admin/destinations', {
        method: 'POST',
        body: JSON.stringify({
          name,
          country,
          region,
          category,
          description,
          linkedTripId: linkedTripId || null,
          isFeatured,
        }),
      });
      setName('');
      setDescription('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create destination.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await adminFetch(`/api/admin/destinations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
      >
        <h3 className="text-sm font-semibold text-slate-900">
          Add Destination &amp; Country
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Destination Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Watamu Marine Park"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g. Kenya, UAE, Maldives"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Region</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
            >
              <option value="kenya">Kenya &amp; East Africa</option>
              <option value="middle-east">Middle East</option>
              <option value="south-asia">South Asia</option>
              <option value="global">Global 2026</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. Kenya Coast, Middle East"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-6">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Short Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Coastal coral reefs, half-board resorts & SGR transfers"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
            />
          </div>
          <div className="sm:col-span-4">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Linked Scheduled Trip (Optional)
            </label>
            <select
              value={linkedTripId}
              onChange={(e) => setLinkedTripId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
            >
              <option value="">None (Quote / Custom Only)</option>
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 flex items-center justify-between gap-2">
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-teal-700"
              />
              <span>Featured</span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{saving ? 'Adding...' : 'Add'}</span>
            </button>
          </div>
        </div>
        {error && <p className="text-xs text-red-700">{error}</p>}
      </form>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Destination</th>
                <th className="py-3 px-4">Country</th>
                <th className="py-3 px-4">Region</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Featured</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
              {destinations.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-medium text-slate-900">{d.name}</td>
                  <td className="py-3 px-4 text-slate-700">{d.country}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">{d.region}</td>
                  <td className="py-3 px-4 text-slate-600">{d.category}</td>
                  <td className="py-3 px-4 text-xs">
                    {d.isFeatured ? (
                      <span className="font-semibold text-teal-800">Featured</span>
                    ) : (
                      <span className="text-slate-500">Standard</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(d.id)}
                      aria-label={`Delete ${d.name}`}
                      className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface TripsPanelProps {
  trips: Trip[];
  adminFetch: AdminFetchFn;
  onRefresh: () => Promise<void>;
}

export function AdminTripsAndDatesPanel({
  trips,
  adminFetch,
  onRefresh,
}: TripsPanelProps) {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [region, setRegion] = useState<Region>('kenya');
  const [country, setCountry] = useState('Kenya');
  const [destination, setDestination] = useState('');
  const [durationDays, setDurationDays] = useState(3);
  const [transportMode, setTransportMode] = useState('4x4 Safari Land Cruiser (KCY 395C Fleet)');
  const [hotelName, setHotelName] = useState('');
  const [summary, setSummary] = useState('');
  const [startDate, setStartDate] = useState('2027-04-02');
  const [endDate, setEndDate] = useState('2027-04-04');
  const [dateLabel, setDateLabel] = useState('02 Apr – 04 Apr 2027');
  const [seatsTotal, setSeatsTotal] = useState(14);
  const [priceUsd, setPriceUsd] = useState(390);
  const [priceKes, setPriceKes] = useState(50300);
  const [savingTrip, setSavingTrip] = useState(false);

  // Add departure to existing trip
  const [selectedTripId, setSelectedTripId] = useState(trips[0]?.id ?? '');
  const [depStart, setDepStart] = useState('2027-05-01');
  const [depEnd, setDepEnd] = useState('2027-05-04');
  const [depLabel, setDepLabel] = useState('01 May – 04 May 2027');
  const [depSeats, setDepSeats] = useState(14);
  const [depUsd, setDepUsd] = useState(295);
  const [depKes, setDepKes] = useState(38000);
  const [depFeatured, setDepFeatured] = useState(false);
  const [savingDep, setSavingDep] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateTrip = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim() || !country.trim() || !destination.trim()) {
      setError('Trip title, country, and destination are required.');
      return;
    }
    setSavingTrip(true);
    try {
      await adminFetch('/api/admin/trips', {
        method: 'POST',
        body: JSON.stringify({
          title,
          code: code || undefined,
          region,
          country,
          destination,
          durationDays,
          nights: durationDays > 1 ? durationDays - 1 : 0,
          transportMode,
          hotelName: durationDays > 1 ? hotelName || 'Curated Partner Hotel' : null,
          summary,
          initialDeparture: {
            startDate,
            endDate,
            dateLabel,
            seatsTotal,
            priceUsd,
            priceKes,
          },
        }),
      });
      setTitle('');
      setCode('');
      setDestination('');
      setSummary('');
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trip.');
    } finally {
      setSavingTrip(false);
    }
  };

  const handleAddDeparture = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const targetTripId = selectedTripId || trips[0]?.id;
    if (!targetTripId) return;
    setSavingDep(true);
    try {
      await adminFetch(`/api/admin/trips/${encodeURIComponent(targetTripId)}/departures`, {
        method: 'POST',
        body: JSON.stringify({
          startDate: depStart,
          endDate: depEnd,
          dateLabel: depLabel,
          seatsTotal: depSeats,
          priceUsd: depUsd,
          priceKes: depKes,
          isFeaturedEvent: depFeatured,
        }),
      });
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add departure date.');
    } finally {
      setSavingDep(false);
    }
  };

  const handleToggleActive = async (trip: Trip) => {
    await adminFetch(`/api/admin/trips/${encodeURIComponent(trip.id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ active: trip.active === false }),
    });
    await onRefresh();
  };

  return (
    <div className="space-y-6">
      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <form
          onSubmit={handleCreateTrip}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-3"
        >
          <h3 className="text-sm font-semibold text-slate-900">
            Create New Trip Package &amp; Initial Event Date
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Trip Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Amboseli Elephant & Kilimanjaro Safari"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="KE-AMB-03"
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as Region)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
              >
                <option value="kenya">Kenya</option>
                <option value="middle-east">Middle East</option>
                <option value="south-asia">South Asia</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Country</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Days</label>
              <input
                type="number"
                min={1}
                max={14}
                value={durationDays}
                onChange={(e) => setDurationDays(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Destination</label>
              <input
                type="text"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Amboseli National Park"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Transport Arrangement
              </label>
              <input
                type="text"
                value={transportMode}
                onChange={(e) => setTransportMode(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Partner Hotel (if overnight)
              </label>
              <input
                type="text"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                placeholder="Ol Tukai Lodge (Half Board)"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Summary
              </label>
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="3 days guided game drives & Half Board stay"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Departure</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Return</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Date Label</label>
              <input
                type="text"
                value={dateLabel}
                onChange={(e) => setDateLabel(e.target.value)}
                className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Slots</label>
              <input
                type="number"
                min={1}
                value={seatsTotal}
                onChange={(e) => setSeatsTotal(Number(e.target.value))}
                className="w-full px-2 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">USD / KES</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min={1}
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(Number(e.target.value))}
                  aria-label="Price USD"
                  className="w-1/2 px-1.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md"
                />
                <input
                  type="number"
                  min={1}
                  value={priceKes}
                  onChange={(e) => setPriceKes(Number(e.target.value))}
                  aria-label="Price KES"
                  className="w-1/2 px-1.5 py-1.5 text-xs font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingTrip}
            className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md cursor-pointer"
          >
            {savingTrip ? 'Creating Trip...' : 'Publish Trip & Initial Departure'}
          </button>
        </form>

        <form
          onSubmit={handleAddDeparture}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-3"
        >
          <h3 className="text-sm font-semibold text-slate-900">
            Schedule Specific Departure &amp; Return Dates
          </h3>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Select Trip</label>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code} · {t.title}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Departure Date
              </label>
              <input
                type="date"
                value={depStart}
                onChange={(e) => setDepStart(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Return Date</label>
              <input
                type="date"
                value={depEnd}
                onChange={(e) => setDepEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Public Date Label
              </label>
              <input
                type="text"
                value={depLabel}
                onChange={(e) => setDepLabel(e.target.value)}
                placeholder="01 May – 04 May 2027"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Total Slots
              </label>
              <input
                type="number"
                min={1}
                value={depSeats}
                onChange={(e) => setDepSeats(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">USD Rate</label>
              <input
                type="number"
                min={1}
                value={depUsd}
                onChange={(e) => setDepUsd(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                KES Rate (Optional)
              </label>
              <input
                type="number"
                min={0}
                value={depKes}
                onChange={(e) => setDepKes(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-slate-50 border border-slate-300 rounded-md"
              />
            </div>
            <label className="inline-flex items-center gap-2 text-xs text-slate-700 pt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={depFeatured}
                onChange={(e) => setDepFeatured(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-teal-700"
              />
              <span>Mark as Featured Holiday Event</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={savingDep}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer"
          >
            {savingDep ? 'Scheduling...' : 'Add Scheduled Date'}
          </button>
        </form>
      </div>

      {/* Published Trips Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Trip &amp; Country</th>
                <th className="py-3 px-4">Duration &amp; Meals</th>
                <th className="py-3 px-4">Dates</th>
                <th className="py-3 px-4">Visibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs sm:text-sm">
              {trips.map((trip) => (
                <tr key={trip.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-xs text-slate-700">{trip.code}</td>
                  <td className="py-3 px-4">
                    <p className="font-medium text-slate-900">{trip.title}</p>
                    <p className="text-xs text-slate-500">
                      {trip.country} · {trip.destination}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">
                    {trip.durationDays}D / {trip.nights}N · {trip.mealPlan}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs tabular-nums text-slate-700">
                    {trip.departures.length} scheduled
                  </td>
                  <td className="py-3 px-4">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(trip)}
                      className={`px-2.5 py-1 text-xs font-medium rounded border cursor-pointer ${
                        trip.active !== false
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      {trip.active !== false ? 'Published' : 'Hidden'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface CapacityPanelProps {
  trips: Trip[];
  adminFetch: AdminFetchFn;
  onRefresh: () => Promise<void>;
}

export function AdminCapacityPanel({
  trips,
  adminFetch,
  onRefresh,
}: CapacityPanelProps) {
  const [edits, setEdits] = useState<
    Record<
      string,
      {
        seatsTotal: number;
        seatsRemaining: number;
        priceUsd: number;
        priceKes: number;
      }
    >
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const allDepartures: Array<{ trip: Trip; dep: DepartureDate }> = [];
  for (const trip of trips) {
    for (const dep of trip.departures) {
      allDepartures.push({ trip, dep });
    }
  }

  const getDraft = (dep: DepartureDate) =>
    edits[dep.id] ?? {
      seatsTotal: dep.seatsTotal,
      seatsRemaining: dep.seatsRemaining,
      priceUsd: dep.priceUsd,
      priceKes: dep.priceKes ?? Math.round(dep.priceUsd * 129),
    };

  const handleSave = async (trip: Trip, dep: DepartureDate) => {
    const draft = getDraft(dep);
    setSavingId(dep.id);
    setFeedback(null);
    try {
      await adminFetch(`/api/admin/departures/${encodeURIComponent(dep.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tripId: trip.id,
          startDate: dep.startDate,
          endDate: dep.endDate,
          dateLabel: dep.dateLabel,
          seatsTotal: draft.seatsTotal,
          seatsRemaining: draft.seatsRemaining,
          priceUsd: draft.priceUsd,
          priceKes: draft.priceKes,
          isFeaturedEvent: dep.isFeaturedEvent,
        }),
      });
      setFeedback(`Updated capacity & rates for ${dep.dateLabel}`);
      await onRefresh();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-4">
      {feedback && (
        <div role="status" className="p-3 bg-teal-50 border border-teal-200 rounded-md text-xs text-teal-900">
          {feedback}
        </div>
      )}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                <th className="py-3 px-4">Trip &amp; Date</th>
                <th className="py-3 px-4">Total Slots</th>
                <th className="py-3 px-4">Available Slots</th>
                <th className="py-3 px-4">USD Rate</th>
                <th className="py-3 px-4">KES Rate</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {allDepartures.map(({ trip, dep }) => {
                const draft = getDraft(dep);
                return (
                  <tr key={dep.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{trip.title}</p>
                      <p className="font-mono text-slate-500">{dep.dateLabel}</p>
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={1}
                        value={draft.seatsTotal}
                        onChange={(e) =>
                          setEdits({
                            ...edits,
                            [dep.id]: { ...draft, seatsTotal: Number(e.target.value) },
                          })
                        }
                        className="w-20 px-2 py-1 font-mono tabular-nums bg-slate-50 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        max={draft.seatsTotal}
                        value={draft.seatsRemaining}
                        onChange={(e) =>
                          setEdits({
                            ...edits,
                            [dep.id]: { ...draft, seatsRemaining: Number(e.target.value) },
                          })
                        }
                        className="w-20 px-2 py-1 font-mono tabular-nums bg-slate-50 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={1}
                        value={draft.priceUsd}
                        onChange={(e) =>
                          setEdits({
                            ...edits,
                            [dep.id]: { ...draft, priceUsd: Number(e.target.value) },
                          })
                        }
                        className="w-24 px-2 py-1 font-mono tabular-nums bg-slate-50 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <input
                        type="number"
                        min={0}
                        value={draft.priceKes}
                        onChange={(e) =>
                          setEdits({
                            ...edits,
                            [dep.id]: { ...draft, priceKes: Number(e.target.value) },
                          })
                        }
                        className="w-24 px-2 py-1 font-mono tabular-nums bg-slate-50 border border-slate-300 rounded"
                      />
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{dep.status}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        disabled={savingId === dep.id}
                        onClick={() => handleSave(trip, dep)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded cursor-pointer"
                      >
                        {savingId === dep.id ? 'Saving...' : 'Save'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface ResourcesPanelProps {
  hotels: HotelRecord[];
  vehicles: FleetVehicle[];
  mealPackages: MealPackageRecord[];
  adminFetch: AdminFetchFn;
  onRefresh: () => Promise<void>;
}

export function AdminResourcesPanel({
  hotels,
  vehicles,
  mealPackages,
  adminFetch,
  onRefresh,
}: ResourcesPanelProps) {
  const [hotelName, setHotelName] = useState('');
  const [hotelLocation, setHotelLocation] = useState('');
  const [hotelCountry, setHotelCountry] = useState('Kenya');
  const [hotelCategory, setHotelCategory] = useState('4-Star Coastal Resort');

  const [vehicleName, setVehicleName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleCapLabel, setVehicleCapLabel] = useState('14 Passengers');
  const [vehicleSeats, setVehicleSeats] = useState(14);
  const [vehicleBestFor, setVehicleBestFor] = useState('');

  const [mealName, setMealName] = useState('');
  const [mealBasis, setMealBasis] = useState('Half Board (Breakfast & Dinner)');
  const [mealDesc, setMealDesc] = useState('');

  const handleAddHotel = async (e: FormEvent) => {
    e.preventDefault();
    if (!hotelName.trim()) return;
    await adminFetch('/api/admin/resources/hotels', {
      method: 'POST',
      body: JSON.stringify({
        name: hotelName,
        location: hotelLocation || 'Nairobi / Coast',
        country: hotelCountry,
        category: hotelCategory,
        roomDetails: 'Standard double & twin rooms on Half Board basis.',
      }),
    });
    setHotelName('');
    setHotelLocation('');
    await onRefresh();
  };

  const handleAddVehicle = async (e: FormEvent) => {
    e.preventDefault();
    if (!vehicleName.trim()) return;
    await adminFetch('/api/admin/resources/vehicles', {
      method: 'POST',
      body: JSON.stringify({
        name: vehicleName,
        registrationPlate: vehiclePlate || null,
        capacityLabel: vehicleCapLabel,
        capacitySeats: vehicleSeats,
        bestFor: vehicleBestFor || 'Domestic Kenya tours & transfers',
      }),
    });
    setVehicleName('');
    setVehiclePlate('');
    setVehicleBestFor('');
    await onRefresh();
  };

  const handleAddMeal = async (e: FormEvent) => {
    e.preventDefault();
    if (!mealName.trim()) return;
    await adminFetch('/api/admin/resources/meals', {
      method: 'POST',
      body: JSON.stringify({
        name: mealName,
        basis: mealBasis,
        description: mealDesc || 'Daily breakfast and dinner included.',
      }),
    });
    setMealName('');
    setMealDesc('');
    await onRefresh();
  };

  return (
    <div className="space-y-8">
      {/* Hotels */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Partner Hotels &amp; Lodges ({hotels.length})
        </h3>
        <form onSubmit={handleAddHotel} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <input
            type="text"
            value={hotelName}
            onChange={(e) => setHotelName(e.target.value)}
            placeholder="Hotel / Lodge name"
            className="sm:col-span-2 px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded"
          />
          <input
            type="text"
            value={hotelLocation}
            onChange={(e) => setHotelLocation(e.target.value)}
            placeholder="Location (e.g. Diani Beach)"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded"
          />
          <input
            type="text"
            value={hotelCategory}
            onChange={(e) => setHotelCategory(e.target.value)}
            placeholder="Category"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded cursor-pointer"
          >
            Add Hotel
          </button>
        </form>
        <div className="divide-y divide-slate-200 text-xs">
          {hotels.map((h) => (
            <div key={h.id} className="py-2.5 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">
                  {h.name} <span className="font-normal text-slate-500">· {h.category}</span>
                </p>
                <p className="text-slate-600">
                  {h.location}, {h.country} — {h.roomDetails}
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await adminFetch(`/api/admin/resources/hotels/${encodeURIComponent(h.id)}`, {
                    method: 'DELETE',
                  });
                  await onRefresh();
                }}
                aria-label={`Remove hotel ${h.name}`}
                className="p-1.5 text-slate-400 hover:text-red-700 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Transport Fleet */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Transport Fleet &amp; Coaches ({vehicles.length})
        </h3>
        <form onSubmit={handleAddVehicle} className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <input
            type="text"
            value={vehicleName}
            onChange={(e) => setVehicleName(e.target.value)}
            placeholder="Vehicle / Bus name"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded"
          />
          <input
            type="text"
            value={vehiclePlate}
            onChange={(e) => setVehiclePlate(e.target.value)}
            placeholder="Plate (e.g. KCY 395C)"
            className="px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded"
          />
          <input
            type="text"
            value={vehicleCapLabel}
            onChange={(e) => setVehicleCapLabel(e.target.value)}
            placeholder="14 Passengers"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded"
          />
          <input
            type="text"
            value={vehicleBestFor}
            onChange={(e) => setVehicleBestFor(e.target.value)}
            placeholder="Route suitability"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded cursor-pointer"
          >
            Add Vehicle
          </button>
        </form>
        <div className="divide-y divide-slate-200 text-xs">
          {vehicles.map((v) => (
            <div key={v.id} className="py-2.5 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">
                  {v.name}{' '}
                  {v.registrationPlate && (
                    <span className="font-mono text-teal-800">({v.registrationPlate})</span>
                  )}{' '}
                  <span className="font-normal text-slate-500">· {v.capacityLabel}</span>
                </p>
                <p className="text-slate-600">{v.bestFor}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await adminFetch(`/api/admin/resources/vehicles/${encodeURIComponent(v.id)}`, {
                    method: 'DELETE',
                  });
                  await onRefresh();
                }}
                aria-label={`Remove vehicle ${v.name}`}
                className="p-1.5 text-slate-400 hover:text-red-700 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Meal Packages */}
      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">
          Meal Packages ({mealPackages.length})
        </h3>
        <form onSubmit={handleAddMeal} className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input
            type="text"
            value={mealName}
            onChange={(e) => setMealName(e.target.value)}
            placeholder="Package name"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded"
          />
          <input
            type="text"
            value={mealBasis}
            onChange={(e) => setMealBasis(e.target.value)}
            placeholder="Meal basis"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded"
          />
          <input
            type="text"
            value={mealDesc}
            onChange={(e) => setMealDesc(e.target.value)}
            placeholder="Description"
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded"
          />
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded cursor-pointer"
          >
            Add Meal Plan
          </button>
        </form>
        <div className="divide-y divide-slate-200 text-xs">
          {mealPackages.map((m) => (
            <div key={m.id} className="py-2.5 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-900">
                  {m.name} <span className="font-mono text-teal-800">· {m.basis}</span>
                </p>
                <p className="text-slate-600">{m.description}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await adminFetch(`/api/admin/resources/meals/${encodeURIComponent(m.id)}`, {
                    method: 'DELETE',
                  });
                  await onRefresh();
                }}
                aria-label={`Remove meal package ${m.name}`}
                className="p-1.5 text-slate-400 hover:text-red-700 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
