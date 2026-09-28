import { randomBytes } from 'node:crypto';
import { hash } from 'bcrypt';

import { PatientsRepository } from './patients.repository';
import type {
  CreateMealBody,
  CreateMealPlanBody,
  CreateMealPlanItemBody,
  CreatePatientBody,
  UpdateMealBody,
  UpdateMealPlanBody,
  UpdateMealPlanItemBody,
  UpdatePatientBody
} from './patients.types';

const passwordSaltRounds = 12;

export class PatientsController {
  constructor(private readonly patientsRepository: PatientsRepository) {}

  listPatients(nutritionistUserId: number) {
    return this.patientsRepository.listPatients(nutritionistUserId);
  }

  async createPatient(nutritionistUserId: number, body: CreatePatientBody) {
    const input = normalizeCreatePatientInput(body);

    if (!body.generateAccess) {
      return {
        status: 'created' as const,
        data: await this.patientsRepository.createPatient(nutritionistUserId, input)
      };
    }

    if (!input.email) {
      return {
        status: 'invalid' as const,
        message: 'Email is required to generate patient access'
      };
    }

    if (await this.patientsRepository.userExistsByEmail(input.email)) {
      return {
        status: 'conflict' as const,
        message: 'Email already registered'
      };
    }

    const generatedPassword = generatePatientPassword();
    const patient = await this.patientsRepository.createPatientWithUser(nutritionistUserId, {
      ...input,
      email: input.email,
      passwordHash: await hash(generatedPassword, passwordSaltRounds)
    });

    return {
      status: 'created' as const,
      data: {
        ...patient,
        generatedPassword
      }
    };
  }

  findPatientById(nutritionistUserId: number, id: string) {
    return this.patientsRepository.findPatientById(nutritionistUserId, Number(id));
  }

  updatePatient(nutritionistUserId: number, id: string, body: UpdatePatientBody) {
    return this.patientsRepository.updatePatient(
      nutritionistUserId,
      Number(id),
      normalizeUpdatePatientInput(body)
    );
  }

  deletePatient(nutritionistUserId: number, id: string) {
    return this.patientsRepository.deletePatient(nutritionistUserId, Number(id));
  }

  async listMealPlans(nutritionistUserId: number, patientId?: string) {
    const patientIdNumber = patientId ? Number(patientId) : null;

    if (patientIdNumber !== null) {
      const patient = await this.patientsRepository.findPatientById(
        nutritionistUserId,
        patientIdNumber
      );

      if (!patient) {
        return {
          status: 'not_found' as const,
          message: 'Patient not found'
        };
      }
    }

    return {
      status: 'ok' as const,
      data: await this.patientsRepository.listMealPlans(nutritionistUserId, patientIdNumber)
    };
  }

  async createMealPlan(
    nutritionistUserId: number,
    body: CreateMealPlanBody,
    patientId?: string
  ) {
    const patientIdNumber = patientId ? Number(patientId) : body.patientId ?? null;

    if (patientIdNumber !== null) {
      const patient = await this.patientsRepository.findPatientById(
        nutritionistUserId,
        patientIdNumber
      );

      if (!patient) {
        return {
          status: 'not_found' as const,
          message: 'Patient not found'
        };
      }
    }

    const mealPlan = await this.patientsRepository.createMealPlan(
      nutritionistUserId,
      normalizeCreateMealPlanInput(body, patientIdNumber)
    );

    return {
      status: 'created' as const,
      data: mealPlan
    };
  }

  findMealPlanDetailById(nutritionistUserId: number, mealPlanId: string) {
    return this.patientsRepository.findMealPlanDetailById(nutritionistUserId, Number(mealPlanId));
  }

  async updateMealPlan(
    nutritionistUserId: number,
    mealPlanId: string,
    body: UpdateMealPlanBody
  ) {
    if (body.patientId !== undefined && body.patientId !== null) {
      const patient = await this.patientsRepository.findPatientById(
        nutritionistUserId,
        body.patientId
      );

      if (!patient) {
        return {
          status: 'patient_not_found' as const,
          message: 'Patient not found'
        };
      }
    }

    const mealPlan = await this.patientsRepository.updateMealPlan(
      nutritionistUserId,
      Number(mealPlanId),
      normalizeUpdateMealPlanInput(body)
    );

    if (!mealPlan) {
      return {
        status: 'not_found' as const,
        message: 'Meal plan not found'
      };
    }

    return {
      status: 'ok' as const,
      data: mealPlan
    };
  }

