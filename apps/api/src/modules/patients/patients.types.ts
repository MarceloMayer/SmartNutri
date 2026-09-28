export const mealPlanStatuses = ['draft', 'active', 'archived'] as const;

export type MealPlanStatus = typeof mealPlanStatuses[number];

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

export interface MealPlanItemFood {
  id: number;
  name: string;
  slug: string;
}

export interface MealPlanItem {
  id: number;
  mealPlanMealId: number;
  foodId: number;
  foodName: string;
  foodSlug: string;
  food: MealPlanItemFood;
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

export interface FoodNutrition {
  id: number;
  name: string;
  slug: string;
  kcalPer100g: number | null;
  carbsPer100g: number | null;
  proteinPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g: number | null;
}

export interface IdParams {
  id: string;
}

export interface PatientMealPlansParams {
  patientId: string;
}

export interface MealPlanParams {
  mealPlanId: string;
}

export interface MealParams {
  mealId: string;
}

export interface MealItemParams {
  itemId: string;
}

export interface MealPlanItemSubstitutionParams {
  id: string;
}

export interface CreatePatientBody {
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

export interface PatientDiet {
  patient: Patient | null;
  mealPlan: MealPlanDetail | null;
}

export interface UpdatePatientBody {
  name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  birthDate?: string | null;
  sex?: PatientSex | null;
}

export interface CreateMealPlanBody {
  patientId?: number | null;
  title: string;
  objective?: string | null;
  description?: string | null;
  status?: MealPlanStatus;
  isActive?: boolean;
}

export interface UpdateMealPlanBody {
  patientId?: number | null;
  title?: string;
  objective?: string | null;
  description?: string | null;
  status?: MealPlanStatus;
  isActive?: boolean;
}

export interface CreateMealBody {
  name: string;
  timeLabel?: string | null;
  orderIndex?: number;
}

export interface UpdateMealBody {
  name?: string;
  timeLabel?: string | null;
  orderIndex?: number;
}

export interface CreateMealPlanItemBody {
  foodId: number;
  quantity: number;
  unit?: string;
  notes?: string | null;
  orderIndex?: number;
}

export interface UpdateMealPlanItemBody {
  foodId?: number;
  quantity?: number;
  unit?: string;
  notes?: string | null;
  orderIndex?: number;
}
