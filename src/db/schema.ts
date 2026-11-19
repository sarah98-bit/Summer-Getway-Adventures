import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import type { DayPlan } from '../types/travel.ts';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('customer'), // 'admin' | 'customer'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const destinations = pgTable('destinations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  country: text('country').notNull(),
  region: text('region').notNull(), // 'kenya' | 'middle-east' | 'south-asia' | 'global'
  category: text('category').notNull(),
  description: text('description').notNull().default(''),
  imageUrl: text('image_url'),
  isFeatured: boolean('is_featured').notNull().default(false),
  linkedTripId: text('linked_trip_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const hotels = pgTable('hotels', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  location: text('location').notNull(),
  country: text('country').notNull(),
  category: text('category').notNull(),
  roomDetails: text('room_details').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const vehicles = pgTable('vehicles', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  registrationPlate: text('registration_plate'),
  capacityLabel: text('capacity_label').notNull(),
  capacitySeats: integer('capacity_seats').notNull().default(7),
  bestFor: text('best_for').notNull(),
  imageUrl: text('image_url'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const mealPackages = pgTable('meal_packages', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  basis: text('basis').notNull(),
  description: text('description').notNull(),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const trips = pgTable('trips', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),
  title: text('title').notNull(),
  region: text('region').notNull(),
  country: text('country').notNull(),
  destination: text('destination').notNull(),
  category: text('category').notNull().default('Scheduled Safari & Tour'),
  departureHub: text('departure_hub').notNull(),
  durationDays: integer('duration_days').notNull(),
  nights: integer('nights').notNull(),
  imageUrl: text('image_url').notNull(),
  imageAlt: text('image_alt').notNull(),
  summary: text('summary').notNull(),
  transportMode: text('transport_mode').notNull(),
  transportDetail: text('transport_detail').notNull(),
  hotelName: text('hotel_name'),
  hotelCategory: text('hotel_category'),
  accommodationDetail: text('accommodation_detail').notNull(),
  mealPlan: text('meal_plan').notNull(),
  singleSupplementUsd: integer('single_supplement_usd').notNull().default(0),
  singleSupplementKes: integer('single_supplement_kes'),
  guidedHighlight: text('guided_highlight').notNull(),
  inclusions: jsonb('inclusions').$type<string[]>().notNull().default([]),
  exclusions: jsonb('exclusions').$type<string[]>().notNull().default([]),
  itinerary: jsonb('itinerary').$type<DayPlan[]>().notNull().default([]),
  isFeatured: boolean('is_featured').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const departures = pgTable('departures', {
  id: text('id').primaryKey(),
  tripId: text('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  monthKey: text('month_key').notNull(),
  dateLabel: text('date_label').notNull(),
  seatsTotal: integer('seats_total').notNull(),
  seatsRemaining: integer('seats_remaining').notNull(),
  priceUsd: integer('price_usd').notNull(),
  priceKes: integer('price_kes'),
  kidPriceUsd: integer('kid_price_usd'),
  kidPriceKes: integer('kid_price_kes'),
  extraNightUsd: integer('extra_night_usd'),
  extraNightKes: integer('extra_night_kes'),
  minDepositUsd: integer('min_deposit_usd'),
  minDepositKes: integer('min_deposit_kes'),
  paybillNumber: text('paybill_number'),
  paybillAccount: text('paybill_account'),
  isFeaturedEvent: boolean('is_featured_event').notNull().default(false),
  status: text('status').notNull().default('Open'), // 'Open' | 'Few Seats' | 'Sold Out'
});

export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  reference: text('reference').notNull().unique(),
  userUid: text('user_uid'),
  tripId: text('trip_id')
    .notNull()
    .references(() => trips.id),
  departureId: text('departure_id')
    .notNull()
    .references(() => departures.id),
  tripCode: text('trip_code').notNull(),
  tripTitle: text('trip_title').notNull(),
  destination: text('destination').notNull(),
  dateLabel: text('date_label').notNull(),
  durationDays: integer('duration_days').notNull(),
  nights: integer('nights').notNull(),
  travelers: integer('travelers').notNull(),
  kids: integer('kids').notNull().default(0),
  extraNights: integer('extra_nights').notNull().default(0),
  singleSupplement: boolean('single_supplement').notNull().default(false),
  transportMode: text('transport_mode').notNull(),
  hotelName: text('hotel_name'),
  mealPlan: text('meal_plan').notNull(),
  bookingChannel: text('booking_channel').notNull().default('online'), // 'online' | 'whatsapp' | 'phone' | 'walk-in'
  status: text('status').notNull().default('Confirmed'), // 'Confirmed' | 'Pending Deposit' | 'Cancelled' | 'Completed'
  totalUsd: integer('total_usd').notNull(),
  totalKes: integer('total_kes').notNull(),
  depositDueUsd: integer('deposit_due_usd').notNull(),
  depositDueKes: integer('deposit_due_kes').notNull(),
  amountPaidUsd: integer('amount_paid_usd').notNull(),
  amountPaidKes: integer('amount_paid_kes').notNull(),
  balanceDueUsd: integer('balance_due_usd').notNull(),
  balanceDueKes: integer('balance_due_kes').notNull(),
  customerName: text('customer_name').notNull(),
  customerEmail: text('customer_email').notNull(),
  customerPhone: text('customer_phone').notNull(),
  notes: text('notes').notNull().default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  bookingId: integer('booking_id')
    .notNull()
    .references(() => bookings.id, { onDelete: 'cascade' }),
  transactionId: text('transaction_id').notNull().unique(),
  method: text('method').notNull(), // 'card' | 'mpesa' | 'paybill_manual' | 'cash'
  paymentOption: text('payment_option').notNull(), // 'deposit' | 'full' | 'balance_settlement'
  amountUsd: integer('amount_usd').notNull(),
  amountKes: integer('amount_kes').notNull(),
  maskedAccount: text('masked_account').notNull(),
  status: text('status').notNull().default('Paid'),
  paidAt: timestamp('paid_at').defaultNow().notNull(),
});

export const reviews = pgTable('reviews', {
  id: text('id').primaryKey(),
  tripId: text('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  tripTitle: text('trip_title').notNull(),
  reviewerName: text('reviewer_name').notNull(),
  reviewerLocation: text('reviewer_location').notNull().default('Kenya'),
  completedMonth: text('completed_month').notNull(),
  rating: integer('rating').notNull(),
  title: text('title').notNull(),
  comment: text('comment').notNull(),
  photos: jsonb('photos').$type<string[]>().notNull().default([]),
  verifiedBooking: boolean('verified_booking').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const inquiries = pgTable('inquiries', {
  id: serial('id').primaryKey(),
  reference: text('reference').notNull().unique(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  channel: text('channel').notNull().default('web'), // 'web' | 'whatsapp'
  region: text('region').notNull(),
  destinationInterest: text('destination_interest').notNull().default(''),
  vehiclePreference: text('vehicle_preference').notNull().default(''),
  preferredMonth: text('preferred_month').notNull(),
  groupSize: integer('group_size').notNull(),
  notes: text('notes').notNull().default(''),
  status: text('status').notNull().default('New'), // 'New' | 'Contacted' | 'Quoted' | 'Closed'
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Drizzle Relations
export const tripsRelations = relations(trips, ({ many }) => ({
  departures: many(departures),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const departuresRelations = relations(departures, ({ one, many }) => ({
  trip: one(trips, {
    fields: [departures.tripId],
    references: [trips.id],
  }),
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  trip: one(trips, {
    fields: [bookings.tripId],
    references: [trips.id],
  }),
  departure: one(departures, {
    fields: [bookings.departureId],
    references: [departures.id],
  }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, {
    fields: [payments.bookingId],
    references: [bookings.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  trip: one(trips, {
    fields: [reviews.tripId],
    references: [trips.id],
  }),
}));
