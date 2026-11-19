import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Lock,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Smartphone,
  Star,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COMPANY_INFO, REGION_LABELS } from '../data/trips';
import type {
  BookingRecord,
  CurrencyCode,
  DepartureDate,
  PaymentMethod,
  PaymentOption,
  Trip,
  TripReview,
} from '../types/travel';
import {
  detectCardBrand,
  formatCardNumberDisplay,
  formatExpiryDisplay,
  normalizeKenyanMpesaPhone,
  validateCardInput,
  type CardValidationErrors,
} from '../utils/payment';
import {
  buildWhatsAppLink,
  calculateBookingSummary,
  computeTripRatingStats,
  formatDeparturePrice,
  formatPrice,
  getTripInclusions,
  validateBookingInput,
  type BookingValidationErrors,
} from '../utils/trips';
import { ReviewForm } from './ReviewForm';
import { TripImage } from './TripImage';

interface TripDetailPageProps {
  trip: Trip;
  initialDeparture?: DepartureDate;
  currency: CurrencyCode;
  onCurrencyChange: (currency: CurrencyCode) => void;
  reviews: TripReview[];
  onBack: () => void;
  onBookingCompleted: (booking: BookingRecord, updatedTrips: Trip[]) => void;
  onSubmitReview: (payload: {
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
  }) => Promise<TripReview>;
}

