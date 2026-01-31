import pool from '../../../lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const client = await pool.connect();
        try {
            await client.query(`
        CREATE TABLE IF NOT EXISTS restaurants (
          id TEXT PRIMARY KEY,
          data JSONB
        );
      `);

            const { rows } = await client.query('SELECT * FROM restaurants');
            const restaurants = rows.map(row => row.data);

            // Sort logic if needed, or rely on client
            return NextResponse.json(restaurants);
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const restaurant = await request.json();
        if (!restaurant.id) throw new Error('ID required');

        const client = await pool.connect();
        try {
            await client.query(
                `INSERT INTO restaurants (id, data)
         VALUES ($1, $2)
         ON CONFLICT (id) DO UPDATE
         SET data = $2`,
                [restaurant.id, restaurant]
            );

            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
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
        const client = await pool.connect();
        try {
            await client.query('DELETE FROM restaurants WHERE id = $1', [id]);
            return NextResponse.json({ success: true });
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Database Error:', error);
        return NextResponse.json({ error: 'Failed to delete restaurant' }, { status: 500 });
    }
}
