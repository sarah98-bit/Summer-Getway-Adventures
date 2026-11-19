export type CardBrand = 'Visa' | 'Mastercard' | 'Amex' | 'Card';

export interface CardInput {
  cardholderName: string;
  cardNumber: string;
  expiry: string; // MM/YY
  cvc: string;
}

export interface CardValidationErrors {
  cardholderName?: string;
  cardNumber?: string;
  expiry?: string;
  cvc?: string;
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

export function formatCardNumberDisplay(value: string): string {
  const digits = digitsOnly(value).slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatExpiryDisplay(value: string): string {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

export function detectCardBrand(cardNumber: string): CardBrand {
  const digits = digitsOnly(cardNumber);
  if (/^4/.test(digits)) return 'Visa';
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard';
  if (/^3[47]/.test(digits)) return 'Amex';
  return 'Card';
}

export function validateLuhn(cardNumber: string): boolean {
  const digits = digitsOnly(cardNumber);
  if (digits.length < 13 || digits.length > 19) {
    return false;
  }
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
}

export function validateCardExpiry(expiry: string, now: Date = new Date()): boolean {
  const match = /^(\d{2})\/(\d{2})$/.exec(expiry.trim());
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (year < currentYear) return false;
  if (year === currentYear && month < currentMonth) return false;
  return true;
}

export function validateCardInput(input: CardInput, now: Date = new Date()): CardValidationErrors {
  const errors: CardValidationErrors = {};
  const digits = digitsOnly(input.cardNumber);
  const cvcDigits = digitsOnly(input.cvc);

  if (input.cardholderName.trim().length < 2) {
    errors.cardholderName = 'Enter the name printed on the card.';
  }
  if (!validateLuhn(digits)) {
    errors.cardNumber = 'Enter a valid 16-digit Visa, Mastercard, or Amex number.';
  }
  if (!validateCardExpiry(input.expiry, now)) {
    errors.expiry = 'Enter a valid future expiry (MM/YY).';
  }
  if (cvcDigits.length < 3 || cvcDigits.length > 4) {
    errors.cvc = 'Enter the 3 or 4 digit security code.';
  }

  return errors;
}

export function normalizeKenyanMpesaPhone(phone: string): string | null {
  const cleaned = phone.replace(/[\s()-]/g, '');
  if (/^\+254(7|1)\d{8}$/.test(cleaned)) {
    return cleaned;
  }
  if (/^254(7|1)\d{8}$/.test(cleaned)) {
    return `+${cleaned}`;
  }
  if (/^0(7|1)\d{8}$/.test(cleaned)) {
    return `+254${cleaned.slice(1)}`;
  }
  return null;
}

export function maskMpesaPhone(normalizedPhone: string): string {
  if (normalizedPhone.length < 8) return normalizedPhone;
  return `${normalizedPhone.slice(0, 6)}•••${normalizedPhone.slice(-3)}`;
}
