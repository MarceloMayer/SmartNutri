import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import type {
  CreateMealPostBody,
  MealFeedPatient,
  MealPost,
  MealPostComment,
  MealPostCommentAuthorRole,
  MealPostVisibility
} from './meal-feed.types';

type TimestampValue = Date | string;

type MealPostRow = RowDataPacket & {
  id: number;
  nutritionistUserId: number;
  patientId: number;
  authorId: number;
  authorName: string;
  mealName: string;
  description: string | null;
  visibility: MealPostVisibility;
  imageOriginalName: string | null;
  imageFileName: string | null;
  imageMimeType: string | null;
  imageFileSize: number | null;
  imageFilePath: string | null;
  createdAt: TimestampValue;
  updatedAt: TimestampValue;
};

type MealPostCommentRow = RowDataPacket & {
  id: number;
  mealPostId: number;
  authorId: number;
  authorName: string;
  authorRole: MealPostCommentAuthorRole;
  content: string;
  createdAt: TimestampValue;
};

const POST_SELECT_COLUMNS = `
  meal_posts.id,
  meal_posts.nutritionist_user_id AS nutritionistUserId,
  meal_posts.patient_id AS patientId,
  patients.id AS authorId,
  patients.name AS authorName,
  meal_posts.meal_name AS mealName,
  meal_posts.description,
  meal_posts.visibility,
  meal_posts.image_original_name AS imageOriginalName,
  meal_posts.image_file_name AS imageFileName,
  meal_posts.image_mime_type AS imageMimeType,
  meal_posts.image_file_size AS imageFileSize,
  meal_posts.image_file_path AS imageFilePath,
  meal_posts.created_at AS createdAt,
  meal_posts.updated_at AS updatedAt
`;

export class MealFeedRepository {
  constructor(private readonly db: Pool) {}

  async findPatientForUserId(patientUserId: number): Promise<MealFeedPatient | null> {
    const [rows] = await this.db.query<Array<RowDataPacket & MealFeedPatient>>(
      `
        SELECT
          id,
          nutritionist_user_id AS nutritionistUserId,
          name
        FROM patients
        WHERE patient_user_id = :patientUserId
        LIMIT 1
      `,
      { patientUserId }
    );

    return rows[0] ?? null;
  }

  async listPostsForPatient(patient: MealFeedPatient): Promise<MealPost[]> {
    const [rows] = await this.db.query<MealPostRow[]>(
      `
        SELECT ${POST_SELECT_COLUMNS}
        FROM meal_posts
        INNER JOIN patients
          ON patients.id = meal_posts.patient_id
        WHERE meal_posts.nutritionist_user_id = :nutritionistUserId
          AND (
            meal_posts.patient_id = :patientId
            OR meal_posts.visibility = 'shared_with_patients'
          )
        ORDER BY meal_posts.created_at DESC, meal_posts.id DESC
      `,
      {
        nutritionistUserId: patient.nutritionistUserId,
        patientId: patient.id
      }
    );

    return this.withComments(rows);
  }

  async listPostsForNutritionist(nutritionistUserId: number): Promise<MealPost[]> {
    const [rows] = await this.db.query<MealPostRow[]>(
      `
        SELECT ${POST_SELECT_COLUMNS}
        FROM meal_posts
        INNER JOIN patients
          ON patients.id = meal_posts.patient_id
        WHERE meal_posts.nutritionist_user_id = :nutritionistUserId
        ORDER BY meal_posts.created_at DESC, meal_posts.id DESC
      `,
      { nutritionistUserId }
    );

    return this.withComments(rows);
  }

  async createPost(patient: MealFeedPatient, input: CreateMealPostBody): Promise<MealPost> {
    const [result] = await this.db.query<ResultSetHeader>(
      `
        INSERT INTO meal_posts (
          nutritionist_user_id,
          patient_id,
          meal_name,
          description,
          visibility
        ) VALUES (
          :nutritionistUserId,
          :patientId,
          :mealName,
          :description,
          :visibility
        )
      `,
      {
        nutritionistUserId: patient.nutritionistUserId,
        patientId: patient.id,
        mealName: input.mealName,
        description: input.description ?? null,
        visibility: input.visibility
      }
    );

    const post = await this.findPostForNutritionist(patient.nutritionistUserId, result.insertId);

    if (!post) {
      throw new Error('Created meal post was not found');
    }

    return post;
  }

  async findPostForNutritionist(
    nutritionistUserId: number,
    postId: number
  ): Promise<MealPost | null> {
    const [rows] = await this.db.query<MealPostRow[]>(
      `
        SELECT ${POST_SELECT_COLUMNS}
        FROM meal_posts
        INNER JOIN patients
          ON patients.id = meal_posts.patient_id
        WHERE meal_posts.id = :postId
          AND meal_posts.nutritionist_user_id = :nutritionistUserId
        LIMIT 1
      `,
      { nutritionistUserId, postId }
    );

    const posts = await this.withComments(rows);
    return posts[0] ?? null;
  }

  async findPostVisibleToPatient(
    patient: MealFeedPatient,
    postId: number
  ): Promise<MealPost | null> {
    const [rows] = await this.db.query<MealPostRow[]>(
      `
        SELECT ${POST_SELECT_COLUMNS}
        FROM meal_posts
        INNER JOIN patients
          ON patients.id = meal_posts.patient_id
        WHERE meal_posts.id = :postId
          AND meal_posts.nutritionist_user_id = :nutritionistUserId
          AND (
            meal_posts.patient_id = :patientId
            OR meal_posts.visibility = 'shared_with_patients'
          )
        LIMIT 1
      `,
      {
        nutritionistUserId: patient.nutritionistUserId,
        patientId: patient.id,
        postId
      }
    );

    const posts = await this.withComments(rows);
    return posts[0] ?? null;
  }

