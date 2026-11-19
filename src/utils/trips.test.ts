import test from 'node:test';
import assert from 'node:assert/strict';
import { SEED_REVIEWS } from '../data/reviews';
import { TRIPS } from '../data/trips';
import type { BookingRecord } from '../types/travel';
import {
  detectCardBrand,
  maskMpesaPhone,
  normalizeKenyanMpesaPhone,
  validateCardExpiry,
  validateCardInput,
  validateLuhn,
} from './payment';
import {
  buildWhatsAppLink,
  calculateBookingSummary,
  computeAdminReportMetrics,
  computeTripRatingStats,
  filterTrips,
  formatPrice,
  getChronologicalDepartures,
  getTripInclusions,
  validateBookingInput,
  validateInquiryInput,
  validateReviewInput,
} from './trips';

test('getTripInclusions enforces hotel + half-board + transport + guided tour for overnight trips', () => {
  const mara = TRIPS.find((t) => t.id === 'kenya-mara-conservancy');
  assert.ok(mara);
  const inclusions = getTripInclusions(mara);

  assert.equal(inclusions.isOvernight, true);
  assert.equal(inclusions.transportIncluded, true);
  assert.equal(inclusions.hotelIncluded, true);
  assert.equal(inclusions.mealsIncluded, true);
  assert.equal(inclusions.mealPlanLabel, 'Half Board (Daily Breakfast & Dinner)');
  assert.equal(inclusions.guidedToursIncluded, true);
});

test('getTripInclusions excludes hotel and half-board on 1-day trips while retaining transport & guided tours', () => {
  const hellsGate = TRIPS.find((t) => t.id === 'kenya-hells-gate-day');
  assert.ok(hellsGate);
  const inclusions = getTripInclusions(hellsGate);

  assert.equal(inclusions.isOvernight, false);
  assert.equal(inclusions.transportIncluded, true);
  assert.equal(inclusions.hotelIncluded, false);
  assert.equal(inclusions.mealsIncluded, false);
  assert.equal(inclusions.guidedToursIncluded, true);
});

test('filterTrips filters accurately by region, country, max price, duration category, month, and search query', () => {
  const middleEast = filterTrips(TRIPS, {
    region: 'middle-east',
    duration: 'all',
    month: 'all',
    query: '',
  });
  assert.equal(middleEast.length, 2);
  assert.ok(middleEast.every((t) => t.region === 'middle-east'));

  const omanOnly = filterTrips(TRIPS, {
    region: 'all',
    duration: 'all',
    month: 'all',
    country: 'Oman',
    query: '',
  });
  assert.equal(omanOnly.length, 1);
  assert.equal(omanOnly[0].id, 'me-oman-muscat-wadi');

  const budgetUnder300 = filterTrips(TRIPS, {
    region: 'all',
    duration: 'all',
    month: 'all',
    maxPriceUsd: 300,
    query: '',
  });
  assert.equal(budgetUnder300.length, 2);
  assert.ok(budgetUnder300.some((t) => t.id === 'kenya-diani-wasini'));
  assert.ok(budgetUnder300.some((t) => t.id === 'kenya-hells-gate-day'));

  const dayTrips = filterTrips(TRIPS, {
    region: 'all',
    duration: 'day-trip',
    month: 'all',
    query: '',
  });
  assert.equal(dayTrips.length, 1);
  assert.equal(dayTrips[0].id, 'kenya-hells-gate-day');

  const sriLankaSearch = filterTrips(TRIPS, {
    region: 'all',
    duration: 'all',
    month: '2027-03',
    query: 'tea',
  });
  assert.equal(sriLankaSearch.length, 1);
  assert.equal(sriLankaSearch[0].region, 'south-asia');
});

test('getChronologicalDepartures sorts upcoming departure dates ascending and respects filters', () => {
  const allRows = getChronologicalDepartures(TRIPS, {
    region: 'all',
    duration: 'all',
    month: 'all',
    query: '',
  });
  assert.ok(allRows.length >= 10);
  for (let i = 1; i < allRows.length; i += 1) {
    assert.ok(allRows[i].departure.startDate >= allRows[i - 1].departure.startDate);
  }
});

