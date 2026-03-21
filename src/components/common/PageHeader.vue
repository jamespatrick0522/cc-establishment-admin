<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
  }>(),
  {
    subtitle: '',
  },
);
</script>

<template>
  <header class="mb-6">
    <h1 class="text-3xl font-bold tracking-tight text-foreground">{{ title }}</h1>
    <p v-if="subtitle" class="mt-2 max-w-3xl text-base leading-relaxed text-muted-foreground">
      {{ subtitle }}
    </p>
  </header>
</template>