export function TripDetailPage({
  trip,
  initialDeparture,
  currency,
  onCurrencyChange,
  reviews,
  onBack,
  onBookingCompleted,
  onSubmitReview,
}: TripDetailPageProps) {
  const { getToken } = useAuth();
  const inclusions = getTripInclusions(trip);
  const tripReviews = useMemo(
    () => reviews.filter((r) => r.tripId === trip.id),
    [reviews, trip.id],
  );
  const ratingStats = useMemo(
    () => computeTripRatingStats(reviews, trip.id),
    [reviews, trip.id],
  );

  const [selectedDepartureId, setSelectedDepartureId] = useState<string>(
    initialDeparture?.id ?? trip.departures[0]?.id ?? '',
  );
  useEffect(() => {
    if (initialDeparture?.id) {
      setSelectedDepartureId(initialDeparture.id);
    }
  }, [initialDeparture?.id]);

  const activeDeparture =
    trip.departures.find((d) => d.id === selectedDepartureId) ?? trip.departures[0];

  const [travelers, setTravelers] = useState<number>(2);
  const [kids, setKids] = useState<number>(0);
  const [extraNights, setExtraNights] = useState<number>(0);
  const [singleSupplement, setSingleSupplement] = useState<boolean>(false);
  const [paymentOption, setPaymentOption] = useState<PaymentOption>('deposit');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  // Lead traveler details
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Card gateway fields
  const [cardholderName, setCardholderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // M-Pesa gateway fields
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [mpesaSession, setMpesaSession] = useState<{
    checkoutRequestId: string;
    maskedPhone: string;
    message: string;
  } | null>(null);
  const [mpesaError, setMpesaError] = useState<string | null>(null);
  const [mpesaLoading, setMpesaLoading] = useState(false);

  const [bookingErrors, setBookingErrors] = useState<BookingValidationErrors>({});
  const [cardErrors, setCardErrors] = useState<CardValidationErrors>({});
  const [gatewayError, setGatewayError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingRecord | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  const hasKidRate = typeof activeDeparture.kidPriceUsd === 'number';
  const hasExtraNightRate =
    inclusions.isOvernight && typeof activeDeparture.extraNightUsd === 'number';
  const effectiveKids = hasKidRate ? kids : 0;
  const effectiveExtraNights = hasExtraNightRate ? extraNights : 0;

  const summary = calculateBookingSummary(
    trip,
    activeDeparture.priceUsd,
    travelers,
    singleSupplement,
    paymentOption,
    {
      kids: effectiveKids,
      kidPriceUsd: activeDeparture.kidPriceUsd,
      extraNights: effectiveExtraNights,
      extraNightPriceUsd: activeDeparture.extraNightUsd,
      minDepositUsd: activeDeparture.minDepositUsd,
    },
  );

  const exactBaseKes =
    typeof activeDeparture.priceKes === 'number'
      ? activeDeparture.priceKes * travelers
      : undefined;
  const exactKidsKes =
    effectiveKids > 0 && typeof activeDeparture.kidPriceKes === 'number'
      ? activeDeparture.kidPriceKes * effectiveKids
      : undefined;
  const exactExtraNightsKes =
    effectiveExtraNights > 0 && typeof activeDeparture.extraNightKes === 'number'
      ? activeDeparture.extraNightKes * (travelers + effectiveKids) * effectiveExtraNights
      : undefined;
  const exactSupplementKes =
    inclusions.isOvernight && singleSupplement && typeof trip.singleSupplementKes === 'number'
      ? trip.singleSupplementKes
      : undefined;
  const exactTotalKes =
    typeof activeDeparture.priceKes === 'number'
      ? (exactBaseKes ?? 0) +
        (exactKidsKes ?? 0) +
        (exactExtraNightsKes ?? 0) +
        (inclusions.isOvernight && singleSupplement
          ? (exactSupplementKes ?? Math.round(trip.singleSupplementUsd * 129))
          : 0)
      : undefined;
  const exactDepositKes =
    typeof activeDeparture.minDepositKes === 'number'
      ? typeof exactTotalKes === 'number'
        ? Math.min(exactTotalKes, activeDeparture.minDepositKes)
        : activeDeparture.minDepositKes
      : undefined;
  const exactDueNowKes =
    paymentOption === 'full' ? exactTotalKes : exactDepositKes;

  const cardBrand = detectCardBrand(cardNumber);

  const handleInitiateMpesa = async () => {
    setMpesaError(null);
    const normalized = normalizeKenyanMpesaPhone(mpesaPhone);
    if (!normalized) {
      setMpesaError('Enter a valid Kenyan Safaricom number (e.g. +254 712 345 678).');
      return;
    }

    setMpesaLoading(true);
    try {
      const response = await fetch('/api/payments/mpesa/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: normalized,
          amountUsd: summary.amountDueNowUsd,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not initiate M-Pesa prompt.');
      }
      setMpesaSession({
        checkoutRequestId: data.checkoutRequestId,
        maskedPhone: data.maskedPhone,
        message: data.message,
      });
    } catch (err) {
      setMpesaError(err instanceof Error ? err.message : 'M-Pesa request failed.');
    } finally {
      setMpesaLoading(false);
    }
  };

  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGatewayError(null);

    const bErrors = validateBookingInput({
      customerName,
      customerEmail,
      customerPhone,
      travelers,
      seatsRemaining: activeDeparture.seatsRemaining,
      departureId: activeDeparture.id,
    });
    if (!bErrors.travelers && travelers + effectiveKids > activeDeparture.seatsRemaining) {
      bErrors.travelers = `Only ${activeDeparture.seatsRemaining} seats remain for adults and kids combined.`;
    }
    setBookingErrors(bErrors);

    let cErrors: CardValidationErrors = {};
    if (paymentMethod === 'card') {
      cErrors = validateCardInput({
        cardholderName,
        cardNumber,
        expiry: cardExpiry,
        cvc: cardCvc,
      });
      setCardErrors(cErrors);
    } else {
      setCardErrors({});
    }

    if (Object.keys(bErrors).length > 0 || Object.keys(cErrors).length > 0) {
      return;
    }

    if (paymentMethod === 'mpesa' && !mpesaSession) {
      setMpesaError('Send the M-Pesa STK prompt to your phone before completing payment.');
      return;
    }

    setIsProcessing(true);
    try {
      let cardToken: string | undefined;
      if (paymentMethod === 'card') {
        const tokRes = await fetch('/api/payments/tokenize-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cardholderName,
            cardNumber,
            expiry: cardExpiry,
            cvc: cardCvc,
          }),
        });
        const tokData = await tokRes.json();
        if (!tokRes.ok) {
          if (tokData.fieldErrors) setCardErrors(tokData.fieldErrors);
          throw new Error(tokData.error || 'Card authorization failed.');
        }
        cardToken = tokData.token;
      }

      const token = await getToken();
      const checkoutHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        checkoutHeaders.Authorization = `Bearer ${token}`;
      }

      const checkoutRes = await fetch('/api/bookings/checkout', {
        method: 'POST',
        headers: checkoutHeaders,
        body: JSON.stringify({
          tripId: trip.id,
          departureId: activeDeparture.id,
          travelers,
          kids: effectiveKids,
          extraNights: effectiveExtraNights,
          singleSupplement: inclusions.isOvernight && singleSupplement,
          paymentOption,
          paymentMethod,
          cardToken,
          mpesaCheckoutRequestId: mpesaSession?.checkoutRequestId,
          customerName,
          customerEmail,
          customerPhone,
          notes,
        }),
      });
      const checkoutData = await checkoutRes.json();
      if (!checkoutRes.ok) {
        if (checkoutData.fieldErrors) setBookingErrors(checkoutData.fieldErrors);
        throw new Error(checkoutData.error || 'Payment checkout failed.');
      }

      setConfirmedBooking(checkoutData.booking);
      onBookingCompleted(checkoutData.booking, checkoutData.trips);
    } catch (err) {
      setGatewayError(err instanceof Error ? err.message : 'Unable to process payment.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Top Breadcrumb Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            <span>Back to All Trips</span>
          </button>

          <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm">
            <span className="font-mono text-slate-500">{trip.code}</span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="font-medium text-teal-800">{REGION_LABELS[trip.region]}</span>
            {ratingStats.reviewCount > 0 && (
              <>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <a
                  href="#trip-reviews"
                  className="inline-flex items-center gap-1 text-slate-700 hover:text-slate-900 font-medium"
                >
                  <Star className="w-4 h-4 fill-amber-500 text-amber-500" aria-hidden="true" />
                  <span className="font-mono tabular-nums">{ratingStats.averageRating}</span>
                  <span>
                    ({ratingStats.reviewCount}{' '}
                    {ratingStats.reviewCount === 1 ? 'review' : 'reviews'})
                  </span>
                </a>
              </>
            )}

            <div
              role="group"
              aria-label="Trip page currency"
              className="inline-flex items-center p-0.5 bg-slate-100 rounded-md ml-2"
            >
              {(['USD', 'KES'] as CurrencyCode[]).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => onCurrencyChange(code)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors cursor-pointer ${
                    currency === code
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          {/* LEFT 7 COLUMNS: Gallery, Inclusions, Day-by-Day Itinerary & Trip Reviews */}
          <div className="lg:col-span-7 space-y-10">
            <div>
              <p className="text-xs sm:text-sm font-medium text-teal-800 mb-2">
                {trip.destination} · Departing {trip.departureHub} ·{' '}
                {trip.durationDays === 1
                  ? '1 Day Guided Excursion'
                  : `${trip.durationDays} Days / ${trip.nights} Nights`}
              </p>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mb-4">
                {trip.title}
              </h1>
              <p className="text-base text-slate-600 leading-relaxed mb-6">{trip.summary}</p>

              <div className="aspect-[16/9] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
                <TripImage
                  src={trip.imageUrl}
                  alt={trip.imageAlt}
                  label={trip.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Inclusions, Transport & Accommodation Breakdown */}
            <section aria-labelledby="trip-inclusions-heading" className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8">
              <h2
                id="trip-inclusions-heading"
                className="font-display text-2xl font-semibold text-slate-900 mb-5"
              >
                Inclusions, Transport &amp; Accommodation
              </h2>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div className="pb-4 sm:pb-0 border-b sm:border-b-0 border-slate-100">
                  <dt className="text-xs font-mono text-teal-800 uppercase tracking-wide mb-1">
                    Transport ({trip.country})
                  </dt>
                  <dd className="font-semibold text-slate-900">{trip.transportMode}</dd>
                  <dd className="text-slate-600 mt-1 leading-relaxed">{trip.transportDetail}</dd>
                </div>

                <div className="pb-4 sm:pb-0 border-b sm:border-b-0 border-slate-100">
                  <dt className="text-xs font-mono text-teal-800 uppercase tracking-wide mb-1">
                    Accommodation
                  </dt>
                  <dd className="font-semibold text-slate-900">
                    {inclusions.hotelIncluded
                      ? `${trip.hotelName} (${trip.hotelCategory})`
                      : 'Day Excursion — No Hotel Stay'}
                  </dd>
                  <dd className="text-slate-600 mt-1 leading-relaxed">
                    {trip.accommodationDetail}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-mono text-teal-800 uppercase tracking-wide mb-1">
                    Meal Basis
                  </dt>
                  <dd className="font-semibold text-slate-900">{inclusions.mealPlanLabel}</dd>
                  <dd className="text-slate-600 mt-1 leading-relaxed">
                    {inclusions.isOvernight
                      ? 'Breakfast before daily tours and seated dinner each evening at your booked hotel or camp.'
                      : 'Bottled water and trail snacks supplied for the full day from Nairobi.'}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-mono text-teal-800 uppercase tracking-wide mb-1">
                    Guided Tour Experiences
                  </dt>
                  <dd className="font-semibold text-slate-900">Included on All Days</dd>
                  <dd className="text-slate-600 mt-1 leading-relaxed">{trip.guidedHighlight}</dd>
                </div>
              </dl>

              {(trip.inclusions?.length || trip.exclusions?.length) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-6 pt-6 border-t border-slate-100 text-xs sm:text-sm">
                  {trip.inclusions && trip.inclusions.length > 0 && (
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wide text-teal-800 font-semibold mb-2">
                        Cost Includes
                      </h3>
                      <ul className="space-y-1.5 text-slate-700 list-disc pl-4">
                        {trip.inclusions.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {trip.exclusions && trip.exclusions.length > 0 && (
                    <div>
                      <h3 className="text-xs font-mono uppercase tracking-wide text-slate-600 font-semibold mb-2">
                        Cost Excludes
                      </h3>
                      <ul className="space-y-1.5 text-slate-600 list-disc pl-4">
                        {trip.exclusions.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </section>

            {/* Day-by-Day Detailed Itinerary */}
            <section aria-labelledby="day-by-day-heading">
              <div className="mb-5">
                <p className="text-xs font-medium text-teal-800 mb-1">
                  Detailed Schedule
                </p>
                <h2
                  id="day-by-day-heading"
                  className="font-display text-2xl sm:text-3xl font-semibold text-slate-900"
                >
                  Day-by-Day Itinerary Breakdown
                </h2>
              </div>

              <ol className="space-y-4">
                {trip.itinerary.map((day) => (
                  <li
                    key={day.day}
                    className="bg-white border border-slate-200 rounded-lg p-6 space-y-4"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <span className="font-mono text-xs font-semibold text-teal-800">
                          DAY {String(day.day).padStart(2, '0')}
                        </span>
                        <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
                          {day.title}
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-teal-700 shrink-0" aria-hidden="true" />
                        <span>{day.location}</span>
                      </span>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-slate-700 mb-2">
                        Scheduled Activities &amp; Guided Tour
                      </p>
                      <ul className="space-y-1.5 text-sm text-slate-600 list-disc pl-5">
                        {day.activities.map((act, idx) => (
                          <li key={idx}>{act}</li>
                        ))}
                      </ul>
                      <p className="text-xs text-teal-900 bg-teal-50/70 border border-teal-100 rounded px-3 py-2 mt-3">
                        Guided Focus: {day.guidedExperience}
                      </p>
                    </div>

                    <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-xs">
                      <div>
                        <dt className="text-slate-500">Transport</dt>
                        <dd className="font-medium text-slate-800 mt-0.5">{day.transport}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Meals Included</dt>
                        <dd className="font-medium text-slate-800 mt-0.5">{day.mealsIncluded}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Overnight Stay</dt>
                        <dd className="font-medium text-slate-800 mt-0.5">{day.accommodation}</dd>
                      </div>
                    </dl>
                  </li>
                ))}
              </ol>
            </section>

            {/* Individual Trip Reviews & Photo Submissions */}
            <section id="trip-reviews" aria-labelledby="trip-reviews-heading" className="space-y-6 pt-4">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div>
                  <h2
                    id="trip-reviews-heading"
                    className="font-display text-2xl sm:text-3xl font-semibold text-slate-900"
                  >
                    Traveler Reviews for This Trip
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    {ratingStats.reviewCount > 0
                      ? `Average ${ratingStats.averageRating} out of 5 stars from ${ratingStats.reviewCount} completed traveler ${
                          ratingStats.reviewCount === 1 ? 'review' : 'reviews'
                        }.`
                      : 'Be the first traveler to share notes and photos from this itinerary.'}
                  </p>
                </div>
              </div>

              {tripReviews.length > 0 && (
                <div className="space-y-4">
                  {tripReviews.map((rev) => (
                    <article
                      key={rev.id}
                      className="bg-white border border-slate-200 rounded-lg p-6 space-y-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="flex items-center gap-0.5"
                            aria-label={`${rev.rating} out of 5 stars`}
                          >
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-4 h-4 ${
                                  s <= rev.rating
                                    ? 'fill-amber-500 text-amber-500'
                                    : 'text-slate-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-semibold text-slate-900">
                            {rev.reviewerName}
                          </span>
                          <span className="text-xs text-slate-500">
                            · {rev.reviewerLocation}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-slate-500">
                          Completed {rev.completedMonth}
                          {rev.verifiedBooking ? ' · Verified' : ''}
                        </span>
                      </div>

                      <h3 className="text-base font-semibold text-slate-900">{rev.title}</h3>
                      <p className="text-sm text-slate-600 leading-relaxed">{rev.comment}</p>

                      {rev.photos.length > 0 && (
                        <div className="flex flex-wrap gap-3 pt-1">
                          {rev.photos.map((photo, idx) => (
                            <button
                              key={`${rev.id}-thumb-${idx}`}
                              type="button"
                              onClick={() => setLightboxPhoto(photo)}
                              aria-label={`View full photo ${idx + 1} from ${rev.reviewerName}`}
                              className="w-28 h-20 rounded-md overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity"
                            >
                              <TripImage
                                src={photo}
                                alt={`${trip.title} photo by ${rev.reviewerName}`}
                                label={trip.title}
                                className="w-full h-full object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}

              <ReviewForm
                trips={[trip]}
                lockedTripId={trip.id}
                onSubmitReview={onSubmitReview}
              />
            </section>
          </div>

          {/* RIGHT 5 COLUMNS: Sticky Booking & Secure Payment Gateway Module */}
          <div className="lg:col-span-5 lg:sticky lg:top-24">
            {confirmedBooking ? (
              <div
                data-testid="checkout-confirmation"
                className="bg-white border border-teal-300 rounded-lg p-6 sm:p-8 space-y-5 shadow-xs"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-7 h-7 text-teal-700 shrink-0 mt-0.5" aria-hidden="true" />
                  <div>
                    <p className="text-xs font-mono uppercase tracking-wide text-teal-800">
                      Booking &amp; Payment Confirmed
                    </p>
                    <h2 className="font-display text-2xl font-semibold text-slate-900 mt-0.5">
                      Ref: {confirmedBooking.reference}
                    </h2>
                  </div>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  Payment authorized for{' '}
                  <span className="font-semibold text-slate-900">
                    {confirmedBooking.customerName}
                  </span>{' '}
                  ({confirmedBooking.travelers}{' '}
                  {confirmedBooking.travelers === 1 ? 'traveler' : 'travelers'}) on{' '}
                  <span className="font-mono font-medium text-slate-900">
                    {confirmedBooking.dateLabel}
                  </span>
                  .
                </p>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transaction ID</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {confirmedBooking.payment.transactionId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Payment Method</span>
                    <span className="font-mono text-slate-900">
                      {confirmedBooking.payment.maskedAccount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid Now</span>
                    <span className="font-mono font-semibold text-teal-800 tabular-nums">
                      {formatPrice(confirmedBooking.amountPaidUsd, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Remaining Balance</span>
                    <span className="font-mono text-slate-900 tabular-nums">
                      {formatPrice(confirmedBooking.balanceDueUsd, currency)}
                    </span>
                  </div>
                </div>

                <dl className="text-xs space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Transport</dt>
                    <dd className="text-slate-900 font-medium text-right">
                      {confirmedBooking.transportMode}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-slate-500">Stay &amp; Meals</dt>
                    <dd className="text-slate-900 font-medium text-right">
                      {confirmedBooking.hotelName
                        ? `${confirmedBooking.hotelName} · Half Board`
                        : 'Day Trip (No hotel stay)'}
                    </dd>
                  </div>
                </dl>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmedBooking(null)}
                    className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                  >
                    Book Another Date
                  </button>
                  <button
                    type="button"
                    onClick={onBack}
                    className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors cursor-pointer"
                  >
                    Browse All Trips
                  </button>
                </div>
              </div>
            ) : (
              <form
                onSubmit={handleCheckoutSubmit}
                noValidate
                className="bg-white border border-slate-200 rounded-lg p-6 space-y-6"
              >
                <div className="pb-4 border-b border-slate-200 flex items-baseline justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Selected Rate (P.P.S.)</p>
                    <p className="font-mono text-2xl font-semibold text-slate-900 tabular-nums">
                      {formatDeparturePrice(activeDeparture, currency)}
                      <span className="text-xs font-sans font-normal text-slate-500">
                        {' '}
                        / person
                      </span>
                    </p>
                  </div>
                  <span className="text-xs font-mono text-teal-800 tabular-nums">
                    {activeDeparture.seatsRemaining} seats left
                  </span>
                </div>

                {/* 1. Departure Date Selection */}
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 mb-2.5">
                    1. Choose Departure Dates
                  </h2>
                  <div className="space-y-2">
                    {trip.departures.map((dep) => {
                      const isSelected = dep.id === activeDeparture.id;
                      const isSoldOut = dep.seatsRemaining <= 0;
                      return (
                        <button
                          key={dep.id}
                          type="button"
                          disabled={isSoldOut}
                          onClick={() => setSelectedDepartureId(dep.id)}
                          aria-pressed={isSelected}
                          className={`w-full text-left p-3 rounded-md border transition-colors flex items-center justify-between gap-3 ${
                            isSoldOut
                              ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                              : isSelected
                                ? 'bg-teal-50/40 border-teal-700 ring-1 ring-teal-700 cursor-pointer'
                                : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                          }`}
                        >
                          <div>
                            <p className="font-mono text-xs font-semibold text-slate-900 tabular-nums">
                              {dep.dateLabel}
                            </p>
                            <p
                              className={`text-xs mt-0.5 tabular-nums ${
                                dep.status === 'Few Seats'
                                  ? 'text-amber-800 font-medium'
                                  : 'text-slate-500'
                              }`}
                            >
                              {dep.status} · {dep.seatsRemaining} seats left
                            </p>
                          </div>
                          <span className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                            {formatDeparturePrice(dep, currency)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Travelers & Details */}
                <div className="space-y-3 pt-4 border-t border-slate-200">
                  <h2 className="text-sm font-semibold text-slate-900">
                    2. Travelers &amp; Contact Details
                  </h2>

                  <div className="flex items-center justify-between gap-4">
                    <label
                      htmlFor="detail-travelers"
                      className="text-xs font-semibold text-slate-700"
                    >
                      {hasKidRate ? 'Adult Travelers (P.P.S.)' : 'Number of Travelers'}
                    </label>
                    <select
                      id="detail-travelers"
                      value={travelers}
                      onChange={(e) => setTravelers(Number(e.target.value))}
                      className="px-3 py-1.5 text-sm font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={n}>
                          {n} {n === 1 ? 'Adult' : 'Adults'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {hasKidRate && (
                    <div className="flex items-center justify-between gap-4">
                      <label
                        htmlFor="detail-kids"
                        className="text-xs font-semibold text-slate-700"
                      >
                        Kids ({formatPrice(activeDeparture.kidPriceUsd!, currency, activeDeparture.kidPriceKes)} / kid)
                      </label>
                      <select
                        id="detail-kids"
                        value={kids}
                        onChange={(e) => setKids(Number(e.target.value))}
                        className="px-3 py-1.5 text-sm font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                      >
                        {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'Kid' : 'Kids'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {hasExtraNightRate && (
                    <div className="flex items-center justify-between gap-4">
                      <label
                        htmlFor="detail-extra-nights"
                        className="text-xs font-semibold text-slate-700"
                      >
                        Extra Nights ({formatPrice(activeDeparture.extraNightUsd!, currency, activeDeparture.extraNightKes)}/person)
                      </label>
                      <select
                        id="detail-extra-nights"
                        value={extraNights}
                        onChange={(e) => setExtraNights(Number(e.target.value))}
                        className="px-3 py-1.5 text-sm font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                      >
                        {[0, 1, 2, 3, 4, 5].map((n) => (
                          <option key={n} value={n}>
                            {n} Extra {n === 1 ? 'Night' : 'Nights'}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {bookingErrors.travelers && (
                    <p className="text-xs text-red-700">{bookingErrors.travelers}</p>
                  )}

                  {inclusions.isOvernight && (
                    <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={singleSupplement}
                        onChange={(e) => setSingleSupplement(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                      />
                      <span>
                        Single-room hotel supplement (+
                        {formatPrice(trip.singleSupplementUsd, currency, trip.singleSupplementKes)})
                      </span>
                    </label>
                  )}

                  <div>
                    <label
                      htmlFor="detail-name"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Lead Traveler Full Name
                    </label>
                    <input
                      id="detail-name"
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Amina Hassan"
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                    />
                    {bookingErrors.customerName && (
                      <p className="text-xs text-red-700 mt-1">{bookingErrors.customerName}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="detail-email"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Email Address
                      </label>
                      <input
                        id="detail-email"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="amina@example.co.ke"
                        className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                      {bookingErrors.customerEmail && (
                        <p className="text-xs text-red-700 mt-1">
                          {bookingErrors.customerEmail}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="detail-phone"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Phone / WhatsApp
                      </label>
                      <input
                        id="detail-phone"
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="+254 712 345 678"
                        className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                      {bookingErrors.customerPhone && (
                        <p className="text-xs text-red-700 mt-1">
                          {bookingErrors.customerPhone}
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="detail-notes"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Dietary or Nairobi Pickup Notes (Optional)
                    </label>
                    <input
                      id="detail-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Vegetarian half-board dinners"
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                    />
                  </div>
                </div>

                {/* 3. Payment Gateway Integration */}
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">
                      3. Secure Payment Checkout
                    </h2>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Lock className="w-3.5 h-3.5 text-teal-700" aria-hidden="true" />
                      <span>Tokenized Gateway</span>
                    </span>
                  </div>

                  {/* Deposit vs Full */}
                  <div
                    role="group"
                    aria-label="Payment amount option"
                    className="grid grid-cols-2 gap-2"
                  >
                    <button
                      type="button"
                      onClick={() => setPaymentOption('deposit')}
                      className={`p-2.5 text-left rounded-md border text-xs transition-colors cursor-pointer ${
                        paymentOption === 'deposit'
                          ? 'bg-teal-50/50 border-teal-700 text-slate-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="block">
                        {typeof activeDeparture.minDepositUsd === 'number'
                          ? 'Book with Deposit'
                          : 'Pay 30% Deposit'}
                      </span>
                      <span className="font-mono tabular-nums text-teal-800">
                        {formatPrice(summary.depositDueUsd, currency, exactDepositKes)}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentOption('full')}
                      className={`p-2.5 text-left rounded-md border text-xs transition-colors cursor-pointer ${
                        paymentOption === 'full'
                          ? 'bg-teal-50/50 border-teal-700 text-slate-900 font-semibold'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span className="block">Pay 100% Full</span>
                      <span className="font-mono tabular-nums text-teal-800">
                        {formatPrice(summary.totalUsd, currency, exactTotalKes)}
                      </span>
                    </button>
                  </div>

                  {/* Payment Method Selector */}
                  <div
                    role="group"
                    aria-label="Payment method"
                    className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-md"
                  >
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded transition-colors cursor-pointer ${
                        paymentMethod === 'card'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Card Checkout</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('mpesa')}
                      className={`inline-flex items-center justify-center gap-1.5 py-2 text-xs font-medium rounded transition-colors cursor-pointer ${
                        paymentMethod === 'mpesa'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>M-Pesa STK</span>
                    </button>
                  </div>

                  {paymentMethod === 'card' ? (
                    <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-md">
                      <div>
                        <label
                          htmlFor="card-holder"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Cardholder Name
                        </label>
                        <input
                          id="card-holder"
                          type="text"
                          autoComplete="cc-name"
                          value={cardholderName}
                          onChange={(e) => setCardholderName(e.target.value)}
                          placeholder="AMINA HASSAN"
                          className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                        />
                        {cardErrors.cardholderName && (
                          <p className="text-xs text-red-700 mt-1">
                            {cardErrors.cardholderName}
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label
                            htmlFor="card-number"
                            className="block text-xs font-semibold text-slate-700"
                          >
                            Card Number
                          </label>
                          <span className="text-xs font-mono text-slate-500">{cardBrand}</span>
                        </div>
                        <input
                          id="card-number"
                          type="text"
                          inputMode="numeric"
                          autoComplete="cc-number"
                          value={cardNumber}
                          onChange={(e) =>
                            setCardNumber(formatCardNumberDisplay(e.target.value))
                          }
                          placeholder="4242 4242 4242 4242"
                          className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                        />
                        {cardErrors.cardNumber && (
                          <p className="text-xs text-red-700 mt-1">{cardErrors.cardNumber}</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label
                            htmlFor="card-expiry"
                            className="block text-xs font-semibold text-slate-700 mb-1"
                          >
                            Expiry (MM/YY)
                          </label>
                          <input
                            id="card-expiry"
                            type="text"
                            inputMode="numeric"
                            autoComplete="cc-exp"
                            value={cardExpiry}
                            onChange={(e) =>
                              setCardExpiry(formatExpiryDisplay(e.target.value))
                            }
                            placeholder="12/28"
                            className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                          />
                          {cardErrors.expiry && (
                            <p className="text-xs text-red-700 mt-1">{cardErrors.expiry}</p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="card-cvc"
                            className="block text-xs font-semibold text-slate-700 mb-1"
                          >
                            CVC
                          </label>
                          <input
                            id="card-cvc"
                            type="password"
                            inputMode="numeric"
                            maxLength={4}
                            autoComplete="cc-csc"
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value)}
                            placeholder="123"
                            className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-md tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                          />
                          {cardErrors.cvc && (
                            <p className="text-xs text-red-700 mt-1">{cardErrors.cvc}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-md">
                      <div>
                        <label
                          htmlFor="mpesa-phone"
                          className="block text-xs font-semibold text-slate-700 mb-1"
                        >
                          Safaricom M-Pesa Number
                        </label>
                        <div className="flex gap-2">
                          <input
                            id="mpesa-phone"
                            type="tel"
                            value={mpesaPhone}
                            onChange={(e) => {
                              setMpesaPhone(e.target.value);
                              setMpesaSession(null);
                            }}
                            placeholder="0712 345 678"
                            className="flex-1 px-3 py-2 text-sm font-mono text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                          />
                          <button
                            type="button"
                            onClick={handleInitiateMpesa}
                            disabled={mpesaLoading}
                            className="px-3 py-2 text-xs font-semibold text-teal-900 bg-white border border-teal-300 hover:bg-teal-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            {mpesaLoading ? 'Sending...' : 'Send STK Prompt'}
                          </button>
                        </div>
                        {mpesaError && (
                          <p className="text-xs text-red-700 mt-1">{mpesaError}</p>
                        )}
                      </div>

                      <div className="p-3 bg-white border border-slate-200 rounded text-xs text-slate-700 space-y-0.5">
                        <p className="font-semibold text-slate-900">
                          Direct M-Pesa Paybill Reference
                        </p>
                        <p className="font-mono text-teal-800">
                          Paybill: {activeDeparture.paybillNumber ?? COMPANY_INFO.mpesaPaybill} ·
                          Account: {activeDeparture.paybillAccount ?? trip.code}
                        </p>
                      </div>

                      {mpesaSession && (
                        <div
                          role="status"
                          className="p-3 bg-teal-50 border border-teal-200 rounded text-xs text-teal-900 space-y-1"
                        >
                          <p className="font-semibold">
                            STK Push Dispatched ({mpesaSession.maskedPhone})
                          </p>
                          <p>{mpesaSession.message}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price Totals */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>
                        Adults ({travelers} × {formatDeparturePrice(activeDeparture, currency)})
                      </span>
                      <span className="font-mono tabular-nums text-slate-900">
                        {formatPrice(summary.baseTotalUsd, currency, exactBaseKes)}
                      </span>
                    </div>
                    {summary.kidsTotalUsd > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>
                          Kids ({effectiveKids} ×{' '}
                          {formatPrice(
                            activeDeparture.kidPriceUsd!,
                            currency,
                            activeDeparture.kidPriceKes,
                          )}
                          )
                        </span>
                        <span className="font-mono tabular-nums text-slate-900">
                          {formatPrice(summary.kidsTotalUsd, currency, exactKidsKes)}
                        </span>
                      </div>
                    )}
                    {summary.extraNightsTotalUsd > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>
                          Extra nights ({effectiveExtraNights} × {travelers + effectiveKids} guests)
                        </span>
                        <span className="font-mono tabular-nums text-slate-900">
                          {formatPrice(summary.extraNightsTotalUsd, currency, exactExtraNightsKes)}
                        </span>
                      </div>
                    )}
                    {summary.singleSupplementTotalUsd > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>Single-room supplement</span>
                        <span className="font-mono tabular-nums text-slate-900">
                          {formatPrice(
                            summary.singleSupplementTotalUsd,
                            currency,
                            exactSupplementKes,
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-900 font-semibold pt-1.5 border-t border-slate-200">
                      <span>Total Package Value</span>
                      <span className="font-mono tabular-nums">
                        {formatPrice(summary.totalUsd, currency, exactTotalKes)}
                      </span>
                    </div>
                    <div className="flex justify-between text-teal-800 font-semibold text-sm pt-1">
                      <span>
                        Due Now (
                        {paymentOption === 'full'
                          ? '100%'
                          : typeof activeDeparture.minDepositUsd === 'number'
                            ? 'Booking Deposit'
                            : '30% Deposit'}
                        )
                      </span>
                      <span className="font-mono tabular-nums">
                        {formatPrice(summary.amountDueNowUsd, currency, exactDueNowKes)}
                      </span>
                    </div>
                  </div>

                  {gatewayError && (
                    <div
                      role="alert"
                      className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-800"
                    >
                      {gatewayError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isProcessing || activeDeparture.seatsRemaining <= 0}
                    className="w-full px-5 py-3 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                    <span>
                      {isProcessing
                        ? 'Authorizing Payment...'
                        : `Pay ${formatPrice(summary.amountDueNowUsd, currency, exactDueNowKes)} & Confirm Booking`}
                    </span>
                  </button>

                  <a
                    href={buildWhatsAppLink(
                      `Hello Summer Getaway Adventures, I would like to book ${trip.title} (${activeDeparture.dateLabel}) for ${travelers} adult(s)${
                        effectiveKids > 0 ? ` and ${effectiveKids} kid(s)` : ''
                      }.`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full px-4 py-2.5 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    <span>Book Manually via WhatsApp (+254 724 794 548)</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>

                  <p className="text-xs text-slate-500 leading-relaxed">
                    {COMPANY_INFO.bookingPolicy} Support: {COMPANY_INFO.phones.join(' | ')}
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox for Traveler Review Photos */}
      {lightboxPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Traveler photo preview"
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
        >
          <div className="max-w-3xl w-full bg-white rounded-lg overflow-hidden shadow-xl">
            <img
              src={lightboxPhoto}
              alt="Enlarged traveler trip photograph"
              className="w-full max-h-[75vh] object-contain bg-slate-950"
            />
            <div className="p-3 flex justify-end">
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
