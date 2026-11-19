import { count } from 'drizzle-orm';
import { SEED_REVIEWS } from '../data/reviews.ts';
import {
  DESTINATIONS_2026,
  FLEET_VEHICLES,
  TRIPS,
} from '../data/trips.ts';
import {
  db,
  departures,
  destinations,
  hotels,
  mealPackages,
  reviews,
  trips,
  vehicles,
} from './index.ts';

let seedPromise: Promise<void> | null = null;
let seededConfirmed = false;

const DEFAULT_INCLUSIONS_BY_TRIP: Record<string, string[]> = {
  'kenya-diani-wasini': [
    '3 nights accommodation at Diani Reef Beach Resort & Spa',
    'To-and-fro SGR economy train tickets & SGR coastal transfers',
    'Meals on Half Board (daily breakfast & dinner)',
    'Unlimited professional photography',
    'Unlimited beach & resort pool access',
    'Guided kayaking at Kongo River & visit to Wakawaka Island',
  ],
  'kenya-mara-conservancy': [
    '2 nights en-suite safari lodge accommodation',
    'Round-trip 4x4 pop-up roof Safari Land Cruiser from Koinange St',
    'Meals on Half Board (daily breakfast & dinner)',
    'Guided game drives with certified KPSGA naturalist',
  ],
  'kenya-hells-gate-day': [
    'Round-trip 14-seater air-conditioned tour van from Nairobi',
    'Guided cycling & Lower Gorge canyon hike',
    '1-hour Lake Naivasha guided boat excursion',
    'Bottled water & trail refreshments',
  ],
  'me-dubai-abudhabi': [
    'Return economy flights (NBO–DXB) & airport transfers',
    '4 nights 4-star heritage accommodation along Dubai Creek',
    'Meals on Half Board (breakfast & dinner)',
    'Guided Dubai Creek, Burj Khalifa, desert 4x4 & Abu Dhabi Mosque tours',
  ],
  'me-oman-muscat-wadi': [
    'Return economy flights (NBO–MCT) & 4x4 mountain SUV transport',
    '5 nights coastal, Wahiba desert camp & Nizwa mountain stays',
    'Meals on Half Board (breakfast & dinner)',
    'Guided Sultan Qaboos Mosque, Wadi Shab trek & Nizwa Fort tours',
  ],
  'sa-srilanka-tea-galle': [
    'Return flights (NBO–CMB), private coach & scenic hill-country train',
    '6 nights boutique heritage & mountain hotels',
    'Meals on Half Board (breakfast & dinner)',
    'Guided Sigiriya Citadel, tea estate & Galle Dutch Fort tours',
  ],
};

const DEFAULT_EXCLUSIONS_BY_TRIP: Record<string, string[]> = {
  'kenya-diani-wasini': [
    'Single room supplement (KES 15,000)',
    'Extra nights extension (KES 6,500 per person/night)',
    'Lunches, drinks & items of personal nature',
  ],
  'kenya-hells-gate-day': [
    'Park conservation entry fees & personal lunch',
    'Overnight hotel stay (same-day Nairobi return)',
  ],
};

function getRegionForGlobalDest(category: string): string {
  if (category === 'Middle East') return 'middle-east';
  if (category === 'East Africa Coast' || category === 'Southern Africa') return 'kenya';
  if (category === 'South Asia' || category === 'Southeast Asia') return 'south-asia';
  return 'global';
}

function getCountryForGlobalDest(name: string): string {
  const map: Record<string, string> = {
    Dubai: 'United Arab Emirates',
    Maldives: 'Maldives',
    Thailand: 'Thailand',
    Bali: 'Indonesia',
    Malaysia: 'Malaysia',
    Singapore: 'Singapore',
    Seychelles: 'Seychelles',
    Mauritius: 'Mauritius',
    Zanzibar: 'Tanzania',
    'Cape Town': 'South Africa',
    Paris: 'France',
    Cruising: 'International Waters',
  };
  return map[name] ?? name;
}

