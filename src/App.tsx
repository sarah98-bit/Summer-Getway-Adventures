import { useCallback, useEffect, useMemo, useState } from 'react';
import { AboutAndInquirySection } from './components/AboutAndInquirySection';
import { AdminDashboard } from './components/AdminDashboard';
import { FleetAndDestinationsSection } from './components/FleetAndDestinationsSection';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { InclusionsSection } from './components/InclusionsSection';
import { MyBookingsSection } from './components/MyBookingsSection';
import { Navbar } from './components/Navbar';
import { ReviewsSection } from './components/ReviewsSection';
import { SavedBookingsDrawer } from './components/SavedBookingsDrawer';
import { TripDetailPage } from './components/TripDetailPage';
import { TripsAndScheduleSection } from './components/TripsAndScheduleSection';
import { AuthProvider } from './context/AuthContext';
import { SEED_REVIEWS } from './data/reviews';
import { DESTINATIONS_2026, FLEET_VEHICLES, TRIPS } from './data/trips';
import type {
  BookingRecord,
  CurrencyCode,
  DepartureDate,
  DestinationRecord,
  FleetVehicle,
  GlobalDestination2026,
  Region,
  Trip,
  TripFilters,
  TripReview,
} from './types/travel';
import {
  filterTrips,
  getAvailableCountries,
  getAvailableMonths,
  getChronologicalDepartures,
  loadSavedBookings,
  persistSavedBookings,
} from './utils/trips';

function getInitialRouteState(): {
  tripId: string | null;
  segment: 'customer' | 'admin';
} {
  if (typeof window === 'undefined') return { tripId: null, segment: 'customer' };
  const params = new URLSearchParams(window.location.search);
  return {
    tripId: params.get('trip'),
    segment: params.get('view') === 'admin' ? 'admin' : 'customer',
  };
}

