<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';

import { login } from '@/api/auth.api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const form = reactive({
  email: '',
  password: '',
});

const loading = ref(false);
const errorMessage = ref('');

async function submit() {
  loading.value = true;
  errorMessage.value = '';

  try {
    const response = await login(form);
    authStore.setSession(response);
    router.push('/');
  } catch (error: any) {
    errorMessage.value =
      error?.response?.data?.message || 'Login failed. Please check your email and password.';
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/50 px-4 py-10">
    <Card class="w-full max-w-md shadow-panel">
      <CardHeader>
        <CardTitle class="text-2xl text-primary">Establishment Login</CardTitle>
        <CardDescription class="text-base">
          Sign in to manage your listing status and guest inquiries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-4" @submit.prevent="submit">
          <div class="space-y-2">
            <Label class="text-base">Email</Label>
            <Input v-model="form.email" type="email" class="h-11" required />
          </div>

          <div class="space-y-2">
            <Label class="text-base">Password</Label>
            <Input v-model="form.password" type="password" class="h-11" required />
          </div>

          <p v-if="errorMessage" class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ errorMessage }}
          </p>

          <Button class="h-11 w-full text-base" :disabled="loading">
            {{ loading ? 'Signing in...' : 'Login' }}
          </Button>

          <p class="text-center text-sm text-muted-foreground">
            No account yet?
            <RouterLink to="/register" class="font-medium text-secondary hover:underline">
              Register establishment account
            </RouterLink>
          </p>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
