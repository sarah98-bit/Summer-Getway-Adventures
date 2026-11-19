import type {
  AdminReportSummary,
  BookingRecord,
  BookingSummary,
  ChronologicalDeparture,
  CurrencyCode,
  CustomInquiryInput,
  DepartureDate,
  InquiryRecord,
  PaymentOption,
  Trip,
  TripFilters,
  TripInclusions,
  TripReview,
} from '../types/travel';

export const USD_TO_KES_RATE = 129;
export const STORAGE_KEY_BOOKINGS = 'sga_saved_bookings_v2';
export const STORAGE_KEY_REVIEWS = 'sga_trip_reviews_v1';
export const WHATSAPP_DEFAULT_NUMBER = '254724794548';

const MONTH_NAMES: Record<string, string> = {
  '01': 'Jan',
  '02': 'Feb',
  '03': 'Mar',
  '04': 'Apr',
  '05': 'May',
  '06': 'Jun',
  '07': 'Jul',
  '08': 'Aug',
  '09': 'Sep',
  '10': 'Oct',
  '11': 'Nov',
  '12': 'Dec',
};

export function buildWhatsAppLink(message: string, phoneNumber = WHATSAPP_DEFAULT_NUMBER): string {
  const cleanDigits = phoneNumber.replace(/\D/g, '');
  const e164 = cleanDigits.startsWith('0')
    ? `254${cleanDigits.slice(1)}`
    : cleanDigits || WHATSAPP_DEFAULT_NUMBER;
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}

export function getTripInclusions(trip: Trip): TripInclusions {
  const isOvernight = trip.durationDays > 1;
  return {
    isOvernight,
    transportIncluded: true,
    transportSummary: trip.transportMode,
    hotelIncluded: isOvernight && Boolean(trip.hotelName),
    hotelSummary: isOvernight
      ? `${trip.hotelName ?? 'Curated Partner Hotel'} (${trip.nights} ${trip.nights === 1 ? 'night' : 'nights'})`
      : 'Day excursion — no overnight hotel stay',
    mealsIncluded: isOvernight,
    mealPlanLabel: isOvernight
      ? 'Half Board (Daily Breakfast & Dinner)'
      : 'Day Refreshments (No overnight meal plan)',
    guidedToursIncluded: true,
    guidedSummary: trip.guidedHighlight,
  };
}

export function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-');
  const label = MONTH_NAMES[month];
  if (!year || !label) return monthKey;
  return `${label} ${year}`;
}

export function getAvailableMonths(trips: Trip[]): Array<{ key: string; label: string }> {
  const keys = new Set<string>();
  for (const trip of trips) {
    for (const dep of trip.departures) {
      keys.add(dep.monthKey);
    }
  }
  return Array.from(keys)
    .sort()
    .map((key) => ({ key, label: formatMonthLabel(key) }));
}

export function getAvailableCountries(trips: Trip[]): string[] {
  const countries = new Set<string>();
  for (const trip of trips) {
    if (trip.country?.trim()) {
      countries.add(trip.country.trim());
    }
  }
  return Array.from(countries).sort((a, b) => a.localeCompare(b));
}

export function filterTrips(trips: Trip[], filters: TripFilters): Trip[] {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const countryFilter = filters.country?.trim();
  const maxPriceUsd =
    typeof filters.maxPriceUsd === 'number' && Number.isFinite(filters.maxPriceUsd) && filters.maxPriceUsd > 0
      ? filters.maxPriceUsd
      : null;

  return trips.filter((trip) => {
    if (filters.region !== 'all' && trip.region !== filters.region) {
      return false;
    }

    if (countryFilter && countryFilter !== 'all' && trip.country.toLowerCase() !== countryFilter.toLowerCase()) {
      return false;
    }

    if (filters.duration === 'overnight' && trip.durationDays <= 1) {
      return false;
    }
    if (filters.duration === 'day-trip' && trip.durationDays > 1) {
      return false;
    }

    if (filters.month !== 'all') {
      const hasMonth = trip.departures.some((d) => d.monthKey === filters.month);
      if (!hasMonth) return false;
    }

    if (maxPriceUsd !== null) {
      const hasAffordable = trip.departures.some((d) => d.priceUsd <= maxPriceUsd);
      if (!hasAffordable) return false;
    }

    if (normalizedQuery.length > 0) {
      const haystack = [
        trip.title,
        trip.destination,
        trip.country,
        trip.category ?? '',
        trip.transportMode,
        trip.summary,
        trip.hotelName ?? '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(normalizedQuery)) {
        return false;
      }
    }

    return true;
  });
}

