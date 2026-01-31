import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
        return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
        );
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            return NextResponse.json(location); // { lat, lng }
        } else {
            return NextResponse.json({ error: 'Geocoding failed', status: data.status }, { status: 500 });
        }
    } catch (error) {
        console.error('Geocoding API error:', error);
        return NextResponse.json({ error: 'Failed to geocode address' }, { status: 500 });
    }
}
