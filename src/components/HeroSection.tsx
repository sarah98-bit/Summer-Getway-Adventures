import { HERO_IMAGE_URL } from '../data/trips';
import { TripImage } from './TripImage';

interface HeroSectionProps {
  onExploreDates: () => void;
}

export function HeroSection({ onExploreDates }: HeroSectionProps) {
  return (
    <section id="top" className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-between py-2">
            <div>
              <p className="text-sm font-medium text-teal-800 mb-4">
                Nairobi, Kenya · Domestic, Middle East &amp; South Asia Departures
              </p>

              <h1
                className="font-display font-semibold tracking-tight text-slate-900 leading-[1.12] mb-6"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)' }}
              >
                Scheduled journeys from Nairobi to Kenya, the Middle East &amp; South Asia.
              </h1>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl mb-8">
                Every departure runs on published calendar dates with certified guided tour
                experiences. Whenever an itinerary lasts more than a day, we coordinate
                location-matched transport, hotel bookings, and half-board dining from start to
                finish.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-5 pt-2">
              <button
                type="button"
                onClick={onExploreDates}
                className="px-6 py-3 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
              >
                Explore Upcoming Dates
              </button>
              <a
                href="#fleet"
                className="text-sm font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4 py-2 whitespace-nowrap shrink-0"
              >
                Diani X-Mass &amp; Fleet
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-72 sm:h-96 lg:h-full min-h-[340px] rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
              <TripImage
                src={HERO_IMAGE_URL}
                alt="4x4 Safari Land Cruiser on a sunlit ridge overlooking the Maasai Mara savannah in Kenya"
                label="Maasai Mara Savannah Expedition"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-transparent p-5 sm:p-6">
                <p className="text-xs font-mono text-slate-200 tracking-wide">
                  KE-MAR-03 · Departing Koinange St, Nairobi
                </p>
                <p className="text-sm sm:text-base font-medium text-white mt-1">
                  4x4 Land Cruisers, Reserve Lodges, Half Board &amp; Silver-Certified Guides
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width 4-column operational standard strip */}
        <div className="mt-10 pt-8 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-xs font-mono text-slate-500">01 · Origin &amp; Reach</p>
            <p className="text-base font-semibold text-slate-900 mt-1">
              Koinange St &amp; JKIA Hub
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Scheduled Kenya events plus 2026 Middle East, South Asia &amp; island routes.
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-slate-500">02 · Dedicated Fleet</p>
            <p className="text-base font-semibold text-slate-900 mt-1">
              Cruisers, Vans &amp; Coaches
            </p>
            <p className="text-sm text-slate-600 mt-1">
              4x4 Land Cruisers, 7–14 seat vans, 27–50 seat buses, SGR rail, and flights.
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-slate-500">03 · Multi-Day Standard</p>
            <p className="text-base font-semibold text-slate-900 mt-1">
              Hotels &amp; Half Board
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Every trip over 1 day includes vetted hotels plus daily breakfast and dinner.
            </p>
          </div>
          <div>
            <p className="text-xs font-mono text-slate-500">04 · Every Itinerary</p>
            <p className="text-base font-semibold text-slate-900 mt-1">
              Guided Tour Experiences
            </p>
            <p className="text-sm text-slate-600 mt-1">
              Naturalists and licensed local guides lead all listed day and overnight trips.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