export function getChronologicalDepartures(
  trips: Trip[],
  filters: TripFilters,
): ChronologicalDeparture[] {
  const matchingTrips = filterTrips(trips, filters);
  const maxPriceUsd =
    typeof filters.maxPriceUsd === 'number' && Number.isFinite(filters.maxPriceUsd) && filters.maxPriceUsd > 0
      ? filters.maxPriceUsd
      : null;
  const rows: ChronologicalDeparture[] = [];

  for (const trip of matchingTrips) {
    const inclusions = getTripInclusions(trip);
    for (const departure of trip.departures) {
      if (filters.month !== 'all' && departure.monthKey !== filters.month) {
        continue;
      }
      if (maxPriceUsd !== null && departure.priceUsd > maxPriceUsd) {
        continue;
      }
      rows.push({ trip, departure, inclusions });
    }
  }

  return rows.sort((a, b) => a.departure.startDate.localeCompare(b.departure.startDate));
}

export function formatPrice(
  usdAmount: number,
  currency: CurrencyCode,
  exactKesOverride?: number | null,
): string {
  if (currency === 'KES') {
    const kes =
      typeof exactKesOverride === 'number'
        ? exactKesOverride
        : Math.round(usdAmount * USD_TO_KES_RATE);
    return `KES ${kes.toLocaleString('en-US')}`;
  }
  return `$${usdAmount.toLocaleString('en-US')}`;
}

export function formatDeparturePrice(
  departure: Pick<DepartureDate, 'priceUsd' | 'priceKes'>,
  currency: CurrencyCode,
): string {
  return formatPrice(departure.priceUsd, currency, departure.priceKes);
}

export function calculateBookingSummary(
  trip: Trip,
  pricePerPersonUsd: number,
  travelers: number,
  singleSupplement: boolean,
  paymentOption: PaymentOption = 'deposit',
  extras?: {
    kids?: number;
    kidPriceUsd?: number | null;
    extraNights?: number;
    extraNightPriceUsd?: number | null;
    minDepositUsd?: number | null;
  },
): BookingSummary {
  const safeTravelers = Math.max(1, Math.floor(travelers));
  const safeKids = Math.max(0, Math.floor(extras?.kids ?? 0));
  const safeExtraNights =
    trip.durationDays > 1 ? Math.max(0, Math.floor(extras?.extraNights ?? 0)) : 0;

  const baseTotalUsd = pricePerPersonUsd * safeTravelers;
  const kidsTotalUsd =
    safeKids > 0 && typeof extras?.kidPriceUsd === 'number'
      ? extras.kidPriceUsd * safeKids
      : 0;
  const extraNightsTotalUsd =
    safeExtraNights > 0 && typeof extras?.extraNightPriceUsd === 'number'
      ? extras.extraNightPriceUsd * (safeTravelers + safeKids) * safeExtraNights
      : 0;

  const isOvernight = trip.durationDays > 1;
  const singleSupplementTotalUsd =
    isOvernight && singleSupplement ? trip.singleSupplementUsd : 0;
  const totalUsd =
    baseTotalUsd + kidsTotalUsd + extraNightsTotalUsd + singleSupplementTotalUsd;

  const rawDeposit =
    typeof extras?.minDepositUsd === 'number'
      ? Math.min(totalUsd, extras.minDepositUsd)
      : Math.round(totalUsd * 0.3);
  const depositDueUsd = rawDeposit;
  const amountDueNowUsd = paymentOption === 'full' ? totalUsd : depositDueUsd;
  const balanceDueUsd = Math.max(0, totalUsd - amountDueNowUsd);

  return {
    baseTotalUsd,
    kidsTotalUsd,
    extraNightsTotalUsd,
    singleSupplementTotalUsd,
    totalUsd,
    depositDueUsd,
    amountDueNowUsd,
    balanceDueUsd,
  };
}

