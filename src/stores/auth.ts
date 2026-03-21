import { computed, ref } from 'vue';
import { defineStore } from 'pinia';

import type { AuthResponse, AuthUser } from '@/types/api';

const TOKEN_KEY = 'establishment_access_token';
const USER_KEY = 'establishment_auth_user';

function readUserFromStorage(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(localStorage.getItem(TOKEN_KEY));
  const user = ref<AuthUser | null>(readUserFromStorage());

  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value));

  function setSession(payload: AuthResponse) {
    accessToken.value = payload.accessToken;
    user.value = payload.user;

    localStorage.setItem(TOKEN_KEY, payload.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));
  }

  function logout() {
    accessToken.value = null;
    user.value = null;

    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  return {
    accessToken,
    user,
    isAuthenticated,
    setSession,
    logout,
  };
});
