import { HttpErrorResponse } from '@angular/common/http';
import { NgFor, NgIf } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import type {
  Food,
  FoodSearchResult,
  SubstitutionGroup,
  SubstitutionGroupFood
} from '../../core/models/nutrition.models';
import { FoodService } from '../../features/foods/services/food.service';
import { NutritionistPreferenceService, type FoodPreferenceType } from '../../features/preferences/services/nutritionist-preference.service';
import { SubstitutionService } from '../../features/substitutions/services/substitution.service';

type DashboardSection = 'foods' | 'groups' | 'settings';
type ViewState = 'idle' | 'loading' | 'error';
type GroupFormMode = 'create' | 'edit';
type FoodSummary = Pick<Food, 'id' | 'name' | 'slug'> & {
  source?: string;
  groups?: SubstitutionGroup[];
};

@Component({
  selector: 'app-nutritionist-dashboard-page',
  standalone: true,
  imports: [NgFor, NgIf, ReactiveFormsModule, RouterLink],
  templateUrl: './nutritionist-dashboard.page.html',
  styleUrl: './nutritionist-dashboard.page.scss'
})
export class NutritionistDashboardPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly foodService = inject(FoodService);
  private readonly preferenceService = inject(NutritionistPreferenceService);
  private readonly substitutionService = inject(SubstitutionService);

  readonly foodSearchControl = new FormControl('', {
    nonNullable: true
  });

  readonly groupNameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.minLength(2)]
  });

  readonly groupDescriptionControl = new FormControl('', {
    nonNullable: true
  });

  readonly groupFoodSearchControl = new FormControl('', {
    nonNullable: true
  });

  activeSection: DashboardSection = this.route.snapshot.data['section'] ?? 'foods';
  foods: FoodSummary[] = [];
  selectedFood: Food | null = null;
  foodState: ViewState = 'idle';
  foodErrorMessage = '';
  preferenceActionMessage = '';
  foodPreferencesByFoodId = new Map<number, FoodPreferenceType>();

  groups: SubstitutionGroup[] = [];
  selectedGroup: SubstitutionGroup | null = null;
  groupFoods: SubstitutionGroupFood[] = [];
  groupState: ViewState = 'idle';
  groupErrorMessage = '';
  groupFormMode: GroupFormMode = 'create';
  groupActionState: ViewState = 'idle';
  groupActionMessage = '';
  groupFoodSearchState: ViewState = 'idle';
  groupFoodCandidates: FoodSearchResult[] = [];
  groupFoodActionMessage = '';

  readonly calculationSettings = [
    {
      label: 'Diferença máxima de calorias',
      value: '15%'
    },
    {
      label: 'Diferença máxima do nutriente base',
      value: '20%'
    },
    {
      label: 'Resultados padrão',
      value: '10'
    }
  ];

  ngOnInit(): void {
    if (this.activeSection === 'foods') {
      this.loadFoodPreferences();
      this.loadFoods();
    }

    if (this.activeSection === 'groups') {
      this.loadGroups();
    }
  }

  loadFoods(): void {
    this.foodState = 'loading';
    this.foodErrorMessage = '';

    this.foodService.list(20).subscribe({
      next: (foods) => {
        this.foods = foods;
        this.selectedFood = foods[0] ?? null;
        this.foodState = 'idle';
      },
      error: (error: unknown) => {
        this.foodState = 'error';
        this.foodErrorMessage = this.resolveErrorMessage(error, 'Nao foi possivel listar alimentos.');
      }
    });
  }

  loadFoodPreferences(): void {
    this.preferenceService.listFoodPreferences().subscribe({
      next: (preferences) => {
        this.foodPreferencesByFoodId = preferences.reduce((preferencesByFoodId, preference) => {
          preferencesByFoodId.set(preference.foodId, preference.preferenceType);
          return preferencesByFoodId;
        }, new Map<number, FoodPreferenceType>());
      },
      error: () => {
        this.preferenceActionMessage = 'Nao foi possivel carregar preferencias de alimentos.';
      }
    });
  }

  searchFoods(): void {
    const term = this.foodSearchControl.value.trim();

    if (!term) {
      this.loadFoods();
      return;
    }

    this.foodState = 'loading';
    this.foodErrorMessage = '';

    this.foodService.search(term, 10).subscribe({
      next: (foods) => {
        this.foods = foods;
        this.selectedFood = null;
        this.foodState = 'idle';
      },
      error: (error: unknown) => {
        this.foodState = 'error';
        this.foodErrorMessage = this.resolveErrorMessage(error, 'Nao foi possivel buscar alimentos.');
      }
    });
  }

  selectFood(food: FoodSummary): void {
    this.foodState = 'loading';
    this.foodErrorMessage = '';

    this.foodService.findById(food.id).subscribe({
      next: (foodDetails) => {
        this.selectedFood = foodDetails;
        this.foodState = 'idle';
      },
      error: (error: unknown) => {
        this.foodState = 'error';
        this.foodErrorMessage = this.resolveErrorMessage(error, 'Nao foi possivel carregar o alimento.');
      }
    });
  }

  getFoodPreference(foodId: number): FoodPreferenceType | null {
    return this.foodPreferencesByFoodId.get(foodId) ?? null;
  }

  setSelectedFoodPreference(preferenceType: FoodPreferenceType): void {
    if (!this.selectedFood) {
      return;
    }

    this.preferenceActionMessage = '';

    this.preferenceService.setFoodPreference(this.selectedFood.id, preferenceType).subscribe({
      next: (preference) => {
        this.foodPreferencesByFoodId.set(preference.foodId, preference.preferenceType);
        this.preferenceActionMessage = preference.preferenceType === 'favorite'
          ? 'Alimento marcado como favorito.'
          : 'Alimento marcado como evitar.';
      },
      error: (error: unknown) => {
        this.preferenceActionMessage = this.resolveErrorMessage(error, 'Nao foi possivel salvar a preferencia.');
      }
    });
  }

  clearSelectedFoodPreference(): void {
    if (!this.selectedFood) {
      return;
    }

    const foodId = this.selectedFood.id;
    this.preferenceActionMessage = '';

    this.preferenceService.clearFoodPreference(foodId).subscribe({
      next: () => {
        this.foodPreferencesByFoodId.delete(foodId);
        this.preferenceActionMessage = 'Preferencia removida.';
      },
      error: (error: unknown) => {
        this.preferenceActionMessage = this.resolveErrorMessage(error, 'Nao foi possivel remover a preferencia.');
      }
    });
  }

  loadGroups(selectedGroupId?: number): void {
    this.groupState = 'loading';
    this.groupErrorMessage = '';

    this.substitutionService.listGroups().subscribe({
      next: (groups) => {
        this.groups = groups;
        this.groupState = 'idle';

        if (groups.length === 0) {
          this.selectedGroup = null;
          this.groupFoods = [];
          this.startCreateGroup();
          return;
        }

        const selectedGroup = groups.find((group) => group.id === selectedGroupId)
          ?? groups.find((group) => group.id === this.selectedGroup?.id)
          ?? groups[0];

        this.selectGroup(selectedGroup);
      },
      error: (error: unknown) => {
        this.groupState = 'error';
        this.groupErrorMessage = this.resolveErrorMessage(error, 'Nao foi possivel listar grupos.');
      }
    });
  }

  selectGroup(group: SubstitutionGroup): void {
    this.selectedGroup = group;
    this.groupFormMode = 'edit';
    this.groupNameControl.setValue(group.name);
    this.groupDescriptionControl.setValue(group.description ?? '');
    this.groupActionMessage = '';
    this.groupFoodActionMessage = '';
    this.groupFoodCandidates = [];
    this.groupFoodSearchControl.setValue('');
    this.groupState = 'loading';
    this.groupErrorMessage = '';

    this.substitutionService.listGroupFoods(group.id).subscribe({
      next: (foods) => {
        this.groupFoods = foods;
        this.groupState = 'idle';
      },
      error: (error: unknown) => {
        this.groupState = 'error';
        this.groupErrorMessage = this.resolveErrorMessage(error, 'Nao foi possivel carregar alimentos do grupo.');
      }
    });
  }

  startCreateGroup(): void {
    this.groupFormMode = 'create';
    this.selectedGroup = null;
    this.groupFoods = [];
    this.groupFoodCandidates = [];
    this.groupFoodSearchControl.setValue('');
    this.groupNameControl.setValue('');
    this.groupDescriptionControl.setValue('');
    this.groupActionMessage = '';
    this.groupFoodActionMessage = '';
  }

  saveGroup(): void {
    this.groupNameControl.markAsTouched();

    if (this.groupNameControl.invalid) {
      return;
    }

    const payload = {
      name: this.groupNameControl.value.trim(),
      description: this.groupDescriptionControl.value.trim() || null
    };

    this.groupActionState = 'loading';
    this.groupActionMessage = '';

    const request = this.groupFormMode === 'edit' && this.selectedGroup
      ? this.substitutionService.updateGroup(this.selectedGroup.id, payload)
      : this.substitutionService.createGroup({ ...payload, isActive: true });

    request.subscribe({
      next: (group) => {
        this.groupActionState = 'idle';
        this.groupActionMessage = this.groupFormMode === 'edit'
          ? 'Grupo atualizado.'
          : 'Grupo criado.';
        this.loadGroups(group.id);
      },
      error: (error: unknown) => {
        this.groupActionState = 'error';
        this.groupActionMessage = this.resolveErrorMessage(error, 'Nao foi possivel salvar o grupo.');
      }
    });
  }

  toggleSelectedGroupStatus(): void {
    if (!this.selectedGroup) {
      return;
    }

    this.groupActionState = 'loading';
    this.groupActionMessage = '';

    this.substitutionService.updateGroupStatus(
      this.selectedGroup.id,
      !this.selectedGroup.isActive
    ).subscribe({
      next: (group) => {
        this.groupActionState = 'idle';
        this.selectedGroup = group;
        this.groups = this.groups.map((item) => item.id === group.id ? group : item);
        this.groupActionMessage = group.isActive ? 'Grupo ativado.' : 'Grupo desativado.';
      },
      error: (error: unknown) => {
        this.groupActionState = 'error';
        this.groupActionMessage = this.resolveErrorMessage(error, 'Nao foi possivel atualizar o status do grupo.');
      }
    });
  }

  searchGroupFoods(): void {
    const term = this.groupFoodSearchControl.value.trim();

    if (!term) {
      this.groupFoodCandidates = [];
      return;
    }

    this.groupFoodSearchState = 'loading';
    this.groupFoodActionMessage = '';

    this.foodService.search(term, 10).subscribe({
      next: (foods) => {
        this.groupFoodSearchState = 'idle';
        this.groupFoodCandidates = foods;
      },
      error: (error: unknown) => {
        this.groupFoodSearchState = 'error';
        this.groupFoodActionMessage = this.resolveErrorMessage(error, 'Nao foi possivel buscar alimentos.');
      }
    });
  }

  addFoodToSelectedGroup(food: FoodSearchResult): void {
    if (!this.selectedGroup || this.isFoodLinkedToSelectedGroup(food.id)) {
      return;
    }

    this.groupFoodSearchState = 'loading';
    this.groupFoodActionMessage = '';

    this.substitutionService.addFoodToGroup(this.selectedGroup.id, {
      foodId: food.id
    }).subscribe({
      next: () => {
        this.groupFoodSearchState = 'idle';
        this.groupFoodActionMessage = 'Alimento adicionado ao grupo.';
        this.groupFoodSearchControl.setValue('');
        this.groupFoodCandidates = [];
        this.reloadSelectedGroupFoods();
      },
      error: (error: unknown) => {
        this.groupFoodSearchState = 'error';
        this.groupFoodActionMessage = this.resolveErrorMessage(error, 'Nao foi possivel adicionar o alimento.');
      }
    });
  }

  removeFoodFromSelectedGroup(food: SubstitutionGroupFood): void {
    if (!this.selectedGroup) {
      return;
    }

    this.groupFoodSearchState = 'loading';
    this.groupFoodActionMessage = '';

    this.substitutionService.removeFoodFromGroup(this.selectedGroup.id, food.id).subscribe({
      next: () => {
        this.groupFoodSearchState = 'idle';
        this.groupFoodActionMessage = 'Alimento removido do grupo.';
        this.groupFoods = this.groupFoods.filter((item) => item.id !== food.id);
      },
      error: (error: unknown) => {
        this.groupFoodSearchState = 'error';
        this.groupFoodActionMessage = this.resolveErrorMessage(error, 'Nao foi possivel remover o alimento.');
      }
    });
  }

  isFoodLinkedToSelectedGroup(foodId: number): boolean {
    return this.groupFoods.some((food) => food.id === foodId);
  }

  formatValue(value: number | null | undefined, unit: string): string {
    return value === null || value === undefined ? '-' : `${value} ${unit}`;
  }

  private reloadSelectedGroupFoods(): void {
    if (!this.selectedGroup) {
      return;
    }

    this.substitutionService.listGroupFoods(this.selectedGroup.id).subscribe({
      next: (foods) => {
        this.groupFoods = foods;
      },
      error: (error: unknown) => {
        this.groupFoodActionMessage = this.resolveErrorMessage(error, 'Nao foi possivel atualizar alimentos do grupo.');
      }
    });
  }

  private resolveErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;

      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }

    return fallback;
  }
}