export function computeAdminReportMetrics(
  bookings: BookingRecord[],
  trips: Trip[],
  inquiries: Pick<InquiryRecord, 'status'>[] = [],
): AdminReportSummary {
  const active = bookings.filter((b) => b.status !== 'Cancelled');
  const cancelled = bookings.filter((b) => b.status === 'Cancelled');

  const totalBookedValueUsd = active.reduce((sum, b) => sum + (b.totalUsd ?? 0), 0);
  const totalCollectedUsd = active.reduce((sum, b) => sum + (b.amountPaidUsd ?? 0), 0);
  const totalCollectedKes = active.reduce(
    (sum, b) => sum + (b.amountPaidKes ?? Math.round((b.amountPaidUsd ?? 0) * USD_TO_KES_RATE)),
    0,
  );
  const outstandingBalanceUsd = active.reduce((sum, b) => sum + (b.balanceDueUsd ?? 0), 0);
  const outstandingBalanceKes = active.reduce(
    (sum, b) => sum + (b.balanceDueKes ?? Math.round((b.balanceDueUsd ?? 0) * USD_TO_KES_RATE)),
    0,
  );
  const totalTravelers = active.reduce((sum, b) => sum + (b.travelers ?? 0) + (b.kids ?? 0), 0);

  const channelMap = new Map<string, { count: number; collectedUsd: number }>();
  for (const b of active) {
    const ch = b.bookingChannel ?? 'online';
    const cur = channelMap.get(ch) ?? { count: 0, collectedUsd: 0 };
    cur.count += 1;
    cur.collectedUsd += b.amountPaidUsd ?? 0;
    channelMap.set(ch, cur);
  }

  const tripById = new Map(trips.map((t) => [t.id, t]));
  const regionMap = new Map<string, { bookings: number; collectedUsd: number; travelers: number }>();
  for (const b of active) {
    const region = tripById.get(b.tripId)?.region ?? 'kenya';
    const cur = regionMap.get(region) ?? { bookings: 0, collectedUsd: 0, travelers: 0 };
    cur.bookings += 1;
    cur.collectedUsd += b.amountPaidUsd ?? 0;
    cur.travelers += (b.travelers ?? 0) + (b.kids ?? 0);
    regionMap.set(region, cur);
  }

  let totalSeatsCapacity = 0;
  let totalSeatsBooked = 0;
  const departureOccupancy: AdminReportSummary['departureOccupancy'] = [];
  for (const trip of trips) {
    for (const dep of trip.departures) {
      const seatsBooked = Math.max(0, dep.seatsTotal - dep.seatsRemaining);
      totalSeatsCapacity += dep.seatsTotal;
      totalSeatsBooked += seatsBooked;
      departureOccupancy.push({
        departureId: dep.id,
        tripTitle: trip.title,
        dateLabel: dep.dateLabel,
        seatsTotal: dep.seatsTotal,
        seatsBooked,
        seatsRemaining: dep.seatsRemaining,
        occupancyPct: dep.seatsTotal > 0 ? Math.round((seatsBooked / dep.seatsTotal) * 100) : 0,
        status: dep.status,
      });
    }
  }

  const occupancyRatePct =
    totalSeatsCapacity > 0 ? Math.round((totalSeatsBooked / totalSeatsCapacity) * 100) : 0;

  return {
    totalBookings: bookings.length,
    activeBookings: active.length,
    cancelledBookings: cancelled.length,
    totalBookedValueUsd,
    totalCollectedUsd,
    totalCollectedKes,
    outstandingBalanceUsd,
    outstandingBalanceKes,
    totalTravelers,
    totalSeatsCapacity,
    occupancyRatePct,
    openInquiriesCount: inquiries.filter((i) => i.status === 'New' || i.status === 'Contacted').length,
    byChannel: Array.from(channelMap.entries()).map(([channel, stats]) => ({
      channel,
      ...stats,
    })),
    byRegion: Array.from(regionMap.entries()).map(([region, stats]) => ({
      region,
      ...stats,
    })),
    departureOccupancy,
  };
}

