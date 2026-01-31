import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const html = await response.text();

        // Simple regex to find OG title or <title>
        const ogTitleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);

        let title = ogTitleMatch ? ogTitleMatch[1] : (titleMatch ? titleMatch[1] : '');

        // Cleanup title (remove "Naver Map", etc.)
        title = title.replace(/ : 네이버 플레이스/g, '')
            .replace(/네이버 MY PLACE/g, '')
            .replace(/ - 네이버 지도/g, '')
            .replace(/\| 네이버 지도/g, '')
            .trim();

        return NextResponse.json({ title });
    } catch (error) {
        console.error('Metadata fetch error:', error);
        return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 });
    }
}
