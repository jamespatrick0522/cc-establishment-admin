<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { CheckCircle2, FileText, ImagePlus, Upload, Video, XCircle } from 'lucide-vue-next';

import {
  createEstablishment,
  deleteEstablishmentMedia,
  getMyEstablishments,
  submitEstablishmentForApproval,
  updateEstablishmentLocation,
  updateEstablishmentProfile,
  updateEstablishmentStatus,
  uploadEstablishmentCoverPhoto,
  uploadEstablishmentGalleryImage,
  uploadEstablishmentLocationVideo,
} from '@/api/establishments.api';
import PageHeader from '@/components/common/PageHeader.vue';
import LocationPickerMap from '@/components/maps/LocationPickerMap.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BusinessStatus, Establishment, EstablishmentCategory, EstablishmentMedia } from '@/types/api';

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
  businessPermitNumber: '',
  contactNumber: '',
  email: '',
  opensAt: '',
  closesAt: '',
  isOpenNow: false,
});

const profileDraft = reactive<Record<string, {
  city: string;
  name: string;
  category: EstablishmentCategory;
  address: string;
  description: string;
  services: string;
  businessPermitNumber: string;
  contactNumber: string;
  email: string;
  opensAt: string;
  closesAt: string;
}>>({});

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
  createForm.businessPermitNumber = '';
  createForm.contactNumber = '';
  createForm.email = '';
  createForm.opensAt = '';
  createForm.closesAt = '';
  createForm.isOpenNow = false;
}

function setDrafts(item: Establishment) {
  profileDraft[item.id] = {
    city: item.city,
    name: item.name,
    category: item.category,
    address: item.address,
    description: item.description || '',
    services: item.services || '',
    businessPermitNumber: item.businessPermitNumber || '',
    contactNumber: item.contactNumber || '',
    email: item.email || '',
    opensAt: item.opensAt || '',
    closesAt: item.closesAt || '',
  };

  statusDraft[item.id] = {
    businessStatus: item.businessStatus,
    isOpenNow: item.isOpenNow,
    statusNote: item.statusNote || '',
  };
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
    response.data.forEach(setDrafts);
  } finally {
    loading.value = false;
  }
}

function replaceListing(updated: Establishment) {
  const index = establishments.value.findIndex((item) => item.id === updated.id);
  if (index >= 0) {
    establishments.value[index] = updated;
  }
  setDrafts(updated);
}

async function submitCreate() {
  saving.value = true;
  message.value = '';
  createModalMessage.value = '';

  try {
    const created = await createEstablishment({
      city: createForm.city.trim(),
      name: createForm.name.trim(),
      category: createForm.category,
      address: createForm.address.trim(),
      description: createForm.description.trim() || undefined,
      services: createForm.services.trim() || undefined,
      businessPermitNumber: createForm.businessPermitNumber.trim() || undefined,
      contactNumber: createForm.contactNumber.trim() || undefined,
      email: createForm.email.trim() || undefined,
      opensAt: createForm.opensAt || undefined,
      closesAt: createForm.closesAt || undefined,
      isOpenNow: createForm.isOpenNow,
    });

    createModalMessage.value = 'Draft saved. Add gallery images and submit it when ready.';
    await load();
    await wait(700);

    messageType.value = 'success';
    message.value = `${created.name} was saved as a draft.`;
    createModalOpen.value = false;
    createModalMessage.value = '';
    resetCreateForm();
  } catch (error: any) {
    messageType.value = 'error';
    message.value = error?.response?.data?.message || 'Failed to create establishment draft.';
    createModalMessage.value = '';
  } finally {
    saving.value = false;
  }
}

