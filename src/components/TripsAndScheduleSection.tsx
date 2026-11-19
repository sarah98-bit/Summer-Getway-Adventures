import { Calendar, LayoutGrid, Search } from 'lucide-react';
import { REGION_LABELS } from '../data/trips';
import type {
  ChronologicalDeparture,
  CurrencyCode,
  DepartureDate,
  DurationCategory,
  Region,
  Trip,
  TripFilters,
  TripReview,
} from '../types/travel';
import {
  computeTripRatingStats,
  formatDeparturePrice,
  getTripInclusions,
} from '../utils/trips';
import { TripImage } from './TripImage';

interface TripsAndScheduleSectionProps {
  filteredTrips: Trip[];
  chronologicalDepartures: ChronologicalDeparture[];
  availableMonths: Array<{ key: string; label: string }>;
  availableCountries: string[];
  reviews: TripReview[];
  filters: TripFilters;
  onFiltersChange: (next: TripFilters) => void;
  viewMode: 'cards' | 'schedule';
  onViewModeChange: (mode: 'cards' | 'schedule') => void;
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  savedCount: number;
  onOpenSavedBookings: () => void;
  onSelectTrip: (trip: Trip, departure?: DepartureDate) => void;
}

const REGION_OPTIONS: Array<'all' | Region> = ['all', 'kenya', 'middle-east', 'south-asia'];
const DURATION_OPTIONS: Array<{ value: DurationCategory; label: string }> = [
  { value: 'all', label: 'All Durations' },
  { value: 'overnight', label: 'Multi-Day (Overnight)' },
  { value: 'day-trip', label: 'Day Trips' },
];

