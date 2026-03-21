<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

defineProps<{
  label: string;
  value: string | number;
  hint?: string;
}>();
</script>

<template>
  <Card class="shadow-panel">
    <CardHeader class="pb-2">
      <CardTitle class="text-base font-semibold text-muted-foreground">{{ label }}</CardTitle>
    </CardHeader>
    <CardContent>
      <p class="text-3xl font-bold text-foreground">{{ value }}</p>
      <p v-if="hint" class="mt-2 text-sm text-muted-foreground">{{ hint }}</p>
    </CardContent>
  </Card>
</template>
