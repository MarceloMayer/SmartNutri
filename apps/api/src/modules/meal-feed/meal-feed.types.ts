export const mealPostVisibilities = [
  'nutritionist_only',
  'shared_with_patients'
] as const;

export type MealPostVisibility = typeof mealPostVisibilities[number];
export type MealPostCommentAuthorRole = 'nutritionist' | 'patient';

export interface MealFeedPatient {
  id: number;
  nutritionistUserId: number;
  name: string;
}

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
    role: MealPostCommentAuthorRole;
  };
  content: string;
  createdAt: string;
}

export interface MealPost {
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
}

export interface MealFeedPost extends MealPost {
  canComment: boolean;
  isOwnPost: boolean;
}

export interface MealFeed {
  posts: MealFeedPost[];
}

export interface CreateMealPostBody {
  mealName: string;
  description?: string | null;
  visibility: MealPostVisibility;
}

export interface CreateMealPostCommentBody {
  content: string;
}

export interface MealPostParams {
  postId: string;
}
