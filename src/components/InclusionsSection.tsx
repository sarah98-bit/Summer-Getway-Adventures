export function InclusionsSection() {
  const pillars = [
    {
      index: '01.',
      title: 'Location-Matched Transport',
      appliesTo: 'All Trips · Scaled to Terrain',
      body: 'Transport is selected specifically for each route. Domestic safaris run in pop-up roof 4x4 Land Cruisers from Westlands; coastal retreats combine First-Class SGR rail with private resort vans; Middle East and South Asia trips include return JKIA flights, airport transfers, and private touring coaches.',
    },
    {
      index: '02.',
      title: 'Vetted Hotel Bookings',
      appliesTo: 'Trips Over 1 Day (Overnight)',
      body: 'Whenever an itinerary extends overnight, accommodation is booked and confirmed before your departure date—ranging from Maasai Mara safari lodges and Diani oceanfront resorts to 4-star heritage hotels in Dubai, Muscat, Kandy, and Galle.',
    },
    {
      index: '03.',
      title: 'Half Board Dining Basis',
      appliesTo: 'Trips Over 1 Day (Overnight)',
      body: 'All multi-day packages operate on a Half Board basis: daily breakfast before morning excursions and seated dinner each evening at your hotel or desert camp, keeping midday hours flexible for local lunches along the route.',
    },
    {
      index: '04.',
      title: 'Guided Tour Experiences',
      appliesTo: '100% of Listed Itineraries',
      body: 'Every trip on our calendar—both single-day Rift Valley excursions and week-long international circuits—is led by vetted driver-guides, marine naturalists, or licensed regional heritage specialists.',
    },
  ];

  return (
    <section id="inclusions" className="bg-white border-y border-slate-200 py-16 lg:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <p className="text-sm font-medium text-teal-800 mb-2">
            How Every Departure Is Structured
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
            Clear logistics for both day excursions and overnight expeditions.
          </h2>
          <p className="text-base text-slate-600 mt-3 leading-relaxed">
            No hidden transport transfers or unbooked hotel nights. Here is what our Nairobi
            operations desk guarantees on every published departure date.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {pillars.map((item) => (
            <div
              key={item.index}
              className="p-6 sm:p-8 rounded-lg border border-slate-200 bg-slate-50/70 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-baseline justify-between gap-4 mb-3">
                  <span className="font-mono text-sm font-medium text-teal-800">
                    {item.index}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {item.appliesTo}
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2.5">
                  {item.title}
                </h3>
                <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
