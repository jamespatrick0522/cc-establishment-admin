import { createRouter, createWebHistory } from 'vue-router';

import AdminLayout from '@/layouts/EstablishmentLayout.vue';
import AdvisoriesPage from '@/pages/AdvisoriesPage.vue';
import DashboardPage from '@/pages/DashboardPage.vue';
import InquiriesPage from '@/pages/InquiriesPage.vue';
import LoginPage from '@/pages/LoginPage.vue';
import MyEstablishmentPage from '@/pages/MyEstablishmentPage.vue';
import NotFoundPage from '@/pages/NotFoundPage.vue';
import RegisterPage from '@/pages/RegisterPage.vue';
import { useAuthStore } from '@/stores/auth';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginPage,
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterPage,
      meta: { guestOnly: true },
    },
    {
      path: '/',
      component: AdminLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardPage,
        },
        {
          path: 'my-establishment',
          name: 'my-establishment',
          component: MyEstablishmentPage,
        },
        {
          path: 'inquiries',
          name: 'inquiries',
          component: InquiriesPage,
        },
        {
          path: 'advisories',
          name: 'advisories',
          component: AdvisoriesPage,
        },
      ],
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: NotFoundPage,
    },
  ],
});

router.beforeEach((to) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' };
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    return { name: 'dashboard' };
  }

  return true;
});

export default router;