async function saveProfile(item: Establishment) {
  const draft = profileDraft[item.id];
  if (!draft) {
    return;
  }

  saving.value = true;
  message.value = '';

  try {
    const updated = await updateEstablishmentProfile(item.id, {
      city: draft.city.trim(),
      name: draft.name.trim(),
      category: draft.category,
      address: draft.address.trim(),
      description: draft.description.trim() || undefined,
      services: draft.services.trim() || undefined,
      businessPermitNumber: draft.businessPermitNumber.trim() || undefined,
      contactNumber: draft.contactNumber.trim() || undefined,
      email: draft.email.trim() || undefined,
      opensAt: draft.opensAt || undefined,
      closesAt: draft.closesAt || undefined,
    });

    replaceListing(updated);
    messageType.value = 'success';
    message.value = `Profile details saved for ${updated.name}.`;
  } catch (error: any) {
    messageType.value = 'error';
    message.value = error?.response?.data?.message || 'Failed to save profile details.';
  } finally {
    saving.value = false;
  }
}

async function submitForApproval(item: Establishment) {
  saving.value = true;
  message.value = '';

  try {
    const updated = await submitEstablishmentForApproval(item.id);
    replaceListing(updated);
    messageType.value = 'success';
    message.value = `${updated.name} was submitted for LGU approval.`;
  } catch (error: any) {
    messageType.value = 'error';
    message.value = error?.response?.data?.message || 'Complete all requirements before submitting.';
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
    const updated = await updateEstablishmentStatus(item.id, {
      businessStatus: draft.businessStatus,
      isOpenNow: draft.isOpenNow,
      statusNote: draft.statusNote.trim() || undefined,
    });

    replaceListing(updated);
    messageType.value = 'success';
    message.value = `Status updated for ${updated.name}.`;
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
    const updated = await updateEstablishmentLocation(item.id, payload);
    replaceListing(updated);
    messageType.value = 'success';
    message.value = `Map location updated for ${updated.name}.`;
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
  if (!file) return;

  uploadingId.value = item.id;
  message.value = '';

  try {
    const updated = await uploadEstablishmentCoverPhoto(item.id, file);
    replaceListing(updated);
    messageType.value = 'success';
    message.value = `Cover photo updated for ${updated.name}.`;
  } catch (error: any) {
    messageType.value = 'error';
    message.value = error?.response?.data?.message || 'Failed to upload cover photo.';
  } finally {
    uploadingId.value = null;
    target.value = '';
  }
}

async function uploadGallery(item: Establishment, event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  uploadingId.value = item.id;
  message.value = '';

  try {
    const updated = await uploadEstablishmentGalleryImage(item.id, file);
    replaceListing(updated);
    messageType.value = 'success';
    message.value = `Gallery image uploaded for ${updated.name}.`;
  } catch (error: any) {
    messageType.value = 'error';
    message.value = error?.response?.data?.message || 'Failed to upload gallery image.';
  } finally {
    uploadingId.value = null;
    target.value = '';
  }
}

async function uploadVideo(item: Establishment, event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  uploadingId.value = item.id;
  message.value = '';

  try {
    const updated = await uploadEstablishmentLocationVideo(item.id, file);
    replaceListing(updated);
    messageType.value = 'success';
    message.value = `Location video uploaded for ${updated.name}.`;
  } catch (error: any) {
    messageType.value = 'error';
    message.value = error?.response?.data?.message || 'Failed to upload location video.';
  } finally {
    uploadingId.value = null;
    target.value = '';
  }
}

async function removeMedia(item: Establishment, media: EstablishmentMedia) {
  saving.value = true;
  message.value = '';

  try {
    const updated = await deleteEstablishmentMedia(item.id, media.id);
    replaceListing(updated);
    messageType.value = 'success';
    message.value = 'Media removed.';
  } catch (error: any) {
    messageType.value = 'error';
    message.value = error?.response?.data?.message || 'Failed to remove media.';
  } finally {
    saving.value = false;
  }
}

function galleryImages(item: Establishment) {
  return item.media.filter((media) => media.type === 'image');
}

function locationVideo(item: Establishment) {
  return item.media.find((media) => media.type === 'video') || null;
}

function statusVariant(status: Establishment['listingStatus']) {
  if (status === 'verified') return 'default';
  if (status === 'rejected') return 'destructive';
  if (status === 'draft') return 'outline';
  return 'secondary';
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader
      title="My Establishment"
      subtitle="Save drafts, complete LGU requirements, and submit listings for verification."
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
            New listings start as drafts. Submit them after adding a permit/BIR number and 3 to 5 gallery images.
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
                <Badge :variant="statusVariant(item.listingStatus)">{{ item.listingStatus }}</Badge>
                <Badge variant="outline">{{ item.businessStatus }}</Badge>
              </div>
            </div>
            <CardDescription>{{ item.city }} • {{ item.address }}</CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <div v-if="item.statusNote" class="rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm text-foreground">
              <p class="font-semibold">LGU note / rejection reason</p>
              <p class="mt-1 text-muted-foreground">{{ item.statusNote }}</p>
            </div>

            <div class="rounded-lg border bg-muted/20 p-4">
              <div class="mb-3 flex items-center gap-2">
                <FileText class="h-5 w-5 text-secondary" />
                <h3 class="font-semibold">Approval Requirements</h3>
              </div>
              <div class="grid gap-3 md:grid-cols-3">
                <div class="flex items-center gap-2">
                  <component :is="item.requirements.hasBusinessPermitNumber ? CheckCircle2 : XCircle" class="h-5 w-5" :class="item.requirements.hasBusinessPermitNumber ? 'text-success' : 'text-destructive'" />
                  <span>Permit / BIR number</span>
                </div>
                <div class="flex items-center gap-2">
                  <component :is="item.requirements.galleryImageCount >= item.requirements.minGalleryImages ? CheckCircle2 : XCircle" class="h-5 w-5" :class="item.requirements.galleryImageCount >= item.requirements.minGalleryImages ? 'text-success' : 'text-destructive'" />
                  <span>{{ item.requirements.galleryImageCount }}/{{ item.requirements.maxGalleryImages }} gallery images</span>
                </div>
                <div class="flex items-center gap-2 text-muted-foreground">
                  <Video class="h-5 w-5 text-secondary" />
                  <span>Location video optional</span>
                </div>
              </div>
              <p v-if="item.requirements.missing.length" class="mt-3 text-sm text-destructive">
                Missing: {{ item.requirements.missing.join(', ') }}.
              </p>
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <Label class="text-base">Establishment name</Label>
                <Input v-model="profileDraft[item.id]!.name" class="h-11" />
              </div>
              <div class="space-y-2">
                <Label class="text-base">Business Permit / BIR Number</Label>
                <Input v-model="profileDraft[item.id]!.businessPermitNumber" class="h-11" placeholder="Required before approval" />
              </div>
              <div class="space-y-2">
                <Label class="text-base">City</Label>
                <Input v-model="profileDraft[item.id]!.city" class="h-11" />
              </div>
              <div class="space-y-2">
                <Label class="text-base">Category</Label>
                <select v-model="profileDraft[item.id]!.category" class="h-11 w-full rounded-md border bg-background px-3 text-base">
                  <option value="tourist_spot">Tourist Spot</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="clinic_hospital">Clinic / Hospital</option>
                  <option value="mall">Mall</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div class="space-y-2 md:col-span-2">
                <Label class="text-base">Address</Label>
                <Input v-model="profileDraft[item.id]!.address" class="h-11" />
              </div>
              <div class="space-y-2">
                <Label class="text-base">Contact number</Label>
                <Input v-model="profileDraft[item.id]!.contactNumber" class="h-11" />
              </div>
              <div class="space-y-2">
                <Label class="text-base">Public email</Label>
                <Input v-model="profileDraft[item.id]!.email" type="email" class="h-11" />
              </div>
              <div class="space-y-2">
                <Label class="text-base">Opens at</Label>
                <Input v-model="profileDraft[item.id]!.opensAt" type="time" class="h-11" />
              </div>
              <div class="space-y-2">
                <Label class="text-base">Closes at</Label>
                <Input v-model="profileDraft[item.id]!.closesAt" type="time" class="h-11" />
              </div>
              <div class="space-y-2 md:col-span-2">
                <Label class="text-base">Description</Label>
                <Textarea v-model="profileDraft[item.id]!.description" class="min-h-[90px]" />
              </div>
              <div class="space-y-2 md:col-span-2">
                <Label class="text-base">Services</Label>
                <Textarea v-model="profileDraft[item.id]!.services" class="min-h-[80px]" />
              </div>
            </div>

            <div class="flex flex-wrap gap-3">
              <Button class="h-10" :disabled="saving" @click="saveProfile(item)">Save Profile</Button>
              <Button
                class="h-10"
                variant="secondary"
                :disabled="saving || item.listingStatus === 'pending' || !item.requirements.canSubmitForApproval"
                @click="submitForApproval(item)"
              >
                {{ item.listingStatus === 'verified' ? 'Submit Changes for Review' : item.listingStatus === 'rejected' ? 'Resubmit for Approval' : 'Submit for Approval' }}
              </Button>
            </div>

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

            <Button class="h-10" :disabled="saving" @click="saveStatus(item)">Save Operating Status</Button>

            <div class="space-y-4 rounded-lg border p-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 class="font-semibold">Media Requirements</h3>
                  <p class="text-sm text-muted-foreground">Upload 3 to 5 gallery images. One short landmark/location video is optional, max 30MB.</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <label class="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted" :class="galleryImages(item).length >= item.requirements.maxGalleryImages ? 'pointer-events-none opacity-50' : ''">
                    <ImagePlus class="h-4 w-4" />
                    <span>{{ uploadingId === item.id ? 'Uploading...' : 'Add Gallery Image' }}</span>
                    <input type="file" class="hidden" accept="image/*" :disabled="uploadingId === item.id || galleryImages(item).length >= item.requirements.maxGalleryImages" @change="uploadGallery(item, $event)" />
                  </label>
                  <label class="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                    <Upload class="h-4 w-4" />
                    <span>{{ locationVideo(item) ? 'Replace Video' : 'Upload Video' }}</span>
                    <input type="file" class="hidden" accept="video/mp4,video/quicktime,video/webm" :disabled="uploadingId === item.id" @change="uploadVideo(item, $event)" />
                  </label>
                  <label class="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
                    <span>{{ uploadingId === item.id ? 'Uploading...' : 'Upload Cover Photo' }}</span>
                    <input type="file" class="hidden" accept="image/*" :disabled="uploadingId === item.id" @change="uploadCover(item, $event)" />
                  </label>
                </div>
              </div>

              <div v-if="galleryImages(item).length" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div v-for="media in galleryImages(item)" :key="media.id" class="overflow-hidden rounded-lg border bg-background">
                  <img :src="media.url" alt="Gallery image" class="h-32 w-full object-cover" />
                  <div class="p-2 text-right">
                    <Button size="sm" variant="outline" class="h-8" :disabled="saving" @click="removeMedia(item, media)">Remove</Button>
                  </div>
                </div>
              </div>
              <div v-else class="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No gallery images yet.</div>

              <video v-if="locationVideo(item)" :src="locationVideo(item)!.url" controls class="max-h-72 w-full rounded-lg border bg-black" />
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
            <h3 class="text-2xl font-semibold text-foreground">Save New Listing Draft</h3>
            <p class="mt-1 text-sm text-muted-foreground">You can upload required media and submit for LGU approval after saving the draft.</p>
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
              <Label class="text-base">Business Permit / BIR Number</Label>
              <Input v-model="createForm.businessPermitNumber" class="h-11" placeholder="Required before approval" />
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
            <div class="space-y-2 md:col-span-2">
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
              <Button type="button" variant="outline" class="h-11 flex-1" :disabled="saving" @click="closeCreateModal">Cancel</Button>
              <Button class="h-11 flex-1 text-base" :disabled="saving || Boolean(createModalMessage)">
                {{ saving ? 'Saving...' : createModalMessage ? 'Saved' : 'Save Draft' }}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>
