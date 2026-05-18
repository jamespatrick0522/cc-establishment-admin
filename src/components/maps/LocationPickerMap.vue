<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import L from 'leaflet';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const SINDANGAN_CENTER = {
  latitude: 8.2376,
  longitude: 122.9976,
};

interface SaveLocationPayload {
  latitude: number;
  longitude: number;
  address?: string;
}

const props = defineProps<{
  latitude?: string | null;
  longitude?: string | null;
  address?: string | null;
  establishmentName: string;
  saving?: boolean;
}>();

const emit = defineEmits<{
  (event: 'save', payload: SaveLocationPayload): void;
}>();

const mapKey = import.meta.env.VITE_MAPTILER_API_KEY as string | undefined;
const mapElement = ref<HTMLElement | null>(null);
const latitudeDraft = ref<number | null>(parseCoordinate(props.latitude));
const longitudeDraft = ref<number | null>(parseCoordinate(props.longitude));
const addressDraft = ref(props.address ?? '');
const locationMessage = ref('');

let map: L.Map | null = null;
let marker: L.Marker | null = null;

const hasSavedLocation = computed(() => isValidCoordinate(parseCoordinate(props.latitude), parseCoordinate(props.longitude)));
const canSave = computed(() => isValidCoordinate(latitudeDraft.value, longitudeDraft.value));
const coordinateText = computed(() => {
  if (!canSave.value) {
    return 'No coordinates selected';
  }

  return `${latitudeDraft.value!.toFixed(6)}, ${longitudeDraft.value!.toFixed(6)}`;
});

