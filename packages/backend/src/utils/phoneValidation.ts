import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

/**
 * Validates and normalizes a phone number to E.164 format.
 * If the number is invalid, returns null.
 */
export function validateAndNormalizePhone(phone: string, defaultCountry: CountryCode = 'ZW'): string | null {
  try {
    // Basic sanitization: keep only digits, plus, and dashes/spaces
    const sanitized = phone.replace(/[^\d+]/g, '');
    
    // Parse using libphonenumber-js
    const phoneNumber = parsePhoneNumberFromString(sanitized, defaultCountry);
    
    if (phoneNumber && phoneNumber.isValid()) {
      return phoneNumber.number; // E.164 format (e.g. +263771234567)
    }
  } catch (error) {
    console.error('Error validating phone number:', error);
  }
  return null;
}