  async findOwnPost(patient: MealFeedPatient, postId: number): Promise<MealPost | null> {
    const [rows] = await this.db.query<MealPostRow[]>(
      `
        SELECT ${POST_SELECT_COLUMNS}
        FROM meal_posts
        INNER JOIN patients
          ON patients.id = meal_posts.patient_id
        WHERE meal_posts.id = :postId
          AND meal_posts.patient_id = :patientId
          AND meal_posts.nutritionist_user_id = :nutritionistUserId
        LIMIT 1
      `,
      {
        nutritionistUserId: patient.nutritionistUserId,
        patientId: patient.id,
        postId
      }
    );

    const posts = await this.withComments(rows);
    return posts[0] ?? null;
  }

  async createComment(
    postId: number,
    authorUserId: number,
    content: string
  ): Promise<MealPostComment> {
    const [result] = await this.db.query<ResultSetHeader>(
      `
        INSERT INTO meal_post_comments (
          meal_post_id,
          author_user_id,
          content
        ) VALUES (
          :postId,
          :authorUserId,
          :content
        )
      `,
      { postId, authorUserId, content }
    );

    const [rows] = await this.db.query<MealPostCommentRow[]>(
      `
        SELECT
          meal_post_comments.id,
          meal_post_comments.meal_post_id AS mealPostId,
          users.id AS authorId,
          users.name AS authorName,
          users.role AS authorRole,
          meal_post_comments.content,
          meal_post_comments.created_at AS createdAt
        FROM meal_post_comments
        INNER JOIN users
          ON users.id = meal_post_comments.author_user_id
        WHERE meal_post_comments.id = :commentId
        LIMIT 1
      `,
      { commentId: result.insertId }
    );

    if (!rows[0]) {
      throw new Error('Created meal post comment was not found');
    }

    return toComment(rows[0]);
  }

  async getPostImagePath(postId: number): Promise<string | null> {
    const [rows] = await this.db.query<Array<RowDataPacket & { imageFilePath: string | null }>>(
      `
        SELECT image_file_path AS imageFilePath
        FROM meal_posts
        WHERE id = :postId
        LIMIT 1
      `,
      { postId }
    );

    return rows[0]?.imageFilePath ?? null;
  }

  async updatePostImage(
    postId: number,
    image: {
      originalName: string;
      fileName: string;
      mimeType: string;
      fileSize: number;
      filePath: string;
    }
  ): Promise<void> {
    await this.db.query<ResultSetHeader>(
      `
        UPDATE meal_posts
        SET
          image_original_name = :originalName,
          image_file_name = :fileName,
          image_mime_type = :mimeType,
          image_file_size = :fileSize,
          image_file_path = :filePath
        WHERE id = :postId
      `,
      { postId, ...image }
    );
  }

  private async withComments(rows: MealPostRow[]): Promise<MealPost[]> {
    if (rows.length === 0) {
      return [];
    }

    const postIds = rows.map((row) => Number(row.id)).filter(Number.isInteger);
    const [commentRows] = await this.db.query<MealPostCommentRow[]>(
      `
        SELECT
          meal_post_comments.id,
          meal_post_comments.meal_post_id AS mealPostId,
          users.id AS authorId,
          users.name AS authorName,
          users.role AS authorRole,
          meal_post_comments.content,
          meal_post_comments.created_at AS createdAt
        FROM meal_post_comments
        INNER JOIN users
          ON users.id = meal_post_comments.author_user_id
        WHERE meal_post_comments.meal_post_id IN (${postIds.join(', ')})
        ORDER BY meal_post_comments.created_at ASC, meal_post_comments.id ASC
      `
    );

    const commentsByPostId = new Map<number, MealPostComment[]>();

    for (const row of commentRows) {
      const comments = commentsByPostId.get(row.mealPostId) ?? [];
      comments.push(toComment(row));
      commentsByPostId.set(row.mealPostId, comments);
    }

    return rows.map((row) => ({
      ...toPost(row),
      comments: commentsByPostId.get(row.id) ?? []
    }));
  }
}

function toPost(row: MealPostRow): Omit<MealPost, 'comments'> {
  return {
    id: row.id,
    nutritionistUserId: row.nutritionistUserId,
    patientId: row.patientId,
    author: {
      id: row.authorId,
      name: row.authorName
    },
    mealName: row.mealName,
    description: row.description,
    visibility: row.visibility,
    image: row.imageFilePath && row.imageOriginalName && row.imageMimeType && row.imageFileSize !== null
      ? {
        originalName: row.imageOriginalName,
        mimeType: row.imageMimeType,
        fileSize: Number(row.imageFileSize)
      }
      : null,
    createdAt: serializeTimestamp(row.createdAt),
    updatedAt: serializeTimestamp(row.updatedAt)
  };
}

function toComment(row: MealPostCommentRow): MealPostComment {
  return {
    id: row.id,
    author: {
      id: row.authorId,
      name: row.authorName,
      role: row.authorRole
    },
    content: row.content,
    createdAt: serializeTimestamp(row.createdAt)
  };
}

function serializeTimestamp(value: TimestampValue): string {
  return value instanceof Date ? value.toISOString() : value;
}