function parseCoordinate(value?: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isValidCoordinate(latitude: number | null, longitude: number | null): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function currentCenter(): [number, number] {
  if (isValidCoordinate(latitudeDraft.value, longitudeDraft.value)) {
    return [latitudeDraft.value!, longitudeDraft.value!];
  }

  return [SINDANGAN_CENTER.latitude, SINDANGAN_CENTER.longitude];
}

function markerIcon() {
  return L.divIcon({
    className: 'cc-location-marker',
    html: '<span></span>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function setDraftLocation(latitude: number, longitude: number, shouldPan = true) {
  latitudeDraft.value = Number(latitude.toFixed(7));
  longitudeDraft.value = Number(longitude.toFixed(7));
  locationMessage.value = '';

  if (!map) {
    return;
  }

  const latLng: [number, number] = [latitudeDraft.value, longitudeDraft.value];
  if (!marker) {
    marker = L.marker(latLng, {
      draggable: true,
      icon: markerIcon(),
    }).addTo(map);

    marker.on('dragend', () => {
      const next = marker!.getLatLng();
      setDraftLocation(next.lat, next.lng, false);
    });
  } else {
    marker.setLatLng(latLng);
  }

  if (shouldPan) {
    map.setView(latLng, Math.max(map.getZoom(), 16));
  }
}

function syncMarkerFromInputs() {
  if (isValidCoordinate(latitudeDraft.value, longitudeDraft.value)) {
    setDraftLocation(latitudeDraft.value!, longitudeDraft.value!, true);
  }
}

function updateLatitude(value: string | number) {
  const parsed = Number(value);
  latitudeDraft.value = Number.isFinite(parsed) ? parsed : null;
  syncMarkerFromInputs();
}

function updateLongitude(value: string | number) {
  const parsed = Number(value);
  longitudeDraft.value = Number.isFinite(parsed) ? parsed : null;
  syncMarkerFromInputs();
}

function useCurrentLocation() {
  locationMessage.value = '';

  if (!navigator.geolocation) {
    locationMessage.value = 'Your browser does not support location detection.';
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      setDraftLocation(position.coords.latitude, position.coords.longitude);
    },
    () => {
      locationMessage.value = 'Location permission was denied or unavailable.';
    },
    { enableHighAccuracy: true, timeout: 10000 },
  );
}

function saveLocation() {
  if (!canSave.value) {
    locationMessage.value = 'Pick a point on the map before saving.';
    return;
  }

  emit('save', {
    latitude: latitudeDraft.value!,
    longitude: longitudeDraft.value!,
    address: addressDraft.value.trim() || undefined,
  });
}

function initializeMap() {
  if (!mapElement.value || !mapKey) {
    return;
  }

  map = L.map(mapElement.value, {
    center: currentCenter(),
    zoom: hasSavedLocation.value ? 16 : 14,
    zoomControl: true,
  });

  L.tileLayer(`https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${mapKey}`, {
    attribution:
      '&copy; <a href="https://www.maptiler.com/">MapTiler</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    tileSize: 512,
    zoomOffset: -1,
  }).addTo(map);

  map.on('click', (event) => {
    setDraftLocation(event.latlng.lat, event.latlng.lng);
  });

  if (hasSavedLocation.value) {
    setDraftLocation(latitudeDraft.value!, longitudeDraft.value!, false);
  }
}

watch(
  () => [props.latitude, props.longitude, props.address],
  () => {
    latitudeDraft.value = parseCoordinate(props.latitude);
    longitudeDraft.value = parseCoordinate(props.longitude);
    addressDraft.value = props.address ?? '';

    if (isValidCoordinate(latitudeDraft.value, longitudeDraft.value)) {
      setDraftLocation(latitudeDraft.value!, longitudeDraft.value!, true);
    }
  },
);

onMounted(initializeMap);

onUnmounted(() => {
  map?.remove();
  map = null;
  marker = null;
});
</script>

<template>
  <section class="rounded-lg border bg-muted/20 p-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 class="text-lg font-semibold">Map Location</h3>
        <p class="mt-1 text-sm text-muted-foreground">
          Set a precise pin so tourists can find {{ establishmentName }} faster.
        </p>
      </div>
      <span
        class="rounded-full px-3 py-1 text-xs font-semibold"
        :class="hasSavedLocation ? 'bg-success/10 text-success' : 'bg-accent/20 text-foreground'"
      >
        {{ hasSavedLocation ? 'Location set' : 'Recommended' }}
      </span>
    </div>

    <div v-if="mapKey" ref="mapElement" class="mt-4 h-72 overflow-hidden rounded-lg border bg-card"></div>
    <div v-else class="mt-4 rounded-lg border border-dashed bg-card p-4 text-sm text-muted-foreground">
      Add <span class="font-medium text-foreground">VITE_MAPTILER_API_KEY</span> to enable the interactive map picker.
    </div>

    <div class="mt-4 grid gap-3 md:grid-cols-3">
      <div class="space-y-2">
        <Label>Latitude</Label>
        <Input
          :model-value="latitudeDraft ?? ''"
          type="number"
          step="0.0000001"
          placeholder="8.2376000"
          @update:model-value="updateLatitude"
        />
      </div>
      <div class="space-y-2">
        <Label>Longitude</Label>
        <Input
          :model-value="longitudeDraft ?? ''"
          type="number"
          step="0.0000001"
          placeholder="122.9976000"
          @update:model-value="updateLongitude"
        />
      </div>
      <div class="space-y-2">
        <Label>Public address</Label>
        <Input v-model="addressDraft" placeholder="Optional address update" />
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted-foreground">{{ coordinateText }}</p>
      <div class="flex flex-wrap gap-2">
        <Button type="button" variant="outline" :disabled="saving" @click="useCurrentLocation">
          Use My Current Location
        </Button>
        <Button type="button" :disabled="saving || !canSave" @click="saveLocation">
          {{ saving ? 'Saving...' : 'Save Location' }}
        </Button>
      </div>
    </div>

    <p v-if="locationMessage" class="mt-3 text-sm text-destructive">{{ locationMessage }}</p>
  </section>
</template>

<style scoped>
:global(.cc-location-marker) {
  background: transparent;
}

:global(.cc-location-marker span) {
  display: block;
  width: 24px;
  height: 24px;
  border: 3px solid white;
  border-radius: 999px;
  background: hsl(var(--primary));
  box-shadow: 0 6px 18px rgb(0 0 0 / 0.25);
}
</style>