function AppContent() {
  const initial = getInitialRouteState();
  const [activeSegment, setActiveSegment] = useState<'customer' | 'admin'>(initial.segment);
  const [trips, setTrips] = useState<Trip[]>(TRIPS);
  const [vehicles, setVehicles] = useState<FleetVehicle[]>(FLEET_VEHICLES);
  const [destinations, setDestinations] = useState<DestinationRecord[]>([]);
  const [reviews, setReviews] = useState<TripReview[]>(SEED_REVIEWS);
  const [savedBookings, setSavedBookings] = useState<BookingRecord[]>(() =>
    loadSavedBookings(),
  );

  const [filters, setFilters] = useState<TripFilters>({
    region: 'all',
    duration: 'all',
    month: 'all',
    country: 'all',
    maxPriceUsd: null,
    query: '',
  });
  const [viewMode, setViewMode] = useState<'cards' | 'schedule'>('cards');
  const [currency, setCurrency] = useState<CurrencyCode>('USD');

  const [activeTripId, setActiveTripId] = useState<string | null>(initial.tripId);
  const [activeDeparture, setActiveDeparture] = useState<DepartureDate | undefined>(
    undefined,
  );
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [prefilledVehicle, setPrefilledVehicle] = useState('');
  const [prefilledDestination, setPrefilledDestination] = useState('');
  const [prefilledRegion, setPrefilledRegion] = useState<Region | undefined>(undefined);
  const [prefillVersion, setPrefillVersion] = useState(0);

  const refreshCatalog = useCallback(async () => {
    try {
      const [catRes, reviewsRes] = await Promise.all([
        fetch('/api/catalog'),
        fetch('/api/reviews'),
      ]);

      if (catRes.ok) {
        const data = await catRes.json();
        if (Array.isArray(data.trips) && data.trips.length > 0) {
          setTrips(data.trips);
        }
        if (Array.isArray(data.vehicles) && data.vehicles.length > 0) {
          setVehicles(data.vehicles);
        }
        if (Array.isArray(data.destinations)) {
          setDestinations(data.destinations);
        }
      }
      if (reviewsRes.ok) {
        const data = await reviewsRes.json();
        if (Array.isArray(data.reviews)) setReviews(data.reviews);
      }
    } catch {
      // Keep fallback data if offline
    }
  }, []);

  useEffect(() => {
    refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    const handlePopState = () => {
      const next = getInitialRouteState();
      setActiveTripId(next.tripId);
      setActiveSegment(next.segment);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const activeTrip = useMemo(
    () => (activeTripId ? trips.find((t) => t.id === activeTripId) ?? null : null),
    [trips, activeTripId],
  );

  const availableMonths = useMemo(() => getAvailableMonths(trips), [trips]);
  const availableCountries = useMemo(() => getAvailableCountries(trips), [trips]);
  const filteredTrips = useMemo(() => filterTrips(trips, filters), [trips, filters]);
  const chronologicalDepartures = useMemo(
    () => getChronologicalDepartures(trips, filters),
    [trips, filters],
  );

  const destinations2026 = useMemo<GlobalDestination2026[]>(() => {
    if (destinations.length === 0) return DESTINATIONS_2026;
    const globalItems = destinations
      .filter((d) => !d.id.startsWith('dest-'))
      .map((d) => ({
        id: d.id,
        name: d.name,
        country: d.country,
        region: d.region,
        category: d.category,
        linkedTripId: d.linkedTripId,
      }));
    return globalItems.length > 0 ? globalItems : DESTINATIONS_2026;
  }, [destinations]);

  const navigateSegment = (segment: 'customer' | 'admin', sectionId?: string) => {
    setActiveSegment(segment);
    setActiveTripId(null);
    setActiveDeparture(undefined);

    const url = new URL(window.location.href);
    url.searchParams.delete('trip');
    if (segment === 'admin') {
      url.searchParams.set('view', 'admin');
    } else {
      url.searchParams.delete('view');
    }
    window.history.pushState({ segment }, '', url.toString());

    if (segment === 'admin' || !sectionId || sectionId === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const openTripPage = (trip: Trip, departure?: DepartureDate) => {
    setActiveSegment('customer');
    setActiveTripId(trip.id);
    setActiveDeparture(departure);
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    url.searchParams.set('trip', trip.id);
    window.history.pushState({ tripId: trip.id }, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeTripPage = () => {
    setActiveTripId(null);
    setActiveDeparture(undefined);
    const url = new URL(window.location.href);
    url.searchParams.delete('trip');
    window.history.pushState({}, '', url.toString());
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  };

  const handleBookDianiXmas = () => {
    const dianiTrip = trips.find((t) => t.id === 'kenya-diani-wasini') ?? trips[0];
    const xmasDep =
      dianiTrip.departures.find((d) => d.id === 'dia-xmas-dec-24') ??
      dianiTrip.departures[0];
    setCurrency('KES');
    openTripPage(dianiTrip, xmasDep);
  };

  const handleCharterVehicle = (vehicleLabel: string) => {
    setPrefilledVehicle(vehicleLabel);
    setPrefilledRegion('kenya');
    setPrefillVersion((v) => v + 1);
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectDestination2026 = (dest: GlobalDestination2026) => {
    if (dest.linkedTripId) {
      const linked = trips.find((t) => t.id === dest.linkedTripId);
      if (linked) {
        openTripPage(linked, linked.departures[0]);
        return;
      }
    }
    const nextRegion: Region =
      dest.category === 'Middle East'
        ? 'middle-east'
        : dest.category === 'East Africa Coast' || dest.category === 'Southern Africa'
          ? 'kenya'
          : 'south-asia';
    setPrefilledDestination(`${dest.name} (${dest.category} · 2026)`);
    setPrefilledRegion(nextRegion);
    setPrefillVersion((v) => v + 1);
    document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToSchedule = () => {
    setActiveSegment('customer');
    setActiveTripId(null);
    setViewMode('schedule');
    setTimeout(() => {
      document.getElementById('trips')?.scrollIntoView({ behavior: 'smooth' });
    }, 40);
  };

  const scrollToTrips = () => {
    setActiveSegment('customer');
    setActiveTripId(null);
    setTimeout(() => {
      document.getElementById('trips')?.scrollIntoView({ behavior: 'smooth' });
    }, 40);
  };

  const handleBookingCompleted = (record: BookingRecord, updatedTrips: Trip[]) => {
    if (Array.isArray(updatedTrips) && updatedTrips.length > 0) {
      setTrips(updatedTrips);
    }
    setSavedBookings((prev) => {
      const next = [record, ...prev.filter((b) => b.reference !== record.reference)];
      persistSavedBookings(next);
      return next;
    });
  };

  const handleCancelBooking = async (reference: string) => {
    try {
      const res = await fetch(`/api/bookings/${encodeURIComponent(reference)}/cancel`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.trips)) {
          setTrips(data.trips);
        }
        setSavedBookings((prev) => {
          const next = prev.map((b) =>
            b.reference === reference ? { ...b, status: 'Cancelled' as const } : b,
          );
          persistSavedBookings(next);
          return next;
        });
        return;
      }
    } catch {
      // Fallback below
    }
    setSavedBookings((prev) => {
      const next = prev.map((b) =>
        b.reference === reference ? { ...b, status: 'Cancelled' as const } : b,
      );
      persistSavedBookings(next);
      return next;
    });
  };

  const handleSubmitReview = async (payload: {
    tripId: string;
    reviewerName: string;
    reviewerLocation: string;
    completedMonth: string;
    bookingReference: string;
    completedTripConfirmed: boolean;
    rating: number;
    title: string;
    comment: string;
    photos: string[];
  }): Promise<TripReview> => {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not submit review.');
    }
    if (Array.isArray(data.reviews)) {
      setReviews(data.reviews);
    } else if (data.review) {
      setReviews((prev) => [data.review, ...prev]);
    }
    return data.review;
  };

  return (
    <div id="top" className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <Navbar
        activeSegment={activeSegment}
        onNavigateSegment={navigateSegment}
        onReserveClick={() => {
          const target = activeTrip ?? filteredTrips[0] ?? trips[0];
          openTripPage(target, target.departures[0]);
        }}
      />

      <main className="flex-1">
        {activeSegment === 'admin' ? (
          <AdminDashboard
            onBackToWebsite={() => navigateSegment('customer', 'top')}
            onCatalogMutated={refreshCatalog}
          />
        ) : activeTrip ? (
          <TripDetailPage
            key={activeTrip.id}
            trip={activeTrip}
            initialDeparture={activeDeparture}
            currency={currency}
            onCurrencyChange={setCurrency}
            reviews={reviews}
            onBack={closeTripPage}
            onBookingCompleted={handleBookingCompleted}
            onSubmitReview={handleSubmitReview}
          />
        ) : (
          <>
            <HeroSection onExploreDates={scrollToSchedule} />

            <TripsAndScheduleSection
              filteredTrips={filteredTrips}
              chronologicalDepartures={chronologicalDepartures}
              availableMonths={availableMonths}
              availableCountries={availableCountries}
              reviews={reviews}
              filters={filters}
              onFiltersChange={setFilters}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              currency={currency}
              onCurrencyChange={setCurrency}
              savedCount={savedBookings.length}
              onOpenSavedBookings={() => setDrawerOpen(true)}
              onSelectTrip={openTripPage}
            />

            <FleetAndDestinationsSection
              vehicles={vehicles}
              destinations2026={destinations2026}
              onBookDianiXmas={handleBookDianiXmas}
              onCharterVehicle={handleCharterVehicle}
              onSelectDestination2026={handleSelectDestination2026}
            />

            <InclusionsSection />

            <MyBookingsSection
              currency={currency}
              sessionBookings={savedBookings}
              onCancelBooking={handleCancelBooking}
              onExploreTrips={scrollToTrips}
            />

            <ReviewsSection
              trips={trips}
              reviews={reviews}
              onSelectTripById={(tripId) => {
                const found = trips.find((t) => t.id === tripId);
                if (found) openTripPage(found, found.departures[0]);
              }}
              onSubmitReview={handleSubmitReview}
            />

            <AboutAndInquirySection
              prefilledVehicle={prefilledVehicle}
              prefilledDestination={prefilledDestination}
              prefilledRegion={prefilledRegion}
              prefillVersion={prefillVersion}
            />
          </>
        )}
      </main>

      <Footer />

      <SavedBookingsDrawer
        isOpen={drawerOpen}
        bookings={savedBookings}
        currency={currency}
        onClose={() => setDrawerOpen(false)}
        onCancelBooking={handleCancelBooking}
        onExploreTrips={scrollToTrips}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
