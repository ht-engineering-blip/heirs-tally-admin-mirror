export interface PostalAddress {
  street_name?: string;
  city_name?: string;
  postal_zone?: string;
  /** LGA code, e.g. "NG-AB-ANO" */
  lga?: string;
  /** State code, e.g. "NG-AB" */
  state?: string;
  country?: string;
}

// `tin` is deliberately absent — neither UI surface ever sends it.
export interface OnboardingProfilePayload {
  party_name?: string;
  email?: string;
  telephone?: string;
  business_description?: string;
  postal_address?: PostalAddress;
}

export interface BusinessSettingsPayload {
  businessName?: string;
  contactEmail?: string;
  contactPhone?: string;
  businessDescription?: string;
  postalAddress?: PostalAddress;
  website?: string;
  industry?: string;
}

/** tin / businessRegistrationNumber are read-only here, returned for display. */
export interface BusinessSettingsResponse extends BusinessSettingsPayload {
  tin?: string;
  businessRegistrationNumber?: string;
}

export interface NgState {
  name: string;
  code: string;
}

export interface NgLga {
  name: string;
  code: string;
  state_code: string;
}
