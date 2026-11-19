import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, ExternalLink, MessageCircle } from 'lucide-react';
import { COMPANY_INFO, FLEET_VEHICLES } from '../data/trips';
import type { CustomInquiryInput, Region } from '../types/travel';
import {
  buildWhatsAppLink,
  validateInquiryInput,
  type InquiryValidationErrors,
} from '../utils/trips';

interface AboutAndInquirySectionProps {
  prefilledVehicle?: string;
  prefilledDestination?: string;
  prefilledRegion?: Region;
  prefillVersion?: number;
}

export function AboutAndInquirySection({
  prefilledVehicle = '',
  prefilledDestination = '',
  prefilledRegion,
  prefillVersion = 0,
}: AboutAndInquirySectionProps) {
  const [form, setForm] = useState<CustomInquiryInput>({
    name: '',
    email: '',
    phone: '',
    region: prefilledRegion ?? 'kenya',
    preferredMonth: '2026-12',
    groupSize: 6,
    vehiclePreference: prefilledVehicle || 'No preference / Included in package',
    destinationInterest: prefilledDestination,
    notes: '',
  });
  const [errors, setErrors] = useState<InquiryValidationErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);

  useEffect(() => {
    if (prefillVersion === 0) return;
    setSubmittedRef(null);
    setForm((prev) => ({
      ...prev,
      region: prefilledRegion ?? prev.region,
      vehiclePreference: prefilledVehicle || prev.vehiclePreference,
      destinationInterest: prefilledDestination || prev.destinationInterest,
    }));
  }, [prefillVersion, prefilledVehicle, prefilledDestination, prefilledRegion]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const validation = validateInquiryInput(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, channel: 'web' }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        throw new Error(data.error || 'Could not submit inquiry.');
      }
      setSubmittedRef(data.inquiry?.reference ?? `INQ-${Math.floor(1000 + Math.random() * 9000)}`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to send inquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappDirectUrl = buildWhatsAppLink(
    `Hello Summer Getaway Adventures! I would like assistance with ${
      form.destinationInterest || 'an upcoming trip'
    } (${form.groupSize} travelers, ${form.preferredMonth}).`,
  );

  return (
    <section id="about" className="py-16 lg:py-20 bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Nairobi Headquarters & WhatsApp Support */}
          <div className="lg:col-span-6 space-y-8">
            <div>
              <p className="text-sm font-medium text-teal-800 mb-2">
                Contact &amp; Customer Support · Koinange Street, Nairobi
              </p>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
                Nairobi dispatch desk linking domestic parks, Diani SGR, and 2026 global routes.
              </h2>
              <p className="text-base text-slate-600 mt-4 leading-relaxed">
                Visit our operations office at{' '}
                <span className="font-medium text-slate-900">{COMPANY_INFO.officeAddress}</span>.
                Book directly online or connect with our coordinators on WhatsApp or phone for
                custom group departures and vehicle charters.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-sm font-semibold text-slate-900">
                Direct WhatsApp Desk, Phone Lines &amp; M-Pesa Paybill
              </h3>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Bookings &amp; Transport Dispatch Lines
                  </p>
                  <p className="font-mono text-sm text-teal-800 font-medium mt-0.5">
                    {COMPANY_INFO.phones.join(' | ')}
                  </p>
                  <p className="text-sm text-slate-600 leading-relaxed mt-1">
                    Direct WhatsApp &amp; phone desk for scheduled tours, manual bookings, 4x4 Land
                    Cruisers, 7–50 seater charters, and corporate retreats.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-1">
                  <a
                    href={whatsappDirectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    <span>Chat on WhatsApp (+254 724 794 548)</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                  <a
                    href="tel:+254724794548"
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-800 bg-white border border-slate-300 hover:bg-slate-100 rounded-md transition-colors"
                  >
                    Call Nairobi Desk
                  </a>
                </div>
              </div>

              <div className="p-5 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                <p className="text-sm font-semibold text-slate-900">
                  M-Pesa Paybill &amp; One-Year Rebooking Flexibility
                </p>
                <p className="font-mono text-xs text-slate-800">
                  Paybill: {COMPANY_INFO.mpesaPaybill} · Website: {COMPANY_INFO.website}
                </p>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {COMPANY_INFO.bookingPolicy}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Private / Custom Group Date & Charter Inquiry */}
          <div className="lg:col-span-6">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 sm:p-8">
              <h3 className="font-display text-2xl font-semibold text-slate-900">
                Request Custom Dates, Support or Vehicle Charter
              </h3>
              <p className="text-sm text-slate-600 mt-1.5 mb-6">
                Planning a 2026 international getaway, private group safari, or bus charter? Our
                Cianda House desk logs your request directly and replies within one business day.
              </p>

              {submittedRef ? (
                <div
                  role="status"
                  data-testid="inquiry-confirmation"
                  className="p-6 bg-teal-50/70 border border-teal-200 rounded-md space-y-3"
                >
                  <div className="flex items-center gap-2 text-teal-900 font-semibold">
                    <CheckCircle2 className="w-5 h-5 text-teal-700" aria-hidden="true" />
                    <span>Customer Inquiry Saved ({submittedRef})</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Thank you, <span className="font-medium">{form.name}</span>. Our Koinange
                    Street operations desk has recorded your {form.groupSize}-person request for{' '}
                    <span className="font-medium">
                      {form.destinationInterest || form.region.replace('-', ' ').toUpperCase()}
                    </span>{' '}
                    ({form.preferredMonth}, {form.vehiclePreference}) and will send pricing to{' '}
                    <span className="font-medium">{form.email}</span>.
                  </p>
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setSubmittedRef(null)}
                      className="px-4 py-2 text-xs font-semibold text-teal-900 bg-white border border-teal-300 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
                    >
                      Submit Another Inquiry
                    </button>
                    <a
                      href={buildWhatsAppLink(
                        `Hi Summer Getaway Adventures, I just logged inquiry ${submittedRef} for ${
                          form.destinationInterest || form.region
                        }.`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors"
                    >
                      <span>Follow Up on WhatsApp</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="inq-name"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Full Name or Organization
                      </label>
                      <input
                        id="inq-name"
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="e.g. Sarah Thuo"
                        className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                      {errors.name && (
                        <p className="text-xs text-red-700 mt-1">{errors.name}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="inq-email"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Email Address
                      </label>
                      <input
                        id="inq-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="name@example.com"
                        className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                      {errors.email && (
                        <p className="text-xs text-red-700 mt-1">{errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="inq-phone"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Phone / WhatsApp
                      </label>
                      <input
                        id="inq-phone"
                        type="tel"
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="0724 794 548"
                        className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                      {errors.phone && (
                        <p className="text-xs text-red-700 mt-1">{errors.phone}</p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="inq-region"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Destination Region
                      </label>
                      <select
                        id="inq-region"
                        value={form.region}
                        onChange={(e) =>
                          setForm({ ...form, region: e.target.value as Region })
                        }
                        className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      >
                        <option value="kenya">Kenya &amp; East Africa</option>
                        <option value="middle-east">Middle East (Dubai / Oman)</option>
                        <option value="south-asia">South Asia &amp; Islands (Maldives / Bali / Thailand)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="inq-destination"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        2026 Destination / Event
                      </label>
                      <input
                        id="inq-destination"
                        type="text"
                        value={form.destinationInterest ?? ''}
                        onChange={(e) =>
                          setForm({ ...form, destinationInterest: e.target.value })
                        }
                        placeholder="e.g. Diani X-Mass, Maldives, Zanzibar"
                        className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="inq-vehicle"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Vehicle / Fleet Preference
                      </label>
                      <select
                        id="inq-vehicle"
                        value={form.vehiclePreference ?? ''}
                        onChange={(e) =>
                          setForm({ ...form, vehiclePreference: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      >
                        <option value="No preference / Included in package">
                          Included in package
                        </option>
                        {FLEET_VEHICLES.map((v) => (
                          <option key={v.id} value={v.name}>
                            {v.name}
                          </option>
                        ))}
                        <option value="SGR Train + Coastal Transfers">
                          SGR Train + Coastal Transfers
                        </option>
                        <option value="International Flight Package">
                          International Flight Package
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="inq-month"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Preferred Travel Month
                      </label>
                      <input
                        id="inq-month"
                        type="month"
                        value={form.preferredMonth}
                        onChange={(e) =>
                          setForm({ ...form, preferredMonth: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="inq-size"
                        className="block text-xs font-semibold text-slate-700 mb-1"
                      >
                        Group Size (Travelers)
                      </label>
                      <input
                        id="inq-size"
                        type="number"
                        min={2}
                        max={60}
                        value={form.groupSize}
                        onChange={(e) =>
                          setForm({ ...form, groupSize: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-700"
                      />
                      {errors.groupSize && (
                        <p className="text-xs text-red-700 mt-1">{errors.groupSize}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="inq-notes"
                      className="block text-xs font-semibold text-slate-700 mb-1"
                    >
                      Itinerary &amp; Accommodation Notes (Optional)
                    </label>
                    <textarea
                      id="inq-notes"
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Specify pickup at Cianda House Koinange St, dietary requirements, or exact dates..."
                      className="w-full px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
                    />
                  </div>

                  {submitError && (
                    <p role="alert" className="text-xs text-red-700">
                      {submitError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-5 py-3 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
                  >
                    {submitting ? 'Sending Inquiry...' : 'Request Custom Group Quote'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
