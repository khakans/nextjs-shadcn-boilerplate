export type PhoneCountryCode = {
  code: string;
  country: string;
};

export const phoneCountryCodes: PhoneCountryCode[] = [
  { code: "+62", country: "Indonesia" },
  { code: "+1", country: "United States / Canada" },
  { code: "+60", country: "Malaysia" },
  { code: "+65", country: "Singapore" },
  { code: "+63", country: "Philippines" },
  { code: "+66", country: "Thailand" },
  { code: "+84", country: "Vietnam" },
  { code: "+61", country: "Australia" },
  { code: "+81", country: "Japan" },
  { code: "+82", country: "South Korea" },
  { code: "+86", country: "China" },
  { code: "+91", country: "India" },
  { code: "+44", country: "United Kingdom" },
  { code: "+49", country: "Germany" },
  { code: "+33", country: "France" },
  { code: "+31", country: "Netherlands" },
  { code: "+971", country: "United Arab Emirates" },
];

export const defaultPhoneCountryCode = phoneCountryCodes[0].code;

export function splitMobileNumber(mobileNumber: string | null) {
  if (!mobileNumber) {
    return {
      countryCode: defaultPhoneCountryCode,
      localNumber: "",
    };
  }

  const countryCode =
    phoneCountryCodes
      .map((option) => option.code)
      .sort((a, b) => b.length - a.length)
      .find((code) => mobileNumber.startsWith(code)) ?? defaultPhoneCountryCode;

  return {
    countryCode,
    localNumber: mobileNumber.slice(countryCode.length),
  };
}

export function formatMobileNumber(countryCode: string, localNumber: string) {
  const normalizedLocalNumber = localNumber.replace(/\D/g, "");

  if (!normalizedLocalNumber) {
    return null;
  }

  return `${countryCode}${normalizedLocalNumber}`;
}
