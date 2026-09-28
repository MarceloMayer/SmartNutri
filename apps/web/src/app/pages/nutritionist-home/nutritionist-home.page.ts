import { NgFor } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import {
  DashboardIconComponent,
  type DashboardIconName
} from '../../shared/components/dashboard-icon/dashboard-icon.component';

interface QuickAccessCard {
  title: string;
  description: string;
  route: string;
  icon: DashboardIconName;
}

@Component({
  selector: 'app-nutritionist-home-page',
  standalone: true,
  imports: [DashboardIconComponent, NgFor, RouterLink],
  templateUrl: './nutritionist-home.page.html',
  styleUrl: './nutritionist-home.page.scss'
})
export class NutritionistHomePage {
  readonly quickAccessCards: QuickAccessCard[] = [
    {
      title: 'Pacientes',
      description: 'Cadastros e acompanhamento clínico.',
      route: '/nutritionist/patients',
      icon: 'patients'
    },
    {
      title: 'Novo plano alimentar',
      description: 'Monte uma nova dieta com refeições.',
      route: '/meal-plans/new',
      icon: 'plan-add'
    },
    {
      title: 'Planos alimentares',
      description: 'Revise e edite planos existentes.',
      route: '/meal-plans',
      icon: 'plans'
    },
    {
      title: 'Cálculo de substituição',
      description: 'Compare equivalências alimentares.',
      route: '/calculator',
      icon: 'calculator'
    },
    {
      title: 'Alimentos',
      description: 'Consulte a base nutricional.',
      route: '/nutritionist/foods',
      icon: 'foods'
    },
    {
      title: 'Grupos de substituição',
      description: 'Gerencie vínculos e curadoria.',
      route: '/nutritionist/substitution-groups',
      icon: 'groups'
    },
    {
      title: 'Usuários',
      description: 'Crie e administre acessos.',
      route: '/nutritionist/users',
      icon: 'users'
    },
    {
      title: 'Configurações de cálculo',
      description: 'Veja os parâmetros atuais.',
      route: '/nutritionist/calculation-settings',
      icon: 'settings'
    }
  ];
}
