import { useState } from 'react';
import { ArrowUpRight, Maximize2, X } from 'lucide-react';
import {
  COMPANY_INFO,
  DESTINATIONS_2026,
  FLEET_VEHICLES,
  FLYER_ASSETS,
} from '../data/trips';
import type { FleetVehicle, GlobalDestination2026 } from '../types/travel';
import { TripImage } from './TripImage';

interface FleetAndDestinationsSectionProps {
  vehicles?: FleetVehicle[];
  destinations2026?: GlobalDestination2026[];
  onBookDianiXmas: () => void;
  onCharterVehicle: (vehicleLabel: string) => void;
  onSelectDestination2026: (dest: GlobalDestination2026) => void;
}

export function FleetAndDestinationsSection({
  vehicles,
  destinations2026,
  onBookDianiXmas,
  onCharterVehicle,
  onSelectDestination2026,
}: FleetAndDestinationsSectionProps) {
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);
  const activeVehicles = vehicles && vehicles.length > 0 ? vehicles : FLEET_VEHICLES;
  const activeDestinations2026 =
    destinations2026 && destinations2026.length > 0 ? destinations2026 : DESTINATIONS_2026;

  return (
    <section
      id="fleet"
      aria-labelledby="featured-event-heading"
      className="py-16 lg:py-20 bg-white border-t border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* 1. Featured Upcoming Event: Diani X-Mass (24–27 Dec 2026) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div>
              <p className="text-sm font-medium text-teal-800 mb-2">
                Upcoming Event · 24–27 Dec 2026 · 4 Days / 3 Nights
              </p>
              <h2
                id="featured-event-heading"
                className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mb-4"
              >
                Diani X-Mass Coastal Package
              </h2>
              <p className="text-base text-slate-600 leading-relaxed mb-6">
                Celebrate Christmas on Diani Beach with to-and-fro Madaraka Express SGR tickets,
                private coastal transfers, 3 nights half-board accommodation, unlimited pool and
                beach access, Kongo River kayaking, Wakawaka Island boat excursion, and unlimited
                professional photography.
              </p>

              {/* Pricing & Paybill Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-slate-50 border border-slate-200 rounded-lg mb-6">
                <div>
                  <span className="block text-xs text-slate-500">Per Person Sharing</span>
                  <span className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                    KES 33,500
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500">Cost Per Kid</span>
                  <span className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                    KES 31,500
                  </span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500">Extra Night</span>
                  <span className="font-mono text-lg font-semibold text-slate-900 tabular-nums">
                    KES 6,500
                  </span>
                  <span className="block text-xs text-slate-500">/person/night</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500">Book With Only</span>
                  <span className="font-mono text-lg font-semibold text-teal-800 tabular-nums">
                    KES 10,000
                  </span>
                  <span className="block text-xs font-mono text-slate-600">
                    Paybill {COMPANY_INFO.mpesaPaybill} · DIANI
                  </span>
                </div>
              </div>

              {/* Inclusions & Exclusions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm mb-6">
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wide text-teal-800 font-semibold mb-2">
                    Package Cost Includes
                  </h3>
                  <ul className="space-y-1.5 text-slate-700 list-disc pl-4">
                    <li>3 nights coastal hotel accommodation</li>
                    <li>To &amp; fro SGR economy tickets + SGR transfers</li>
                    <li>Daily meals on Half Board basis</li>
                    <li>Unlimited professional photography</li>
                    <li>Unlimited beach &amp; resort pool experience</li>
                    <li>Guided kayaking at Kongo River</li>
                    <li>Guided excursion to Wakawaka Island</li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wide text-slate-600 font-semibold mb-2">
                      Package Excludes
                    </h3>
                    <ul className="space-y-1.5 text-slate-600 list-disc pl-4">
                      <li>Single room supplement: KES 15,000</li>
                      <li>Items not listed in package inclusions</li>
                    </ul>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-900">Booking Policy &amp; Desk</p>
                    <p>{COMPANY_INFO.bookingPolicy}</p>
                    <p className="font-mono text-slate-700 pt-1">
                      Bookings: {COMPANY_INFO.phones.join(' | ')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={onBookDianiXmas}
                className="px-5 py-3 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                Book Diani X-Mass (KES 33,500)
              </button>
              <button
                type="button"
                onClick={() =>
                  setLightbox({
                    src: FLYER_ASSETS.dianiXmas,
                    title: 'Diani X-Mass 4 Days / 3 Nights Official Flyer (24–27 Dec 2026)',
                  })
                }
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Maximize2 className="w-4 h-4" aria-hidden="true" />
                <span>View Event Flyer</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <button
              type="button"
              onClick={() =>
                setLightbox({
                  src: FLYER_ASSETS.dianiXmas,
                  title: 'Diani X-Mass 4 Days / 3 Nights Official Flyer (24–27 Dec 2026)',
                })
              }
              aria-label="Open full Diani X-Mass event flyer"
              className="group flex-1 flex flex-col w-full rounded-lg overflow-hidden border border-slate-200 bg-white text-left cursor-pointer"
            >
              <div className="relative flex-1 min-h-[320px] aspect-square w-full overflow-hidden bg-slate-100">
                <TripImage
                  src={FLYER_ASSETS.dianiXmas}
                  alt="Summer Getaway Adventures Diani X-Mass 4 Days 3 Nights Package flyer for 24 to 27 December 2026"
                  label="Diani X-Mass 24–27 Dec 2026"
                  className="w-full h-full object-cover object-[50%_47%] scale-[1.04] transition-transform duration-300 group-hover:scale-[1.07]"
                />
              </div>
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-mono text-teal-800">
                    M-Pesa Paybill {COMPANY_INFO.mpesaPaybill} · Acc: DIANI
                  </p>
                  <p className="text-sm font-medium text-slate-900">
                    Click to inspect full event poster
                  </p>
                </div>
                <Maximize2 className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
              </div>
            </button>
          </div>
        </div>

        {/* 2. Transport Services Fleet: Within Kenya & Beyond */}
        <div className="pt-16 border-t border-slate-200 space-y-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <p className="text-sm font-medium text-teal-800 mb-2">
                Dedicated Company Transport · Within Kenya &amp; Beyond
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
                Safari Land Cruisers, Tour Vans &amp; Coach Fleet
              </h2>
            </div>

            <button
              type="button"
              onClick={() =>
                setLightbox({
                  src: FLYER_ASSETS.transportFleet,
                  title: 'Summer Getaway Adventures — Transport Services Available Flyer',
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" aria-hidden="true" />
              <span>View Transport Flyer</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="aspect-[3/2] w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-900 relative">
                <TripImage
                  src={FLYER_ASSETS.landCruiserKcy395c}
                  alt="Summer Getaway Adventures branded beige Toyota Land Cruiser 4x4 safari vehicle KCY 395C with open doors in the Kenyan bush"
                  label="4x4 Safari Land Cruiser KCY 395C"
                  className="w-full h-full object-cover object-center scale-[1.08]"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 via-slate-950/35 to-transparent p-4">
                  <p className="text-xs font-mono text-slate-200">
                    Unit KCY 395C · Company-Branded Overland Cruiser
                  </p>
                  <p className="text-sm font-medium text-white">
                    4x4 Safari Land Cruiser ready for Kenya &amp; cross-border safaris
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setLightbox({
                    src: FLYER_ASSETS.transportFleet,
                    title: 'Transport Services Available — Full Fleet Flyer',
                  })
                }
                className="flex items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-lg text-left hover:border-slate-300 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-16 h-16 rounded overflow-hidden border border-slate-200 bg-slate-900 shrink-0">
                    <TripImage
                      src={FLYER_ASSETS.transportFleet}
                      alt="Summer Getaway Adventures Transport Services flyer thumbnail"
                      label="Transport Services"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      Private Vehicle Hire &amp; Group Transfers
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      7-seater vans through 50-seater tour buses · {COMPANY_INFO.website}
                    </p>
                  </div>
                </div>
                <Maximize2 className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
              </button>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="p-5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between gap-4"
                >
                  <div>
                    <p className="font-mono text-xs font-medium text-teal-800">
                      {vehicle.capacityLabel}
                    </p>
                    <h3 className="text-base font-semibold text-slate-900 mt-1">
                      {vehicle.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                      {vehicle.bestFor}
                    </p>
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => onCharterVehicle(vehicle.name)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:text-teal-900 underline underline-offset-4 cursor-pointer"
                    >
                      <span>Charter {vehicle.capacityLabel}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. 2026 Travel Plans: Global & Regional Destinations */}
        <div className="pt-16 border-t border-slate-200 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-5">
              <button
                type="button"
                onClick={() =>
                  setLightbox({
                    src: FLYER_ASSETS.destinations2026,
                    title: "What's Your 2026 Travel Plans? — 12 Featured Destinations",
                  })
                }
                aria-label="Open full 2026 Travel Plans destination flyer"
                className="group flex flex-col w-full rounded-lg overflow-hidden border border-slate-200 bg-white text-left cursor-pointer"
              >
                <div className="aspect-square w-full overflow-hidden bg-slate-100">
                  <TripImage
                    src={FLYER_ASSETS.destinations2026}
                    alt="Summer Getaway Adventures 2026 travel plans flyer showcasing Thailand, Maldives, Seychelles, Mauritius, Cape Town, Zanzibar, Dubai, Paris, Bali, Malaysia, Singapore, and Cruising"
                    label="2026 Travel Plans"
                    className="w-full h-full object-cover object-center scale-[1.04] transition-transform duration-300 group-hover:scale-[1.07]"
                  />
                </div>
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-mono text-teal-800">
                      12 International &amp; Ocean Circuits
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      Inspect 2026 travel plans poster
                    </p>
                  </div>
                  <Maximize2 className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
                </div>
              </button>
            </div>

            <div className="lg:col-span-7 space-y-6">
              <div>
                <p className="text-sm font-medium text-teal-800 mb-2">
                  2026 International Portfolio · Plan With Us Today
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
                  12 Global &amp; Coastal Destinations for 2026
                </h2>
                <p className="text-base text-slate-600 mt-3 leading-relaxed">
                  Alongside our scheduled Kenya, UAE, Oman, and Sri Lanka departures, our Koinange
                  Street desk coordinates return flights, airport transfers, half-board hotel stays,
                  and guided tours across 12 sought-after 2026 routes.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activeDestinations2026.map((dest) => (
                  <button
                    key={dest.id}
                    type="button"
                    onClick={() => onSelectDestination2026(dest)}
                    className="p-3.5 bg-slate-50 hover:bg-teal-50/50 border border-slate-200 hover:border-teal-700 rounded-md text-left transition-colors cursor-pointer group"
                  >
                    <span className="block text-xs text-slate-500">{dest.category}</span>
                    <span className="mt-0.5 flex items-center justify-between gap-2 text-sm font-semibold text-slate-900">
                      <span>{dest.name}</span>
                      <ArrowUpRight
                        className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-800 shrink-0"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="block text-xs text-teal-800 mt-1">
                      {dest.linkedTripId ? 'View itinerary' : 'Request quote'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Flyer Lightbox Dialog */}
      {lightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.title}
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-slate-950/85 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-2xl w-full bg-white rounded-lg overflow-hidden shadow-xl border border-slate-200"
          >
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-4">
              <p className="text-sm font-semibold text-slate-900 truncate">{lightbox.title}</p>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                aria-label="Close flyer preview"
                className="w-9 h-9 inline-flex items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-950 flex items-center justify-center">
              <img
                src={lightbox.src}
                alt={lightbox.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[78vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
