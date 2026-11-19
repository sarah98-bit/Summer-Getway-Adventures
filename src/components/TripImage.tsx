import { useState } from 'react';
import { Compass } from 'lucide-react';

interface TripImageProps {
  src: string;
  alt: string;
  label: string;
  className?: string;
}

export function TripImage({ src, alt, label, className = '' }: TripImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-200 via-slate-100 to-teal-50 text-slate-600 p-6 text-center ${className}`}
      >
        <Compass className="w-8 h-8 text-teal-700 mb-2" aria-hidden="true" />
        <span className="text-sm font-medium text-slate-700">{label}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
