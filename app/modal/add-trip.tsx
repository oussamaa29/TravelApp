import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { API } from '@/services/api';

export default function AddTripModal() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [titleError, setTitleError] = useState('');
  const [destinationError, setDestinationError] = useState('');
  const [dateError, setDateError] = useState('');

  const validateTitle = (value: string): boolean => {
    if (!value || value.trim().length === 0) {
      setTitleError('Titre requis');
      return false;
    }
    setTitleError('');
    return true;
  };

  const validateDestination = (value: string): boolean => {
    if (!value || value.trim().length === 0) {
      setDestinationError('Destination requise');
      return false;
    }
    const destinationRegex = /^[A-Za-zÀ-ÿ\s-]+,\s*[A-Za-zÀ-ÿ\s-]+$/;
    if (!destinationRegex.test(value)) {
      setDestinationError('Format requis: Ville, Pays (ex: Paris, France)');
      return false;
    }
    setDestinationError('');
    return true;
  };

  const parseDate = (dateStr: string): Date | null => {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      const date = new Date(year, month, day);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    return null;
  };

  const validateDates = (): boolean => {
    if (!startDate || !endDate) {
      setDateError('Les deux dates sont requises');
      return false;
    }

    const start = parseDate(startDate);
    const end = parseDate(endDate);

    if (!start || !end) {
      setDateError('Format invalide. Utilisez JJ/MM/AAAA');
      return false;
    }

    if (end < start) {
      setDateError('La date de retour doit être après la date de départ');
      return false;
    }

    setDateError('');
    return true;
  };

  const requestPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission requise',
        "Cette application nécessite l'accès à la galerie pour ajouter des photos."
      );
      return false;
    }
    return true;
  };

  const handlePickCover = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCoverImage(result.assets[0].uri);
    }
  };

  const handlePickPhotos = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newPhotos = result.assets.map((asset) => asset.uri);
      setPhotos([...photos, ...newPhotos]);
    }
  };

  const handleSubmit = async () => {
    const isTitleValid = validateTitle(title);
    const isDestinationValid = validateDestination(destination);
    const areDatesValid = validateDates();

    if (!isTitleValid || !isDestinationValid || !areDatesValid) {
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let coverUrl = '';
      let photoUrls: string[] = [];

      if (coverImage) {
        setUploadProgress(20);
        coverUrl = await API.uploadImage(coverImage);
      }

      if (photos.length > 0) {
        setUploadProgress(40);
        const uploadPromises = photos.map((photo) => API.uploadImage(photo));
        photoUrls = await Promise.all(uploadPromises);
        setUploadProgress(80);
      }

      const start = parseDate(startDate);
      const end = parseDate(endDate);

      await API.createTrip({
        title: title.trim(),
        destination: destination.trim(),
        startDate: start!.toISOString(),
        endDate: end!.toISOString(),
        description: description.trim(),
        image: coverUrl,
        photos: photoUrls,
      });

      setUploadProgress(100);
      Alert.alert('Succès', 'Voyage créé avec succès !', [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      Alert.alert(
        'Erreur',
        error instanceof Error ? error.message : 'Échec de la création du voyage'
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient colors={['#a855f7', '#ec4899']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nouveau Voyage</Text>
          <View style={styles.placeholder} />
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.label}>Titre du voyage *</Text>
            <TextInput
              style={[styles.input, titleError && styles.inputError]}
              placeholder="Ex: Voyage à Bali"
              value={title}
              onChangeText={(text) => {
                setTitle(text);
                setTitleError('');
              }}
              onBlur={() => validateTitle(title)}
              editable={!isSubmitting}
            />
            {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Destination *</Text>
            <TextInput
              style={[styles.input, destinationError && styles.inputError]}
              placeholder="Paris, France"
              value={destination}
              onChangeText={(text) => {
                setDestination(text);
                setDestinationError('');
              }}
              onBlur={() => validateDestination(destination)}
              editable={!isSubmitting}
            />
            {destinationError ? <Text style={styles.errorText}>{destinationError}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Date de départ * (JJ/MM/AAAA)</Text>
            <View style={styles.dateInputContainer}>
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              <TextInput
                style={styles.dateInput}
                placeholder="15/01/2025"
                value={startDate}
                onChangeText={(text) => {
                  setStartDate(text);
                  setDateError('');
                }}
                keyboardType="numeric"
                maxLength={10}
                editable={!isSubmitting}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Date de retour * (JJ/MM/AAAA)</Text>
            <View style={styles.dateInputContainer}>
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              <TextInput
                style={styles.dateInput}
                placeholder="20/01/2025"
                value={endDate}
                onChangeText={(text) => {
                  setEndDate(text);
                  setDateError('');
                }}
                keyboardType="numeric"
                maxLength={10}
                editable={!isSubmitting}
              />
            </View>
            {dateError ? <Text style={styles.errorText}>{dateError}</Text> : null}
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Décrivez votre voyage..."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Image de couverture</Text>
            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={handlePickCover}
              disabled={isSubmitting}
            >
              {coverImage ? (
                <Image source={{ uri: coverImage }} style={styles.coverPreview} />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Ionicons name="image-outline" size={48} color="#9ca3af" />
                  <Text style={styles.imagePickerText}>Ajouter une image</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Photos du voyage</Text>
            <TouchableOpacity
              style={styles.photosButton}
              onPress={handlePickPhotos}
              disabled={isSubmitting}
            >
              <Ionicons name="camera-outline" size={20} color="#a855f7" />
              <Text style={styles.photosButtonText}>Ajouter des photos ({photos.length})</Text>
            </TouchableOpacity>
            {photos.length > 0 && (
              <View style={styles.photosPreview}>
                {photos.map((photo, index) => (
                  <Image key={index} source={{ uri: photo }} style={styles.photoThumbnail} />
                ))}
              </View>
            )}
          </View>

          {isSubmitting && (
            <View style={styles.progressContainer}>
              <ActivityIndicator size="small" color="#a855f7" />
              <Text style={styles.progressText}>Upload en cours... {uploadProgress}%</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <LinearGradient colors={['#a855f7', '#ec4899']} style={styles.submitButtonGradient}>
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Création...' : 'Créer le voyage'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  dateInputContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 12,
  },
  imagePickerButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  imagePickerPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePickerText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6b7280',
  },
  coverPreview: {
    width: '100%',
    height: 200,
  },
  photosButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  photosButtonText: {
    fontSize: 16,
    color: '#a855f7',
    fontWeight: '600',
    marginLeft: 8,
  },
  photosPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});