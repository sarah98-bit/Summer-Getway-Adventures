export type Region = 'kenya' | 'middle-east' | 'south-asia';

export type DurationCategory = 'all' | 'overnight' | 'day-trip';

export type CurrencyCode = 'USD' | 'KES';

export type PaymentMethod = 'card' | 'mpesa' | 'paybill_manual' | 'cash';

export type PaymentOption = 'deposit' | 'full' | 'balance_settlement';

export type BookingStatus = 'Confirmed' | 'Pending Deposit' | 'Cancelled' | 'Completed';

export type BookingChannel = 'online' | 'whatsapp' | 'phone' | 'walk-in';

export interface DepartureDate {
  id: string;
  tripId?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  monthKey: string; // YYYY-MM
  dateLabel: string;
  seatsTotal: number;
  seatsRemaining: number;
  priceUsd: number;
  priceKes?: number | null;
  kidPriceUsd?: number | null;
  kidPriceKes?: number | null;
  extraNightUsd?: number | null;
  extraNightKes?: number | null;
  minDepositUsd?: number | null;
  minDepositKes?: number | null;
  paybillNumber?: string | null;
  paybillAccount?: string | null;
  isFeaturedEvent?: boolean;
  status: 'Open' | 'Few Seats' | 'Sold Out';
}

export interface DayPlan {
  day: number;
  title: string;
  location: string;
  activities: string[];
  guidedExperience: string;
  transport: string;
  mealsIncluded: string;
  accommodation: string;
}

export interface Trip {
  id: string;
  code: string;
  title: string;
  region: Region;
  country: string;
  destination: string;
  category?: string;
  departureHub: string;
  durationDays: number;
  nights: number;
  imageUrl: string;
  imageAlt: string;
  summary: string;
  transportMode: string;
  transportDetail: string;
  hotelName: string | null;
  hotelCategory: string | null;
  accommodationDetail: string;
  mealPlan: 'Half Board (Breakfast & Dinner)' | 'Day Trip (Refreshments)' | string;
  singleSupplementUsd: number;
  singleSupplementKes?: number | null;
  guidedHighlight: string;
  inclusions?: string[];
  exclusions?: string[];
  itinerary: DayPlan[];
  departures: DepartureDate[];
  isFeatured?: boolean;
  active?: boolean;
}

export interface FleetVehicle {
  id: string;
  name: string;
  registrationPlate?: string | null;
  capacityLabel: string;
  capacitySeats?: number;
  bestFor: string;
  imageUrl?: string | null;
  active?: boolean;
}

export interface GlobalDestination2026 {
  id: string;
  name: string;
  country?: string;
  region?: string;
  category: string;
  description?: string;
  imageUrl?: string | null;
  isFeatured?: boolean;
  linkedTripId?: string | null;
}

export interface DestinationRecord {
  id: string;
  name: string;
  country: string;
  region: string;
  category: string;
  description: string;
  imageUrl: string | null;
  isFeatured: boolean;
  linkedTripId: string | null;
}

export interface HotelRecord {
  id: string;
  name: string;
  location: string;
  country: string;
  category: string;
  roomDetails: string;
  active: boolean;
}

export interface MealPackageRecord {
  id: string;
  name: string;
  basis: string;
  description: string;
  active: boolean;
}

export interface TripInclusions {
  isOvernight: boolean;
  transportIncluded: boolean;
  transportSummary: string;
  hotelIncluded: boolean;
  hotelSummary: string;
  mealsIncluded: boolean;
  mealPlanLabel: string;
  guidedToursIncluded: boolean;
  guidedSummary: string;
}

export interface TripFilters {
  region: 'all' | Region;
  duration: DurationCategory;
  month: string;
  query: string;
  country?: string;
  maxPriceUsd?: number | null;
}

export interface ChronologicalDeparture {
  trip: Trip;
  departure: DepartureDate;
  inclusions: TripInclusions;
}

export interface BookingSummary {
  baseTotalUsd: number;
  kidsTotalUsd: number;
  extraNightsTotalUsd: number;
  singleSupplementTotalUsd: number;
  totalUsd: number;
  depositDueUsd: number;
  amountDueNowUsd: number;
  balanceDueUsd: number;
}

export interface PaymentReceipt {
  transactionId: string;
  method: PaymentMethod;
  paymentOption: PaymentOption;
  amountPaidUsd: number;
  amountPaidKes?: number;
  maskedAccount: string;
  paidAt: string;
  status: 'Paid';
}

export interface PaymentTransaction {
  id?: number;
  bookingId?: number;
  bookingReference?: string;
  customerName?: string;
  tripTitle?: string;
  transactionId: string;
  method: PaymentMethod;
  paymentOption: PaymentOption;
  amountUsd: number;
  amountKes: number;
  maskedAccount: string;
  status: string;
  paidAt: string;
}

export interface BookingRecord {
  id?: number;
  reference: string;
  userUid?: string | null;
  createdAt: string;
  tripId: string;
  tripCode: string;
  tripTitle: string;
  destination: string;
  departureId: string;
  dateLabel: string;
  durationDays: number;
  nights: number;
  travelers: number;
  kids?: number;
  extraNights?: number;
  singleSupplement: boolean;
  transportMode: string;
  hotelName: string | null;
  mealPlan: string;
  bookingChannel?: BookingChannel;
  status?: BookingStatus;
  totalUsd: number;
  totalKes?: number;
  depositDueUsd: number;
  depositDueKes?: number;
  amountPaidUsd: number;
  amountPaidKes?: number;
  balanceDueUsd: number;
  balanceDueKes?: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
  payment: PaymentReceipt;
  payments?: PaymentTransaction[];
}

export interface TripReview {
  id: string;
  tripId: string;
  tripTitle: string;
  reviewerName: string;
  reviewerLocation: string;
  completedMonth: string;
  rating: number;
  title: string;
  comment: string;
  photos: string[];
  verifiedBooking: boolean;
  createdAt: string;
}

export interface CustomInquiryInput {
  name: string;
  email: string;
  phone: string;
  region: Region;
  preferredMonth: string;
  groupSize: number;
  vehiclePreference?: string;
  destinationInterest?: string;
  notes: string;
  channel?: 'web' | 'whatsapp';
}

export interface InquiryRecord {
  id: number;
  reference: string;
  name: string;
  email: string;
  phone: string;
  channel: string;
  region: string;
  destinationInterest: string;
  vehiclePreference: string;
  preferredMonth: string;
  groupSize: number;
  notes: string;
  status: 'New' | 'Contacted' | 'Quoted' | 'Closed';
  createdAt: string;
}

export interface AdminReportSummary {
  totalBookings: number;
  activeBookings: number;
  cancelledBookings: number;
  totalBookedValueUsd: number;
  totalCollectedUsd: number;
  totalCollectedKes: number;
  outstandingBalanceUsd: number;
  outstandingBalanceKes: number;
  totalTravelers: number;
  totalSeatsCapacity: number;
  occupancyRatePct: number;
  openInquiriesCount: number;
  byChannel: Array<{ channel: string; count: number; collectedUsd: number }>;
  byRegion: Array<{ region: string; bookings: number; collectedUsd: number; travelers: number }>;
  departureOccupancy: Array<{
    departureId: string;
    tripTitle: string;
    dateLabel: string;
    seatsTotal: number;
    seatsBooked: number;
    seatsRemaining: number;
    occupancyPct: number;
    status: string;
  }>;
}
