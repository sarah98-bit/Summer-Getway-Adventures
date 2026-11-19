import crypto from 'node:crypto';
import { count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import type {
  AdminReportSummary,
  BookingChannel,
  BookingRecord,
  BookingStatus,
  CustomInquiryInput,
  DayPlan,
  DepartureDate,
  DestinationRecord,
  FleetVehicle,
  HotelRecord,
  InquiryRecord,
  MealPackageRecord,
  PaymentMethod,
  PaymentOption,
  PaymentTransaction,
  Trip,
  TripReview,
} from '../types/travel.ts';
import { computeAdminReportMetrics, USD_TO_KES_RATE } from '../utils/trips.ts';
import {
  bookings,
  db,
  departures,
  destinations,
  hotels,
  inquiries,
  mealPackages,
  payments,
  reviews,
  trips,
  users,
  vehicles,
} from './index.ts';
import { ensureSeeded } from './seed.ts';

function computeDepartureStatus(
  seatsRemaining: number,
): 'Open' | 'Few Seats' | 'Sold Out' {
  if (seatsRemaining <= 0) return 'Sold Out';
  if (seatsRemaining <= 5) return 'Few Seats';
  return 'Open';
}

function mapDepartureRow(row: typeof departures.$inferSelect): DepartureDate {
  const status =
    row.status === 'Sold Out' || row.seatsRemaining <= 0
      ? 'Sold Out'
      : row.seatsRemaining <= 5
        ? 'Few Seats'
        : 'Open';

  return {
    id: row.id,
    tripId: row.tripId,
    startDate: row.startDate,
    endDate: row.endDate,
    monthKey: row.monthKey,
    dateLabel: row.dateLabel,
    seatsTotal: row.seatsTotal,
    seatsRemaining: row.seatsRemaining,
    priceUsd: row.priceUsd,
    priceKes: row.priceKes,
    kidPriceUsd: row.kidPriceUsd,
    kidPriceKes: row.kidPriceKes,
    extraNightUsd: row.extraNightUsd,
    extraNightKes: row.extraNightKes,
    minDepositUsd: row.minDepositUsd,
    minDepositKes: row.minDepositKes,
    paybillNumber: row.paybillNumber,
    paybillAccount: row.paybillAccount,
    isFeaturedEvent: row.isFeaturedEvent,
    status,
  };
}

function mapTripRow(
  row: typeof trips.$inferSelect,
  tripDepartures: Array<typeof departures.$inferSelect>,
): Trip {
  const sortedDeps = [...tripDepartures]
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map(mapDepartureRow);

  return {
    id: row.id,
    code: row.code,
    title: row.title,
    region: row.region as Trip['region'],
    country: row.country,
    destination: row.destination,
    category: row.category,
    departureHub: row.departureHub,
    durationDays: row.durationDays,
    nights: row.nights,
    imageUrl: row.imageUrl,
    imageAlt: row.imageAlt,
    summary: row.summary,
    transportMode: row.transportMode,
    transportDetail: row.transportDetail,
    hotelName: row.hotelName,
    hotelCategory: row.hotelCategory,
    accommodationDetail: row.accommodationDetail,
    mealPlan: row.mealPlan,
    singleSupplementUsd: row.singleSupplementUsd,
    singleSupplementKes: row.singleSupplementKes,
    guidedHighlight: row.guidedHighlight,
    inclusions: Array.isArray(row.inclusions) ? row.inclusions : [],
    exclusions: Array.isArray(row.exclusions) ? row.exclusions : [],
    itinerary: Array.isArray(row.itinerary) ? (row.itinerary as DayPlan[]) : [],
    departures: sortedDeps,
    isFeatured: row.isFeatured,
    active: row.active,
  };
}

function mapBookingRow(
  row: typeof bookings.$inferSelect,
  paymentRows: Array<typeof payments.$inferSelect>,
): BookingRecord {
  const mappedPayments: PaymentTransaction[] = [...paymentRows]
    .sort((a, b) => b.paidAt.getTime() - a.paidAt.getTime())
    .map((p) => ({
      id: p.id,
      bookingId: p.bookingId,
      bookingReference: row.reference,
      customerName: row.customerName,
      tripTitle: row.tripTitle,
      transactionId: p.transactionId,
      method: p.method as PaymentMethod,
      paymentOption: p.paymentOption as PaymentOption,
      amountUsd: p.amountUsd,
      amountKes: p.amountKes,
      maskedAccount: p.maskedAccount,
      status: p.status,
      paidAt: p.paidAt.toISOString(),
    }));

  const latestPayment = mappedPayments[0];

  return {
    id: row.id,
    reference: row.reference,
    userUid: row.userUid,
    createdAt: row.createdAt.toISOString(),
    tripId: row.tripId,
    tripCode: row.tripCode,
    tripTitle: row.tripTitle,
    destination: row.destination,
    departureId: row.departureId,
    dateLabel: row.dateLabel,
    durationDays: row.durationDays,
    nights: row.nights,
    travelers: row.travelers,
    kids: row.kids,
    extraNights: row.extraNights,
    singleSupplement: row.singleSupplement,
    transportMode: row.transportMode,
    hotelName: row.hotelName,
    mealPlan: row.mealPlan,
    bookingChannel: row.bookingChannel as BookingChannel,
    status: row.status as BookingStatus,
    totalUsd: row.totalUsd,
    totalKes: row.totalKes,
    depositDueUsd: row.depositDueUsd,
    depositDueKes: row.depositDueKes,
    amountPaidUsd: row.amountPaidUsd,
    amountPaidKes: row.amountPaidKes,
    balanceDueUsd: row.balanceDueUsd,
    balanceDueKes: row.balanceDueKes,
    customerName: row.customerName,
    customerEmail: row.customerEmail,
    customerPhone: row.customerPhone,
    notes: row.notes,
    payment: latestPayment
      ? {
          transactionId: latestPayment.transactionId,
          method: latestPayment.method,
          paymentOption: latestPayment.paymentOption,
          amountPaidUsd: latestPayment.amountUsd,
          amountPaidKes: latestPayment.amountKes,
          maskedAccount: latestPayment.maskedAccount,
          paidAt: latestPayment.paidAt,
          status: 'Paid',
        }
      : {
          transactionId: 'PENDING-DEPOSIT',
          method: 'paybill_manual',
          paymentOption: 'deposit',
          amountPaidUsd: row.amountPaidUsd,
          amountPaidKes: row.amountPaidKes,
          maskedAccount: 'Pending M-Pesa / Cash',
          paidAt: row.createdAt.toISOString(),
          status: 'Paid',
        },
    payments: mappedPayments,
  };
}

export async function getOrCreateUser(input: {
  uid: string;
  email: string;
  displayName: string | null;
}): Promise<typeof users.$inferSelect> {
  try {
    const safeEmail = input.email.trim() || 'unknown@summergetway.co.ke';
    const normalizedEmail = safeEmail.toLowerCase();
    const isOwnerEmail =
      normalizedEmail === 'thuosarah81@gmail.com' ||
      normalizedEmail.endsWith('@summergetway.co.ke');

    const existing = await db.query.users.findFirst({
      where: eq(users.uid, input.uid),
    });

    if (existing) {
      if (
        (isOwnerEmail && existing.role !== 'admin') ||
        (input.displayName && input.displayName !== existing.displayName)
      ) {
        const [updated] = await db
          .update(users)
          .set({
            role: isOwnerEmail ? 'admin' : existing.role,
            displayName: input.displayName ?? existing.displayName,
          })
          .where(eq(users.id, existing.id))
          .returning();
        return updated;
      }
      return existing;
    }

    const [{ value: adminCount }] = await db
      .select({ value: count() })
      .from(users)
      .where(eq(users.role, 'admin'));

    const assignedRole = isOwnerEmail || Number(adminCount) === 0 ? 'admin' : 'customer';

    const [synced] = await db
      .insert(users)
      .values({
        uid: input.uid,
        email: safeEmail,
        displayName: input.displayName,
        role: assignedRole,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: safeEmail,
          displayName: sql`COALESCE(${input.displayName}, ${users.displayName})`,
          ...(isOwnerEmail ? { role: 'admin' } : {}),
        },
      })
      .returning();

    return synced;
  } catch (error) {
    console.error('[DB] getOrCreateUser failed:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function listTripsWithDepartures(includeInactive = false): Promise<Trip[]> {
  try {
    await ensureSeeded();
    const tripRows = await db.query.trips.findMany({
      where: includeInactive ? undefined : eq(trips.active, true),
      with: {
        departures: true,
      },
      orderBy: (t, { desc: d, asc }) => [d(t.isFeatured), asc(t.title)],
    });

    return tripRows.map((row) => mapTripRow(row, row.departures));
  } catch (error) {
    console.error('[DB] listTripsWithDepartures failed:', error);
    throw new Error('Failed to load trips catalog.', { cause: error });
  }
}

export async function getPublicCatalog(): Promise<{
  trips: Trip[];
  destinations: DestinationRecord[];
  hotels: HotelRecord[];
  vehicles: FleetVehicle[];
  mealPackages: MealPackageRecord[];
}> {
  try {
    await ensureSeeded();
    const [tripList, destRows, hotelRows, vehicleRows, mealRows] = await Promise.all([
      listTripsWithDepartures(false),
      db.query.destinations.findMany({ orderBy: (d, { desc: o, asc }) => [o(d.isFeatured), asc(d.name)] }),
      db.query.hotels.findMany({ where: eq(hotels.active, true) }),
      db.query.vehicles.findMany({ where: eq(vehicles.active, true) }),
      db.query.mealPackages.findMany({ where: eq(mealPackages.active, true) }),
    ]);

    return {
      trips: tripList,
      destinations: destRows.map((d) => ({
        id: d.id,
        name: d.name,
        country: d.country,
        region: d.region,
        category: d.category,
        description: d.description,
        imageUrl: d.imageUrl,
        isFeatured: d.isFeatured,
        linkedTripId: d.linkedTripId,
      })),
      hotels: hotelRows.map((h) => ({
        id: h.id,
        name: h.name,
        location: h.location,
        country: h.country,
        category: h.category,
        roomDetails: h.roomDetails,
        active: h.active,
      })),
      vehicles: vehicleRows.map((v) => ({
        id: v.id,
        name: v.name,
        registrationPlate: v.registrationPlate,
        capacityLabel: v.capacityLabel,
        capacitySeats: v.capacitySeats,
        bestFor: v.bestFor,
        imageUrl: v.imageUrl,
        active: v.active,
      })),
      mealPackages: mealRows.map((m) => ({
        id: m.id,
        name: m.name,
        basis: m.basis,
        description: m.description,
        active: m.active,
      })),
    };
  } catch (error) {
    console.error('[DB] getPublicCatalog failed:', error);
    throw new Error('Failed to load travel catalog.', { cause: error });
  }
}

export async function createBookingWithPayment(input: {
  reference: string;
  userUid: string | null;
  trip: Trip;
  departureId: string;
  dateLabel: string;
  travelers: number;
  kids: number;
  extraNights: number;
  singleSupplement: boolean;
  bookingChannel: BookingChannel;
  status: BookingStatus;
  totalUsd: number;
  totalKes: number;
  depositDueUsd: number;
  depositDueKes: number;
  amountPaidUsd: number;
  amountPaidKes: number;
  balanceDueUsd: number;
  balanceDueKes: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
  payment?: {
    transactionId: string;
    method: PaymentMethod;
    paymentOption: PaymentOption;
    maskedAccount: string;
  };
}): Promise<{ booking: BookingRecord; trips: Trip[] }> {
  try {
    await ensureSeeded();
    const seatsRequested = input.travelers + input.kids;

    const createdBookingRow = await db.transaction(async (tx) => {
      const [dep] = await tx
        .select()
        .from(departures)
        .where(eq(departures.id, input.departureId));

      if (!dep) {
        throw new Error('DEPARTURE_NOT_FOUND');
      }
      if (dep.seatsRemaining < seatsRequested) {
        throw new Error(`INSUFFICIENT_SEATS:${dep.seatsRemaining}`);
      }

      const nextRemaining = Math.max(0, dep.seatsRemaining - seatsRequested);
      const nextStatus = computeDepartureStatus(nextRemaining);

      await tx
        .update(departures)
        .set({
          seatsRemaining: nextRemaining,
          status: nextStatus,
        })
        .where(eq(departures.id, dep.id));

      const isOvernight = input.trip.durationDays > 1;
      const [insertedBooking] = await tx
        .insert(bookings)
        .values({
          reference: input.reference,
          userUid: input.userUid,
          tripId: input.trip.id,
          departureId: dep.id,
          tripCode: input.trip.code,
          tripTitle: input.trip.title,
          destination: input.trip.destination,
          dateLabel: input.dateLabel,
          durationDays: input.trip.durationDays,
          nights: input.trip.nights,
          travelers: input.travelers,
          kids: input.kids,
          extraNights: input.extraNights,
          singleSupplement: isOvernight && input.singleSupplement,
          transportMode: input.trip.transportMode,
          hotelName: input.trip.hotelName,
          mealPlan: isOvernight
            ? 'Half Board (Daily Breakfast & Dinner)'
            : 'Day Refreshments (No overnight meal plan)',
          bookingChannel: input.bookingChannel,
          status: input.status,
          totalUsd: input.totalUsd,
          totalKes: input.totalKes,
          depositDueUsd: input.depositDueUsd,
          depositDueKes: input.depositDueKes,
          amountPaidUsd: input.amountPaidUsd,
          amountPaidKes: input.amountPaidKes,
          balanceDueUsd: input.balanceDueUsd,
          balanceDueKes: input.balanceDueKes,
          customerName: input.customerName,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          notes: input.notes,
        })
        .returning();

      let paymentRow: typeof payments.$inferSelect | undefined;
      if (input.payment && input.amountPaidUsd > 0) {
        const [insertedPayment] = await tx
          .insert(payments)
          .values({
            bookingId: insertedBooking.id,
            transactionId: input.payment.transactionId,
            method: input.payment.method,
            paymentOption: input.payment.paymentOption,
            amountUsd: input.amountPaidUsd,
            amountKes: input.amountPaidKes,
            maskedAccount: input.payment.maskedAccount,
            status: 'Paid',
          })
          .returning();
        paymentRow = insertedPayment;
      }

      return mapBookingRow(insertedBooking, paymentRow ? [paymentRow] : []);
    });

    const refreshedTrips = await listTripsWithDepartures(false);
    return { booking: createdBookingRow, trips: refreshedTrips };
  } catch (error) {
    if (error instanceof Error && (error.message === 'DEPARTURE_NOT_FOUND' || error.message.startsWith('INSUFFICIENT_SEATS:'))) {
      throw error;
    }
    console.error('[DB] createBookingWithPayment failed:', error);
    throw new Error('Failed to persist booking and payment.', { cause: error });
  }
}

export async function lookupBookings(params: {
  reference?: string;
  email?: string;
}): Promise<BookingRecord[]> {
  try {
    await ensureSeeded();
    const cleanRef = params.reference?.trim().toUpperCase();
    const cleanEmail = params.email?.trim().toLowerCase();
    if (!cleanRef && !cleanEmail) return [];

    const condition =
      cleanRef && cleanEmail
        ? or(eq(bookings.reference, cleanRef), ilike(bookings.customerEmail, cleanEmail))
        : cleanRef
          ? eq(bookings.reference, cleanRef)
          : ilike(bookings.customerEmail, cleanEmail!);

    const rows = await db.query.bookings.findMany({
      where: condition,
      with: { payments: true },
      orderBy: [desc(bookings.createdAt)],
    });

    return rows.map((r) => mapBookingRow(r, r.payments));
  } catch (error) {
    console.error('[DB] lookupBookings failed:', error);
    throw new Error('Failed to search customer bookings.', { cause: error });
  }
}

export async function getUserBookings(
  userUid: string,
  email: string,
): Promise<BookingRecord[]> {
  try {
    await ensureSeeded();
    const condition = email.trim()
      ? or(eq(bookings.userUid, userUid), ilike(bookings.customerEmail, email.trim()))
      : eq(bookings.userUid, userUid);

    const rows = await db.query.bookings.findMany({
      where: condition,
      with: { payments: true },
      orderBy: [desc(bookings.createdAt)],
    });

    return rows.map((r) => mapBookingRow(r, r.payments));
  } catch (error) {
    console.error('[DB] getUserBookings failed:', error);
    throw new Error('Failed to load user bookings.', { cause: error });
  }
}

export async function cancelBookingByReference(
  reference: string,
): Promise<{ booking: BookingRecord; trips: Trip[] } | null> {
  try {
    await ensureSeeded();
    const cleanRef = reference.trim().toUpperCase();

    const updated = await db.transaction(async (tx) => {
      const target = await tx.query.bookings.findFirst({
        where: eq(bookings.reference, cleanRef),
        with: { payments: true },
      });
      if (!target) return null;

      if (target.status !== 'Cancelled') {
        const [dep] = await tx
          .select()
          .from(departures)
          .where(eq(departures.id, target.departureId));

        if (dep) {
          const seatsToRestore = target.travelers + (target.kids ?? 0);
          const restored = Math.min(dep.seatsTotal, dep.seatsRemaining + seatsToRestore);
          await tx
            .update(departures)
            .set({
              seatsRemaining: restored,
              status: computeDepartureStatus(restored),
            })
            .where(eq(departures.id, dep.id));
        }

        const [saved] = await tx
          .update(bookings)
          .set({ status: 'Cancelled' })
          .where(eq(bookings.id, target.id))
          .returning();

        return mapBookingRow(saved, target.payments);
      }

      return mapBookingRow(target, target.payments);
    });

    if (!updated) return null;
    const refreshedTrips = await listTripsWithDepartures(false);
    return { booking: updated, trips: refreshedTrips };
  } catch (error) {
    console.error('[DB] cancelBookingByReference failed:', error);
    throw new Error('Failed to cancel booking.', { cause: error });
  }
}

export async function listReviews(tripId?: string): Promise<TripReview[]> {
  try {
    await ensureSeeded();
    const rows = await db.query.reviews.findMany({
      where: tripId ? eq(reviews.tripId, tripId) : undefined,
      orderBy: [desc(reviews.createdAt)],
    });

    return rows.map((r) => ({
      id: r.id,
      tripId: r.tripId,
      tripTitle: r.tripTitle,
      reviewerName: r.reviewerName,
      reviewerLocation: r.reviewerLocation,
      completedMonth: r.completedMonth,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      photos: Array.isArray(r.photos) ? r.photos : [],
      verifiedBooking: r.verifiedBooking,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error('[DB] listReviews failed:', error);
    throw new Error('Failed to load traveler reviews.', { cause: error });
  }
}

export async function createReviewRecord(input: {
  tripId: string;
  tripTitle: string;
  reviewerName: string;
  reviewerLocation: string;
  completedMonth: string;
  rating: number;
  title: string;
  comment: string;
  photos: string[];
  bookingReference?: string;
  completedTripConfirmed?: boolean;
}): Promise<{ review: TripReview; reviews: TripReview[] }> {
  try {
    await ensureSeeded();
    let verified = Boolean(input.completedTripConfirmed);

    if (input.bookingReference?.trim()) {
      const refMatch = await db.query.bookings.findFirst({
        where: eq(bookings.reference, input.bookingReference.trim().toUpperCase()),
      });
      if (refMatch && refMatch.tripId === input.tripId) {
        verified = true;
      }
    }

    const newId = `rev-${crypto.randomBytes(5).toString('hex')}`;
    const [inserted] = await db
      .insert(reviews)
      .values({
        id: newId,
        tripId: input.tripId,
        tripTitle: input.tripTitle,
        reviewerName: input.reviewerName,
        reviewerLocation: input.reviewerLocation || 'Kenya',
        completedMonth: input.completedMonth,
        rating: input.rating,
        title: input.title,
        comment: input.comment,
        photos: input.photos,
        verifiedBooking: verified,
      })
      .returning();

    const allReviews = await listReviews();
    return {
      review: {
        id: inserted.id,
        tripId: inserted.tripId,
        tripTitle: inserted.tripTitle,
        reviewerName: inserted.reviewerName,
        reviewerLocation: inserted.reviewerLocation,
        completedMonth: inserted.completedMonth,
        rating: inserted.rating,
        title: inserted.title,
        comment: inserted.comment,
        photos: Array.isArray(inserted.photos) ? inserted.photos : [],
        verifiedBooking: inserted.verifiedBooking,
        createdAt: inserted.createdAt.toISOString(),
      },
      reviews: allReviews,
    };
  } catch (error) {
    console.error('[DB] createReviewRecord failed:', error);
    throw new Error('Failed to save traveler review.', { cause: error });
  }
}

export async function createInquiryRecord(
  input: CustomInquiryInput,
): Promise<InquiryRecord> {
  try {
    await ensureSeeded();
    const reference = `INQ-${crypto.randomInt(1000, 9999)}-${crypto.randomBytes(1).toString('hex').toUpperCase()}`;
    const [inserted] = await db
      .insert(inquiries)
      .values({
        reference,
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone.trim(),
        channel: input.channel ?? 'web',
        region: input.region,
        destinationInterest: (input.destinationInterest ?? '').trim(),
        vehiclePreference: (input.vehiclePreference ?? '').trim(),
        preferredMonth: input.preferredMonth,
        groupSize: input.groupSize,
        notes: (input.notes ?? '').trim(),
        status: 'New',
      })
      .returning();

    return {
      id: inserted.id,
      reference: inserted.reference,
      name: inserted.name,
      email: inserted.email,
      phone: inserted.phone,
      channel: inserted.channel,
      region: inserted.region,
      destinationInterest: inserted.destinationInterest,
      vehiclePreference: inserted.vehiclePreference,
      preferredMonth: inserted.preferredMonth,
      groupSize: inserted.groupSize,
      notes: inserted.notes,
      status: inserted.status as InquiryRecord['status'],
      createdAt: inserted.createdAt.toISOString(),
    };
  } catch (error) {
    console.error('[DB] createInquiryRecord failed:', error);
    throw new Error('Failed to save inquiry.', { cause: error });
  }
}

// ========================
// ADMIN REPOSITORY METHODS
// ========================

export async function listDestinations(): Promise<DestinationRecord[]> {
  try {
    await ensureSeeded();
    const rows = await db.query.destinations.findMany({
      orderBy: (d, { desc: o, asc }) => [o(d.isFeatured), asc(d.name)],
    });
    return rows.map((d) => ({
      id: d.id,
      name: d.name,
      country: d.country,
      region: d.region,
      category: d.category,
      description: d.description,
      imageUrl: d.imageUrl,
      isFeatured: d.isFeatured,
      linkedTripId: d.linkedTripId,
    }));
  } catch (error) {
    console.error('[DB] listDestinations failed:', error);
    throw new Error('Failed to load destinations.', { cause: error });
  }
}

export async function upsertDestination(
  input: Omit<DestinationRecord, 'id'> & { id?: string },
): Promise<DestinationRecord> {
  try {
    await ensureSeeded();
    const id =
      input.id?.trim() ||
      `dest-${input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}-${crypto.randomBytes(2).toString('hex')}`;

    const [saved] = await db
      .insert(destinations)
      .values({
        id,
        name: input.name.trim(),
        country: input.country.trim(),
        region: input.region.trim(),
        category: input.category.trim(),
        description: input.description.trim(),
        imageUrl: input.imageUrl || null,
        isFeatured: Boolean(input.isFeatured),
        linkedTripId: input.linkedTripId || null,
      })
      .onConflictDoUpdate({
        target: destinations.id,
        set: {
          name: input.name.trim(),
          country: input.country.trim(),
          region: input.region.trim(),
          category: input.category.trim(),
          description: input.description.trim(),
          imageUrl: input.imageUrl || null,
          isFeatured: Boolean(input.isFeatured),
          linkedTripId: input.linkedTripId || null,
        },
      })
      .returning();

    return {
      id: saved.id,
      name: saved.name,
      country: saved.country,
      region: saved.region,
      category: saved.category,
      description: saved.description,
      imageUrl: saved.imageUrl,
      isFeatured: saved.isFeatured,
      linkedTripId: saved.linkedTripId,
    };
  } catch (error) {
    console.error('[DB] upsertDestination failed:', error);
    throw new Error('Failed to save destination.', { cause: error });
  }
}

export async function deleteDestination(id: string): Promise<void> {
  try {
    await db.delete(destinations).where(eq(destinations.id, id));
  } catch (error) {
    console.error('[DB] deleteDestination failed:', error);
    throw new Error('Failed to delete destination.', { cause: error });
  }
}

export async function createAdminTrip(input: {
  title: string;
  code: string;
  region: string;
  country: string;
  destination: string;
  category: string;
  departureHub: string;
  durationDays: number;
  nights: number;
  imageUrl: string;
  summary: string;
  transportMode: string;
  transportDetail: string;
  hotelName: string | null;
  hotelCategory: string | null;
  accommodationDetail: string;
  mealPlan: string;
  singleSupplementUsd: number;
  guidedHighlight: string;
  inclusions: string[];
  exclusions: string[];
  initialDeparture?: {
    startDate: string;
    endDate: string;
    dateLabel: string;
    seatsTotal: number;
    priceUsd: number;
    priceKes?: number | null;
    minDepositKes?: number | null;
    isFeaturedEvent?: boolean;
  };
}): Promise<Trip> {
  try {
    await ensureSeeded();
    const id = `${input.region}-${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 20)}-${crypto.randomBytes(2).toString('hex')}`;
    const defaultDay: DayPlan = {
      day: 1,
      title: `${input.title} — Arrival & Guided Orientation`,
      location: `${input.departureHub} → ${input.destination}`,
      activities: ['Departure coordination from Nairobi', 'Check-in & guided highlight excursion'],
      guidedExperience: input.guidedHighlight,
      transport: input.transportMode,
      mealsIncluded: input.durationDays > 1 ? 'Half Board (Breakfast & Dinner)' : 'Day Refreshments',
      accommodation: input.hotelName ?? 'Day Excursion (No overnight stay)',
    };

    await db.transaction(async (tx) => {
      await tx.insert(trips).values({
        id,
        code: input.code.trim().toUpperCase(),
        title: input.title.trim(),
        region: input.region,
        country: input.country.trim(),
        destination: input.destination.trim(),
        category: input.category.trim() || 'Scheduled Safari & Tour',
        departureHub: input.departureHub.trim(),
        durationDays: input.durationDays,
        nights: input.nights,
        imageUrl: input.imageUrl.trim() || '/src/assets/images/hero_kenya_savannah_1795079736061.jpg',
        imageAlt: `${input.title.trim()} scenic adventure`,
        summary: input.summary.trim(),
        transportMode: input.transportMode.trim(),
        transportDetail: input.transportDetail.trim(),
        hotelName: input.hotelName,
        hotelCategory: input.hotelCategory,
        accommodationDetail: input.accommodationDetail.trim(),
        mealPlan: input.mealPlan,
        singleSupplementUsd: input.singleSupplementUsd,
        guidedHighlight: input.guidedHighlight.trim(),
        inclusions: input.inclusions,
        exclusions: input.exclusions,
        itinerary: [defaultDay],
        isFeatured: false,
        active: true,
      });

      if (input.initialDeparture) {
        const dep = input.initialDeparture;
        const depId = `dep-${crypto.randomBytes(4).toString('hex')}`;
        await tx.insert(departures).values({
          id: depId,
          tripId: id,
          startDate: dep.startDate,
          endDate: dep.endDate,
          monthKey: dep.startDate.slice(0, 7),
          dateLabel: dep.dateLabel,
          seatsTotal: dep.seatsTotal,
          seatsRemaining: dep.seatsTotal,
          priceUsd: dep.priceUsd,
          priceKes: dep.priceKes ?? Math.round(dep.priceUsd * USD_TO_KES_RATE),
          minDepositKes: dep.minDepositKes ?? null,
          minDepositUsd: dep.minDepositKes ? Math.round(dep.minDepositKes / USD_TO_KES_RATE) : null,
          isFeaturedEvent: Boolean(dep.isFeaturedEvent),
          status: computeDepartureStatus(dep.seatsTotal),
        });
      }
    });

    const all = await listTripsWithDepartures(true);
    const created = all.find((t) => t.id === id);
    if (!created) throw new Error('Trip creation could not be verified.');
    return created;
  } catch (error) {
    console.error('[DB] createAdminTrip failed:', error);
    throw new Error('Failed to create trip package.', { cause: error });
  }
}

export async function updateAdminTrip(
  tripId: string,
  updates: Partial<{
    title: string;
    destination: string;
    country: string;
    region: string;
    transportMode: string;
    hotelName: string | null;
    mealPlan: string;
    active: boolean;
    isFeatured: boolean;
  }>,
): Promise<Trip | null> {
  try {
    await ensureSeeded();
    await db
      .update(trips)
      .set(updates)
      .where(eq(trips.id, tripId));
    const all = await listTripsWithDepartures(true);
    return all.find((t) => t.id === tripId) ?? null;
  } catch (error) {
    console.error('[DB] updateAdminTrip failed:', error);
    throw new Error('Failed to update trip.', { cause: error });
  }
}

export async function upsertDepartureDate(input: {
  id?: string;
  tripId: string;
  startDate: string;
  endDate: string;
  dateLabel: string;
  seatsTotal: number;
  seatsRemaining?: number;
  priceUsd: number;
  priceKes?: number | null;
  minDepositKes?: number | null;
  isFeaturedEvent?: boolean;
}): Promise<DepartureDate> {
  try {
    await ensureSeeded();
    const id = input.id?.trim() || `dep-${crypto.randomBytes(4).toString('hex')}`;
    const remaining =
      typeof input.seatsRemaining === 'number'
        ? Math.min(input.seatsTotal, Math.max(0, input.seatsRemaining))
        : input.seatsTotal;
    const status = computeDepartureStatus(remaining);

    const [saved] = await db
      .insert(departures)
      .values({
        id,
        tripId: input.tripId,
        startDate: input.startDate,
        endDate: input.endDate,
        monthKey: input.startDate.slice(0, 7),
        dateLabel: input.dateLabel.trim(),
        seatsTotal: input.seatsTotal,
        seatsRemaining: remaining,
        priceUsd: input.priceUsd,
        priceKes: input.priceKes ?? Math.round(input.priceUsd * USD_TO_KES_RATE),
        minDepositKes: input.minDepositKes ?? null,
        minDepositUsd: input.minDepositKes
          ? Math.round(input.minDepositKes / USD_TO_KES_RATE)
          : null,
        isFeaturedEvent: Boolean(input.isFeaturedEvent),
        status,
      })
      .onConflictDoUpdate({
        target: departures.id,
        set: {
          startDate: input.startDate,
          endDate: input.endDate,
          monthKey: input.startDate.slice(0, 7),
          dateLabel: input.dateLabel.trim(),
          seatsTotal: input.seatsTotal,
          seatsRemaining: remaining,
          priceUsd: input.priceUsd,
          priceKes: input.priceKes ?? Math.round(input.priceUsd * USD_TO_KES_RATE),
          minDepositKes: input.minDepositKes ?? null,
          isFeaturedEvent: Boolean(input.isFeaturedEvent),
          status,
        },
      })
      .returning();

    return mapDepartureRow(saved);
  } catch (error) {
    console.error('[DB] upsertDepartureDate failed:', error);
    throw new Error('Failed to save departure date and capacity.', { cause: error });
  }
}

export async function deleteDepartureDate(departureId: string): Promise<void> {
  try {
    await db.delete(departures).where(eq(departures.id, departureId));
  } catch (error) {
    console.error('[DB] deleteDepartureDate failed:', error);
    throw new Error('Cannot remove a departure date that already has bookings.', { cause: error });
  }
}

export async function listAllBookings(): Promise<BookingRecord[]> {
  try {
    await ensureSeeded();
    const rows = await db.query.bookings.findMany({
      with: { payments: true },
      orderBy: [desc(bookings.createdAt)],
    });
    return rows.map((r) => mapBookingRow(r, r.payments));
  } catch (error) {
    console.error('[DB] listAllBookings failed:', error);
    throw new Error('Failed to load all bookings.', { cause: error });
  }
}

export async function updateBookingStatus(
  reference: string,
  nextStatus: BookingStatus,
): Promise<BookingRecord | null> {
  try {
    if (nextStatus === 'Cancelled') {
      const res = await cancelBookingByReference(reference);
      return res?.booking ?? null;
    }

    const cleanRef = reference.trim().toUpperCase();
    const target = await db.query.bookings.findFirst({
      where: eq(bookings.reference, cleanRef),
      with: { payments: true },
    });
    if (!target) return null;

    const [updated] = await db
      .update(bookings)
      .set({ status: nextStatus })
      .where(eq(bookings.id, target.id))
      .returning();

    return mapBookingRow(updated, target.payments);
  } catch (error) {
    console.error('[DB] updateBookingStatus failed:', error);
    throw new Error('Failed to update booking status.', { cause: error });
  }
}

export async function listAllPayments(): Promise<PaymentTransaction[]> {
  try {
    await ensureSeeded();
    const rows = await db.query.payments.findMany({
      with: { booking: true },
      orderBy: [desc(payments.paidAt)],
    });

    return rows.map((p) => ({
      id: p.id,
      bookingId: p.bookingId,
      bookingReference: p.booking?.reference ?? '',
      customerName: p.booking?.customerName ?? '',
      tripTitle: p.booking?.tripTitle ?? '',
      transactionId: p.transactionId,
      method: p.method as PaymentMethod,
      paymentOption: p.paymentOption as PaymentOption,
      amountUsd: p.amountUsd,
      amountKes: p.amountKes,
      maskedAccount: p.maskedAccount,
      status: p.status,
      paidAt: p.paidAt.toISOString(),
    }));
  } catch (error) {
    console.error('[DB] listAllPayments failed:', error);
    throw new Error('Failed to load payment transactions.', { cause: error });
  }
}

export async function recordBalancePayment(
  reference: string,
  input: {
    amountUsd: number;
    amountKes: number;
    method: PaymentMethod;
    maskedAccount: string;
    transactionRef?: string;
  },
): Promise<BookingRecord | null> {
  try {
    const cleanRef = reference.trim().toUpperCase();
    return await db.transaction(async (tx) => {
      const target = await tx.query.bookings.findFirst({
        where: eq(bookings.reference, cleanRef),
        with: { payments: true },
      });
      if (!target) return null;

      const txId =
        input.transactionRef?.trim().toUpperCase() ||
        `TXN-SGA-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

      const [newPay] = await tx
        .insert(payments)
        .values({
          bookingId: target.id,
          transactionId: txId,
          method: input.method,
          paymentOption: 'balance_settlement',
          amountUsd: input.amountUsd,
          amountKes: input.amountKes,
          maskedAccount: input.maskedAccount.trim() || 'Paybill 709 8495',
          status: 'Paid',
        })
        .returning();

      const nextPaidUsd = target.amountPaidUsd + input.amountUsd;
      const nextPaidKes = target.amountPaidKes + input.amountKes;
      const nextBalanceUsd = Math.max(0, target.totalUsd - nextPaidUsd);
      const nextBalanceKes = Math.max(0, target.totalKes - nextPaidKes);
      const nextStatus: BookingStatus =
        target.status === 'Pending Deposit' && nextPaidUsd > 0
          ? 'Confirmed'
          : (target.status as BookingStatus);

      const [updated] = await tx
        .update(bookings)
        .set({
          amountPaidUsd: nextPaidUsd,
          amountPaidKes: nextPaidKes,
          balanceDueUsd: nextBalanceUsd,
          balanceDueKes: nextBalanceKes,
          status: nextStatus,
        })
        .where(eq(bookings.id, target.id))
        .returning();

      return mapBookingRow(updated, [newPay, ...target.payments]);
    });
  } catch (error) {
    console.error('[DB] recordBalancePayment failed:', error);
    throw new Error('Failed to record balance payment.', { cause: error });
  }
}

export async function listResources(): Promise<{
  hotels: HotelRecord[];
  vehicles: FleetVehicle[];
  mealPackages: MealPackageRecord[];
}> {
  try {
    await ensureSeeded();
    const [hotelRows, vehicleRows, mealRows] = await Promise.all([
      db.query.hotels.findMany(),
      db.query.vehicles.findMany(),
      db.query.mealPackages.findMany(),
    ]);

    return {
      hotels: hotelRows.map((h) => ({
        id: h.id,
        name: h.name,
        location: h.location,
        country: h.country,
        category: h.category,
        roomDetails: h.roomDetails,
        active: h.active,
      })),
      vehicles: vehicleRows.map((v) => ({
        id: v.id,
        name: v.name,
        registrationPlate: v.registrationPlate,
        capacityLabel: v.capacityLabel,
        capacitySeats: v.capacitySeats,
        bestFor: v.bestFor,
        imageUrl: v.imageUrl,
        active: v.active,
      })),
      mealPackages: mealRows.map((m) => ({
        id: m.id,
        name: m.name,
        basis: m.basis,
        description: m.description,
        active: m.active,
      })),
    };
  } catch (error) {
    console.error('[DB] listResources failed:', error);
    throw new Error('Failed to load hotels, vehicles, and meal packages.', { cause: error });
  }
}

export async function upsertHotel(input: Omit<HotelRecord, 'id'> & { id?: string }): Promise<HotelRecord> {
  try {
    const id = input.id?.trim() || `htl-${crypto.randomBytes(3).toString('hex')}`;
    const [saved] = await db
      .insert(hotels)
      .values({
        id,
        name: input.name.trim(),
        location: input.location.trim(),
        country: input.country.trim(),
        category: input.category.trim(),
        roomDetails: input.roomDetails.trim(),
        active: input.active,
      })
      .onConflictDoUpdate({
        target: hotels.id,
        set: {
          name: input.name.trim(),
          location: input.location.trim(),
          country: input.country.trim(),
          category: input.category.trim(),
          roomDetails: input.roomDetails.trim(),
          active: input.active,
        },
      })
      .returning();

    return saved;
  } catch (error) {
    console.error('[DB] upsertHotel failed:', error);
    throw new Error('Failed to save hotel.', { cause: error });
  }
}

export async function deleteHotel(id: string): Promise<void> {
  try {
    await db.delete(hotels).where(eq(hotels.id, id));
  } catch (error) {
    console.error('[DB] deleteHotel failed:', error);
    throw new Error('Failed to remove hotel.', { cause: error });
  }
}

export async function upsertVehicle(
  input: Omit<FleetVehicle, 'id'> & { id?: string },
): Promise<FleetVehicle> {
  try {
    const id = input.id?.trim() || `veh-${crypto.randomBytes(3).toString('hex')}`;
    const [saved] = await db
      .insert(vehicles)
      .values({
        id,
        name: input.name.trim(),
        registrationPlate: input.registrationPlate?.trim() || null,
        capacityLabel: input.capacityLabel.trim(),
        capacitySeats: input.capacitySeats ?? 7,
        bestFor: input.bestFor.trim(),
        imageUrl: input.imageUrl || null,
        active: input.active ?? true,
      })
      .onConflictDoUpdate({
        target: vehicles.id,
        set: {
          name: input.name.trim(),
          registrationPlate: input.registrationPlate?.trim() || null,
          capacityLabel: input.capacityLabel.trim(),
          capacitySeats: input.capacitySeats ?? 7,
          bestFor: input.bestFor.trim(),
          imageUrl: input.imageUrl || null,
          active: input.active ?? true,
        },
      })
      .returning();

    return saved;
  } catch (error) {
    console.error('[DB] upsertVehicle failed:', error);
    throw new Error('Failed to save vehicle.', { cause: error });
  }
}

export async function deleteVehicle(id: string): Promise<void> {
  try {
    await db.delete(vehicles).where(eq(vehicles.id, id));
  } catch (error) {
    console.error('[DB] deleteVehicle failed:', error);
    throw new Error('Failed to remove vehicle.', { cause: error });
  }
}

export async function upsertMealPackage(
  input: Omit<MealPackageRecord, 'id'> & { id?: string },
): Promise<MealPackageRecord> {
  try {
    const id = input.id?.trim() || `meal-${crypto.randomBytes(3).toString('hex')}`;
    const [saved] = await db
      .insert(mealPackages)
      .values({
        id,
        name: input.name.trim(),
        basis: input.basis.trim(),
        description: input.description.trim(),
        active: input.active,
      })
      .onConflictDoUpdate({
        target: mealPackages.id,
        set: {
          name: input.name.trim(),
          basis: input.basis.trim(),
          description: input.description.trim(),
          active: input.active,
        },
      })
      .returning();

    return saved;
  } catch (error) {
    console.error('[DB] upsertMealPackage failed:', error);
    throw new Error('Failed to save meal package.', { cause: error });
  }
}

export async function deleteMealPackage(id: string): Promise<void> {
  try {
    await db.delete(mealPackages).where(eq(mealPackages.id, id));
  } catch (error) {
    console.error('[DB] deleteMealPackage failed:', error);
    throw new Error('Failed to remove meal package.', { cause: error });
  }
}

export async function listInquiries(): Promise<InquiryRecord[]> {
  try {
    await ensureSeeded();
    const rows = await db.query.inquiries.findMany({
      orderBy: [desc(inquiries.createdAt)],
    });
    return rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      name: r.name,
      email: r.email,
      phone: r.phone,
      channel: r.channel,
      region: r.region,
      destinationInterest: r.destinationInterest,
      vehiclePreference: r.vehiclePreference,
      preferredMonth: r.preferredMonth,
      groupSize: r.groupSize,
      notes: r.notes,
      status: r.status as InquiryRecord['status'],
      createdAt: r.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error('[DB] listInquiries failed:', error);
    throw new Error('Failed to load inquiries.', { cause: error });
  }
}

export async function updateInquiryStatus(
  id: number,
  status: InquiryRecord['status'],
): Promise<InquiryRecord | null> {
  try {
    const [updated] = await db
      .update(inquiries)
      .set({ status })
      .where(eq(inquiries.id, id))
      .returning();
    if (!updated) return null;
    return {
      id: updated.id,
      reference: updated.reference,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      channel: updated.channel,
      region: updated.region,
      destinationInterest: updated.destinationInterest,
      vehiclePreference: updated.vehiclePreference,
      preferredMonth: updated.preferredMonth,
      groupSize: updated.groupSize,
      notes: updated.notes,
      status: updated.status as InquiryRecord['status'],
      createdAt: updated.createdAt.toISOString(),
    };
  } catch (error) {
    console.error('[DB] updateInquiryStatus failed:', error);
    throw new Error('Failed to update inquiry status.', { cause: error });
  }
}

export async function getAdminReportSummary(): Promise<AdminReportSummary> {
  try {
    const [allBookings, allTrips, allInquiries] = await Promise.all([
      listAllBookings(),
      listTripsWithDepartures(true),
      listInquiries(),
    ]);
    return computeAdminReportMetrics(allBookings, allTrips, allInquiries);
  } catch (error) {
    console.error('[DB] getAdminReportSummary failed:', error);
    throw new Error('Failed to generate financial and booking report.', { cause: error });
  }
}
