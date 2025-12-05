import Tag from '../models/tag.model.js';
import Media from '../models/media.model.js';
import AppError from '../utils/appError.js';
import catchAsync from '../utils/catchAsync.js';

// @desc    Get all tags
// @route   GET /api/v1/tags
// @access  Private
export const getAllTags = catchAsync(async (req, res, next) => {
  const tags = await Tag.find().sort({ name: 1 });
  
  // Get media count for each tag
  const tagsWithCounts = await Promise.all(
    tags.map(async (tag) => {
      const count = await Media.countDocuments({ tags: tag.name });
      return {
        ...tag.toObject(),
        mediaCount: count
      };
    })
  );

  res.status(200).json({
    status: 'success',
    results: tagsWithCounts.length,
    data: {
      tags: tagsWithCounts
    }
  });
});

// @desc    Create a new tag
// @route   POST /api/v1/tags
// @access  Private
export const createTag = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  
  if (!name) {
    return next(new AppError('Please provide a tag name', 400));
  }

  // Check if tag already exists (case insensitive)
  const existingTag = await Tag.findOne({ 
    name: { $regex: new RegExp(`^${name}$`, 'i') } 
  });

  if (existingTag) {
    return next(new AppError('Tag with this name already exists', 400));
  }

  const tag = await Tag.create({ name });
  const tagWithCount = {
    ...tag.toObject(),
    mediaCount: 0 // New tags start with 0 media items
  };

  res.status(201).json({
    status: 'success',
    data: {
      tag: tagWithCount
    }
  });
});

// @desc    Update a tag
// @route   PATCH /api/v1/tags/:id
// @access  Private
export const updateTag = catchAsync(async (req, res, next) => {
  const { name } = req.body;
  
  // First get the current tag to know the old name
  const currentTag = await Tag.findById(req.params.id);
  if (!currentTag) {
    return next(new AppError('No tag found with that ID', 404));
  }

  const oldName = currentTag.name;
  
  // Update the tag
  const tag = await Tag.findByIdAndUpdate(
    req.params.id,
    { name },
    { new: true, runValidators: true }
  );

  // Update all media items with this tag
  await Media.updateMany(
    { tags: oldName },
    { $set: { "tags.$": name } }
  );

  res.status(200).json({
    status: 'success',
    data: {
      tag
    }
  });
});

// @desc    Delete a tag
// @route   DELETE /api/v1/tags/:id
// @access  Private
export const deleteTag = catchAsync(async (req, res, next) => {
  const tag = await Tag.findByIdAndDelete(req.params.id);

  if (!tag) {
    return next(new AppError('No tag found with that ID', 404));
  }

  // Remove this tag from all media items
  await Media.updateMany(
    { tags: tag.name },
    { $pull: { tags: tag.name } }
  );

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// @desc    Get media by tag
// @route   GET /api/v1/tags/:tag/media
// @access  Private
export const getMediaByTag = catchAsync(async (req, res, next) => {
  const { tag } = req.params;
  
  const media = await Media.find({ tags: tag });

  res.status(200).json({
    status: 'success',
    results: media.length,
    data: {
      media
    }
  });
});
