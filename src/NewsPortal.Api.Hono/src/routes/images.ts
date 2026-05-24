import { Hono } from 'hono';
import type { Env } from '../lib/env';
import { errMsg } from '../lib/response';
import { requireAuth, requireRole } from '../lib/auth';
import { uploadFromUrl, deleteByPublicId } from '../lib/cloudinary';

export const imagesRoutes = new Hono<Env>();

// POST /upload-url   body: { imageUrl, articleId? }
// Pulls a remote image into Cloudinary and (optionally) attaches it to an article.
imagesRoutes.post('/upload-url', requireAuth, requireRole('Editor'), async (c) => {
  const body = await c.req.json<{ imageUrl?: string; articleId?: number; publicIdHint?: string }>();
  if (!body.imageUrl) return c.json(errMsg('imageUrl is required'), 400);

  const cdnUrl = await uploadFromUrl(c.env, body.imageUrl, body.publicIdHint);
  if (!cdnUrl) return c.json(errMsg('Upload failed'), 502);

  if (body.articleId) {
    await c.env.DB.prepare(
      'UPDATE news_articles SET original_image_url = ?, updated_at = ? WHERE id = ?'
    ).bind(cdnUrl, new Date().toISOString(), body.articleId).run();
  }
  return c.json({ url: cdnUrl });
});

// DELETE /:publicId  — admin delete
imagesRoutes.delete('/:publicId', requireAuth, requireRole('Admin'), async (c) => {
  const publicId = decodeURIComponent(c.req.param('publicId'));
  const ok = await deleteByPublicId(c.env, publicId);
  return c.json({ deleted: ok });
});
