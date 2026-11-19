import { useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import type { Trip, TripReview } from '../types/travel';
import { ReviewForm } from './ReviewForm';
import { TripImage } from './TripImage';

interface ReviewsSectionProps {
  trips: Trip[];
  reviews: TripReview[];
  onSelectTripById: (tripId: string) => void;
  onSubmitReview: (payload: {
    tripId: string;
    reviewerName: string;
    reviewerLocation: string;
    completedMonth: string;
    bookingReference: string;
    completedTripConfirmed: boolean;
    rating: number;
    title: string;
    comment: string;
    photos: string[];
  }) => Promise<TripReview>;
}

export function ReviewsSection({
  trips,
  reviews,
  onSelectTripById,
  onSubmitReview,
}: ReviewsSectionProps) {
  const [filterTripId, setFilterTripId] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);

  const visibleReviews = useMemo(() => {
    if (filterTripId === 'all') return reviews;
    return reviews.filter((r) => r.tripId === filterTripId);
  }, [reviews, filterTripId]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return '0.0';
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  }, [reviews]);

  return (
    <section id="reviews" className="py-16 lg:py-20 bg-slate-50 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-sm font-medium text-teal-800 mb-2">
              Traveler Reviews &amp; Adventure Photos
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900">
              Verified feedback from completed departures
            </h2>
            <p className="text-base text-slate-600 mt-2 max-w-2xl">
              Rated{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {averageRating} / 5.0
              </span>{' '}
              across{' '}
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {reviews.length}
              </span>{' '}
              traveler reviews covering Kenya safaris, coastal retreats, Middle East circuits, and
              South Asia tours.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto min-w-0">
            <div className="w-full sm:w-auto max-w-full min-w-0">
              <label htmlFor="reviews-trip-filter" className="sr-only">
                Filter reviews by trip
              </label>
              <select
                id="reviews-trip-filter"
                value={filterTripId}
                onChange={(e) => setFilterTripId(e.target.value)}
                className="w-full sm:w-64 max-w-full truncate px-3 py-2 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="all">All Trips ({reviews.length})</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowForm((prev) => !prev)}
              className="px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {showForm ? 'Close Review Form' : 'Write a Trip Review'}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="mb-10">
            <ReviewForm
              trips={trips}
              onSubmitReview={onSubmitReview}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleReviews.map((review) => (
            <article
              key={review.id}
              data-testid={`review-card-${review.id}`}
              className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div
                    className="flex items-center gap-0.5"
                    aria-label={`${review.rating} out of 5 stars`}
                  >
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating
                            ? 'fill-amber-500 text-amber-500'
                            : 'text-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-mono text-slate-500">
                    {review.completedMonth}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-slate-900 leading-snug">
                    {review.title}
                  </h3>
                  <p className="text-xs text-teal-800 font-medium mt-1">
                    {review.tripTitle}
                  </p>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">{review.comment}</p>

                {review.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {review.photos.map((photo, idx) => (
                      <div
                        key={`${review.id}-photo-${idx}`}
                        className="aspect-[4/3] rounded overflow-hidden border border-slate-200 bg-slate-100"
                      >
                        <TripImage
                          src={photo}
                          alt={`${review.tripTitle} traveler photo by ${review.reviewerName}`}
                          label={review.tripTitle}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                <div className="text-slate-500">
                  <span className="font-semibold text-slate-900">{review.reviewerName}</span>
                  <span aria-hidden="true"> · </span>
                  <span>{review.reviewerLocation}</span>
                  {review.verifiedBooking && (
                    <>
                      <span aria-hidden="true"> · </span>
                      <span className="text-teal-800 font-medium">Completed Trip</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onSelectTripById(review.tripId)}
                  className="text-teal-800 font-semibold hover:underline underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  View Trip
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
