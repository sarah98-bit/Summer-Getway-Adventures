import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ImagePlus, Star, X } from 'lucide-react';
import type { Trip, TripReview } from '../types/travel';
import { validateReviewInput, type ReviewValidationErrors } from '../utils/trips';

interface ReviewFormProps {
  trips: Trip[];
  lockedTripId?: string;
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
  onCancel?: () => void;
}

async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read selected image file.'));
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        const maxWidth = 960;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function ReviewForm({
  trips,
  lockedTripId,
  onSubmitReview,
  onCancel,
}: ReviewFormProps) {
  const [tripId, setTripId] = useState(lockedTripId ?? trips[0]?.id ?? '');
  const [reviewerName, setReviewerName] = useState('');
  const [reviewerLocation, setReviewerLocation] = useState('');
  const [completedMonth, setCompletedMonth] = useState('Nov 2026');
  const [bookingReference, setBookingReference] = useState('');
  const [completedTripConfirmed, setCompletedTripConfirmed] = useState(true);
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<ReviewValidationErrors & { submit?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTitle, setSubmittedTitle] = useState<string | null>(null);

  const handlePhotoSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const remainingSlots = Math.max(0, 3 - photos.length);
    const chosen = Array.from(fileList).slice(0, remainingSlots);
    try {
      const encoded = await Promise.all(chosen.map((f) => compressImageFile(f)));
      setPhotos((prev) => [...prev, ...encoded].slice(0, 3));
      setErrors((prev) => ({ ...prev, photos: undefined }));
    } catch {
      setErrors((prev) => ({
        ...prev,
        photos: 'One of the selected images could not be processed.',
      }));
    }
    e.target.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validation = validateReviewInput({
      tripId,
      reviewerName,
      completedMonth,
      rating,
      title,
      comment,
      photos,
    });

    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    try {
      const saved = await onSubmitReview({
        tripId,
        reviewerName,
        reviewerLocation: reviewerLocation || 'Nairobi, Kenya',
        completedMonth,
        bookingReference,
        completedTripConfirmed,
        rating,
        title,
        comment,
        photos,
      });
      setSubmittedTitle(saved.title);
      setReviewerName('');
      setReviewerLocation('');
      setBookingReference('');
      setTitle('');
      setComment('');
      setPhotos([]);
      setRating(5);
    } catch (err) {
      setErrors({
        submit: err instanceof Error ? err.message : 'Unable to save review right now.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedTitle) {
    return (
      <div
        role="status"
        className="p-6 bg-teal-50/70 border border-teal-200 rounded-lg space-y-3"
      >
        <p className="text-sm font-semibold text-teal-900">
          Review Published: “{submittedTitle}”
        </p>
        <p className="text-xs sm:text-sm text-slate-700">
          Thank you for sharing your adventure notes and photos. Your review is now visible on
          this trip’s itinerary page and in our traveler reviews feed.
        </p>
        <button
          type="button"
          onClick={() => setSubmittedTitle(null)}
          className="px-4 py-2 text-xs font-semibold text-teal-900 bg-white border border-teal-300 hover:bg-teal-50 rounded-md transition-colors cursor-pointer"
        >
          Write Another Review
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="p-6 bg-white border border-slate-200 rounded-lg space-y-4"
    >
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-display text-xl font-semibold text-slate-900">
          Share Your Completed Trip Review
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {!lockedTripId && (
          <div className="sm:col-span-2">
            <label
              htmlFor="rev-trip"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Completed Trip
            </label>
            <select
              id="rev-trip"
              value={tripId}
              onChange={(e) => setTripId(e.target.value)}
              className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
            >
              {trips.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.country})
                </option>
              ))}
            </select>
            {errors.tripId && <p className="text-xs text-red-700 mt-1">{errors.tripId}</p>}
          </div>
        )}

        <div>
          <label
            htmlFor="rev-name"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Your Name
          </label>
          <input
            id="rev-name"
            type="text"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            placeholder="e.g. Mercy Wambui"
            className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
          {errors.reviewerName && (
            <p className="text-xs text-red-700 mt-1">{errors.reviewerName}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="rev-location"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            City / Neighborhood
          </label>
          <input
            id="rev-location"
            type="text"
            value={reviewerLocation}
            onChange={(e) => setReviewerLocation(e.target.value)}
            placeholder="e.g. Kilimani, Nairobi"
            className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>

        <div>
          <label
            htmlFor="rev-month"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Trip Month Completed
          </label>
          <input
            id="rev-month"
            type="text"
            value={completedMonth}
            onChange={(e) => setCompletedMonth(e.target.value)}
            placeholder="e.g. Nov 2026"
            className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
          {errors.completedMonth && (
            <p className="text-xs text-red-700 mt-1">{errors.completedMonth}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="rev-booking-ref"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Booking Reference (Optional)
          </label>
          <input
            id="rev-booking-ref"
            type="text"
            value={bookingReference}
            onChange={(e) => setBookingReference(e.target.value)}
            placeholder="e.g. SGA-2026-4821"
            className="w-full px-3 py-2 text-sm font-mono text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
          />
        </div>
      </div>

      {/* Star Rating Selector */}
      <div>
        <span className="block text-xs font-semibold text-slate-700 mb-1.5">
          Overall Trip Rating
        </span>
        <div role="radiogroup" aria-label="Trip star rating" className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((value) => {
            const active = value <= rating;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={rating === value}
                aria-label={`Rate ${value} out of 5 stars`}
                onClick={() => setRating(value)}
                className="p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Star
                  className={`w-5 h-5 ${
                    active ? 'fill-amber-500 text-amber-500' : 'text-slate-300'
                  }`}
                />
              </button>
            );
          })}
          <span className="ml-2 font-mono text-xs text-slate-600 tabular-nums">
            {rating} / 5
          </span>
        </div>
        {errors.rating && <p className="text-xs text-red-700 mt-1">{errors.rating}</p>}
      </div>

      <div>
        <label
          htmlFor="rev-title"
          className="block text-xs font-semibold text-slate-700 mb-1"
        >
          Review Headline
        </label>
        <input
          id="rev-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Punctual 4x4 safari and half-board dinners at Mara Sopa"
          className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
        />
        {errors.title && <p className="text-xs text-red-700 mt-1">{errors.title}</p>}
      </div>

      <div>
        <label
          htmlFor="rev-comment"
          className="block text-xs font-semibold text-slate-700 mb-1"
        >
          Your Experience (Transport, Hotel, Half-Board &amp; Guide)
        </label>
        <textarea
          id="rev-comment"
          rows={3}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell future travelers about the transport, hotel comfort, half-board meals, and guided tours..."
          className="w-full px-3 py-2 text-sm text-slate-900 bg-slate-50 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
        />
        {errors.comment && <p className="text-xs text-red-700 mt-1">{errors.comment}</p>}
      </div>

      {/* Optional Adventure Photo Upload */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="rev-photos"
            className="block text-xs font-semibold text-slate-700"
          >
            Upload Trip Photos (Optional, up to 3)
          </label>
          <span className="text-xs font-mono text-slate-500 tabular-nums">
            {photos.length}/3 attached
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {photos.length < 3 && (
            <label
              htmlFor="rev-photos"
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-dashed border-slate-300 hover:border-teal-700 hover:text-teal-800 rounded-md cursor-pointer transition-colors"
            >
              <ImagePlus className="w-4 h-4" aria-hidden="true" />
              <span>Attach Photo</span>
              <input
                id="rev-photos"
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoSelect}
                className="sr-only"
              />
            </label>
          )}

          {photos.map((src, idx) => (
            <div
              key={`${idx}-${src.slice(0, 24)}`}
              className="relative w-16 h-16 rounded-md overflow-hidden border border-slate-200 bg-slate-100"
            >
              <img
                src={src}
                alt={`Uploaded traveler photo ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                aria-label={`Remove uploaded photo ${idx + 1}`}
                className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-slate-900/80 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        {errors.photos && <p className="text-xs text-red-700 mt-1">{errors.photos}</p>}
      </div>

      <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
        <input
          type="checkbox"
          checked={completedTripConfirmed}
          onChange={(e) => setCompletedTripConfirmed(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 text-teal-700 focus:ring-teal-700"
        />
        <span>I confirm I have completed this itinerary with Summer Getaway Adventures.</span>
      </label>

      {errors.submit && <p className="text-xs text-red-700">{errors.submit}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full sm:w-auto px-5 py-2.5 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 disabled:opacity-60 rounded-md transition-colors cursor-pointer"
      >
        {isSubmitting ? 'Publishing Review...' : 'Submit Trip Review'}
      </button>
    </form>
  );
}
