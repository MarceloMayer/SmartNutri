import { FoodsRepository } from './foods.repository';
import type { FoodListQuery, FoodSearchQuery } from './foods.types';

export class FoodsController {
  constructor(private readonly foodsRepository: FoodsRepository) {}

  list(query: FoodListQuery) {
    return this.foodsRepository.list(query);
  }

  search(query: FoodSearchQuery) {
    return this.foodsRepository.search(query);
  }

  findById(id: string) {
    return this.foodsRepository.findById(Number(id));
  }
}
