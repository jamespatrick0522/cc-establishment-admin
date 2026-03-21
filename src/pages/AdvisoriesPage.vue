<script setup lang="ts">
import { onMounted, ref } from 'vue';

import { getAnnouncements } from '@/api/announcements.api';
import { getMyEstablishments } from '@/api/establishments.api';
import PageHeader from '@/components/common/PageHeader.vue';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Announcement } from '@/types/api';

const announcements = ref<Announcement[]>([]);
const loading = ref(false);
const cityFilter = ref<string | undefined>(undefined);

async function load() {
  loading.value = true;

  try {
    announcements.value = await getAnnouncements({ city: cityFilter.value, limit: 50 });
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  const mine = await getMyEstablishments({ page: 1, pageSize: 1 });
  cityFilter.value = mine.data[0]?.city;
  await load();
});
</script>

<template>
  <div>
    <PageHeader
      title="City Advisories"
      subtitle="Monitor LGU advisories that may affect business operations and customer traffic."
    />

    <div class="mb-4 flex items-center gap-3">
      <input v-model="cityFilter" class="h-11 w-full max-w-md rounded-md border bg-background px-3 text-base" placeholder="Filter by city" />
      <Button class="h-11" variant="secondary" @click="load">Refresh</Button>
    </div>

    <Card class="shadow-panel">
      <CardContent class="space-y-3 p-4">
        <div v-if="loading" class="rounded-lg border bg-muted/40 p-4 text-base text-muted-foreground">
          Loading advisories...
        </div>

        <div v-else-if="!announcements.length" class="rounded-lg border bg-muted/40 p-4 text-base text-muted-foreground">
          No advisories found.
        </div>

        <article v-for="item in announcements" :key="item.id" class="rounded-lg border bg-background p-4">
          <div class="mb-2 flex items-center justify-between gap-2">
            <h3 class="text-lg font-semibold">{{ item.title }}</h3>
            <Badge variant="secondary">{{ item.city }}</Badge>
          </div>

          <p class="mb-2 whitespace-pre-wrap text-sm text-muted-foreground">{{ item.content }}</p>

          <p class="text-xs text-muted-foreground">
            Posted: {{ new Date(item.createdAt).toLocaleString() }}
          </p>
        </article>
      </CardContent>
    </Card>
  </div>
</template>
