import { Routes } from '@angular/router';

import { authenticatedGuard } from './core/auth/authenticated.guard';
import { nutritionistGuard } from './core/auth/nutritionist.guard';
import { patientGuard } from './core/auth/patient.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage)
  },
  {
    path: 'cadastro',
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage)
  },
  {
    path: 'esqueci-senha',
    loadComponent: () => import('./pages/forgot-password/forgot-password.page').then((m) => m.ForgotPasswordPage)
  },
  {
    path: 'redefinir-senha',
    loadComponent: () => import('./pages/reset-password/reset-password.page').then((m) => m.ResetPasswordPage)
  },
  {
    path: 'conta',
    canActivate: [nutritionistGuard],
    loadComponent: () => import('./pages/conta/conta.page').then((m) => m.ContaPage)
  },
  {
    path: 'minha-dieta',
    canActivate: [patientGuard],
    loadComponent: () => import('./pages/patient-diet/patient-diet.page').then((m) => m.PatientDietPage)
  },
  {
    path: 'refeicoes',
    canActivate: [patientGuard],
    loadComponent: () => import('./pages/meal-feed/meal-feed.page').then((m) => m.MealFeedPage)
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/home-redirect/home-redirect.page').then((m) => m.HomeRedirectPage)
  },
  {
    path: 'nutritionist/patients',
    canActivate: [nutritionistGuard],
    loadComponent: () => import('./pages/patients/patients.page').then((m) => m.PatientsPage)
  },
  {
    path: 'nutritionist/refeicoes',
    canActivate: [nutritionistGuard],
    loadComponent: () => import('./pages/meal-feed/meal-feed.page').then((m) => m.MealFeedPage)
  },
  {
    path: 'nutritionist/users',
    canActivate: [nutritionistGuard],
    loadComponent: () => import('./pages/users/users.page').then((m) => m.UsersPage)
  },
  {
    path: 'meal-plans',
    canActivate: [nutritionistGuard],
    loadComponent: () => import('./pages/meal-plan-list/meal-plan-list.page').then((m) => m.MealPlanListPage)
  },
  {
    path: 'meal-plans/new',
    canActivate: [nutritionistGuard],
    loadComponent: () => import('./pages/meal-plan-editor/meal-plan-editor.page').then((m) => m.MealPlanEditorPage)
  },
  {
    path: 'meal-plans/:id/edit',
    canActivate: [nutritionistGuard],
    loadComponent: () => import('./pages/meal-plan-editor/meal-plan-editor.page').then((m) => m.MealPlanEditorPage)
  },
  {
    path: 'nutritionist/patients/:id',
    canActivate: [nutritionistGuard],
    loadComponent: () => import('./pages/patient-detail/patient-detail.page').then((m) => m.PatientDetailPage)
  },
  {
    path: 'nutritionist/patients/:id/physical-evaluations/evolution',
    canActivate: [nutritionistGuard],
    loadComponent: () => import('./pages/physical-evaluation-evolution/physical-evaluation-evolution.page').then((m) => m.PhysicalEvaluationEvolutionPage)
  },
  {
    path: 'nutritionist/patients/:patientId/physical-evaluations/new',
    canActivate: [nutritionistGuard],
    loadComponent: () => import('./pages/physical-evaluation-form/physical-evaluation-form.page').then((m) => m.PhysicalEvaluationFormPage)
  },
  {
    path: 'nutritionist/physical-evaluations/:id/edit',
    canActivate: [nutritionistGuard],
    loadComponent: () => import('./pages/physical-evaluation-form/physical-evaluation-form.page').then((m) => m.PhysicalEvaluationFormPage)
  },
  {
    path: 'nutritionist/foods',
    canActivate: [nutritionistGuard],
    data: {
      section: 'foods'
    },
    loadComponent: () => import('./pages/nutritionist-dashboard/nutritionist-dashboard.page').then((m) => m.NutritionistDashboardPage)
  },
  {
    path: 'nutritionist',
    canActivate: [nutritionistGuard],
    loadComponent: () => import('./pages/nutritionist-home/nutritionist-home.page').then((m) => m.NutritionistHomePage)
  },
  {
    path: 'nutritionist/substitution-groups',
    canActivate: [nutritionistGuard],
    data: {
      section: 'groups'
    },
    loadComponent: () => import('./pages/nutritionist-dashboard/nutritionist-dashboard.page').then((m) => m.NutritionistDashboardPage)
  },
  {
    path: 'nutritionist/calculation-settings',
    canActivate: [nutritionistGuard],
    data: {
      section: 'settings'
    },
    loadComponent: () => import('./pages/nutritionist-dashboard/nutritionist-dashboard.page').then((m) => m.NutritionistDashboardPage)
  },
  {
    path: 'calculator',
    canActivate: [authenticatedGuard],
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
