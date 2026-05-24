import { Router } from "express";
import multer from "multer";
import type { MinioStorage } from "../storage/minio.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

export function createUploadsRouter(minioStorage: MinioStorage, publicBaseUrl: string) {
  const router = Router();

  router.post("/", upload.single("file"), async (request, response, next) => {
    try {
      if (!request.file) {
        response.status(400).json({ error: "Missing file" });
        return;
      }

      const objectKey = `${Date.now()}-${sanitizeFilename(request.file.originalname)}`;
      await minioStorage.uploadImage(objectKey, request.file.buffer, request.file.mimetype);

      response.status(201).json({
        objectKey,
        url: `${publicBaseUrl}/assets/${objectKey}`
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:objectKey", async (request, response, next) => {
    try {
      const meta = await minioStorage.getImageMeta(request.params.objectKey);
      const contentType = meta.metaData?.["content-type"] ?? meta.metaData?.["Content-Type"];

      if (contentType) {
        response.setHeader("Content-Type", contentType);
      }

      const stream = await minioStorage.getImage(request.params.objectKey);
      stream.pipe(response);
    } catch (error) {
      next(error);
    }
  });

  return router;
}

function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}
