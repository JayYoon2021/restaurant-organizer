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

interface RestaurantStore {
    restaurants: Restaurant[];
    selectedId: string | null;
    addRestaurant: (restaurant: Restaurant) => void;
    removeRestaurant: (id: string) => void;
    updateComment: (id: string, comment: string) => void;
    reorderRestaurants: (newRestaurants: Restaurant[]) => void;
    setSelectedId: (id: string | null) => void;
}

export const useRestaurantStore = create<RestaurantStore>()(
    persist(
        (set) => ({
            restaurants: [],
            selectedId: null,
            addRestaurant: (restaurant) =>
                set((state) => ({ restaurants: [...state.restaurants, restaurant] })),
            removeRestaurant: (id) =>
                set((state) => ({
                    restaurants: state.restaurants.filter((r) => r.id !== id),
                    selectedId: state.selectedId === id ? null : state.selectedId
                })),
            updateComment: (id, comment) =>
                set((state) => ({
                    restaurants: state.restaurants.map((r) =>
                        r.id === id ? { ...r, comment } : r
                    )
                })),
            reorderRestaurants: (newRestaurants) => set({ restaurants: newRestaurants }),
            setSelectedId: (id) => set({ selectedId: id }),
        }),
        {
            name: 'restaurant-storage-v2', // Version bumped to clear old data
        }
    )
);
