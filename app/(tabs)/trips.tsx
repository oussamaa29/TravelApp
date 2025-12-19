import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { IMAGES_SOURCES } from '.';
import { useRouter } from 'expo-router';
import { API } from '@/services/api';

export default function TripsScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [trips, setTrips] = useState<any[]>([]);
  const [filteredTrips, setFilteredTrips] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs = ['All', 'Upcoming', 'Past', 'Favorites'];

  useEffect(() => {
    loadTrips();
  }, []);

  useEffect(() => {
    filterTrips();
  }, [selectedTab, searchQuery, trips]);

  const loadTrips = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await API.getTrips();
      setTrips(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  };

  const filterTrips = () => {
    let filtered = [...trips];
    const now = new Date();

    if (selectedTab === 'Upcoming') {
      filtered = filtered.filter(trip => new Date(trip.startDate) > now);
    } else if (selectedTab === 'Past') {
      filtered = filtered.filter(trip => new Date(trip.endDate) < now);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(
        trip =>
          trip.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          trip.destination?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTrips(filtered);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.HeaderTitle}>My Trips</Text>

        <View style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search trips"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabContainer}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, selectedTab === tab && styles.tabAcitve]}
              onPress={() => setSelectedTab(tab)}
            >
              <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#a855f7" />
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadTrips} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : filteredTrips.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>Aucun voyage trouvé</Text>
            {searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.clearSearchText}>Effacer la recherche</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.tripsList}>
            {filteredTrips.map((trip) => (
              <TouchableOpacity key={trip.id} style={styles.tripCard}>
                <View style={styles.tripImageContainer}>
                  <Image
                    source={
                      trip.image && IMAGES_SOURCES[trip.image as keyof typeof IMAGES_SOURCES]
                        ? IMAGES_SOURCES[trip.image as keyof typeof IMAGES_SOURCES]
                        : require('@/assets/images/paris.jpeg')
                    }
                    style={styles.tripImage}
                    resizeMode="cover"
                  />
                  <View style={styles.tripImageOverlay} />
                  <View style={styles.tripImageContent}>
                    <Text style={styles.tripCardTitle}>{trip.title}</Text>
                    <View style={styles.tripLocation}>
                      <Ionicons name="location-outline" size={16} color="white" />
                      <Text style={styles.tripLocationText}>{trip.destination}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.tripCardInfo}>
                  <View style={styles.tripDate}>
                    <Ionicons name="calendar-outline" size={16} color="#6b7280" />
                    <Text style={styles.tripDateText}>
                      {new Date(trip.startDate).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}{' '}
                      -{' '}
                      {new Date(trip.endDate).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                  </View>
                  <View style={styles.tripPhotos}>
                    <View style={styles.photoCircle} />
                    <View style={[styles.photoCircle, styles.photoCircle2]} />
                    <View style={[styles.photoCircle, styles.photoCircle3]}>
                      <Text style={styles.tripPhotoCount}>{trip.photos?.length || 0}</Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => router.push('/modal/add-trip')}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  HeaderTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  searchBarContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#a855f7',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  tabContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  tabsContent: {
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'white',
  },
  tabAcitve: {
    backgroundColor: '#a855f7',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  tabTextActive: {
    color: 'white',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#a855f7',
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
    marginTop: 12,
  },
  clearSearchText: {
    color: '#a855f7',
    fontSize: 14,
    marginTop: 8,
    fontWeight: '600',
  },
  tripsList: {
    paddingHorizontal: 24,
    gap: 16,
  },
  tripCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  tripImageContainer: {
    position: 'relative',
    height: 192,
  },
  tripImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
  },
  tripImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  tripImageContent: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
  },
  tripCardTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  tripLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripLocationText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
  },
  tripCardInfo: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tripDateText: {
    color: '#6b7280',
    fontSize: 14,
  },
  tripPhotos: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#d1d5db',
    borderWidth: 2,
    borderColor: 'white',
    marginLeft: -8,
  },
  photoCircle2: {
    backgroundColor: '#d1d5db',
  },
  photoCircle3: {
    backgroundColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripPhotoCount: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  fabButton: {
    position: 'absolute',
    bottom: 80,
    right: 24,
    width: 56,
    height: 56,
    backgroundColor: '#a855f7',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});