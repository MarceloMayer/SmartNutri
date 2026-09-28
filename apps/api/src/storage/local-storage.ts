import { createReadStream } from 'node:fs';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { env } from '../config/env';

function uploadsRoot(): string {
  return resolve(env.uploadsDir);
}

/** Relative path used in DB, e.g. "evaluations/42/abc123.jpg" */
export function buildRelativePath(evaluationId: number, fileName: string): string {
  return join('evaluations', String(evaluationId), fileName);
}

/** Relative path used in DB, e.g. "meal-posts/42/abc123.jpg" */
export function buildMealPostRelativePath(postId: number, fileName: string): string {
  return join('meal-posts', String(postId), fileName);
}

export async function saveFile(relativePath: string, data: Buffer): Promise<void> {
  const absolute = join(uploadsRoot(), relativePath);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, data);
}

export async function deleteFile(relativePath: string): Promise<void> {
  const absolute = join(uploadsRoot(), relativePath);
  await unlink(absolute);
}

export function openReadStream(relativePath: string): ReturnType<typeof createReadStream> {
  return createReadStream(join(uploadsRoot(), relativePath));
}
