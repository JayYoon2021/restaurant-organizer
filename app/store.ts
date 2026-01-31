import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Restaurant {
    id: string;
    name: string;
    category: string;
    categoryType: string;
    address: string;
    roadAddress: string;
    lat: number;
    lng: number;
    comment: string;
    region: string;
    link?: string;
}

export interface RestaurantStore {
    restaurants: Restaurant[];
    selectedId: string | null;
    addRestaurant: (restaurant: Restaurant) => Promise<void>;
    removeRestaurant: (id: string) => Promise<void>;
    updateComment: (id: string, comment: string) => Promise<void>;
    reorderRestaurants: (newRestaurants: Restaurant[]) => void;
    setSelectedId: (id: string | null) => void;
    fetchRestaurants: () => Promise<void>;
}

export const useRestaurantStore = create<RestaurantStore>()(
    persist(
        (set, get) => ({
            restaurants: [],
            selectedId: null,
            fetchRestaurants: async () => {
                try {
                    const res = await fetch('/api/restaurants');
                    if (res.ok) {
                        const data = await res.json();
                        set({ restaurants: data });
                    }
                } catch (e) {
                    console.error('Failed to fetch', e);
                }
            },
            addRestaurant: async (restaurant) => {
                // Optimistic update
                set((state) => ({ restaurants: [...state.restaurants, restaurant] }));
                try {
                    await fetch('/api/restaurants', {
                        method: 'POST',
                        body: JSON.stringify(restaurant),
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (e) {
                    console.error('Sync failed', e);
                    // Rollback? Simplified for now: just log
                }
            },
            removeRestaurant: async (id) => {
                set((state) => ({
                    restaurants: state.restaurants.filter((r) => r.id !== id),
                    selectedId: state.selectedId === id ? null : state.selectedId
                }));
                try {
                    await fetch(`/api/restaurants?id=${id}`, { method: 'DELETE' });
                } catch (e) { console.error('Sync failed', e); }
            },
            updateComment: async (id, comment) => {
                const restaurant = get().restaurants.find(r => r.id === id);
                if (!restaurant) return;

                const updated = { ...restaurant, comment };
                set((state) => ({
                    restaurants: state.restaurants.map((r) =>
                        r.id === id ? updated : r
                    )
                }));

                try {
                    await fetch('/api/restaurants', {
                        method: 'POST',
                        body: JSON.stringify(updated),
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (e) { console.error('Sync failed', e); }
            },
            reorderRestaurants: (newRestaurants) => set({ restaurants: newRestaurants }),
            setSelectedId: (id) => set({ selectedId: id }),
        }),
        {
            name: 'restaurant-storage-v3', // Bump version
            skipHydration: true, // We rely on API fetch mostly now, but keep local cache
        }
    )
);
