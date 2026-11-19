import 'dotenv/config';
import crypto from 'node:crypto';
import path from 'node:path';
import express from 'express';
import {
  cancelBookingByReference,
  createAdminTrip,
  createBookingWithPayment,
  createInquiryRecord,
  createReviewRecord,
  deleteDepartureDate,
  deleteDestination,
  deleteHotel,
  deleteMealPackage,
  deleteVehicle,
  getAdminReportSummary,
  getPublicCatalog,
  getUserBookings,
  listAllBookings,
  listAllPayments,
  listDestinations,
  listInquiries,
  listResources,
  listReviews,
  listTripsWithDepartures,
  lookupBookings,
  recordBalancePayment,
  updateAdminTrip,
  updateBookingStatus,
  updateInquiryStatus,
  upsertDepartureDate,
  upsertDestination,
  upsertHotel,
  upsertMealPackage,
  upsertVehicle,
} from './src/db/repository.ts';
import { optionalAuth, requireAdmin, requireAuth } from './src/middleware/auth.ts';
import type {
  BookingChannel,
  BookingStatus,
  PaymentMethod,
  PaymentOption,
  Region,
} from './src/types/travel.ts';
import {
  detectCardBrand,
  digitsOnly,
  maskMpesaPhone,
  normalizeKenyanMpesaPhone,
  validateCardInput,
} from './src/utils/payment.ts';
import {
  calculateBookingSummary,
  generateBookingReference,
  USD_TO_KES_RATE,
  validateBookingInput,
  validateInquiryInput,
  validateReviewInput,
} from './src/utils/trips.ts';

interface CardTokenRecord {
  token: string;
  brand: string;
  last4: string;
  createdAt: number;
}

interface MpesaSessionRecord {
  checkoutRequestId: string;
  maskedPhone: string;
  amountUsd: number;
  createdAt: number;
}