async function runInitialSeed(): Promise<void> {
  const [{ value: tripCount }] = await db.select({ value: count() }).from(trips);
  if (Number(tripCount) > 0) {
    seededConfirmed = true;
    return;
  }

  // 1. Destinations
  const kenyaDomesticDests = [
    {
      id: 'dest-diani',
      name: 'Diani & Wasini Coast',
      country: 'Kenya',
      region: 'kenya',
      category: 'Kenya Coast',
      description: 'White coral sands, Kongo River kayaking, Wakawaka Island & SGR transfers.',
      imageUrl: '/src/assets/images/trip_diani_beach_1795079734643.jpg',
      isFeatured: true,
      linkedTripId: 'kenya-diani-wasini',
    },
    {
      id: 'dest-mara',
      name: 'Maasai Mara National Reserve',
      country: 'Kenya',
      region: 'kenya',
      category: 'Kenya Safari',
      description: 'Big-cat conservancy tracking in 4x4 pop-up roof Land Cruisers.',
      imageUrl: '/src/assets/images/hero_kenya_savannah_1795079736061.jpg',
      isFeatured: true,
      linkedTripId: 'kenya-mara-conservancy',
    },
    {
      id: 'dest-naivasha',
      name: "Naivasha & Hell's Gate",
      country: 'Kenya',
      region: 'kenya',
      category: 'Rift Valley Day Trip',
      description: 'Volcanic gorge hiking, cycling trails, and Lake Naivasha boat rides.',
      imageUrl: '/src/assets/images/trip_naivasha_gorge_1795079734738.jpg',
      isFeatured: false,
      linkedTripId: 'kenya-hells-gate-day',
    },
    {
      id: 'dest-oman',
      name: 'Muscat & Wadi Shab',
      country: 'Oman',
      region: 'middle-east',
      category: 'Middle East',
      description: 'Limestone canyon emerald pools, Wahiba dunes & Jebel Akhdar terraces.',
      imageUrl: '/src/assets/images/trip_oman_wadi_1795079736560.jpg',
      isFeatured: true,
      linkedTripId: 'me-oman-muscat-wadi',
    },
    {
      id: 'dest-srilanka',
      name: 'Sigiriya, Ella & Galle',
      country: 'Sri Lanka',
      region: 'south-asia',
      category: 'South Asia',
      description: 'UNESCO rock citadel, highland tea rail journey & Dutch coastal fort.',
      imageUrl: '/src/assets/images/trip_srilanka_highlands_1795079735669.jpg',
      isFeatured: true,
      linkedTripId: 'sa-srilanka-tea-galle',
    },
  ];

  const global2026Rows = DESTINATIONS_2026.map((d) => ({
    id: d.id,
    name: d.name,
    country: getCountryForGlobalDest(d.name),
    region: getRegionForGlobalDest(d.category),
    category: d.category,
    description: `2026 curated holiday packages from Nairobi to ${d.name}.`,
    imageUrl: null,
    isFeatured: d.name === 'Dubai' || d.name === 'Maldives' || d.name === 'Zanzibar',
    linkedTripId: d.linkedTripId ?? null,
  }));

  await db
    .insert(destinations)
    .values([...kenyaDomesticDests, ...global2026Rows])
    .onConflictDoNothing();

  // 2. Hotels
  await db
    .insert(hotels)
    .values([
      {
        id: 'htl-diani-reef',
        name: 'Diani Reef Beach Resort & Spa',
        location: 'Diani Beach, Kwale',
        country: 'Kenya',
        category: '4-Star Oceanfront Resort',
        roomDetails: 'Beachfront rooms with unlimited pool & beach access, Half Board meals.',
        active: true,
      },
      {
        id: 'htl-mara-sopa',
        name: 'Mara Sopa Lodge & Talek Bush Camp',
        location: 'Oloolaimutia, Maasai Mara',
        country: 'Kenya',
        category: 'Safari Lodge',
        roomDetails: 'En-suite stone-and-canvas cottages overlooking Oloolaimutia valley.',
        active: true,
      },
      {
        id: 'htl-al-seef',
        name: 'Al Seef Heritage Hotel & Canopy Creek',
        location: 'Al Seef Quarter, Dubai',
        country: 'United Arab Emirates',
        category: '4-Star Boutique Waterfront Hotel',
        roomDetails: 'Arabian courtyard rooms along Dubai Creek with rooftop pool.',
        active: true,
      },
      {
        id: 'htl-muscat-nizwa',
        name: 'Chedi-Quarter Boutique & Nizwa Heritage Inn',
        location: 'Muscat & Nizwa',
        country: 'Oman',
        category: '4-Star Coastal & Mountain Hotels',
        roomDetails: 'Coastal Muscat stay, Wahiba desert camp & Nizwa heritage inn.',
        active: true,
      },
      {
        id: 'htl-srilanka-circuit',
        name: 'Cinnamon Citadel Kandy, Ella Ridge & Galle Heritage Villa',
        location: 'Kandy, Ella & Galle',
        country: 'Sri Lanka',
        category: '4-Star Boutique Highland & Coastal Hotels',
        roomDetails: 'Riverside Kandy rooms, misty Ella ridge chalets & Galle Fort villas.',
        active: true,
      },
    ])
    .onConflictDoNothing();

  // 3. Vehicles
  await db
    .insert(vehicles)
    .values(
      FLEET_VEHICLES.map((v) => {
        const match = v.capacityLabel.match(/(\d+)/);
        const seats = match ? Number(match[1]) : 7;
        return {
          id: v.id,
          name: v.name,
          registrationPlate: v.id === '4x4-land-cruiser' ? 'KCY 395C' : null,
          capacityLabel: v.capacityLabel,
          capacitySeats: seats,
          bestFor: v.bestFor,
          imageUrl: v.imageUrl ?? null,
          active: true,
        };
      }),
    )
    .onConflictDoNothing();

  // 4. Meal Packages
  await db
    .insert(mealPackages)
    .values([
      {
        id: 'meal-half-board',
        name: 'Standard Half Board',
        basis: 'Half Board (Breakfast & Dinner)',
        description:
          'Included on all overnight domestic and international packages: daily buffet breakfast before tours and evening dinner at the booked hotel.',
        active: true,
      },
      {
        id: 'meal-day-refreshments',
        name: 'Day Excursion Refreshments',
        basis: 'Day Trip (Refreshments)',
        description:
          'Included on single-day Nairobi excursions: chilled drinking water and trail snacks during transit.',
        active: true,
      },
      {
        id: 'meal-full-board-upgrade',
        name: 'Full Board Group Upgrade',
        basis: 'Full Board (Breakfast, Lunch & Dinner)',
        description:
          'Available on request for private corporate retreats, safari lodges, and festive coastal charters.',
        active: true,
      },
    ])
    .onConflictDoNothing();

  // 5. Trips & Departures
  for (const trip of TRIPS) {
    await db
      .insert(trips)
      .values({
        id: trip.id,
        code: trip.code,
        title: trip.title,
        region: trip.region,
        country: trip.country,
        destination: trip.destination,
        category: trip.durationDays === 1 ? 'Day Excursion' : 'Overnight Package',
        departureHub: trip.departureHub,
        durationDays: trip.durationDays,
        nights: trip.nights,
        imageUrl: trip.imageUrl,
        imageAlt: trip.imageAlt,
        summary: trip.summary,
        transportMode: trip.transportMode,
        transportDetail: trip.transportDetail,
        hotelName: trip.hotelName,
        hotelCategory: trip.hotelCategory,
        accommodationDetail: trip.accommodationDetail,
        mealPlan: trip.mealPlan,
        singleSupplementUsd: trip.singleSupplementUsd,
        singleSupplementKes: trip.singleSupplementKes ?? null,
        guidedHighlight: trip.guidedHighlight,
        inclusions: DEFAULT_INCLUSIONS_BY_TRIP[trip.id] ?? [
          `${trip.transportMode} included`,
          `${trip.mealPlan} included`,
          trip.guidedHighlight,
        ],
        exclusions: DEFAULT_EXCLUSIONS_BY_TRIP[trip.id] ?? [
          'Personal travel insurance & visa fees where applicable',
          'Single room supplement & personal expenses',
        ],
        itinerary: trip.itinerary,
        isFeatured: trip.id === 'kenya-diani-wasini' || trip.id === 'kenya-mara-conservancy',
        active: true,
      })
      .onConflictDoNothing();

    for (const dep of trip.departures) {
      await db
        .insert(departures)
        .values({
          id: dep.id,
          tripId: trip.id,
          startDate: dep.startDate,
          endDate: dep.endDate,
          monthKey: dep.monthKey,
          dateLabel: dep.dateLabel,
          seatsTotal: dep.seatsTotal,
          seatsRemaining: dep.seatsRemaining,
          priceUsd: dep.priceUsd,
          priceKes: dep.priceKes ?? null,
          kidPriceUsd: dep.kidPriceUsd ?? null,
          kidPriceKes: dep.kidPriceKes ?? null,
          extraNightUsd: dep.extraNightUsd ?? null,
          extraNightKes: dep.extraNightKes ?? null,
          minDepositUsd: dep.minDepositUsd ?? null,
          minDepositKes: dep.minDepositKes ?? null,
          paybillNumber: dep.paybillNumber ?? null,
          paybillAccount: dep.paybillAccount ?? null,
          isFeaturedEvent: Boolean(dep.isFeaturedEvent),
          status: dep.status,
        })
        .onConflictDoNothing();
    }
  }

  // 6. Seed Reviews
  await db
    .insert(reviews)
    .values(
      SEED_REVIEWS.map((r) => ({
        id: r.id,
        tripId: r.tripId,
        tripTitle: r.tripTitle,
        reviewerName: r.reviewerName,
        reviewerLocation: r.reviewerLocation,
        completedMonth: r.completedMonth,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        photos: r.photos,
        verifiedBooking: r.verifiedBooking,
      })),
    )
    .onConflictDoNothing();

  seededConfirmed = true;
}

export async function ensureSeeded(): Promise<void> {
  if (seededConfirmed) return;
  if (!seedPromise) {
    seedPromise = runInitialSeed().finally(() => {
      seedPromise = null;
    });
  }
  await seedPromise;
}
