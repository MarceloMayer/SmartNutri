import { DatePipe, NgFor, NgIf } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

import type {
  MealFeedPost,
  MealPostComment,
  MealPostVisibility
} from '../../core/models/meal-feed.models';
import { AuthService } from '../../core/auth/auth.service';
import { MealFeedService } from '../../features/meal-feed/services/meal-feed.service';

type ViewState = 'idle' | 'loading' | 'error';

@Component({
  selector: 'app-meal-feed-page',
  standalone: true,
  imports: [DatePipe, FormsModule, NgFor, NgIf, ReactiveFormsModule],
  templateUrl: './meal-feed.page.html',
  styleUrl: './meal-feed.page.scss'
})
export class MealFeedPage implements OnInit, OnDestroy {
  private readonly authService = inject(AuthService);
  private readonly mealFeedService = inject(MealFeedService);
  private readonly imageUrls = new Map<number, string>();

  readonly mealNameControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(160)]
  });
  readonly descriptionControl = new FormControl('', {
    nonNullable: true,
    validators: [Validators.maxLength(2000)]
  });
  readonly visibilityControl = new FormControl<MealPostVisibility>('nutritionist_only', {
    nonNullable: true
  });

  readonly isPatient = this.authService.hasAnyRole(['patient']);
  @ViewChild('imageInput') private imageInput?: ElementRef<HTMLInputElement>;

  posts: MealFeedPost[] = [];
  feedState: ViewState = 'idle';
  composeState: ViewState = 'idle';
  message = '';
  composerOpen = false;
  selectedImage: File | null = null;
  selectedImagePreview: string | null = null;
  commentingPostId: number | null = null;
  commentDrafts: Partial<Record<number, string>> = {};
  commentComposerPostIds = new Set<number>();

  ngOnInit(): void {
    this.loadFeed();
  }

  ngOnDestroy(): void {
    this.imageUrls.forEach((url) => URL.revokeObjectURL(url));
    this.imageUrls.clear();
    this.clearSelectedImage();
  }

  get pageTitle(): string {
    return this.isPatient ? 'Minhas refeições' : 'Feed de refeições';
  }

  get pageDescription(): string {
    return this.isPatient
      ? 'Registre suas refeições e receba orientações da sua nutricionista.'
      : 'Acompanhe as refeições registradas pelos seus pacientes.';
  }

  get selectedImageName(): string {
    return this.selectedImage?.name ?? '';
  }

  loadFeed(clearMessage = true): void {
    this.feedState = 'loading';

    if (clearMessage) {
      this.message = '';
    }

    this.mealFeedService.findFeed().subscribe({
      next: (feed) => {
        this.posts = feed.posts;
        this.feedState = 'idle';
        if (this.isPatient && feed.posts.length === 0) {
          this.composerOpen = true;
        }
        this.cleanupUnusedImageUrls(feed.posts);
        this.loadPostImages(feed.posts);
      },
      error: (error: unknown) => {
        this.feedState = 'error';
        this.message = this.resolveErrorMessage(error, 'Não foi possível carregar o feed de refeições.');
      }
    });
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const image = input.files?.[0] ?? null;

    if (!image) {
      return;
    }

    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!acceptedTypes.includes(image.type)) {
      this.clearSelectedImage();
      input.value = '';
      this.message = 'Escolha uma imagem JPG, PNG ou WEBP.';
      return;
    }

    this.revokeSelectedImagePreview();
    this.selectedImage = image;
    this.selectedImagePreview = URL.createObjectURL(image);
    this.message = '';
  }

  clearSelectedImage(): void {
    this.selectedImage = null;
    this.revokeSelectedImagePreview();

    if (this.imageInput) {
      this.imageInput.nativeElement.value = '';
    }
  }

  openComposer(): void {
    this.composerOpen = true;
    this.message = '';
  }

  closeComposer(): void {
    if (this.composeState === 'loading') {
      return;
    }

    this.resetComposer();
    this.composerOpen = false;
    this.message = '';
  }

  isCommentComposerOpen(postId: number): boolean {
    return this.commentComposerPostIds.has(postId);
  }

  toggleCommentComposer(postId: number): void {
    if (this.commentComposerPostIds.has(postId)) {
      this.commentComposerPostIds.delete(postId);
      return;
    }

    this.commentComposerPostIds.add(postId);
  }

  createPost(): void {
    this.mealNameControl.markAsTouched();

    if (this.mealNameControl.invalid || this.composeState === 'loading') {
      return;
    }

    const selectedImage = this.selectedImage;
    this.composeState = 'loading';
    this.message = '';

    this.mealFeedService.createPost({
      mealName: this.mealNameControl.value.trim(),
      description: this.descriptionControl.value.trim() || null,
      visibility: this.visibilityControl.value
    }).subscribe({
      next: (post) => {
        if (!selectedImage) {
          this.completePostCreation();
          return;
        }

        this.mealFeedService.uploadImage(post.id, selectedImage).subscribe({
          next: () => this.completePostCreation(),
          error: (error: unknown) => {
            this.completePostCreation(
              `A refeição foi publicada, mas a imagem não foi enviada. ${this.resolveErrorMessage(error, '')}`.trim()
            );
          }
        });
      },
      error: (error: unknown) => {
        this.composeState = 'error';
        this.message = this.resolveErrorMessage(error, 'Não foi possível publicar sua refeição.');
      }
    });
  }

  addComment(post: MealFeedPost): void {
    const content = (this.commentDrafts[post.id] ?? '').trim();

    if (!content || this.commentingPostId !== null) {
      return;
    }

    this.commentingPostId = post.id;
    this.message = '';

    this.mealFeedService.createComment(post.id, { content }).subscribe({
      next: (comment) => {
        post.comments = [...post.comments, comment];
        delete this.commentDrafts[post.id];
        this.commentComposerPostIds.add(post.id);
        this.commentingPostId = null;
      },
      error: (error: unknown) => {
        this.commentingPostId = null;
        this.message = this.resolveErrorMessage(error, 'Não foi possível publicar o comentário.');
      }
    });
  }

  imageUrl(post: MealFeedPost): string | null {
    return this.imageUrls.get(post.id) ?? null;
  }

  trackPost(_index: number, post: MealFeedPost): number {
    return post.id;
  }

  trackComment(_index: number, comment: MealPostComment): number {
    return comment.id;
  }

  initial(name: string): string {
    return name.trim().charAt(0).toUpperCase() || '?';
  }

  visibilityLabel(visibility: MealPostVisibility): string {
    return visibility === 'shared_with_patients'
      ? 'Compartilhado com pacientes'
      : 'Somente nutricionista';
  }

  visibilityHint(visibility: MealPostVisibility): string {
    return visibility === 'shared_with_patients'
      ? 'Pacientes da sua nutricionista podem ver e comentar.'
      : 'Visível apenas para você e sua nutricionista.';
  }

  private completePostCreation(message = 'Refeição publicada.'): void {
    this.resetComposer();
    this.composerOpen = false;
    this.composeState = 'idle';
    this.message = message;
    this.loadFeed(false);
  }

  private resetComposer(): void {
    this.mealNameControl.reset('');
    this.descriptionControl.reset('');
    this.visibilityControl.reset('nutritionist_only');
    this.clearSelectedImage();
  }

  private loadPostImages(posts: MealFeedPost[]): void {
    posts
      .filter((post) => post.image !== null && !this.imageUrls.has(post.id))
      .forEach((post) => {
        this.mealFeedService.getImage(post.id).subscribe({
          next: (image) => this.imageUrls.set(post.id, URL.createObjectURL(image)),
          error: () => { /* O feed continua utilizável se uma imagem não carregar. */ }
        });
      });
  }

  private cleanupUnusedImageUrls(posts: MealFeedPost[]): void {
    const currentPostIds = new Set(posts.map((post) => post.id));

    this.imageUrls.forEach((url, postId) => {
      if (!currentPostIds.has(postId)) {
        URL.revokeObjectURL(url);
        this.imageUrls.delete(postId);
      }
    });
  }

  private revokeSelectedImagePreview(): void {
    if (this.selectedImagePreview) {
      URL.revokeObjectURL(this.selectedImagePreview);
      this.selectedImagePreview = null;
    }
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
