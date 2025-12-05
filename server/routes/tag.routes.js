import express from 'express';
import * as tagController from '../controllers/tag.controller.js';

const router = express.Router();

router
  .route('/')
  .get(tagController.getAllTags)
  .post(tagController.createTag);

router
  .route('/:id')
  .patch(tagController.updateTag)
  .delete(tagController.deleteTag);

router.get('/:tag/media', tagController.getMediaByTag);

export default router;