test('calculateBookingSummary computes deposit vs full payment and ignores supplement on day trips', () => {
  const dubai = TRIPS.find((t) => t.id === 'me-dubai-abudhabi');
  const dayTrip = TRIPS.find((t) => t.id === 'kenya-hells-gate-day');
  assert.ok(dubai && dayTrip);

  const dubaiDeposit = calculateBookingSummary(dubai, 1290, 2, true, 'deposit');
  assert.equal(dubaiDeposit.totalUsd, 2840);
  assert.equal(dubaiDeposit.amountDueNowUsd, 852);
  assert.equal(dubaiDeposit.balanceDueUsd, 1988);

  const dubaiFull = calculateBookingSummary(dubai, 1290, 2, true, 'full');
  assert.equal(dubaiFull.amountDueNowUsd, 2840);
  assert.equal(dubaiFull.balanceDueUsd, 0);

  const daySummary = calculateBookingSummary(dayTrip, 85, 3, true, 'full');
  assert.equal(daySummary.singleSupplementTotalUsd, 0);
  assert.equal(daySummary.totalUsd, 255);

  const diani = TRIPS.find((t) => t.id === 'kenya-diani-wasini');
  assert.ok(diani);
  const xmasDep = diani.departures[0];
  assert.equal(xmasDep.priceKes, 33500);
  assert.equal(xmasDep.kidPriceKes, 31500);
  assert.equal(xmasDep.minDepositKes, 10000);
  const dianiSummary = calculateBookingSummary(diani, xmasDep.priceUsd, 2, false, 'deposit', {
    kids: 1,
    kidPriceUsd: xmasDep.kidPriceUsd,
    extraNights: 1,
    extraNightPriceUsd: xmasDep.extraNightUsd,
    minDepositUsd: xmasDep.minDepositUsd,
  });
  assert.equal(dianiSummary.baseTotalUsd, 520);
  assert.equal(dianiSummary.kidsTotalUsd, 244);
  assert.equal(dianiSummary.extraNightsTotalUsd, 150);
  assert.equal(dianiSummary.depositDueUsd, 78);
});

test('formatPrice formats USD and KES accurately', () => {
  assert.equal(formatPrice(100, 'USD'), '$100');
  assert.equal(formatPrice(100, 'KES'), 'KES 12,900');
});

test('buildWhatsAppLink normalizes Kenyan numbers and encodes inquiry text', () => {
  const url = buildWhatsAppLink('Hello Diani X-Mass', '0724 794 548');
  assert.equal(url, 'https://wa.me/254724794548?text=Hello%20Diani%20X-Mass');
});

test('computeAdminReportMetrics aggregates active revenue, outstanding balances, and cancelled exclusions', () => {
  const sampleBookings: BookingRecord[] = [
    {
      reference: 'SGA-2026-1001',
      createdAt: '2026-11-19T00:00:00Z',
      tripId: 'kenya-diani-wasini',
      tripCode: 'KE-DIA-04',
      tripTitle: 'Diani X-Mass & Wasini Coast Retreat',
      destination: 'Diani Beach',
      departureId: 'dia-xmas-dec-24',
      dateLabel: '24 Dec – 27 Dec 2026',
      durationDays: 4,
      nights: 3,
      travelers: 2,
      kids: 1,
      singleSupplement: false,
      transportMode: 'SGR',
      hotelName: 'Diani Reef',
      mealPlan: 'Half Board',
      bookingChannel: 'online',
      status: 'Confirmed',
      totalUsd: 764,
      totalKes: 98500,
      depositDueUsd: 78,
      amountPaidUsd: 78,
      amountPaidKes: 10000,
      balanceDueUsd: 686,
      balanceDueKes: 88500,
      customerName: 'Amina',
      customerEmail: 'amina@example.com',
      customerPhone: '+254712345678',
      notes: '',
      payment: {
        transactionId: 'TXN-1',
        method: 'mpesa',
        paymentOption: 'deposit',
        amountPaidUsd: 78,
        maskedAccount: 'M-Pesa',
        paidAt: '2026-11-19T00:00:00Z',
        status: 'Paid',
      },
    },
    {
      reference: 'SGA-2026-1002',
      createdAt: '2026-11-19T00:00:00Z',
      tripId: 'me-dubai-abudhabi',
      tripCode: 'ME-DXB-05',
      tripTitle: 'Dubai',
      destination: 'Dubai',
      departureId: 'dxb-dec-26',
      dateLabel: '26 Dec – 30 Dec 2026',
      durationDays: 5,
      nights: 4,
      travelers: 2,
      singleSupplement: false,
      transportMode: 'Flights',
      hotelName: 'Al Seef',
      mealPlan: 'Half Board',
      bookingChannel: 'whatsapp',
      status: 'Cancelled',
      totalUsd: 2760,
      depositDueUsd: 828,
      amountPaidUsd: 828,
      balanceDueUsd: 1932,
      customerName: 'Peter',
      customerEmail: 'peter@example.com',
      customerPhone: '+254712345679',
      notes: '',
      payment: {
        transactionId: 'TXN-2',
        method: 'paybill_manual',
        paymentOption: 'deposit',
        amountPaidUsd: 828,
        maskedAccount: 'Paybill',
        paidAt: '2026-11-19T00:00:00Z',
        status: 'Paid',
      },
    },
  ];

  const report = computeAdminReportMetrics(sampleBookings, TRIPS, [{ status: 'New' }]);
  assert.equal(report.totalBookings, 2);
  assert.equal(report.activeBookings, 1);
  assert.equal(report.cancelledBookings, 1);
  assert.equal(report.totalCollectedUsd, 78);
  assert.equal(report.outstandingBalanceUsd, 686);
  assert.equal(report.totalTravelers, 3);
  assert.equal(report.openInquiriesCount, 1);
});