  deleteMealPlan(nutritionistUserId: number, mealPlanId: string) {
    return this.patientsRepository.deleteMealPlan(nutritionistUserId, Number(mealPlanId));
  }

  async listMeals(nutritionistUserId: number, mealPlanId: string) {
    const mealPlan = await this.patientsRepository.findMealPlanById(
      nutritionistUserId,
      Number(mealPlanId)
    );

    if (!mealPlan) {
      return {
        status: 'not_found' as const,
        message: 'Meal plan not found'
      };
    }

    return {
      status: 'ok' as const,
      data: await this.patientsRepository.listMeals(nutritionistUserId, Number(mealPlanId))
    };
  }

  async createMeal(nutritionistUserId: number, mealPlanId: string, body: CreateMealBody) {
    const mealPlan = await this.patientsRepository.findMealPlanById(
      nutritionistUserId,
      Number(mealPlanId)
    );

    if (!mealPlan) {
      return {
        status: 'not_found' as const,
        message: 'Meal plan not found'
      };
    }

    const meal = await this.patientsRepository.createMeal(
      Number(mealPlanId),
      normalizeCreateMealInput(body)
    );

    return {
      status: 'created' as const,
      data: meal
    };
  }

  updateMeal(nutritionistUserId: number, mealId: string, body: UpdateMealBody) {
    return this.patientsRepository.updateMeal(
      nutritionistUserId,
      Number(mealId),
      normalizeUpdateMealInput(body)
    );
  }

  deleteMeal(nutritionistUserId: number, mealId: string) {
    return this.patientsRepository.deleteMeal(nutritionistUserId, Number(mealId));
  }

  async listItems(nutritionistUserId: number, mealId: string) {
    const meal = await this.patientsRepository.findMealById(nutritionistUserId, Number(mealId));

    if (!meal) {
      return {
        status: 'not_found' as const,
        message: 'Meal not found'
      };
    }

    return {
      status: 'ok' as const,
      data: await this.patientsRepository.listItems(nutritionistUserId, Number(mealId))
    };
  }

  async createItem(nutritionistUserId: number, mealId: string, body: CreateMealPlanItemBody) {
    const meal = await this.patientsRepository.findMealById(nutritionistUserId, Number(mealId));

    if (!meal) {
      return {
        status: 'not_found' as const,
        message: 'Meal not found'
      };
    }

    const item = await this.patientsRepository.createItem(
      Number(mealId),
      normalizeCreateItemInput(body)
    );

    if (!item) {
      return {
        status: 'food_not_found' as const,
        message: 'Food not found'
      };
    }

    return {
      status: 'created' as const,
      data: item
    };
  }

  async updateItem(nutritionistUserId: number, itemId: string, body: UpdateMealPlanItemBody) {
    if (
      body.foodId !== undefined
      && !await this.patientsRepository.foodExists(body.foodId)
    ) {
      return {
        status: 'food_not_found' as const,
        message: 'Food not found'
      };
    }

    const item = await this.patientsRepository.updateItem(
      nutritionistUserId,
      Number(itemId),
      normalizeUpdateItemInput(body)
    );

    if (!item) {
      return {
        status: 'not_found' as const,
        message: 'Meal plan item not found'
      };
    }

    return {
      status: 'ok' as const,
      data: item
    };
  }

  deleteItem(nutritionistUserId: number, itemId: string) {
    return this.patientsRepository.deleteItem(nutritionistUserId, Number(itemId));
  }

  recalculateMealPlan(nutritionistUserId: number, mealPlanId: string) {
    return this.patientsRepository.recalculatePlanWithMeals(
      nutritionistUserId,
      Number(mealPlanId)
    );
  }

  findItemById(nutritionistUserId: number, itemId: string) {
    return this.patientsRepository.findItemById(nutritionistUserId, Number(itemId));
  }
}