export function TripsAndScheduleSection({
  filteredTrips,
  chronologicalDepartures,
  availableMonths,
  availableCountries,
  reviews,
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  currency,
  onCurrencyChange,
  savedCount,
  onOpenSavedBookings,
  onSelectTrip,
}: TripsAndScheduleSectionProps) {
  const resetFilters = () => {
    onFiltersChange({
      region: 'all',
      duration: 'all',
      month: 'all',
      country: 'all',
      maxPriceUsd: null,
      query: '',
    });
  };

  return (
    <section id="trips" className="py-16 lg:py-20 bg-slate-50">
      <div id="dates" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
          <div>
            <p className="text-sm font-medium text-teal-800 mb-2">
              Published Itineraries &amp; Scheduled Event Dates
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              Upcoming Departures from Nairobi
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Currency Switch */}
            <div
              role="group"
              aria-label="Display currency"
              className="inline-flex items-center p-1 bg-slate-200/80 rounded-md"
            >
              {(['USD', 'KES'] as CurrencyCode[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onCurrencyChange(code)}
                  className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    currency === code
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>

            {/* View Mode Switch */}
            <div
              role="group"
              aria-label="Catalog display view"
              className="inline-flex items-center p-1 bg-slate-200/80 rounded-md"
            >
              <button
                type="button"
                onClick={() => onViewModeChange('cards')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                Itinerary Cards
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('schedule')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  viewMode === 'schedule'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                Departure Dates
              </button>
            </div>

            <button
              type="button"
              onClick={onOpenSavedBookings}
              className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
            >
              My Bookings ({savedCount})
            </button>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 mb-8 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div
              role="group"
              aria-label="Filter by destination region"
              className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md w-fit"
            >
              {REGION_OPTIONS.map((region) => (
                <button
                  key={region}
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, region, country: 'all' })}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filters.region === region
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {REGION_LABELS[region]}
                </button>
              ))}
            </div>

            <div
              role="group"
              aria-label="Filter by trip duration"
              className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md w-fit"
            >
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, duration: option.value })}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filters.duration === option.value
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
            <div className="sm:col-span-5 relative">
              <label htmlFor="trip-search" className="sr-only">
                Search destinations, hotels, or transport
              </label>
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="trip-search"
                type="search"
                value={filters.query}
                onChange={(e) => onFiltersChange({ ...filters, query: e.target.value })}
                placeholder="Search destination, hotel, or transport (e.g. Diani, Wadi Shab, 4x4, SGR)"
                className="w-full pl-9 pr-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-md placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="country-filter" className="sr-only">
                Filter by country
              </label>
              <select
                id="country-filter"
                value={filters.country ?? 'all'}
                onChange={(e) => onFiltersChange({ ...filters, country: e.target.value })}
                className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
              >
                <option value="all">All Countries</option>
                {availableCountries.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="price-filter" className="sr-only">
                Filter by maximum price
              </label>
              <select
                id="price-filter"
                value={filters.maxPriceUsd ? String(filters.maxPriceUsd) : 'all'}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    maxPriceUsd: e.target.value === 'all' ? null : Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
              >
                <option value="all">Any Budget</option>
                <option value="150">Under $150 (KES 19k)</option>
                <option value="500">Under $500 (KES 65k)</option>
                <option value="1500">Under $1,500</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="month-filter" className="sr-only">
                Filter by departure month
              </label>
              <select
                id="month-filter"
                value={filters.month}
                onChange={(e) => onFiltersChange({ ...filters, month: e.target.value })}
                className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700 focus:border-teal-700"
              >
                <option value="all">All Months</option>
                {availableMonths.map((m) => (
                  <option key={m.key} value={m.key}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1 flex items-center justify-end">
              <span className="text-xs font-mono text-slate-500 tabular-nums whitespace-nowrap">
                {viewMode === 'cards'
                  ? `${filteredTrips.length} ${filteredTrips.length === 1 ? 'trip' : 'trips'}`
                  : `${chronologicalDepartures.length} ${chronologicalDepartures.length === 1 ? 'date' : 'dates'}`}
              </span>
            </div>
          </div>
        </div>

        {(viewMode === 'cards' ? filteredTrips.length === 0 : chronologicalDepartures.length === 0) ? (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <h3 className="text-lg font-semibold text-slate-900">
              No scheduled itineraries match those filters
            </h3>
            <p className="text-sm text-slate-600 mt-1 mb-5">
              Adjust your region, country, budget, or departure month to see available trips from Nairobi.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-4 py-2 text-sm font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'cards' ? (
          <div
            data-testid="trips-grid"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
          >
            {filteredTrips.map((trip) => {
              const inclusions = getTripInclusions(trip);
              const nextDeparture = trip.departures[0];
              const cheapestDeparture =
                trip.departures.length > 0
                  ? trip.departures.reduce(
                      (min, dep) => (dep.priceUsd < min.priceUsd ? dep : min),
                      trip.departures[0],
                    )
                  : undefined;
              const stats = computeTripRatingStats(reviews, trip.id);

              return (
                <article
                  key={trip.id}
                  data-testid={`trip-card-${trip.id}`}
                  className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div>
                    <div className="aspect-[4/3] w-full bg-slate-100 overflow-hidden border-b border-slate-200">
                      <TripImage
                        src={trip.imageUrl}
                        alt={trip.imageAlt}
                        label={trip.title}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="p-6">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 mb-2">
                        <span className="font-medium text-teal-800">
                          {trip.country}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {trip.durationDays === 1
                            ? '1 Day Excursion'
                            : `${trip.durationDays} Days / ${trip.nights} Nights`}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{inclusions.isOvernight ? 'Half Board' : 'Guided Day Tour'}</span>
                        {stats.reviewCount > 0 && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-slate-700 tabular-nums">
                              {stats.averageRating}★ ({stats.reviewCount})
                            </span>
                          </>
                        )}
                      </div>

                      <h3 className="font-display text-xl font-semibold text-slate-900 leading-snug mb-2">
                        {trip.title}
                      </h3>

                      <p className="text-sm text-slate-600 leading-relaxed mb-5">
                        {trip.summary}
                      </p>

                      <dl className="space-y-2 pt-4 border-t border-slate-100 text-xs sm:text-sm">
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500 shrink-0">Transport</dt>
                          <dd className="text-slate-800 font-medium text-right">
                            {inclusions.transportSummary}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-3">
                          <dt className="text-slate-500 shrink-0">Stay &amp; Meals</dt>
                          <dd className="text-slate-800 text-right">
                            {inclusions.hotelIncluded
                              ? `${trip.hotelName} · Half Board`
                              : 'Day Trip (No overnight stay)'}
                          </dd>
                        </div>
                        {nextDeparture && (
                          <div className="flex justify-between gap-3">
                            <dt className="text-slate-500 shrink-0">Next Date</dt>
                            <dd className="font-mono text-xs text-slate-800 text-right tabular-nums">
                              {nextDeparture.isFeaturedEvent
                                ? `Featured · ${nextDeparture.dateLabel}`
                                : nextDeparture.dateLabel}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
                    <div>
                      <span className="block text-xs text-slate-500">From</span>
                      <span className="font-mono text-base font-semibold text-slate-900 tabular-nums">
                        {cheapestDeparture
                          ? formatDeparturePrice(cheapestDeparture, currency)
                          : 'On Request'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectTrip(trip, nextDeparture)}
                      className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                    >
                      View Itinerary &amp; Book
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div
            data-testid="departures-schedule"
            className="bg-white border border-slate-200 rounded-lg overflow-hidden"
          >
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <th className="py-3.5 px-5">Scheduled Dates</th>
                    <th className="py-3.5 px-5">Trip &amp; Country</th>
                    <th className="py-3.5 px-5">Transport</th>
                    <th className="py-3.5 px-5">Hotel &amp; Meal Basis</th>
                    <th className="py-3.5 px-5">Availability</th>
                    <th className="py-3.5 px-5 text-right">Per Person</th>
                    <th className="py-3.5 px-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {chronologicalDepartures.map(({ trip, departure, inclusions }) => (
                    <tr key={departure.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-5 font-mono text-xs text-slate-900 whitespace-nowrap tabular-nums">
                        <div>{departure.dateLabel}</div>
                        <div className="text-slate-500 mt-0.5">
                          {trip.durationDays === 1
                            ? '1 Day'
                            : `${trip.durationDays}D / ${trip.nights}N`}
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-semibold text-slate-900">{trip.title}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {trip.country} · {trip.destination} · Guided tour included
                        </div>
                      </td>
                      <td className="py-4 px-5 text-xs text-slate-700 max-w-xs">
                        {trip.transportMode}
                      </td>
                      <td className="py-4 px-5 text-xs text-slate-700 max-w-xs">
                        {inclusions.hotelIncluded ? (
                          <div>
                            <span className="font-medium text-slate-900">{trip.hotelName}</span>
                            <div className="text-slate-500">Half Board (Breakfast &amp; Dinner)</div>
                          </div>
                        ) : (
                          <span>Day Trip — No overnight hotel</span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-xs whitespace-nowrap tabular-nums">
                        <span
                          className={
                            departure.status === 'Few Seats'
                              ? 'font-semibold text-amber-800'
                              : departure.status === 'Sold Out'
                                ? 'font-semibold text-red-700'
                                : 'font-medium text-teal-800'
                          }
                        >
                          {departure.status} · {departure.seatsRemaining} seats left
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right font-mono font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                        {formatDeparturePrice(departure, currency)}
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onSelectTrip(trip, departure)}
                          className="px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
                        >
                          Book Date
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="lg:hidden divide-y divide-slate-200">
              {chronologicalDepartures.map(({ trip, departure, inclusions }) => (
                <div key={departure.id} className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-xs text-teal-800 font-medium tabular-nums">
                        {departure.dateLabel}
                      </p>
                      <h3 className="font-semibold text-slate-900 mt-0.5">{trip.title}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {trip.country} ·{' '}
                        {trip.durationDays === 1
                          ? '1 Day Guided Trip'
                          : `${trip.durationDays}D/${trip.nights}N · Half Board`}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-semibold text-slate-900 whitespace-nowrap tabular-nums">
                      {formatDeparturePrice(departure, currency)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    {trip.transportMode} ·{' '}
                    {inclusions.hotelIncluded
                      ? `${trip.hotelName} (Half Board)`
                      : 'Day trip (No hotel stay)'}
                  </p>

                  <div className="flex items-center justify-between pt-1">
                    <span
                      className={`text-xs tabular-nums ${
                        departure.status === 'Few Seats'
                          ? 'font-semibold text-amber-800'
                          : 'font-medium text-teal-800'
                      }`}
                    >
                      {departure.status} · {departure.seatsRemaining} seats left
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectTrip(trip, departure)}
                      className="px-4 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
                    >
                      Book Date
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
