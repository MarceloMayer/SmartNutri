export type MealPostVisibility = 'nutritionist_only' | 'shared_with_patients';

export interface MealPostImage {
  originalName: string;
  mimeType: string;
  fileSize: number;
}

export interface MealPostComment {
  id: number;
  author: {
    id: number;
    name: string;
    role: 'nutritionist' | 'patient';
  };
  content: string;
  createdAt: string;
}

export interface MealFeedPost {
  id: number;
  nutritionistUserId: number;
  patientId: number;
  author: {
    id: number;
    name: string;
  };
  mealName: string;
  description: string | null;
  visibility: MealPostVisibility;
  image: MealPostImage | null;
  comments: MealPostComment[];
  createdAt: string;
  updatedAt: string;
  canComment: boolean;
  isOwnPost: boolean;
}

export interface MealFeed {
  posts: MealFeedPost[];
}

export interface CreateMealPostPayload {
  mealName: string;
  description?: string | null;
  visibility: MealPostVisibility;
}

export interface CreateMealPostCommentPayload {
  content: string;
}
