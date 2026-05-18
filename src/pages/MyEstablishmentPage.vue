<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

import {
  createEstablishment,
  getMyEstablishments,
  updateEstablishmentLocation,
  updateEstablishmentStatus,
  uploadEstablishmentCoverPhoto,
} from '@/api/establishments.api';
import PageHeader from '@/components/common/PageHeader.vue';
import LocationPickerMap from '@/components/maps/LocationPickerMap.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BusinessStatus, Establishment, EstablishmentCategory } from '@/types/api';

const loading = ref(false);
const saving = ref(false);
const uploadingId = ref<string | null>(null);
const locationSavingId = ref<string | null>(null);
const message = ref('');
const messageType = ref<'success' | 'error'>('success');
const createModalOpen = ref(false);
const createModalMessage = ref('');

const establishments = ref<Establishment[]>([]);

const createForm = reactive({
  city: '',
  name: '',
  category: 'restaurant' as EstablishmentCategory,
  address: '',
  description: '',
  services: '',
  contactNumber: '',
  email: '',
  opensAt: '',
  closesAt: '',
  isOpenNow: false,
});

const statusDraft = reactive<Record<string, { businessStatus: BusinessStatus; isOpenNow: boolean; statusNote: string }>>({});

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function resetCreateForm() {
  createForm.city = '';
  createForm.name = '';
  createForm.category = 'restaurant';
  createForm.address = '';
  createForm.description = '';
  createForm.services = '';
  createForm.contactNumber = '';
  createForm.email = '';
  createForm.opensAt = '';
  createForm.closesAt = '';
  createForm.isOpenNow = false;
}

function openCreateModal() {
  resetCreateForm();
  createModalMessage.value = '';
  createModalOpen.value = true;
}

function closeCreateModal() {
  if (saving.value) {
    return;
  }

  createModalMessage.value = '';
  createModalOpen.value = false;
}

async function load() {
  loading.value = true;

  try {
    const response = await getMyEstablishments({ page: 1, pageSize: 30 });
    establishments.value = response.data;

    for (const item of response.data) {
      statusDraft[item.id] = {
        businessStatus: item.businessStatus,
        isOpenNow: item.isOpenNow,
        statusNote: item.statusNote || '',
      };
    }
  } finally {
    loading.value = false;
  }
}

async function submitCreate() {
  saving.value = true;
  message.value = '';
  createModalMessage.value = '';

  try {
    await createEstablishment({
      city: createForm.city.trim(),
      name: createForm.name.trim(),
      category: createForm.category,
      address: createForm.address.trim(),
      description: createForm.description.trim() || undefined,
      services: createForm.services.trim() || undefined,
      contactNumber: createForm.contactNumber.trim() || undefined,
      email: createForm.email.trim() || undefined,
      opensAt: createForm.opensAt || undefined,
      closesAt: createForm.closesAt || undefined,
      isOpenNow: createForm.isOpenNow,
    });

    createModalMessage.value = 'Listing submitted successfully. Refreshing your listings...';
    await load();
    await wait(900);

    messageType.value = 'success';
    message.value = 'Establishment submitted successfully. It is now pending LGU verification.';
    createModalOpen.value = false;
    createModalMessage.value = '';
    resetCreateForm();
  } catch (error: any) {
    messageType.value = 'error';
    message.value = error?.response?.data?.message || 'Failed to create establishment.';
    createModalMessage.value = '';
  } finally {
    saving.value = false;
  }
}

async function saveStatus(item: Establishment) {
  const draft = statusDraft[item.id];
  if (!draft) {
    return;
  }

  saving.value = true;
  message.value = '';

  try {
    await updateEstablishmentStatus(item.id, {
      businessStatus: draft.businessStatus,
      isOpenNow: draft.isOpenNow,
      statusNote: draft.statusNote.trim() || undefined,
    });

    messageType.value = 'success';
    message.value = `Status updated for ${item.name}.`;
    await load();
  } catch (error: any) {
    messageType.value = 'error';
    message.value = error?.response?.data?.message || 'Failed to update business status.';
  } finally {
    saving.value = false;
  }
}

