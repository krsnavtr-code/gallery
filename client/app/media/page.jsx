"use client";

import { useState, useEffect, useRef } from "react";
import {
  FiImage,
  FiVideo,
  FiFile,
  FiTrash2,
  FiX,
  FiDownload,
  FiCopy,
  FiTag,
  FiChevronDown,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { Toaster } from "react-hot-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const MediaGallery = () => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [editingTags, setEditingTags] = useState(null);
  const tagMenuRef = useRef(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [availableTags, setAvailableTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [tagToDelete, setTagToDelete] = useState(null);
  const [filesWithTag, setFilesWithTag] = useState({ count: 0, files: [] });
  const [sizeFilter, setSizeFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

  // Fetch available tags from server
  const fetchAvailableTags = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/tags`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch tags");
      }

      const { data } = await response.json();
      setAvailableTags(data.tags || []);
    } catch (error) {
      console.error("Error fetching tags:", error);
      toast.error("Failed to load tags");
    }
  };

  // Add tags to selected files
  const addTagsToSelectedFiles = async (tagName) => {
    if (selectedFiles.size === 0) return;

    try {
      const updatePromises = Array.from(selectedFiles).map((fileId) => {
        const file = files.find((f) => f._id === fileId || f.id === fileId);
        if (!file) return Promise.resolve();

        const currentTags = Array.isArray(file.tags) ? [...file.tags] : [];
        if (currentTags.includes(tagName)) return Promise.resolve();

        const updatedTags = [...currentTags, tagName];
        return updateFileTags(fileId, updatedTags).then(() => {
          // Update local state
          setFiles((prev) =>
            prev.map((f) =>
              f._id === fileId || f.id === fileId
                ? { ...f, tags: updatedTags }
                : f
            )
          );
        });
      });

      await Promise.all(updatePromises);
      toast.success(
        `Added tag to ${selectedFiles.size} file${
          selectedFiles.size > 1 ? "s" : ""
        }`
      );
      clearSelections();
    } catch (error) {
      console.error("Error adding tags:", error);
      toast.error("Failed to add tags to selected files");
    }
  };

  // Add a new tag
  const handleAddTag = async (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/tags`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: newTag.trim() }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to add tag");
      }

      const { data } = await response.json();
      setAvailableTags((prev) => [...prev, data.tag]);
      setNewTag("");
      toast.success("Tag added successfully");
    } catch (error) {
      console.error("Error adding tag:", error);
      toast.error("Failed to add tag");
    }
  };

  // Count files with a specific tag
  const countFilesWithTag = async (tagName) => {
    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_API_URL
        }/api/v1/media?tag=${encodeURIComponent(tagName)}`,
        { credentials: "include" }
      );
      if (response.ok) {
        const data = await response.json();
        const files =
          data.data?.media?.filter(
            (media) =>
              media.tags &&
              Array.isArray(media.tags) &&
              media.tags.includes(tagName)
          ) || [];

        return {
          count: files.length,
          files: files.map(
            (file) => file.originalname || file.filename || "Untitled"
          ),
        };
      }
      return { count: 0, files: [] };
    } catch (error) {
      console.error("Error counting files with tag:", error);
      return { count: 0, files: [] };
    }
  };

  // Delete a tag
  const handleDeleteTag = async (tagId, tagName) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/tags/${tagId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete tag");
      }

      // Update the available tags list
      setAvailableTags((prevTags) =>
        prevTags.filter((tag) => tag._id !== tagId)
      );

      // If the deleted tag was selected, clear the filter
      if (tagFilter === tagName) {
        setTagFilter("");
      }

      toast.success("Tag deleted successfully");
    } catch (error) {
      console.error("Error deleting tag:", error);
      toast.error(error.message || "Failed to delete tag");
    } finally {
      setTagToDelete(null);
      setFilesWithTagCount(0);
    }
  };

  // Fetch all media files
  useEffect(() => {
    fetchMedia();
    fetchAvailableTags();
  }, []);

  const fetchMedia = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/media`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch media: ${response.status} ${response.statusText}`
        );
      }

      const { data } = await response.json();
      //   console.log("Fetched media:", data);

      if (data && Array.isArray(data.media)) {
        const serverFiles = data.media.map((media) => ({
          ...media,
          id: media._id || media.id,
          url: media.path.startsWith("http")
            ? media.path
            : `${process.env.NEXT_PUBLIC_API_URL}${media.path}`,
          type: media.mimetype?.split("/")[0] || "file",
          uploaded: true,
        }));
        setFiles(serverFiles);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
      toast.error("Failed to load media library");
    }
  };

  // Toggle file selection
  const toggleFileSelection = (fileId) => {
    setSelectedFiles((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(fileId)) {
        newSelection.delete(fileId);
      } else {
        newSelection.add(fileId);
      }

      // If no files are selected, exit selection mode
      if (newSelection.size === 0) {
        setIsSelectMode(false);
      } else if (!isSelectMode) {
        setIsSelectMode(true);
      }

      return newSelection;
    });
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedFiles(new Set());
    setIsSelectMode(false);
  };

  // Update file tags on server
  const updateFileTags = async (fileId, tags) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/media/${fileId}/tags`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ tags }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update tags");
      }
    } catch (error) {
      console.error("Error updating tags:", error);
      toast.error("Failed to update tags");
    }
  };

  const openDeletePopup = (id) => {
    setDeleteId(id);
    setShowConfirm(true);
  };

  const handleDelete = async (id = null) => {
    // Handle both string (single ID or comma-separated IDs) and array (multiple IDs) cases
    const idsToDelete = id
      ? Array.isArray(id)
        ? id
        : id.split(",").map((id) => id.trim())
      : Array.from(selectedFiles);

    try {
      // Delete files one by one with better error handling
      const results = await Promise.allSettled(
        idsToDelete.map((id) =>
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/media/${id}`, {
            method: "DELETE",
            credentials: "include",
          })
        )
      );

      // Check for failed deletions
      const failedDeletions = results.filter(
        (result, index) => result.status === "rejected" || !result.value.ok
      );

      // Update the files list, checking both _id and id for compatibility
      setFiles(
        files.filter(
          (file) => !idsToDelete.some((id) => id === file._id || id === file.id)
        )
      );

      // Clear selection if in multi-select mode
      if (isSelectMode) {
        setSelectedFiles(new Set());
        setIsSelectMode(false);
      }

      if (failedDeletions.length > 0) {
        throw new Error(`Failed to delete ${failedDeletions.length} file(s)`);
      }

      toast.success(
        `${idsToDelete.length} file${
          idsToDelete.length > 1 ? "s" : ""
        } deleted successfully!`
      );
    } catch (error) {
      console.error("Delete error:", error);
      toast.error(
        error.message ||
          `Failed to delete file${idsToDelete.length > 1 ? "s" : ""}`
      );
    } finally {
      setShowConfirm(false);
      setDeleteId(null);
    }
  };

  const handleDownload = async (id) => {
    const idsToDownload = id ? [id] : Array.from(selectedFiles);

    try {
      // Download files one by one
      for (const fileId of idsToDownload) {
        const file = files.find((f) => f._id === fileId || f.id === fileId);
        if (!file) continue;

        // If it's a new file that hasn't been uploaded yet
        if (file.file) {
          const url = URL.createObjectURL(file.file);
          const a = document.createElement("a");
          a.href = url;
          a.download = file.name || "download";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          continue;
        }

        // For files already on the server
        const fileUrl =
          file.url || `${process.env.NEXT_PUBLIC_API_URL}${file.path}`;
        const response = await fetch(fileUrl);
        if (!response.ok)
          throw new Error(
            `Failed to download file: ${file.name || file.filename}`
          );

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name || file.filename || "download";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      toast.success(
        `Downloaded ${idsToDownload.length} file${
          idsToDownload.length > 1 ? "s" : ""
        }`
      );
    } catch (error) {
      console.error("Download error:", error);
      toast.error(error.message || "Failed to download files");
    }
  };

  // Filter by size an date time
  const getFileSizeInMB = (bytes) => bytes / (1024 * 1024);

  const isWithinDateRange = (
    fileDate,
    range,
    customRange = [startDate, endDate]
  ) => {
    if (!fileDate) return false;

    const fileDateObj = new Date(fileDate);
    const now = new Date();

    // Create date-only objects (time set to 00:00:00) for accurate date comparison
    const normalizeDate = (date) => {
      const d = new Date(date);
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    };

    const fileDateNormalized = normalizeDate(fileDateObj);
    const nowNormalized = normalizeDate(now);

    switch (range) {
      case "today":
        return fileDateNormalized.getTime() === nowNormalized.getTime();

      case "week": {
        const weekAgo = new Date(nowNormalized);
        weekAgo.setDate(nowNormalized.getDate() - 7);
        return (
          fileDateNormalized >= weekAgo && fileDateNormalized <= nowNormalized
        );
      }

      case "month":
        return (
          fileDateNormalized.getMonth() === nowNormalized.getMonth() &&
          fileDateNormalized.getFullYear() === nowNormalized.getFullYear()
        );

      case "year":
        return fileDateNormalized.getFullYear() === nowNormalized.getFullYear();

      case "custom":
        if (!customRange[0] || !customRange[1]) return true;
        const start = normalizeDate(customRange[0]);
        const end = normalizeDate(customRange[1]);
        return fileDateNormalized >= start && fileDateNormalized <= end;

      default:
        return true;
    }
  };

  // Filter files based on search, active tab, and tags
  const filteredFiles = files.filter((file) => {
    const searchLower = searchQuery.toLowerCase();
    const fileName = file.name || "";
    const fileType =
      file.type || (file.mimetype ? file.mimetype.split("/")[0] : "");
    const fileExtension = fileName.split(".").pop().toLowerCase();
    const fileTags = file.tags || [];

    const matchesSearch =
      (file.name && file.name.toLowerCase().includes(searchLower)) ||
      (file.originalname &&
        file.originalname.toLowerCase().includes(searchLower)) ||
      (file.path && file.path.toLowerCase().includes(searchLower)) ||
      searchLower === ""; // Show all files if search is empty

    // File type detection
    const isImage =
      fileType?.startsWith?.("image") ||
      ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExtension);
    const isVideo =
      fileType?.startsWith?.("video") ||
      ["mp4", "webm", "ogg"].includes(fileExtension);
    const isPdf =
      fileType === "pdf" ||
      fileExtension === "pdf" ||
      (file.mimetype && file.mimetype === "application/pdf");
    const isCsv =
      fileExtension === "csv" ||
      (file.mimetype && file.mimetype === "text/csv");
    const isHtml =
      fileExtension === "html" ||
      fileExtension === "htm" ||
      (file.mimetype &&
        (file.mimetype === "text/html" ||
          file.mimetype === "application/xhtml+xml"));

    const matchesTab =
      activeTab === "all" ||
      (activeTab === "image" && isImage) ||
      (activeTab === "video" && isVideo) ||
      (activeTab === "pdf" && isPdf) ||
      (activeTab === "csv" && isCsv) ||
      (activeTab === "html" && isHtml) ||
      (activeTab === "other" &&
        fileType &&
        !isImage &&
        !isVideo &&
        !isPdf &&
        (isCsv || isHtml || !["csv", "html", "htm"].includes(fileExtension)));

    const matchesTag = !tagFilter || fileTags.includes(tagFilter);

    // Size filtering
    const fileSizeMB = getFileSizeInMB(file.size || 0);
    const matchesSize =
      sizeFilter === "all" ||
      (sizeFilter === "small" && fileSizeMB < 1) ||
      (sizeFilter === "medium" && fileSizeMB >= 1 && fileSizeMB <= 10) ||
      (sizeFilter === "large" && fileSizeMB > 10);

    // Date filtering
    const matchesDate =
      dateFilter === "all" ||
      isWithinDateRange(
        file.uploadedAt || file.createdAt || new Date(),
        dateFilter,
        dateRange
      );

    return (
      matchesSearch && matchesTab && matchesTag && matchesSize && matchesDate
    );
  });

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Close tag dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tagMenuRef.current && !tagMenuRef.current.contains(event.target)) {
        setEditingTags(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="space-y-6">
      <Toaster position="bottom-right" />

      {/* Delete Tag Confirmation Dialog */}
      {tagToDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-gray-50 border border-green-500 rounded-lg p-6 w-80 shadow-lg">
            <h3 className="text-lg font-medium mb-4">Delete Tag</h3>
            <p className="mb-6">
              Are you sure you want to delete the tag "{tagToDelete.name}"?
              <br />
              This will remove the tag from {filesWithTag.count}{" "}
              {filesWithTag.count === 1 ? "file" : "files"}:
              {filesWithTag.files.length > 0 && (
                <div className="mt-2 max-h-40 overflow-y-auto bg-gray-800 text-white p-2 rounded text-sm">
                  {filesWithTag.files.map((fileName, index) => (
                    <div key={index} className="truncate" title={fileName}>
                      - {fileName}
                    </div>
                  ))}
                </div>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setTagToDelete(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleDeleteTag(tagToDelete.id, tagToDelete.name)
                }
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">Media Library</h2>
          </div>
          <p className="text-sm text-[var(--text-color)]">
            {filteredFiles.length} of {files.length}{" "}
            {files.length === 1 ? "item" : "items"}
            {tagFilter && ` filtered by tag: ${tagFilter}`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {/* Universial Search */}
          <input
            type="text"
            placeholder="Search files..."
            className="px-4 py-2 border rounded-md w-full sm:w-64 bg-[var(--container-color-in)] text-[var(--text-color)]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          {/* Search by File size and date time */}
          <div className="flex gap-2">
            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              className="px-3 py-2 border rounded-md bg-[var(--container-color-in)] text-[var(--text-color)]"
            >
              <option value="all">All Sizes</option>
              <option value="small">Small (&lt; 1MB)</option>
              <option value="medium">Medium (1MB - 10MB)</option>
              <option value="large">Large (&gt; 10MB)</option>
            </select>

            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => {
                setDateRange(update);
                setDateFilter(update[0] && update[1] ? "custom" : "all");
              }}
              isClearable={true}
              placeholderText="Select date range"
              className="px-3 py-2 border rounded-md bg-[var(--container-color-in)] text-[var(--text-color)] w-full"
              dateFormat="MMM d, yyyy"
              maxDate={new Date()}
            />
          </div>

          {/* Tag filter dropdown */}
          <div className="relative" ref={tagMenuRef}>
            <button
              onClick={() =>
                setEditingTags(editingTags === "filter" ? null : "filter")
              }
              className="flex cursor-pointer items-center gap-2 px-4 py-2 border rounded-md bg-[var(--container-color-in)] text-[var(--text-color)] hover:bg-[var(--container-color)]"
            >
              <FiTag />
              <span>Tags</span>
              <FiChevronDown
                className={`transition-transform ${
                  editingTags === "filter" ? "transform rotate-180" : ""
                }`}
              />
            </button>
            {editingTags === "filter" && (
              <div className="absolute right-0 mt-1 w-72 bg-[var(--container-color-in)] rounded-md shadow-lg z-10 border border-[var(--border-color)]">
                <div className="p-2">
                  <div
                    className="px-4 py-2 cursor-pointer text-sm text-[var(--text-color)] hover:bg-[var(--container-color)] rounded"
                    onClick={() => {
                      setTagFilter("");
                      setEditingTags(null);
                    }}
                  >
                    All Files
                  </div>
                  {availableTags.map((tag) => (
                    <div
                      key={tag._id}
                      className={`px-4 py-2 text-sm ${
                        tagFilter === tag.name
                          ? "bg-[var(--container-color)] font-medium"
                          : "text-[var(--text-color)]"
                      } hover:bg-[var(--container-color)] rounded flex justify-between items-center group`}
                      onClick={(e) => {
                        // Only trigger tag selection if not clicking the delete button
                        if (!e.target.closest(".delete-tag-btn")) {
                          setTagFilter(tagFilter === tag.name ? "" : tag.name);
                          setEditingTags(null);
                        }
                      }}
                    >
                      <span className="flex-1">{tag.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs opacity-70">
                          {tag.mediaCount || 0}
                        </span>
                        <button
                          className="delete-tag-btn p-1 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition-opacity"
                          onClick={async (e) => {
                            e.stopPropagation();
                            const { count, files } = await countFilesWithTag(
                              tag.name
                            );
                            setFilesWithTag({ count, files });
                            setTagToDelete({ id: tag._id, name: tag.name });
                          }}
                          title="Delete tag"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-[var(--border-color)] mt-2 pt-2">
                    <form onSubmit={handleAddTag} className="px-2 py-1">
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="Enter a new tag name"
                          className="flex-1 px-2 py-1 text-sm rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-[var(--text-color)] bg-[var(--container-color-in)]"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          type="submit"
                          className="px-2 py-1 text-sm text-white bg-blue-500 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Add
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selection Toolbar */}
      {isSelectMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-medium">{selectedFiles.size} Selected </span>
            <button
              onClick={clearSelections}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleDownload()}
              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border rounded-md hover:bg-gray-50"
              title="Download selected"
            >
              <FiDownload className="h-4 w-4" />
              <span>Download</span>
            </button>

            <div className="relative" ref={tagMenuRef}>
              <button
                onClick={() =>
                  setEditingTags(
                    editingTags === "bulk-tags" ? null : "bulk-tags"
                  )
                }
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border rounded-md hover:bg-gray-50"
                title="Add tag to selected"
              >
                <FiTag className="h-4 w-4" />
                <span>Add Tag</span>
              </button>

              {editingTags === "bulk-tags" && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                  <div className="p-2 max-h-60 overflow-y-auto">
                    {availableTags.map((tag) => (
                      <div
                        key={tag._id}
                        className="px-3 py-2 text-sm hover:bg-gray-100 rounded cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          addTagsToSelectedFiles(tag.name);
                          setEditingTags(null);
                        }}
                      >
                        {tag.name}
                      </div>
                    ))}
                    <div className="border-t border-gray-200 mt-2 pt-2 px-2">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (newTag.trim()) {
                            addTagsToSelectedFiles(newTag.trim());
                            setNewTag("");
                            setEditingTags(null);
                          }
                        }}
                        className="flex items-center gap-1"
                      >
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="New tag name"
                          className="flex-1 px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          type="submit"
                          className="px-2 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Add
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setDeleteId(Array.from(selectedFiles).join(","));
                setShowConfirm(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-white border border-red-200 rounded-md hover:bg-red-50"
              title="Delete selected"
            >
              <FiTrash2 className="h-4 w-4" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex justify-between items-center border-b border-[var(--border-color-in)]">
        <nav className="-mb-px flex space-x-8">
          {["all", "image", "video", "pdf", "csv", "html", "other"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap py-4 px-1 border-b-3 font-medium text-sm cursor-pointer ${
                  activeTab === tab
                    ? "border-[var(--border-color)] text-[var(--text-color)]"
                    : "border-transparent text-[var(--text-color)] hover:text-[var(--text-color)] hover:border-[var(--border-color)]"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            )
          )}
        </nav>

        <div>
          {!isSelectMode && (
            <button
              onClick={() => setIsSelectMode(true)}
              className="flex cursor-pointer items-center gap-2 px-4 py-2 border rounded-md bg-[var(--container-color-in)] text-[var(--text-color)] hover:bg-[var(--container-color)]"
            >
              Select Multiple
            </button>
          )}
          {isSelectMode && (
            <button
              onClick={clearSelections}
              className="flex cursor-pointer items-center gap-2 px-4 py-2 border rounded-md bg-[var(--container-color-in)] text-[var(--text-color)] hover:bg-[var(--container-color)]"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Media Grid */}
      {filteredFiles.length === 0 ? (
        <div className="text-center py-12">
          <FiFile className="mx-auto h-12 w-12 text-[var(--text-color)]" />
          <h3 className="mt-2 text-sm font-medium text-[var(--text-color)]">
            No files found
          </h3>
          <p className="mt-1 text-sm text-[var(--text-color)]">
            {searchQuery
              ? "Try a different search term"
              : "Upload some files to get started"}
          </p>
        </div>
      ) : (
        <div className="grid h-[calc(100vh-200px)] grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {filteredFiles.map((file) => (
            <div
              key={file._id || file.id}
              className={`group relative flex flex-col bg-[var(--container-color-in)] rounded-xl border ${
                selectedFiles.has(file._id || file.id)
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-[var(--border-color)] hover:shadow-md"
              } shadow-sm transition-all duration-200`}
            >
              {/* Selection Checkbox */}
              <div
                className={`absolute top-2 left-2 z-10 transition-opacity duration-200 ${
                  isSelectMode
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFileSelection(file._id || file.id);
                }}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedFiles.has(file._id || file.id)
                      ? "bg-blue-500 border-blue-500"
                      : "bg-white border-gray-300"
                  }`}
                >
                  {selectedFiles.has(file._id || file.id) && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </div>
              {/* Media Preview */}
              <div className="aspect-square rounded-t-xl overflow-hidden bg-[var(--container-color)]">
                {file.type?.startsWith("image") ||
                file.mimetype?.startsWith("image") ? (
                  <img
                    src={
                      file.url ||
                      (file.path
                        ? `${process.env.NEXT_PUBLIC_API_URL}${file.path}`
                        : URL.createObjectURL(file.file))
                    }
                    alt={file.name || "Uploaded file"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : file.type?.startsWith("video") ||
                  file.mimetype?.startsWith("video") ? (
                  <div className="w-full h-full flex items-center justify-center bg-black/10">
                    <FiVideo className="h-12 w-12 text-[var(--text-color)] opacity-70" />
                  </div>
                ) : file.mimetype?.includes("pdf") ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-black/10 p-4">
                    <FiFile className="h-12 w-12 text-red-500 mb-2" />
                    <span className="text-xs text-center truncate text-[var(--text-color)]">
                      {file.originalname}
                    </span>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-black/10">
                    <FiFile className="h-12 w-12 text-[var(--text-color)] opacity-70" />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center gap-2 py-2 bg-[var(--container-color-in)]">
                <button
                  onClick={() => setSelectedFile(file)}
                  className="p-2 rounded-full border border-[var(--border-color)] hover:bg-[var(--container-color)] transition"
                  title="View"
                >
                  <FiImage className="h-4 w-4" />
                </button>

                <button
                  onClick={() => handleDownload(file._id || file.id)}
                  className="p-2 rounded-full border border-[var(--border-color)] hover:bg-[var(--container-color)] transition"
                  title="Download"
                >
                  <FiDownload className="h-4 w-4" />
                </button>

                <button
                  onClick={() => {
                    const fileUrl = file.path
                      ? `${process.env.NEXT_PUBLIC_API_URL}${file.path}`
                      : file.url;

                    navigator.clipboard.writeText(fileUrl);
                    toast.success("URL copied successfully!");
                  }}
                  className="p-2 rounded-full border border-[var(--border-color)] hover:bg-[var(--container-color)] transition"
                  title="Copy URL"
                >
                  <FiCopy className="h-4 w-4" />
                </button>

                <button
                  onClick={() => openDeletePopup(file._id)}
                  className="p-2 rounded-full border border-[var(--border-color)] hover:bg-red-600 hover:text-white transition"
                  title="Delete"
                >
                  <FiTrash2 className="h-4 w-4" />
                </button>
              </div>

              {/* Filename */}
              <div className="px-2 text-xs text-[var(--text-color)] truncate font-medium">
                {file.originalname}
              </div>

              {/* Size */}
              <div className="px-2 text-xs text-[var(--text-color)] opacity-80">
                {formatFileSize(file.size)}
              </div>

              {/* Tags */}
              {file.tags?.length > 0 && (
                <div className="px-2 pb-2 mt-1 flex flex-wrap gap-1 max-h-10 overflow-hidden">
                  {file.tags.slice(0, 2).map((tag, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 group"
                    >
                      {tag}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const updatedTags = [...file.tags].filter(
                            (_, i) => i !== index
                          );
                          updateFileTags(file._id || file.id, updatedTags);
                          setFiles((prev) =>
                            prev.map((f) =>
                              f._id === file._id || f.id === file.id
                                ? { ...f, tags: updatedTags }
                                : f
                            )
                          );
                        }}
                        className="opacity-0 group-hover:opacity-100 text-blue-600 hover:text-blue-800 transition-opacity"
                        title="Remove tag"
                      >
                        <FiX className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {file.tags.length > 2 && (
                    <span className="text-xs text-gray-500 self-center">
                      +{file.tags.length - 2} more
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* File Preview Modal */}
      {selectedFile && (
        <div className="fixed inset-0 bg-[var(--container-color)] bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--container-color-in)] rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium">
                {selectedFile.originalname}
              </h3>
              <button
                onClick={() => setSelectedFile(null)}
                className="text-[var(--text-color)] hover:text-[var(--text-color)]"
              >
                <FiX className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 flex-1 flex flex-col">
              {selectedFile.type === "pdf" ||
              selectedFile.mimetype?.includes("pdf") ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="bg-[var(--container-color)] p-6 rounded-full mb-6">
                    <FiFile className="h-16 w-16 text-[var(--text-color)]" />
                  </div>
                  <h4 className="text-lg font-medium mb-2">
                    {selectedFile.originalname}
                  </h4>
                  <p className="text-[var(--text-color)] mb-6">PDF Document</p>
                  <a
                    href={
                      selectedFile.url ||
                      `${process.env.NEXT_PUBLIC_API_URL}${selectedFile.path}`
                    }
                    download={selectedFile.originalname}
                    className="px-4 py-2 bg-[var(--button-bg-color)] text-[var(--button-color)] rounded-md hover:bg-[var(--button-hover-color)] flex items-center gap-2"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FiFile className="h-4 w-4" />
                    Open PDF in New Tab
                  </a>
                </div>
              ) : selectedFile.type?.startsWith("image") ||
                selectedFile.mimetype?.startsWith("image") ? (
                <img
                  src={
                    selectedFile.url ||
                    (selectedFile.path
                      ? `${process.env.NEXT_PUBLIC_API_URL}${selectedFile.path}`
                      : URL.createObjectURL(selectedFile.file))
                  }
                  alt={selectedFile.name}
                  className="max-w-full max-h-[60vh] mx-auto object-contain"
                />
              ) : selectedFile.type?.startsWith("video") ||
                selectedFile.mimetype?.startsWith("video") ? (
                <video
                  src={
                    selectedFile.url ||
                    (selectedFile.path
                      ? `${process.env.NEXT_PUBLIC_API_URL}${selectedFile.path}`
                      : URL.createObjectURL(selectedFile.file))
                  }
                  controls
                  className="max-w-full max-h-[60vh] mx-auto"
                />
              ) : (
                <div className="text-center py-12">
                  <FiFile className="mx-auto h-16 w-16 text-[var(--text-color)]" />
                  <p className="mt-2 text-sm text-[var(--text-color)]">
                    Preview not available for this file type
                  </p>
                  <a
                    href={
                      selectedFile.url ||
                      (selectedFile.path
                        ? `${process.env.NEXT_PUBLIC_API_URL}${selectedFile.path}`
                        : URL.createObjectURL(selectedFile.file))
                    }
                    download={selectedFile.originalname}
                    className="mt-4 inline-flex items-center px-4 py-2 bg-[var(--button-bg-color)] text-[var(--button-color)] rounded-md hover:bg-[var(--button-hover-color)]"
                  >
                    <FiFile className="mr-2 h-4 w-4" />
                    Download File
                  </a>
                </div>
              )}
            </div>
            <div className="p-4 border-t text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[var(--text-color)]">File Name:</p>
                  <p className="font-medium truncate">
                    {selectedFile.filename}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-color)]">
                    File Original Name:
                  </p>
                  <p className="font-medium truncate">
                    {selectedFile.originalname}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-color)]">File Size:</p>
                  <p className="font-medium">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-color)]">File Type:</p>
                  <p className="font-medium">
                    {selectedFile.mimetype || selectedFile.type || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-color)]">File Path:</p>
                  <p className="font-medium">{selectedFile.path}</p>
                </div>
                <div>
                  <p className="text-[var(--text-color)]">Uploaded:</p>
                  <p className="font-medium">
                    {selectedFile.uploadDate || selectedFile.createdAt
                      ? new Date(
                          selectedFile.uploadDate || selectedFile.createdAt
                        ).toLocaleDateString()
                      : "Just now"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete model */}
      {showConfirm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-gray-50 border border-green-500 rounded-lg p-6 w-80 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">
              {deleteId.includes(",")
                ? "Delete Multiple Files"
                : "Confirm Deletion"}
            </h2>
            <p className="mb-6 text-gray-700">
              {deleteId.includes(",")
                ? `Are you sure you want to delete ${
                    deleteId.split(",").length
                  } selected files?`
                : "Are you sure you want to delete this file?"}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>

              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
              >
                {deleteId.includes(",") ? "Delete All" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
