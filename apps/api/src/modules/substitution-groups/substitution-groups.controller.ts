import { SubstitutionGroupsRepository } from './substitution-groups.repository';
import type {
  AddFoodToGroupBody,
  CreateSubstitutionGroupBody,
  UpdateSubstitutionGroupBody,
  UpdateSubstitutionGroupStatusBody
} from './substitution-groups.types';

export class SubstitutionGroupsController {
  constructor(private readonly substitutionGroupsRepository: SubstitutionGroupsRepository) {}

  list() {
    return this.substitutionGroupsRepository.list();
  }

  async create(body: CreateSubstitutionGroupBody) {
    const slug = slugify(body.name);
    const existingGroup = await this.substitutionGroupsRepository.findBySlug(slug);

    if (existingGroup) {
      return {
        status: 'conflict' as const,
        message: 'Substitution group already exists'
      };
    }

    const group = await this.substitutionGroupsRepository.create({
      name: body.name.trim(),
      slug,
      description: normalizeDescription(body.description),
      isActive: body.isActive ?? true
    });

    return {
      status: 'created' as const,
      data: group
    };
  }

  findById(id: string) {
    return this.substitutionGroupsRepository.findById(Number(id));
  }

  async update(id: string, body: UpdateSubstitutionGroupBody) {
    const groupId = Number(id);
    const group = await this.substitutionGroupsRepository.findById(groupId);

    if (!group) {
      return {
        status: 'not_found' as const,
        message: 'Substitution group not found'
      };
    }

    const slug = slugify(body.name);
    const existingGroup = await this.substitutionGroupsRepository.findBySlug(slug);

    if (existingGroup && existingGroup.id !== groupId) {
      return {
        status: 'conflict' as const,
        message: 'Substitution group already exists'
      };
    }

    const updatedGroup = await this.substitutionGroupsRepository.update(groupId, {
      name: body.name.trim(),
      slug,
      description: normalizeDescription(body.description)
    });

    return {
      status: 'ok' as const,
      data: updatedGroup
    };
  }

  async updateStatus(id: string, body: UpdateSubstitutionGroupStatusBody) {
    const group = await this.substitutionGroupsRepository.updateStatus(Number(id), body.isActive);

    if (!group) {
      return {
        status: 'not_found' as const,
        message: 'Substitution group not found'
      };
    }

    return {
      status: 'ok' as const,
      data: group
    };
  }

  findFoodsByGroupId(id: string) {
    return this.substitutionGroupsRepository.findFoodsByGroupId(Number(id));
  }

  async addFoodToGroup(id: string, body: AddFoodToGroupBody) {
    const groupId = Number(id);
    const foodId = body.foodId;
    const group = await this.substitutionGroupsRepository.findById(groupId);

    if (!group) {
      return {
        status: 'not_found' as const,
        message: 'Substitution group not found'
      };
    }

    if (!await this.substitutionGroupsRepository.foodExists(foodId)) {
      return {
        status: 'food_not_found' as const,
        message: 'Food not found'
      };
    }

    if (await this.substitutionGroupsRepository.foodIsLinkedToGroup(groupId, foodId)) {
      return {
        status: 'conflict' as const,
        message: 'Food already linked to this group'
      };
    }

    await this.substitutionGroupsRepository.addFoodToGroup(groupId, foodId);

    return {
      status: 'created' as const,
      data: {
        groupId,
        foodId
      }
    };
  }

  async removeFoodFromGroup(id: string, foodId: string) {
    const groupId = Number(id);
    const parsedFoodId = Number(foodId);
    const group = await this.substitutionGroupsRepository.findById(groupId);

    if (!group) {
      return {
        status: 'not_found' as const,
        message: 'Substitution group not found'
      };
    }

    const removed = await this.substitutionGroupsRepository.removeFoodFromGroup(groupId, parsedFoodId);

    if (!removed) {
      return {
        status: 'not_found' as const,
        message: 'Food is not linked to this group'
      };
    }

    return {
      status: 'removed' as const
    };
  }
}

function normalizeDescription(description: string | null | undefined): string | null {
  const normalizedDescription = description?.trim();

  return normalizedDescription ? normalizedDescription : null;
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