async function saveLocation(
  item: Establishment,
  payload: { latitude: number; longitude: number; address?: string },
) {
  locationSavingId.value = item.id;
  message.value = '';

  try {
    await updateEstablishmentLocation(item.id, payload);

    messageType.value = 'success';
    message.value = `Map location updated for ${item.name}.`;
    await load();
  } catch (error: any) {
    messageType.value = 'error';
    message.value = error?.response?.data?.message || 'Failed to update map location.';
  } finally {
    locationSavingId.value = null;
  }
}

async function uploadCover(item: Establishment, event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) {
    return;
  }

  uploadingId.value = item.id;
  message.value = '';

  try {
    await uploadEstablishmentCoverPhoto(item.id, file);
    messageType.value = 'success';
    message.value = `Cover photo updated for ${item.name}.`;
    await load();
  } catch (error: any) {
    messageType.value = 'error';
    message.value = error?.response?.data?.message || 'Failed to upload cover photo.';
  } finally {
    uploadingId.value = null;
    target.value = '';
  }
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader
      title="My Establishment"
      subtitle="Register your listing and keep operational details updated for visitors."
    />

    <div
      v-if="message"
      class="mb-4 rounded-lg px-4 py-3 text-sm"
      :class="messageType === 'success' ? 'border border-success/40 bg-success/10 text-success' : 'border border-destructive/30 bg-destructive/10 text-destructive'"
    >
      {{ message }}
    </div>

    <Card class="mb-6 shadow-panel">
      <CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle class="text-xl">Listing Management</CardTitle>
          <CardDescription class="text-base">
            Add a new establishment only when you need another listing or branch under this account.
          </CardDescription>
        </div>
        <Button class="h-11 px-5 text-base" @click="openCreateModal">Add New Establishment</Button>
      </CardHeader>
    </Card>

    <section>
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-xl font-semibold">Managed Listings</h2>
        <Button variant="secondary" class="h-10" @click="load">Refresh Listings</Button>
      </div>

      <div v-if="loading" class="rounded-lg border bg-muted/40 p-4 text-base text-muted-foreground">
        Loading your listings...
      </div>

      <div v-else-if="!establishments.length" class="rounded-lg border bg-muted/40 p-5 text-base text-muted-foreground">
        <p>No listing linked to this account yet.</p>
        <Button class="mt-4 h-11" @click="openCreateModal">Create Your First Listing</Button>
      </div>

      <div v-else class="grid gap-4">
        <Card v-for="item in establishments" :key="item.id" class="shadow-panel">
          <CardHeader>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <CardTitle class="text-xl">{{ item.name }}</CardTitle>
              <div class="flex gap-2">
                <Badge :variant="item.listingStatus === 'verified' ? 'default' : item.listingStatus === 'rejected' ? 'destructive' : 'secondary'">
                  {{ item.listingStatus }}
                </Badge>
                <Badge variant="outline">{{ item.businessStatus }}</Badge>
              </div>
            </div>
            <CardDescription>{{ item.city }} • {{ item.address }}</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid gap-4 md:grid-cols-3">
              <div class="space-y-2">
                <Label class="text-base">Business status</Label>
                <select v-model="statusDraft[item.id]!.businessStatus" class="h-11 w-full rounded-md border bg-background px-3 text-base">
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="temporarily_closed">Temporarily Closed</option>
                </select>
              </div>
              <div class="space-y-2">
                <Label class="text-base">Status note</Label>
                <Input v-model="statusDraft[item.id]!.statusNote" class="h-11" placeholder="Optional note for users" />
              </div>
              <div class="flex items-end justify-between rounded-lg border bg-muted/30 px-4 py-3">
                <Label class="text-base">Open now</Label>
                <input v-model="statusDraft[item.id]!.isOpenNow" type="checkbox" class="h-5 w-5 rounded border" />
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <Button class="h-10" :disabled="saving" @click="saveStatus(item)">Save Status</Button>
              <label class="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                <span>{{ uploadingId === item.id ? 'Uploading...' : 'Upload Cover Photo' }}</span>
                <input type="file" class="hidden" accept="image/*" :disabled="uploadingId === item.id" @change="uploadCover(item, $event)" />
              </label>
            </div>

            <img v-if="item.coverPhotoUrl" :src="item.coverPhotoUrl" alt="Cover" class="h-44 w-full rounded-lg border object-cover" />

            <LocationPickerMap
              :latitude="item.latitude"
              :longitude="item.longitude"
              :address="item.address"
              :establishment-name="item.name"
              :saving="locationSavingId === item.id"
              @save="saveLocation(item, $event)"
            />
          </CardContent>
        </Card>
      </div>
    </section>

    <div v-if="createModalOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="closeCreateModal">
      <div class="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border bg-card shadow-2xl">
        <div class="flex items-start justify-between gap-4 border-b px-6 py-5">
          <div>
            <h3 class="text-2xl font-semibold text-foreground">Register New Listing</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              Add another branch or a new establishment under this account.
            </p>
          </div>
          <Button variant="ghost" size="sm" :disabled="saving" @click="closeCreateModal">Close</Button>
        </div>

        <div class="px-6 py-5">
          <div v-if="createModalMessage" class="mb-4 rounded-lg border border-success/40 bg-success/10 px-4 py-3 text-sm text-success">
            {{ createModalMessage }}
          </div>

          <form class="grid gap-4 md:grid-cols-2" @submit.prevent="submitCreate">
            <div class="space-y-2">
              <Label class="text-base">City</Label>
              <Input v-model="createForm.city" class="h-11" required />
            </div>
            <div class="space-y-2">
              <Label class="text-base">Establishment name</Label>
              <Input v-model="createForm.name" class="h-11" required />
            </div>

            <div class="space-y-2">
              <Label class="text-base">Category</Label>
              <select v-model="createForm.category" class="h-11 w-full rounded-md border bg-background px-3 text-base">
                <option value="tourist_spot">Tourist Spot</option>
                <option value="restaurant">Restaurant</option>
                <option value="clinic_hospital">Clinic / Hospital</option>
                <option value="mall">Mall</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div class="space-y-2">
              <Label class="text-base">Address</Label>
              <Input v-model="createForm.address" class="h-11" required />
            </div>

            <div class="space-y-2">
              <Label class="text-base">Contact number</Label>
              <Input v-model="createForm.contactNumber" class="h-11" />
            </div>
            <div class="space-y-2">
              <Label class="text-base">Public email</Label>
              <Input v-model="createForm.email" type="email" class="h-11" />
            </div>

            <div class="space-y-2">
              <Label class="text-base">Opens at</Label>
              <Input v-model="createForm.opensAt" type="time" class="h-11" />
            </div>
            <div class="space-y-2">
              <Label class="text-base">Closes at</Label>
              <Input v-model="createForm.closesAt" type="time" class="h-11" />
            </div>

            <div class="space-y-2 md:col-span-2">
              <Label class="text-base">Description</Label>
              <Textarea v-model="createForm.description" class="min-h-[100px]" />
            </div>

            <div class="space-y-2 md:col-span-2">
              <Label class="text-base">Services</Label>
              <Textarea v-model="createForm.services" class="min-h-[90px]" />
            </div>

            <div class="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 md:col-span-2">
              <Label class="text-base">Set as currently open</Label>
              <input v-model="createForm.isOpenNow" type="checkbox" class="h-5 w-5 rounded border" />
            </div>

            <div class="flex gap-3 md:col-span-2">
              <Button type="button" variant="outline" class="h-11 flex-1" :disabled="saving" @click="closeCreateModal">
                Cancel
              </Button>
              <Button class="h-11 flex-1 text-base" :disabled="saving || Boolean(createModalMessage)">
                {{ saving ? 'Submitting...' : createModalMessage ? 'Submitted' : 'Submit Listing' }}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