function normalizeCreatePatientInput(input: CreatePatientBody): CreatePatientBody {
  return {
    name: input.name.trim(),
    email: normalizeOptionalText(input.email)?.toLowerCase() ?? null,
    phone: normalizeOptionalText(input.phone),
    notes: normalizeOptionalText(input.notes),
    birthDate: input.birthDate ?? null,
    sex: input.sex ?? null
  };
}

function normalizeUpdatePatientInput(input: UpdatePatientBody): UpdatePatientBody {
  const output: UpdatePatientBody = {};

  if (input.name !== undefined) {
    output.name = input.name.trim();
  }

  if (input.email !== undefined) {
    output.email = normalizeOptionalText(input.email)?.toLowerCase() ?? null;
  }

  if (input.phone !== undefined) {
    output.phone = normalizeOptionalText(input.phone);
  }

  if (input.notes !== undefined) {
    output.notes = normalizeOptionalText(input.notes);
  }

  if (input.birthDate !== undefined) {
    output.birthDate = input.birthDate ?? null;
  }

  if (input.sex !== undefined) {
    output.sex = input.sex ?? null;
  }

  return output;
}

function normalizeCreateMealPlanInput(
  input: CreateMealPlanBody,
  patientId: number | null
): CreateMealPlanBody {
  return {
    patientId,
    title: input.title.trim(),
    objective: normalizeOptionalText(input.objective),
    description: normalizeOptionalText(input.description),
    status: input.status,
    isActive: input.isActive
  };
}

function normalizeUpdateMealPlanInput(input: UpdateMealPlanBody): UpdateMealPlanBody {
  const output: UpdateMealPlanBody = {};

  if (input.patientId !== undefined) {
    output.patientId = input.patientId;
  }

  if (input.title !== undefined) {
    output.title = input.title.trim();
  }

  if (input.objective !== undefined) {
    output.objective = normalizeOptionalText(input.objective);
  }

  if (input.description !== undefined) {
    output.description = normalizeOptionalText(input.description);
  }

  if (input.status !== undefined) {
    output.status = input.status;
  }

  if (input.isActive !== undefined) {
    output.isActive = input.isActive;
  }

  return output;
}

function normalizeCreateMealInput(input: CreateMealBody): CreateMealBody {
  return {
    name: input.name.trim(),
    timeLabel: normalizeOptionalText(input.timeLabel),
    orderIndex: input.orderIndex ?? 0
  };
}

function normalizeUpdateMealInput(input: UpdateMealBody): UpdateMealBody {
  const output: UpdateMealBody = {};

  if (input.name !== undefined) {
    output.name = input.name.trim();
  }

  if (input.timeLabel !== undefined) {
    output.timeLabel = normalizeOptionalText(input.timeLabel);
  }

  if (input.orderIndex !== undefined) {
    output.orderIndex = input.orderIndex;
  }

  return output;
}

function normalizeCreateItemInput(input: CreateMealPlanItemBody): CreateMealPlanItemBody {
  return {
    foodId: input.foodId,
    quantity: input.quantity,
    unit: normalizeOptionalText(input.unit) ?? 'g',
    notes: normalizeOptionalText(input.notes),
    orderIndex: input.orderIndex ?? 0
  };
}

function normalizeUpdateItemInput(input: UpdateMealPlanItemBody): UpdateMealPlanItemBody {
  const output: UpdateMealPlanItemBody = {};

  if (input.foodId !== undefined) {
    output.foodId = input.foodId;
  }

  if (input.quantity !== undefined) {
    output.quantity = input.quantity;
  }

  if (input.unit !== undefined) {
    output.unit = normalizeOptionalText(input.unit) ?? 'g';
  }

  if (input.notes !== undefined) {
    output.notes = normalizeOptionalText(input.notes);
  }

  if (input.orderIndex !== undefined) {
    output.orderIndex = input.orderIndex;
  }

  return output;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim();

  return normalizedValue ? normalizedValue : null;
}

function generatePatientPassword(): string {
  return randomBytes(9).toString('base64url');
}
