export type PatientSex = 'male' | 'female';

export interface Patient {
  id: number;
  nutritionistUserId: number;
  patientUserId: number | null;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  birthDate: string | null;
  sex: PatientSex | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavePatientPayload {
  name: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  birthDate?: string | null;
  sex?: PatientSex | null;
  generateAccess?: boolean;
}

export interface CreatePatientResponse extends Patient {
  generatedPassword?: string;
}

export interface MealPlan {
  id: number;
  nutritionistUserId: number;
  patientId: number | null;
  title: string;
  objective: string | null;
  description: string | null;
  status: MealPlanStatus;
  isActive: boolean;
  totalKcal: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  totalFiber: number;
  createdAt: string;
  updatedAt: string;
}

export type MealPlanStatus = 'draft' | 'active' | 'archived';

export interface SaveMealPlanPayload {
  patientId?: number | null;
  title: string;
  objective?: string | null;
  description?: string | null;
  status?: MealPlanStatus;
  isActive?: boolean;
}

export interface UpdateMealPlanPayload {
  patientId?: number | null;
  title?: string;
  objective?: string | null;
  description?: string | null;
  status?: MealPlanStatus;
  isActive?: boolean;
}

export interface MealPlanMeal {
  id: number;
  mealPlanId: number;
  name: string;
  timeLabel: string | null;
  orderIndex: number;
  totalKcal: number;
  totalCarbs: number;
  totalProtein: number;
  totalFat: number;
  totalFiber: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveMealPayload {
  name: string;
  timeLabel?: string | null;
  orderIndex?: number;
}

export interface UpdateMealPayload {
  name?: string;
  timeLabel?: string | null;
  orderIndex?: number;
}

export interface MealPlanItem {
  id: number;
  mealPlanMealId: number;
  foodId: number;
  foodName: string;
  foodSlug: string;
  food: {
    id: number;
    name: string;
    slug: string;
  };
  quantity: number;
  unit: string;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  notes: string | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface MealPlanMealWithItems extends MealPlanMeal {
  items: MealPlanItem[];
}

export interface MealPlanDetail extends MealPlan {
  patient: Patient | null;
  meals: MealPlanMealWithItems[];
}

export interface PatientDiet {
  patient: Patient | null;
  mealPlan: MealPlanDetail | null;
}

export interface SaveMealPlanItemPayload {
  foodId: number;
  quantity: number;
  unit?: string;
  notes?: string | null;
  orderIndex?: number;
}

export interface UpdateMealPlanItemPayload {
  foodId?: number;
  quantity?: number;
  unit?: string;
  notes?: string | null;
  orderIndex?: number;
}