export interface BookingValidationErrors {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  travelers?: string;
  departureId?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+\d][\d\s()-]{6,18}$/;

export function validateBookingInput(input: {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  travelers: number;
  seatsRemaining: number;
  departureId: string;
}): BookingValidationErrors {
  const errors: BookingValidationErrors = {};

  if (!input.departureId) {
    errors.departureId = 'Select a departure date.';
  }
  if (input.customerName.trim().length < 2) {
    errors.customerName = 'Enter the lead traveler full name.';
  }
  if (!EMAIL_REGEX.test(input.customerEmail.trim())) {
    errors.customerEmail = 'Enter a valid email address for your booking confirmation.';
  }
  if (!PHONE_REGEX.test(input.customerPhone.trim())) {
    errors.customerPhone = 'Enter a reachable phone or WhatsApp number (e.g. +254 724 794 548).';
  }
  if (!Number.isFinite(input.travelers) || input.travelers < 1) {
    errors.travelers = 'At least 1 traveler is required.';
  } else if (input.travelers > input.seatsRemaining) {
    errors.travelers = `Only ${input.seatsRemaining} seats remain on this departure date.`;
  }

  return errors;
}

export interface InquiryValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  groupSize?: string;
}

export function validateInquiryInput(input: CustomInquiryInput): InquiryValidationErrors {
  const errors: InquiryValidationErrors = {};

  if (input.name.trim().length < 2) {
    errors.name = 'Enter your name or organization.';
  }
  if (!EMAIL_REGEX.test(input.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!PHONE_REGEX.test(input.phone.trim())) {
    errors.phone = 'Enter a valid phone number.';
  }
  if (!Number.isFinite(input.groupSize) || input.groupSize < 2) {
    errors.groupSize = 'Custom group inquiries require at least 2 travelers.';
  }

  return errors;
}

export interface ReviewValidationErrors {
  tripId?: string;
  reviewerName?: string;
  completedMonth?: string;
  rating?: string;
  title?: string;
  comment?: string;
  photos?: string;
}

export function validateReviewInput(input: {
  tripId: string;
  reviewerName: string;
  completedMonth: string;
  rating: number;
  title: string;
  comment: string;
  photos: string[];
}): ReviewValidationErrors {
  const errors: ReviewValidationErrors = {};

  if (!input.tripId.trim()) {
    errors.tripId = 'Select the trip you completed.';
  }
  if (input.reviewerName.trim().length < 2) {
    errors.reviewerName = 'Enter your name.';
  }
  if (input.completedMonth.trim().length < 3) {
    errors.completedMonth = 'Enter when you completed the trip (e.g. Oct 2026).';
  }
  if (!Number.isFinite(input.rating) || input.rating < 1 || input.rating > 5) {
    errors.rating = 'Select a star rating between 1 and 5.';
  }
  if (input.title.trim().length < 3) {
    errors.title = 'Add a short headline for your review.';
  }
  if (input.comment.trim().length < 15) {
    errors.comment = 'Please write at least 15 characters about your experience.';
  }
  if (input.photos.length > 3) {
    errors.photos = 'You can attach up to 3 photos per review.';
  }

  return errors;
}

export function computeTripRatingStats(
  reviews: TripReview[],
  tripId: string,
): { averageRating: number; reviewCount: number } {
  const matching = reviews.filter((r) => r.tripId === tripId);
  if (matching.length === 0) {
    return { averageRating: 0, reviewCount: 0 };
  }
  const sum = matching.reduce((acc, r) => acc + r.rating, 0);
  return {
    averageRating: Math.round((sum / matching.length) * 10) / 10,
    reviewCount: matching.length,
  };
}

export function generateBookingReference(seedSuffix?: string): string {
  const suffix = seedSuffix ?? String(Math.floor(1000 + Math.random() * 9000));
  return `SGA-2026-${suffix}`;
}

export function loadSavedBookings(): BookingRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_BOOKINGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function persistSavedBookings(bookings: BookingRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY_BOOKINGS, JSON.stringify(bookings));
  } catch {
    // Ignore storage quota errors
  }
}
