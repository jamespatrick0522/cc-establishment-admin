<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { Building2, Megaphone, ShieldAlert } from 'lucide-vue-next';

import { getAnnouncements } from '@/api/announcements.api';
import { getMyEstablishments } from '@/api/establishments.api';
import { getConversations } from '@/api/messages.api';
import PageHeader from '@/components/common/PageHeader.vue';
import StatCard from '@/components/common/StatCard.vue';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Announcement, Establishment } from '@/types/api';

const loading = ref(false);
const myEstablishments = ref<Establishment[]>([]);
const announcements = ref<Announcement[]>([]);
const inquiryCount = ref(0);

async function load() {
  loading.value = true;

  try {
    const mine = await getMyEstablishments({ page: 1, pageSize: 20 });
    myEstablishments.value = mine.data;

    const first = mine.data[0];
    if (first) {
      const [inquiries, cityAnnouncements] = await Promise.all([
        getConversations({
          establishmentId: first.id,
          page: 1,
          pageSize: 200,
        }),
        getAnnouncements({ city: first.city, limit: 5 }),
      ]);

      inquiryCount.value = inquiries.meta.total;
      announcements.value = cityAnnouncements;
    } else {
      announcements.value = await getAnnouncements({ limit: 5 });
      inquiryCount.value = 0;
    }
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader
      title="Establishment Dashboard"
      subtitle="Quickly review your listing approval status, inquiries, and local city advisories."
    />

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="My Listings"
        :value="loading ? '...' : myEstablishments.length"
        hint="Number of establishments linked to your account."
      />
      <StatCard
        label="Pending Verification"
        :value="loading ? '...' : myEstablishments.filter((x) => x.listingStatus === 'pending').length"
        hint="Listings waiting for LGU review and approval."
      />
      <StatCard
        label="Active Inquiries"
        :value="loading ? '...' : inquiryCount"
        hint="Current guest conversation threads available in your inbox."
      />
      <StatCard
        label="Advisories"
        :value="loading ? '...' : announcements.length"
        hint="Recent city advisories relevant to your area."
      />
    </div>

    <section class="mt-8 grid gap-4 lg:grid-cols-2">
      <Card class="shadow-panel">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-xl">
            <Building2 class="h-5 w-5 text-secondary" />
            My Establishments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="!myEstablishments.length" class="rounded-lg border bg-muted/40 p-4 text-base text-muted-foreground">
            You have no listing yet. Open “My Establishment” to register your business.
          </div>

          <ul v-else class="space-y-3">
            <li
              v-for="item in myEstablishments"
              :key="item.id"
              class="rounded-lg border bg-background p-4"
            >
              <div class="mb-2 flex items-center justify-between gap-2">
                <h3 class="text-lg font-semibold">{{ item.name }}</h3>
                <Badge
                  :variant="item.listingStatus === 'verified' ? 'default' : item.listingStatus === 'rejected' ? 'destructive' : 'secondary'"
                >
                  {{ item.listingStatus }}
                </Badge>
              </div>
              <p class="text-sm text-muted-foreground">{{ item.city }} • {{ item.address }}</p>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card class="shadow-panel">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-xl">
            <Megaphone class="h-5 w-5 text-accent" />
            Latest Advisories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="!announcements.length" class="rounded-lg border bg-muted/40 p-4 text-base text-muted-foreground">
            No advisories available right now.
          </div>

          <ul v-else class="space-y-3">
            <li v-for="item in announcements" :key="item.id" class="rounded-lg border bg-background p-4">
              <div class="mb-2 flex items-center justify-between gap-2">
                <h3 class="text-base font-semibold">{{ item.title }}</h3>
                <Badge variant="secondary">{{ item.city }}</Badge>
              </div>
              <p class="line-clamp-2 text-sm text-muted-foreground">{{ item.content }}</p>
            </li>
          </ul>
        </CardContent>
      </Card>
    </section>

    <section class="mt-8">
      <Card class="shadow-panel">
        <CardHeader>
          <CardTitle class="flex items-center gap-2 text-xl">
            <ShieldAlert class="h-5 w-5 text-primary" />
            Operations Tip
          </CardTitle>
        </CardHeader>
        <CardContent class="text-base text-muted-foreground">
          Keep your business status and opening hours updated daily. This improves tourist trust and helps reduce inquiry delays.
        </CardContent>
      </Card>
    </section>
  </div>
</template>

