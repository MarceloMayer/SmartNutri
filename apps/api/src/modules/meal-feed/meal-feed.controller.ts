import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';

import type { MultipartFile } from '@fastify/multipart';

import type { AuthContext } from '../../auth/auth.types';
import {
  buildMealPostRelativePath,
  deleteFile,
  saveFile
} from '../../storage/local-storage';
import { MealFeedRepository } from './meal-feed.repository';
import type {
  CreateMealPostBody,
  CreateMealPostCommentBody,
  MealFeed,
  MealFeedPatient,
  MealFeedPost,
  MealPost
} from './meal-feed.types';

const allowedImageMimes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class MealFeedController {
  constructor(private readonly repository: MealFeedRepository) {}

  async list(auth: AuthContext): Promise<MealFeed> {
    if (auth.role === 'nutritionist') {
      const posts = await this.repository.listPostsForNutritionist(auth.userId);

      return {
        posts: posts.map((post) => toFeedPost(post, true, false))
      };
    }

    const patient = await this.repository.findPatientForUserId(auth.userId);

    if (!patient) {
      return { posts: [] };
    }

    const posts = await this.repository.listPostsForPatient(patient);

    return {
      posts: posts.map((post) => toFeedPost(post, canPatientComment(post, patient), post.patientId === patient.id))
    };
  }

  async createPost(auth: AuthContext, input: CreateMealPostBody) {
    const patient = await this.requirePatient(auth);

    if (!patient) {
      return {
        status: 'patient_not_linked' as const,
        message: 'Seu acesso ainda não está vinculado ao cadastro da nutricionista.'
      };
    }

    const post = await this.repository.createPost(patient, {
      mealName: input.mealName.trim(),
      description: normalizeOptionalText(input.description),
      visibility: input.visibility
    });

    return {
      status: 'created' as const,
      data: toFeedPost(post, true, true)
    };
  }

  async createComment(
    auth: AuthContext,
    postId: string,
    input: CreateMealPostCommentBody
  ) {
    const post = await this.findPostForActor(auth, Number(postId));

    if (!post) {
      return { status: 'not_found' as const, message: 'Publicação não encontrada.' };
    }

    const content = input.content.trim();

    if (!content) {
      return { status: 'invalid' as const, message: 'Escreva um comentário antes de publicar.' };
    }

    const comment = await this.repository.createComment(post.id, auth.userId, content);

    return { status: 'created' as const, data: comment };
  }

  async uploadImage(auth: AuthContext, postId: string, fileData: MultipartFile) {
    const patient = await this.requirePatient(auth);

    if (!patient) {
      await fileData.toBuffer().catch(() => null);
      return {
        status: 'patient_not_linked' as const,
        message: 'Seu acesso ainda não está vinculado ao cadastro da nutricionista.'
      };
    }

    if (!allowedImageMimes.has(fileData.mimetype)) {
      await fileData.toBuffer().catch(() => null);
      return {
        status: 'invalid' as const,
        message: 'Envie uma imagem JPG, PNG ou WEBP.'
      };
    }

    const post = await this.repository.findOwnPost(patient, Number(postId));

    if (!post) {
      await fileData.toBuffer().catch(() => null);
      return { status: 'not_found' as const, message: 'Publicação não encontrada.' };
    }

    const buffer = await fileData.toBuffer();
    const extension = sanitizeExtension(extname(fileData.filename ?? '').toLowerCase())
      || extensionForMime(fileData.mimetype);
    const fileName = `${randomUUID()}${extension}`;
    const filePath = buildMealPostRelativePath(post.id, fileName);
    const oldFilePath = await this.repository.getPostImagePath(post.id);

    await saveFile(filePath, buffer);

    try {
      await this.repository.updatePostImage(post.id, {
        originalName: sanitizeOriginalName(fileData.filename, fileName),
        fileName,
        mimeType: fileData.mimetype,
        fileSize: buffer.length,
        filePath
      });
    } catch (error) {
      await deleteFile(filePath).catch(() => null);
      throw error;
    }

    if (oldFilePath) {
      await deleteFile(oldFilePath).catch(() => null);
    }

    const updated = await this.repository.findOwnPost(patient, post.id);

    if (!updated) {
      throw new Error('Updated meal post was not found');
    }

    return {
      status: 'ok' as const,
      data: toFeedPost(updated, true, true)
    };
  }

  async getImage(auth: AuthContext, postId: string) {
    const post = await this.findPostForActor(auth, Number(postId));

    if (!post || !post.image) {
      return { status: 'not_found' as const, message: 'Imagem não encontrada.' };
    }

    const filePath = await this.repository.getPostImagePath(post.id);

    if (!filePath) {
      return { status: 'not_found' as const, message: 'Imagem não encontrada.' };
    }

    return {
      status: 'ok' as const,
      data: {
        filePath,
        mimeType: post.image.mimeType,
        originalName: post.image.originalName
      }
    };
  }

  private async requirePatient(auth: AuthContext): Promise<MealFeedPatient | null> {
    if (auth.role !== 'patient') {
      return null;
    }

    return this.repository.findPatientForUserId(auth.userId);
  }

  private async findPostForActor(auth: AuthContext, postId: number): Promise<MealPost | null> {
    if (!Number.isInteger(postId) || postId <= 0) {
      return null;
    }

    if (auth.role === 'nutritionist') {
      return this.repository.findPostForNutritionist(auth.userId, postId);
    }

    const patient = await this.requirePatient(auth);

    if (!patient) {
      return null;
    }

    return this.repository.findPostVisibleToPatient(patient, postId);
  }
}

function toFeedPost(post: MealPost, canComment: boolean, isOwnPost: boolean): MealFeedPost {
  return {
    ...post,
    canComment,
    isOwnPost
  };
}

function canPatientComment(post: MealPost, patient: MealFeedPatient): boolean {
  return post.patientId === patient.id || post.visibility === 'shared_with_patients';
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function sanitizeExtension(extension: string): string {
  return /^\.(jpe?g|png|webp)$/.test(extension) ? extension : '';
}

function extensionForMime(mimeType: string): string {
  const extensions: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
  };

  return extensions[mimeType] ?? '.bin';
}

function sanitizeOriginalName(rawName: string | undefined, fallback: string): string {
  const normalized = rawName?.replace(/[\r\n"]/g, '').trim().slice(0, 255);
  return normalized || fallback;
}