test('Luhn, card expiry, and Kenyan M-Pesa phone validation enforce payment gateway integrity', () => {
  assert.equal(validateLuhn('4242 4242 4242 4242'), true);
  assert.equal(validateLuhn('4242 4242 4242 4241'), false);
  assert.equal(detectCardBrand('4242424242424242'), 'Visa');
  assert.equal(detectCardBrand('5555555555554444'), 'Mastercard');

  const fixedNow = new Date('2026-11-19T00:00:00Z');
  assert.equal(validateCardExpiry('12/28', fixedNow), true);
  assert.equal(validateCardExpiry('10/26', fixedNow), false);

  const badCard = validateCardInput(
    {
      cardholderName: 'A',
      cardNumber: '4111111111111112',
      expiry: '01/24',
      cvc: '12',
    },
    fixedNow,
  );
  assert.ok(badCard.cardholderName);
  assert.ok(badCard.cardNumber);
  assert.ok(badCard.expiry);
  assert.ok(badCard.cvc);

  assert.equal(normalizeKenyanMpesaPhone('0712345678'), '+254712345678');
  assert.equal(normalizeKenyanMpesaPhone('+254 712 345 678'), '+254712345678');
  assert.equal(normalizeKenyanMpesaPhone('0812345678'), null);
  assert.equal(maskMpesaPhone('+254712345678'), '+25471•••678');
});

test('review validation and rating stats work across seeded and custom reviews', () => {
  const stats = computeTripRatingStats(SEED_REVIEWS, 'kenya-mara-conservancy');
  assert.equal(stats.reviewCount, 1);
  assert.equal(stats.averageRating, 5);

  const badReview = validateReviewInput({
    tripId: '',
    reviewerName: 'A',
    completedMonth: '',
    rating: 0,
    title: 'Ok',
    comment: 'Too short',
    photos: ['1', '2', '3', '4'],
  });
  assert.ok(badReview.tripId);
  assert.ok(badReview.reviewerName);
  assert.ok(badReview.completedMonth);
  assert.ok(badReview.rating);
  assert.ok(badReview.title);
  assert.ok(badReview.comment);
  assert.ok(badReview.photos);

  const goodReview = validateReviewInput({
    tripId: 'kenya-mara-conservancy',
    reviewerName: 'Grace Wambui',
    completedMonth: 'Oct 2026',
    rating: 5,
    title: 'Memorable Mara dawn game drives',
    comment: 'Excellent 4x4 cruiser, warm lodge hospitality, and knowledgeable guide.',
    photos: ['data:image/jpeg;base64,abc'],
  });
  assert.deepEqual(goodReview, {});
});

test('validateBookingInput and validateInquiryInput reject invalid inputs and allow valid ones', () => {
  const bad = validateBookingInput({
    customerName: 'A',
    customerEmail: 'not-an-email',
    customerPhone: '123',
    travelers: 5,
    seatsRemaining: 3,
    departureId: 'mar-dec-12',
  });
  assert.ok(bad.customerName);
  assert.ok(bad.customerEmail);
  assert.ok(bad.customerPhone);
  assert.ok(bad.travelers);

  const badInquiry = validateInquiryInput({
    name: '',
    email: 'bad',
    phone: '0',
    region: 'south-asia',
    preferredMonth: '2027-03',
    groupSize: 1,
    notes: '',
  });
  assert.ok(badInquiry.name);
  assert.ok(badInquiry.email);
  assert.ok(badInquiry.phone);
  assert.ok(badInquiry.groupSize);
});
