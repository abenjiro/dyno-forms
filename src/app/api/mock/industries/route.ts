import { NextResponse } from 'next/server';

const industries = [
  { id: 'tech', name: 'Software & Information Technology' },
  { id: 'fintech', name: 'Financial Services & Banking' },
  { id: 'healthcare', name: 'Healthcare & Life Sciences' },
  { id: 'manufacturing', name: 'Manufacturing & Industrial' },
  { id: 'retail', name: 'Retail, Consumer Goods & E-Commerce' },
  { id: 'energy', name: 'Energy, Utilities & Cleantech' },
  { id: 'consulting', name: 'Professional Services & Consulting' },
];

export async function GET() {
  return NextResponse.json(industries);
}
