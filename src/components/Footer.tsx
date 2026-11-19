import { COMPANY_INFO } from '../data/trips';

export function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-800">
          <div className="md:col-span-5">
            <p className="font-display text-xl font-semibold text-white">
              {COMPANY_INFO.brandName}
            </p>
            <p className="text-xs font-mono text-teal-400 mt-1">{COMPANY_INFO.tagline}</p>
            <p className="text-sm text-slate-400 mt-3 max-w-sm leading-relaxed">
              Licensed Nairobi tour operator organizing domestic Kenya escapes, 2026 global routes,
              and dedicated 7–50 seater transport charters with vetted hotels, half-board meals,
              and guided tours.
            </p>
          </div>

          <div className="md:col-span-4 space-y-1.5 text-sm">
            <p className="font-semibold text-white mb-2">Nairobi Operations Office</p>
            <p>{COMPANY_INFO.officeAddress}</p>
            <p>Mon–Sat · 08:00 – 17:30 EAT</p>
            <p className="font-mono text-slate-200 pt-1">{COMPANY_INFO.website}</p>
            <p className="font-mono text-slate-200">{COMPANY_INFO.phones.join(' | ')}</p>
            <p className="font-mono text-xs text-teal-300 pt-1">
              M-Pesa Paybill: {COMPANY_INFO.mpesaPaybill}
            </p>
          </div>

          <div className="md:col-span-3 space-y-2 text-sm">
            <p className="font-semibold text-white mb-2">Explore</p>
            <ul className="space-y-2">
              <li>
                <a href="#trips" className="hover:text-white transition-colors">
                  Scheduled Trips
                </a>
              </li>
              <li>
                <a href="#fleet" className="hover:text-white transition-colors">
                  Diani X-Mass &amp; Fleet
                </a>
              </li>
              <li>
                <a href="#inclusions" className="hover:text-white transition-colors">
                  Half Board &amp; Transit
                </a>
              </li>
              <li>
                <a href="#about" className="hover:text-white transition-colors">
                  Custom Group Inquiry
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 {COMPANY_INFO.brandName} Ltd. Nairobi, Kenya.</p>
          <p>{COMPANY_INFO.bookingPolicy}</p>
        </div>
      </div>
    </footer>
  );
}
