import { Injectable, inject } from '@angular/core';
import type { Observable } from 'rxjs';

import { ApiClientService } from '../../../core/api/api-client.service';
import type {
  CreateMealPostCommentPayload,
  CreateMealPostPayload,
  MealFeed,
  MealFeedPost,
  MealPostComment
} from '../../../core/models/meal-feed.models';

@Injectable({
  providedIn: 'root'
})
export class MealFeedService {
  private readonly api = inject(ApiClientService);

  findFeed(): Observable<MealFeed> {
    return this.api.get<MealFeed>('/meal-feed');
  }

  createPost(payload: CreateMealPostPayload): Observable<MealFeedPost> {
    return this.api.post<MealFeedPost, CreateMealPostPayload>('/meal-feed', payload);
  }

  uploadImage(postId: number, image: File): Observable<MealFeedPost> {
    const formData = new FormData();
    formData.append('file', image);

    return this.api.postFormData<MealFeedPost>(`/meal-feed/${postId}/image`, formData);
  }

  createComment(postId: number, payload: CreateMealPostCommentPayload): Observable<MealPostComment> {
    return this.api.post<MealPostComment, CreateMealPostCommentPayload>(
      `/meal-feed/${postId}/comments`,
      payload
    );
  }

  getImage(postId: number): Observable<Blob> {
    return this.api.getBlob(`/meal-feed/${postId}/image`);
  }
}
