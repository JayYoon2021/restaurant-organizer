import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        // Create table if not exists (Lazy initialization)
        await sql`
      CREATE TABLE IF NOT EXISTS restaurants (
        id TEXT PRIMARY KEY,
        data JSONB
      );
    `;

        const { rows } = await sql`SELECT * FROM restaurants`;
        const restaurants = rows.map(row => row.data);

        // Sort logic if needed, or rely on client
        return NextResponse.json(restaurants);
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const restaurant = await request.json();
        if (!restaurant.id) throw new Error('ID required');

        await sql`
      INSERT INTO restaurants (id, data)
      VALUES (${restaurant.id}, ${JSON.stringify(restaurant)}::jsonb)
      ON CONFLICT (id) DO UPDATE
      SET data = ${JSON.stringify(restaurant)}::jsonb;
    `;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Failed to save restaurant' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    try {
        await sql`DELETE FROM restaurants WHERE id = ${id}`;
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete restaurant' }, { status: 500 });
    }
}
