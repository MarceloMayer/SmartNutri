import { FoodAliasesRepository } from './food-aliases.repository';
import type { FoodAliasesQuery } from './food-aliases.types';

export class FoodAliasesController {
  constructor(private readonly foodAliasesRepository: FoodAliasesRepository) {}

  list(query: FoodAliasesQuery) {
    return this.foodAliasesRepository.list(query);
  }
}
