import { NextRequest, NextResponse } from 'next/server';

const statesByCountry: Record<string, Array<{ code: string; label: string }>> = {
  US: [
    { code: 'CA', label: 'California' },
    { code: 'NY', label: 'New York' },
    { code: 'TX', label: 'Texas' },
    { code: 'FL', label: 'Florida' },
    { code: 'WA', label: 'Washington' },
  ],
  CA: [
    { code: 'ON', label: 'Ontario' },
    { code: 'QC', label: 'Quebec' },
    { code: 'BC', label: 'British Columbia' },
  ],
  GH: [
    { code: 'AA', label: 'Greater Accra' },
    { code: 'AH', label: 'Ashanti' },
    { code: 'WP', label: 'Western' },
  ],
  NG: [
    { code: 'LA', label: 'Lagos' },
    { code: 'AB', label: 'Abuja FCT' },
    { code: 'KN', label: 'Kano' },
  ],
  DE: [
    { code: 'BY', label: 'Bavaria' },
    { code: 'BE', label: 'Berlin' },
    { code: 'HE', label: 'Hesse' },
  ],
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const country = (searchParams.get('country') || searchParams.get('country_code') || 'US').toUpperCase();
  const states = statesByCountry[country] || [];
  return NextResponse.json(states);
}