const PORT = Number(process.env.PORT || 3000);
const cardTokens = new Map<string, CardTokenRecord>();
const mpesaSessions = new Map<string, MpesaSessionRecord>();

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '8mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // ==========================
  // AUTHENTICATION SYNC
  // ==========================
  app.post('/api/auth/sync', requireAuth, (req, res) => {
    res.json({ user: req.authUser });
  });

  // ==========================
  // PUBLIC CUSTOMER CATALOG
  // ==========================
  app.get('/api/catalog', async (_req, res) => {
    try {
      const catalog = await getPublicCatalog();
      res.json(catalog);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Unable to load travel catalog.' });
    }
  });

  app.get('/api/trips', async (_req, res) => {
    try {
      const trips = await listTripsWithDepartures(false);
      res.json({ trips });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Unable to load scheduled trips.' });
    }
  });

  // ==========================
  // CUSTOMER PAYMENT & BOOKING
  // ==========================
  app.post('/api/payments/tokenize-card', (req, res) => {
    const body = req.body ?? {};
    const cardInput = {
      cardholderName: String(body.cardholderName ?? ''),
      cardNumber: String(body.cardNumber ?? ''),
      expiry: String(body.expiry ?? ''),
      cvc: String(body.cvc ?? ''),
    };

    const errors = validateCardInput(cardInput);
    if (Object.keys(errors).length > 0) {
      res.status(400).json({ error: 'Card validation failed', fieldErrors: errors });
      return;
    }

    const digits = digitsOnly(cardInput.cardNumber);
    const brand = detectCardBrand(digits);
    const last4 = digits.slice(-4);
    const token = `tok_sga_${crypto.randomBytes(10).toString('hex')}`;

    cardTokens.set(token, {
      token,
      brand,
      last4,
      createdAt: Date.now(),
    });

    res.status(201).json({ token, brand, last4 });
  });

  app.post('/api/payments/mpesa/initiate', (req, res) => {
    const body = req.body ?? {};
    const normalized = normalizeKenyanMpesaPhone(String(body.phone ?? ''));
    const amountUsd = Number(body.amountUsd ?? 0);

    if (!normalized) {
      res.status(400).json({
        error: 'Enter a valid Kenyan Safaricom number (e.g. +254 712 345 678 or 0712 345 678).',
      });
      return;
    }

    const checkoutRequestId = `ws_CO_${crypto.randomBytes(8).toString('hex')}`;
    const maskedPhone = maskMpesaPhone(normalized);

    mpesaSessions.set(checkoutRequestId, {
      checkoutRequestId,
      maskedPhone,
      amountUsd,
      createdAt: Date.now(),
    });

    res.status(201).json({
      checkoutRequestId,
      maskedPhone,
      status: 'pending_pin',
      message: `STK Push sent to ${maskedPhone}. Confirm PIN to authorize payment.`,
    });
  });

  app.post('/api/bookings/checkout', optionalAuth, async (req, res) => {
    try {
      const body = req.body ?? {};
      const tripId = String(body.tripId ?? '');
      const departureId = String(body.departureId ?? '');
      const travelers = Number(body.travelers ?? 1);
      const safeKids = Number.isFinite(Number(body.kids))
        ? Math.max(0, Math.min(6, Math.floor(Number(body.kids))))
        : 0;
      const safeExtraNights = Number.isFinite(Number(body.extraNights))
        ? Math.max(0, Math.min(5, Math.floor(Number(body.extraNights))))
        : 0;
      const singleSupplement = Boolean(body.singleSupplement);
      const paymentOption: PaymentOption = body.paymentOption === 'full' ? 'full' : 'deposit';
      const paymentMethod: PaymentMethod = body.paymentMethod === 'mpesa' ? 'mpesa' : 'card';

      const liveTrips = await listTripsWithDepartures(false);
      const trip = liveTrips.find((t) => t.id === tripId);
      if (!trip) {
        res.status(404).json({ error: 'Selected trip was not found.' });
        return;
      }

      const departure = trip.departures.find((d) => d.id === departureId);
      if (!departure) {
        res.status(404).json({ error: 'Selected departure date was not found.' });
        return;
      }

      const bookingErrors = validateBookingInput({
        customerName: String(body.customerName ?? ''),
        customerEmail: String(body.customerEmail ?? ''),
        customerPhone: String(body.customerPhone ?? ''),
        travelers,
        seatsRemaining: departure.seatsRemaining,
        departureId: departure.id,
      });

      if (!bookingErrors.travelers && travelers + safeKids > departure.seatsRemaining) {
        bookingErrors.travelers = `Only ${departure.seatsRemaining} total seats remain for adults and kids combined.`;
      }

      if (Object.keys(bookingErrors).length > 0) {
        res.status(400).json({ error: 'Traveler details failed validation.', fieldErrors: bookingErrors });
        return;
      }

      let maskedAccount = '';
      if (paymentMethod === 'card') {
        const cardToken = String(body.cardToken ?? '');
        const tokenRecord = cardTokens.get(cardToken);
        if (!tokenRecord) {
          res.status(402).json({
            error: 'Card payment token missing or expired. Please enter valid card details.',
          });
          return;
        }
        maskedAccount = `${tokenRecord.brand} •••• ${tokenRecord.last4}`;
        cardTokens.delete(cardToken);
      } else {
        const checkoutRequestId = String(body.mpesaCheckoutRequestId ?? '');
        const session = mpesaSessions.get(checkoutRequestId);
        if (!session) {
          res.status(402).json({
            error: 'M-Pesa STK Push session not initiated. Please send the prompt first.',
          });
          return;
        }
        maskedAccount = `M-Pesa ${session.maskedPhone}`;
        mpesaSessions.delete(checkoutRequestId);
      }

      const effectiveKids = typeof departure.kidPriceUsd === 'number' ? safeKids : 0;
      const effectiveExtraNights =
        typeof departure.extraNightUsd === 'number' ? safeExtraNights : 0;

      const summary = calculateBookingSummary(
        trip,
        departure.priceUsd,
        travelers,
        singleSupplement,
        paymentOption,
        {
          kids: effectiveKids,
          kidPriceUsd: departure.kidPriceUsd,
          extraNights: effectiveExtraNights,
          extraNightPriceUsd: departure.extraNightUsd,
          minDepositUsd: departure.minDepositUsd,
        },
      );

      const isOvernight = trip.durationDays > 1;
      const exactTotalKes =
        typeof departure.priceKes === 'number'
          ? departure.priceKes * travelers +
            (effectiveKids > 0 && typeof departure.kidPriceKes === 'number'
              ? departure.kidPriceKes * effectiveKids
              : 0) +
            (effectiveExtraNights > 0 && typeof departure.extraNightKes === 'number'
              ? departure.extraNightKes * (travelers + effectiveKids) * effectiveExtraNights
              : 0) +
            (isOvernight && singleSupplement
              ? (trip.singleSupplementKes ?? Math.round(trip.singleSupplementUsd * USD_TO_KES_RATE))
              : 0)
          : Math.round(summary.totalUsd * USD_TO_KES_RATE);

      const exactDepositKes =
        typeof departure.minDepositKes === 'number'
          ? Math.min(exactTotalKes, departure.minDepositKes)
          : Math.round(summary.depositDueUsd * USD_TO_KES_RATE);

      const amountPaidKes = paymentOption === 'full' ? exactTotalKes : exactDepositKes;
      const balanceDueKes = Math.max(0, exactTotalKes - amountPaidKes);

      const reference = generateBookingReference(
        String(crypto.randomInt(1000, 9999)),
      );
      const transactionId = `TXN-SGA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const result = await createBookingWithPayment({
        reference,
        userUid: req.authUser?.uid ?? null,
        trip,
        departureId: departure.id,
        dateLabel: departure.dateLabel,
        travelers,
        kids: effectiveKids,
        extraNights: effectiveExtraNights,
        singleSupplement,
        bookingChannel: 'online',
        status: 'Confirmed',
        totalUsd: summary.totalUsd,
        totalKes: exactTotalKes,
        depositDueUsd: summary.depositDueUsd,
        depositDueKes: exactDepositKes,
        amountPaidUsd: summary.amountDueNowUsd,
        amountPaidKes,
        balanceDueUsd: summary.balanceDueUsd,
        balanceDueKes,
        customerName: String(body.customerName).trim(),
        customerEmail: String(body.customerEmail).trim(),
        customerPhone: String(body.customerPhone).trim(),
        notes: String(body.notes ?? '').trim(),
        payment: {
          transactionId,
          method: paymentMethod,
          paymentOption,
          maskedAccount,
        },
      });

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('INSUFFICIENT_SEATS:')) {
        const left = err.message.split(':')[1] ?? '0';
        res.status(409).json({ error: `Only ${left} seats remain on this departure.` });
        return;
      }
      console.error(err);
      res.status(500).json({ error: 'Unable to complete booking checkout.' });
    }
  });

  app.get('/api/bookings/lookup', async (req, res) => {
    try {
      const reference = typeof req.query.reference === 'string' ? req.query.reference : undefined;
      const email = typeof req.query.email === 'string' ? req.query.email : undefined;
      if (!reference?.trim() && !email?.trim()) {
        res.status(400).json({ error: 'Provide a booking reference or email address.' });
        return;
      }
      const list = await lookupBookings({ reference, email });
      res.json({ bookings: list });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to look up bookings.' });
    }
  });

  app.get('/api/my-bookings', requireAuth, async (req, res) => {
    try {
      const list = await getUserBookings(req.authUser!.uid, req.authUser!.email);
      res.json({ bookings: list });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load your bookings.' });
    }
  });

  app.post('/api/bookings/:reference/cancel', async (req, res) => {
    try {
      const result = await cancelBookingByReference(req.params.reference);
      if (!result) {
        res.status(404).json({ error: 'Booking not found.' });
        return;
      }
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Unable to cancel booking.' });
    }
  });

  app.delete('/api/bookings/:reference', async (req, res) => {
    try {
      const result = await cancelBookingByReference(req.params.reference);
      if (!result) {
        res.status(404).json({ error: 'Booking not found.' });
        return;
      }
      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Unable to cancel booking.' });
    }
  });

  // ==========================
  // REVIEWS & SUPPORT INQUIRIES
  // ==========================
  app.get('/api/reviews', async (req, res) => {
    try {
      const tripId = typeof req.query.tripId === 'string' ? req.query.tripId : undefined;
      const reviews = await listReviews(tripId);
      res.json({ reviews });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Unable to load reviews.' });
    }
  });

  app.post('/api/reviews', async (req, res) => {
    try {
      const body = req.body ?? {};
      const tripId = String(body.tripId ?? '');
      const liveTrips = await listTripsWithDepartures(true);
      const trip = liveTrips.find((t) => t.id === tripId);

      const photos: string[] = Array.isArray(body.photos)
        ? body.photos
            .filter((p: unknown): p is string => typeof p === 'string' && p.length > 0)
            .slice(0, 3)
        : [];

      const validation = validateReviewInput({
        tripId,
        reviewerName: String(body.reviewerName ?? ''),
        completedMonth: String(body.completedMonth ?? ''),
        rating: Number(body.rating ?? 0),
        title: String(body.title ?? ''),
        comment: String(body.comment ?? ''),
        photos,
      });

      if (!trip) {
        validation.tripId = 'Selected trip was not found.';
      }

      if (Object.keys(validation).length > 0) {
        res.status(400).json({ error: 'Review validation failed.', fieldErrors: validation });
        return;
      }

      const saved = await createReviewRecord({
        tripId: trip!.id,
        tripTitle: trip!.title,
        reviewerName: String(body.reviewerName).trim(),
        reviewerLocation: String(body.reviewerLocation ?? 'Kenya').trim() || 'Kenya',
        completedMonth: String(body.completedMonth).trim(),
        rating: Math.min(5, Math.max(1, Math.round(Number(body.rating)))),
        title: String(body.title).trim(),
        comment: String(body.comment).trim(),
        photos,
        bookingReference: String(body.bookingReference ?? ''),
        completedTripConfirmed: Boolean(body.completedTripConfirmed),
      });

      res.status(201).json(saved);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Unable to submit review.' });
    }
  });

  app.post('/api/inquiries', async (req, res) => {
    try {
      const body = req.body ?? {};
      const input = {
        name: String(body.name ?? ''),
        email: String(body.email ?? ''),
        phone: String(body.phone ?? ''),
        region: (body.region ?? 'kenya') as Region,
        preferredMonth: String(body.preferredMonth ?? '2026-12'),
        groupSize: Number(body.groupSize ?? 2),
        vehiclePreference: String(body.vehiclePreference ?? ''),
        destinationInterest: String(body.destinationInterest ?? ''),
        notes: String(body.notes ?? ''),
        channel: (body.channel === 'whatsapp' ? 'whatsapp' : 'web') as 'web' | 'whatsapp',
      };

      const validation = validateInquiryInput(input);
      if (Object.keys(validation).length > 0) {
        res.status(400).json({ error: 'Inquiry validation failed.', fieldErrors: validation });
        return;
      }

      const inquiry = await createInquiryRecord(input);
      res.status(201).json({ inquiry });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Unable to submit inquiry.' });
    }
  });

  // ======================================
  // COMPANY ADMINISTRATION DASHBOARD APIS
  // ======================================

  // 1. Destinations & Countries
  app.get('/api/admin/destinations', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const destinations = await listDestinations();
      res.json({ destinations });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load destinations.' });
    }
  });

  app.post('/api/admin/destinations', requireAuth, requireAdmin, async (req, res) => {
    try {
      const b = req.body ?? {};
      if (!String(b.name ?? '').trim() || !String(b.country ?? '').trim()) {
        res.status(400).json({ error: 'Destination name and country are required.' });
        return;
      }
      const saved = await upsertDestination({
        name: String(b.name),
        country: String(b.country),
        region: String(b.region || 'kenya'),
        category: String(b.category || 'Kenya Coast'),
        description: String(b.description || ''),
        imageUrl: b.imageUrl ? String(b.imageUrl) : null,
        isFeatured: Boolean(b.isFeatured),
        linkedTripId: b.linkedTripId ? String(b.linkedTripId) : null,
      });
      res.status(201).json({ destination: saved });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save destination.' });
    }
  });

  app.patch('/api/admin/destinations/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const b = req.body ?? {};
      const saved = await upsertDestination({
        id: req.params.id,
        name: String(b.name ?? ''),
        country: String(b.country ?? ''),
        region: String(b.region ?? 'kenya'),
        category: String(b.category ?? 'Kenya Coast'),
        description: String(b.description ?? ''),
        imageUrl: b.imageUrl ? String(b.imageUrl) : null,
        isFeatured: Boolean(b.isFeatured),
        linkedTripId: b.linkedTripId ? String(b.linkedTripId) : null,
      });
      res.json({ destination: saved });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update destination.' });
    }
  });

  app.delete('/api/admin/destinations/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      await deleteDestination(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete destination.' });
    }
  });

  // 2 & 3. Trips, Scheduled Dates & Capacity Slots
  app.get('/api/admin/trips', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const trips = await listTripsWithDepartures(true);
      res.json({ trips });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load admin trips.' });
    }
  });

  app.post('/api/admin/trips', requireAuth, requireAdmin, async (req, res) => {
    try {
      const b = req.body ?? {};
      if (!String(b.title ?? '').trim() || !String(b.country ?? '').trim() || !String(b.destination ?? '').trim()) {
        res.status(400).json({ error: 'Title, country, and destination are required.' });
        return;
      }
      const durationDays = Math.max(1, Number(b.durationDays ?? 3));
      const nights = durationDays > 1 ? Math.max(0, Number(b.nights ?? durationDays - 1)) : 0;

      const trip = await createAdminTrip({
        title: String(b.title),
        code: String(b.code || `SGA-${crypto.randomBytes(2).toString('hex').toUpperCase()}`),
        region: String(b.region || 'kenya'),
        country: String(b.country),
        destination: String(b.destination),
        category: String(b.category || (durationDays > 1 ? 'Overnight Package' : 'Day Excursion')),
        departureHub: String(b.departureHub || "Cianda House, Koinange St (Opp. CJ's), Nairobi"),
        durationDays,
        nights,
        imageUrl: String(b.imageUrl || '/src/assets/images/hero_kenya_savannah_1795079736061.jpg'),
        summary: String(b.summary || `Curated ${durationDays}-day adventure from Nairobi to ${b.destination}.`),
        transportMode: String(b.transportMode || '4x4 Safari Land Cruiser (KCY 395C Fleet)'),
        transportDetail: String(b.transportDetail || 'Dedicated transport coordinated from Nairobi.'),
        hotelName: durationDays > 1 ? (b.hotelName ? String(b.hotelName) : 'Curated Partner Resort') : null,
        hotelCategory: durationDays > 1 ? (b.hotelCategory ? String(b.hotelCategory) : '4-Star Accommodation') : null,
        accommodationDetail: String(b.accommodationDetail || (durationDays > 1 ? `${nights} nights half board accommodation.` : 'Same-day excursion from Nairobi.')),
        mealPlan: durationDays > 1 ? 'Half Board (Breakfast & Dinner)' : 'Day Trip (Refreshments)',
        singleSupplementUsd: Number(b.singleSupplementUsd ?? 0),
        guidedHighlight: String(b.guidedHighlight || 'Certified guided tours included throughout itinerary'),
        inclusions: Array.isArray(b.inclusions) ? b.inclusions.map(String) : ['Return transport', 'Half Board meals', 'Guided tours'],
        exclusions: Array.isArray(b.exclusions) ? b.exclusions.map(String) : ['Personal expenses'],
        initialDeparture: b.initialDeparture
          ? {
              startDate: String(b.initialDeparture.startDate),
              endDate: String(b.initialDeparture.endDate),
              dateLabel: String(b.initialDeparture.dateLabel),
              seatsTotal: Math.max(1, Number(b.initialDeparture.seatsTotal ?? 14)),
              priceUsd: Math.max(1, Number(b.initialDeparture.priceUsd ?? 250)),
              priceKes: b.initialDeparture.priceKes ? Number(b.initialDeparture.priceKes) : null,
              minDepositKes: b.initialDeparture.minDepositKes ? Number(b.initialDeparture.minDepositKes) : null,
              isFeaturedEvent: Boolean(b.initialDeparture.isFeaturedEvent),
            }
          : undefined,
      });

      res.status(201).json({ trip });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create trip.' });
    }
  });

  app.patch('/api/admin/trips/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const b = req.body ?? {};
      const updated = await updateAdminTrip(req.params.id, {
        ...(typeof b.title === 'string' ? { title: b.title } : {}),
        ...(typeof b.destination === 'string' ? { destination: b.destination } : {}),
        ...(typeof b.country === 'string' ? { country: b.country } : {}),
        ...(typeof b.region === 'string' ? { region: b.region } : {}),
        ...(typeof b.transportMode === 'string' ? { transportMode: b.transportMode } : {}),
        ...(b.hotelName !== undefined ? { hotelName: b.hotelName } : {}),
        ...(typeof b.mealPlan === 'string' ? { mealPlan: b.mealPlan } : {}),
        ...(typeof b.active === 'boolean' ? { active: b.active } : {}),
        ...(typeof b.isFeatured === 'boolean' ? { isFeatured: b.isFeatured } : {}),
      });
      if (!updated) {
        res.status(404).json({ error: 'Trip not found.' });
        return;
      }
      res.json({ trip: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update trip.' });
    }
  });

  app.post('/api/admin/trips/:tripId/departures', requireAuth, requireAdmin, async (req, res) => {
    try {
      const b = req.body ?? {};
      if (!b.startDate || !b.endDate || !b.dateLabel) {
        res.status(400).json({ error: 'Start date, return date, and label are required.' });
        return;
      }
      const dep = await upsertDepartureDate({
        tripId: req.params.tripId,
        startDate: String(b.startDate),
        endDate: String(b.endDate),
        dateLabel: String(b.dateLabel),
        seatsTotal: Math.max(1, Number(b.seatsTotal ?? 14)),
        seatsRemaining:
          b.seatsRemaining !== undefined ? Number(b.seatsRemaining) : undefined,
        priceUsd: Math.max(1, Number(b.priceUsd ?? 250)),
        priceKes: b.priceKes ? Number(b.priceKes) : null,
        minDepositKes: b.minDepositKes ? Number(b.minDepositKes) : null,
        isFeaturedEvent: Boolean(b.isFeaturedEvent),
      });
      res.status(201).json({ departure: dep });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to add departure date.' });
    }
  });

  app.patch('/api/admin/departures/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const b = req.body ?? {};
      const dep = await upsertDepartureDate({
        id: req.params.id,
        tripId: String(b.tripId),
        startDate: String(b.startDate),
        endDate: String(b.endDate),
        dateLabel: String(b.dateLabel),
        seatsTotal: Math.max(1, Number(b.seatsTotal ?? 14)),
        seatsRemaining: Math.max(0, Number(b.seatsRemaining ?? 0)),
        priceUsd: Math.max(1, Number(b.priceUsd ?? 250)),
        priceKes: b.priceKes ? Number(b.priceKes) : null,
        minDepositKes: b.minDepositKes ? Number(b.minDepositKes) : null,
        isFeaturedEvent: Boolean(b.isFeaturedEvent),
      });
      res.json({ departure: dep });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update departure capacity or dates.' });
    }
  });

  app.delete('/api/admin/departures/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      await deleteDepartureDate(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(409).json({
        error: err instanceof Error ? err.message : 'Failed to delete departure.',
      });
    }
  });

  // 4. Bookings & Cancellations (including manual WhatsApp/phone creation)
  app.get('/api/admin/bookings', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const bookings = await listAllBookings();
      res.json({ bookings });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load bookings.' });
    }
  });

  app.post('/api/admin/bookings/manual', requireAuth, requireAdmin, async (req, res) => {
    try {
      const body = req.body ?? {};
      const liveTrips = await listTripsWithDepartures(true);
      const trip = liveTrips.find((t) => t.id === String(body.tripId ?? ''));
      if (!trip) {
        res.status(404).json({ error: 'Selected trip was not found.' });
        return;
      }
      const departure = trip.departures.find((d) => d.id === String(body.departureId ?? ''));
      if (!departure) {
        res.status(404).json({ error: 'Selected departure date was not found.' });
        return;
      }

      const travelers = Math.max(1, Number(body.travelers ?? 1));
      const kids = Math.max(0, Number(body.kids ?? 0));
      const channel = (body.bookingChannel ?? 'whatsapp') as BookingChannel;
      const singleSupplement = Boolean(body.singleSupplement);
      const depositPaidUsd = Math.max(0, Number(body.amountPaidUsd ?? 0));
      const summary = calculateBookingSummary(
        trip,
        departure.priceUsd,
        travelers,
        singleSupplement,
        'deposit',
        {
          kids: typeof departure.kidPriceUsd === 'number' ? kids : 0,
          kidPriceUsd: departure.kidPriceUsd,
          minDepositUsd: departure.minDepositUsd,
        },
      );

      const amountPaidUsd = Math.min(summary.totalUsd, depositPaidUsd);
      const totalKes =
        typeof departure.priceKes === 'number'
          ? departure.priceKes * travelers +
            (typeof departure.kidPriceKes === 'number' ? departure.kidPriceKes * kids : 0)
          : Math.round(summary.totalUsd * USD_TO_KES_RATE);
      const depositDueKes =
        typeof departure.minDepositKes === 'number'
          ? Math.min(totalKes, departure.minDepositKes)
          : Math.round(summary.depositDueUsd * USD_TO_KES_RATE);
      const amountPaidKes =
        body.amountPaidKes !== undefined
          ? Math.min(totalKes, Math.max(0, Number(body.amountPaidKes)))
          : Math.round(amountPaidUsd * USD_TO_KES_RATE);

      const effectivePaidUsd =
        amountPaidUsd > 0
          ? amountPaidUsd
          : amountPaidKes > 0
            ? Math.round(amountPaidKes / USD_TO_KES_RATE)
            : 0;
      const balanceDueUsd = Math.max(0, summary.totalUsd - effectivePaidUsd);
      const balanceDueKes = Math.max(0, totalKes - amountPaidKes);
      const status: BookingStatus = effectivePaidUsd > 0 ? 'Confirmed' : 'Pending Deposit';

      const reference = generateBookingReference(String(crypto.randomInt(1000, 9999)));
      const txId = `TXN-MAN-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      const result = await createBookingWithPayment({
        reference,
        userUid: null,
        trip,
        departureId: departure.id,
        dateLabel: departure.dateLabel,
        travelers,
        kids,
        extraNights: 0,
        singleSupplement,
        bookingChannel: channel,
        status,
        totalUsd: summary.totalUsd,
        totalKes,
        depositDueUsd: summary.depositDueUsd,
        depositDueKes,
        amountPaidUsd: effectivePaidUsd,
        amountPaidKes,
        balanceDueUsd,
        balanceDueKes,
        customerName: String(body.customerName ?? '').trim() || 'Manual Booking Guest',
        customerEmail: String(body.customerEmail ?? '').trim() || 'guest@summergetway.co.ke',
        customerPhone: String(body.customerPhone ?? '').trim() || '+254 724 794 548',
        notes: String(body.notes ?? '').trim(),
        payment:
          effectivePaidUsd > 0
            ? {
                transactionId: txId,
                method: (body.paymentMethod as PaymentMethod) || 'paybill_manual',
                paymentOption: balanceDueUsd === 0 ? 'full' : 'deposit',
                maskedAccount: String(body.maskedAccount || `Paybill ${departure.paybillNumber ?? '709 8495'}`),
              }
            : undefined,
      });

      res.status(201).json(result);
    } catch (err) {
      if (err instanceof Error && err.message.startsWith('INSUFFICIENT_SEATS:')) {
        const left = err.message.split(':')[1] ?? '0';
        res.status(409).json({ error: `Only ${left} seats remain on this departure.` });
        return;
      }
      console.error(err);
      res.status(500).json({ error: 'Failed to create manual booking.' });
    }
  });

  app.patch('/api/admin/bookings/:reference', requireAuth, requireAdmin, async (req, res) => {
    try {
      const nextStatus = String(req.body?.status ?? '') as BookingStatus;
      if (!['Confirmed', 'Pending Deposit', 'Cancelled', 'Completed'].includes(nextStatus)) {
        res.status(400).json({ error: 'Invalid booking status.' });
        return;
      }
      const booking = await updateBookingStatus(req.params.reference, nextStatus);
      if (!booking) {
        res.status(404).json({ error: 'Booking not found.' });
        return;
      }
      res.json({ booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update booking.' });
    }
  });

  // 5. Payments & Outstanding Balance Settlements
  app.get('/api/admin/payments', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const payments = await listAllPayments();
      res.json({ payments });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load payments.' });
    }
  });

  app.post('/api/admin/bookings/:reference/payments', requireAuth, requireAdmin, async (req, res) => {
    try {
      const b = req.body ?? {};
      const amountUsd = Math.max(0, Number(b.amountUsd ?? 0));
      const amountKes =
        b.amountKes !== undefined
          ? Math.max(0, Number(b.amountKes))
          : Math.round(amountUsd * USD_TO_KES_RATE);
      const effectiveUsd =
        amountUsd > 0 ? amountUsd : Math.round(amountKes / USD_TO_KES_RATE);

      if (effectiveUsd <= 0 && amountKes <= 0) {
        res.status(400).json({ error: 'Payment amount must be greater than zero.' });
        return;
      }

      const booking = await recordBalancePayment(req.params.reference, {
        amountUsd: effectiveUsd,
        amountKes,
        method: (b.method as PaymentMethod) || 'paybill_manual',
        maskedAccount: String(b.maskedAccount || 'M-Pesa Paybill 709 8495'),
        transactionRef: b.transactionRef ? String(b.transactionRef) : undefined,
      });

      if (!booking) {
        res.status(404).json({ error: 'Booking not found.' });
        return;
      }
      res.status(201).json({ booking });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to record balance settlement.' });
    }
  });

  // 6. Hotels, Transport & Meal Packages
  app.get('/api/admin/resources', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const resources = await listResources();
      res.json(resources);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load resources.' });
    }
  });

  app.post('/api/admin/resources/hotels', requireAuth, requireAdmin, async (req, res) => {
    try {
      const b = req.body ?? {};
      const hotel = await upsertHotel({
        name: String(b.name ?? ''),
        location: String(b.location ?? ''),
        country: String(b.country ?? 'Kenya'),
        category: String(b.category ?? '4-Star Hotel'),
        roomDetails: String(b.roomDetails ?? ''),
        active: b.active !== false,
      });
      res.status(201).json({ hotel });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create hotel.' });
    }
  });

  app.delete('/api/admin/resources/hotels/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      await deleteHotel(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete hotel.' });
    }
  });

  app.post('/api/admin/resources/vehicles', requireAuth, requireAdmin, async (req, res) => {
    try {
      const b = req.body ?? {};
      const vehicle = await upsertVehicle({
        name: String(b.name ?? ''),
        registrationPlate: b.registrationPlate ? String(b.registrationPlate) : null,
        capacityLabel: String(b.capacityLabel ?? '14 Passengers'),
        capacitySeats: Math.max(1, Number(b.capacitySeats ?? 14)),
        bestFor: String(b.bestFor ?? ''),
        imageUrl: b.imageUrl ? String(b.imageUrl) : null,
        active: b.active !== false,
      });
      res.status(201).json({ vehicle });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create vehicle.' });
    }
  });

  app.delete('/api/admin/resources/vehicles/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      await deleteVehicle(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete vehicle.' });
    }
  });

  app.post('/api/admin/resources/meals', requireAuth, requireAdmin, async (req, res) => {
    try {
      const b = req.body ?? {};
      const mealPackage = await upsertMealPackage({
        name: String(b.name ?? ''),
        basis: String(b.basis ?? 'Half Board (Breakfast & Dinner)'),
        description: String(b.description ?? ''),
        active: b.active !== false,
      });
      res.status(201).json({ mealPackage });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create meal package.' });
    }
  });

  app.delete('/api/admin/resources/meals/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      await deleteMealPackage(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to delete meal package.' });
    }
  });

  // 7. Inquiries & Financial/Booking Reports
  app.get('/api/admin/inquiries', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const inquiries = await listInquiries();
      res.json({ inquiries });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to load inquiries.' });
    }
  });

  app.patch('/api/admin/inquiries/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
      const updated = await updateInquiryStatus(Number(req.params.id), req.body?.status);
      if (!updated) {
        res.status(404).json({ error: 'Inquiry not found.' });
        return;
      }
      res.json({ inquiry: updated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to update inquiry.' });
    }
  });

  app.get('/api/admin/reports', requireAuth, requireAdmin, async (_req, res) => {
    try {
      const report = await getAdminReportSummary();
      res.json({ report });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to generate admin report.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Summer Getaway Adventures server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
