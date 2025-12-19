import { auth } from "@/utils/auth";
import { config } from "@/utils/env";
import { OFFLINE } from "./offline";

interface Trip {
    id?: string;
    title: string;
    destination: string;
    startDate: string;
    endDate: string;
    description?: string;
    image?: string;
    photos?: string[];
}

export const API = {
    async uploadImage(uri: string): Promise<string> {
        const formData = new FormData();
        const filename = uri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append(
            'file',
            {
                uri,
                name: filename,
                type,
            } as any
        );

        const response = await fetch(`${config.mockBackendUrl}/uploads`, {
            method: 'POST',
            body: formData,
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        if (!response.ok) {
            throw new Error('Error upload image');
        }

        const data = await response.json();
        return data.url;
    },

    async createTrip(trip: Omit<Trip, 'id'>) {
        const isOnline = await OFFLINE.checkIsOnline();

        if (isOnline) {
            const response = await auth.fetch(`${config.mockBackendUrl}/trips`, {
                method: "POST",
                body: JSON.stringify(trip),
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error('Erreur création voyage');
            }

            return response.json();
        } else {
            await OFFLINE.addToQueue({
                type: 'CREATE',
                endpoint: '/trips',
                method: 'POST',
                payload: trip,
            });

            return {
                ...trip,
                id: `local-${Date.now()}`,
            };
        }
    },

    async getTrips(): Promise<Trip[]> {
        const isOnline = await OFFLINE.checkIsOnline();

        if (isOnline) {
            try {
                // Check if user has tokens (is authenticated)
                const tokens = await auth.getTokens();
                
                if (!tokens || !tokens.accessToken) {
                    console.log('⚠️ [API] User not authenticated, returning empty array');
                    return [];
                }

                // Use authenticated fetch
                const response = await auth.fetch(`${config.mockBackendUrl}/trips`);
                
                if (!response.ok) {
                    console.error('❌ [API] Failed to fetch trips:', response.status);
                    const cached = await OFFLINE.getCachedTrips();
                    return cached || [];
                }

                const data = await response.json();
                console.log('✅ [API] Raw response from backend:', data);
                
                // Handle different response formats
                let trips: Trip[];
                
                if (Array.isArray(data)) {
                    // Backend returns array directly
                    trips = data;
                } else if (data && typeof data === 'object' && Array.isArray(data.trips)) {
                    // Backend returns { trips: [...] }
                    trips = data.trips;
                } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
                    // Backend returns { data: [...] }
                    trips = data.data;
                } else {
                    // Unknown format, return empty array
                    console.warn('⚠️ [API] Unknown response format, returning empty array');
                    trips = [];
                }

                console.log('✅ [API] Parsed trips:', trips.length);
                await OFFLINE.cacheTrips(trips);
                return trips;
            } catch (error) {
                console.error('❌ [API] Error fetching trips:', error);
                // If not authenticated error, return empty array
                if (error instanceof Error && error.message.includes('Not authenticated')) {
                    console.log('⚠️ [API] Not authenticated, returning empty array');
                    return [];
                }
                const cached = await OFFLINE.getCachedTrips();
                return cached || [];
            }
        } else {
            const cached = await OFFLINE.getCachedTrips();
            return cached || [];
        }
    },

    async getUserStats(): Promise<{ trips: number; photos: number; countries: number }> {
        try {
            const trips = await this.getTrips();
            
            // Ensure trips is an array
            if (!Array.isArray(trips)) {
                console.error('❌ [API] trips is not an array:', trips);
                return { trips: 0, photos: 0, countries: 0 };
            }

            const photosCount = trips.reduce((sum, trip) => sum + (trip.photos?.length || 0), 0);
            const countriesSet = new Set(
                trips
                    .map(t => t.destination?.split(',')[1]?.trim())
                    .filter(Boolean)
            );

            return {
                trips: trips.length,
                photos: photosCount,
                countries: countriesSet.size,
            };
        } catch (error) {
            console.error('❌ [API] Error getting stats:', error);
            return { trips: 0, photos: 0, countries: 0 };
        }
    },

    async getUpcomingTrips(): Promise<Trip[]> {
        try {
            const trips = await this.getTrips();
            
            // Ensure trips is an array
            if (!Array.isArray(trips)) {
                console.error('❌ [API] trips is not an array:', trips);
                return [];
            }

            const now = new Date();
            return trips
                .filter(trip => new Date(trip.startDate) > now)
                .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        } catch (error) {
            console.error('❌ [API] Error getting upcoming trips:', error);
            return [];
        }
    },
};