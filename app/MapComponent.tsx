'use client';

import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { useRestaurantStore } from './store';
import { useCallback, useEffect, useState } from 'react';

const containerStyle = {
    width: '100%',
    height: '100%',
};

const centerDefault = {
    lat: 37.5665,
    lng: 126.9780, // Seoul
};

const categoryColors: Record<string, string> = {
    '한식': 'orange',
    '중식': 'red',
    '양식': 'blue',
    '일식': 'green',
    '퓨전': 'purple',
    '빵집': 'brown',
    '디저트': 'pink',
    '기타': 'gray',
};

export default function MapComponent({ restaurants: propRestaurants }: { restaurants?: any[] }) {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    });

    console.log('[DEBUG] API Key:', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'Present (' + process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.slice(0, 5) + '...)' : 'MISSING');


    const { restaurants: storeRestaurants, selectedId } = useRestaurantStore();
    const restaurants = propRestaurants || storeRestaurants;
    const [map, setMap] = useState<google.maps.Map | null>(null);

    const onLoad = useCallback(function callback(map: google.maps.Map) {
        setMap(map);
    }, []);

    const onUnmount = useCallback(function callback(map: google.maps.Map) {
        setMap(null);
    }, []);

    // Handle focusing on selected restaurant
    useEffect(() => {
        if (map && selectedId) {
            const selectedItem = restaurants.find(r => r.id === selectedId);
            if (selectedItem) {
                map.panTo({ lat: selectedItem.lat, lng: selectedItem.lng });
                map.setZoom(17);
            }
        } else if (map && restaurants.length > 0) {
            // Fit to all if none selected but items exist
            const bounds = new window.google.maps.LatLngBounds();
            restaurants.forEach(r => bounds.extend({ lat: r.lat, lng: r.lng }));
            map.fitBounds(bounds);
        }
    }, [map, selectedId, restaurants]);

    if (!isLoaded) return <div>Loading...</div>;

    return (
        <div className="map-container">
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={centerDefault}
                zoom={12}
                onLoad={onLoad}
                onUnmount={onUnmount}
                options={{
                    disableDefaultUI: true,
                    styles: [
                        { "elementType": "geometry", "stylers": [{ "color": "#1d2c4d" }] },
                        { "elementType": "labels.text.fill", "stylers": [{ "color": "#8ec3b9" }] },
                        { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1a3646" }] },
                        { "featureType": "administrative.country", "elementType": "geometry.stroke", "stylers": [{ "color": "#4b6878" }] },
                        { "featureType": "landscape.man_made", "elementType": "geometry.stroke", "stylers": [{ "color": "#334e87" }] },
                        { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#283d6a" }] },
                        { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#304a7d" }] },
                        { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#0e1626" }] }
                    ]
                }}
            >
                {restaurants.map((res) => (
                    <MarkerF
                        key={res.id}
                        position={{ lat: res.lat, lng: res.lng }}
                        title={`${res.name} (${res.categoryType})`}
                        icon={{
                            url: 'https://maps.google.com/mapfiles/ms/icons/red-pushpin.png',
                            scaledSize: new window.google.maps.Size(40, 40)
                        }}
                    />
                ))}
            </GoogleMap>
        </div>
    );
}
