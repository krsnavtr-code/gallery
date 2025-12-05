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

  const handleDelete = async () => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/media/${deleteId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      setFiles(files.filter((file) => file._id !== deleteId));
      toast.success("File deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete file");
    } finally {
      setShowConfirm(false);
      setDeleteId(null);
    }
  };

  const handleDownload = async (id) => {
    try {
      const file = files.find((f) => f._id === id || f.id === id);
      if (!file) throw new Error("File not found");

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
        return;
      }

      // For files already on the server
      const fileUrl =
        file.url || `${process.env.NEXT_PUBLIC_API_URL}${file.path}`;
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Failed to download file");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name || file.filename || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success("Download started");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download file");
    }
  };

  // Filter files based on search, active tab, and tags
  const filteredFiles = files.filter((file) => {
    const fileName = file.name || "";
    const fileType =
      file.type || (file.mimetype ? file.mimetype.split("/")[0] : "");
    const fileExtension = fileName.split(".").pop().toLowerCase();
    const fileTags = file.tags || [];

    const matchesSearch = fileName
      .toString()
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

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

    return matchesSearch && matchesTab && matchesTag;
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-auto">
          <h2 className="text-2xl font-bold">Media Library</h2>
          <p className="text-sm text-[var(--text-color)]">
            {filteredFiles.length} of {files.length}{" "}
            {files.length === 1 ? "item" : "items"}
            {tagFilter && ` filtered by tag: ${tagFilter}`}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search files..."
            className="px-4 py-2 border rounded-md w-full sm:w-64 bg-[var(--container-color-in)] text-[var(--text-color)]"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

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
                      } hover:bg-[var(--container-color)] rounded flex justify-between items-center`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setTagFilter(tagFilter === tag.name ? "" : tag.name);
                        setEditingTags(null);
                      }}
                    >
                      <span>{tag.name}</span>
                      <span className="text-xs opacity-70">
                        {tag.mediaCount || 0}
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-[var(--border-color)] mt-2 pt-2">
                    <form onSubmit={handleAddTag} className="px-2 py-1">
                      <div className="flex items-center">
                        <input
                          type="text"
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="New tag name"
                          className="flex-1 px-2 py-1 text-sm border rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-[var(--text-color)] bg-[var(--container-color-in)]"
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

      {/* Tabs */}
      <div className="border-b border-[var(--border-color-in)]">
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
              className="group relative flex flex-col bg-[var(--container-color-in)] rounded-xl border border-[var(--border-color)] shadow-sm hover:shadow-md transition-all duration-200"
            >
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
              <div className="px-2 pb-2 text-xs text-[var(--text-color)] opacity-80">
                {formatFileSize(file.size)}
              </div>
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
            <h2 className="text-lg font-semibold mb-4">Confirm Deletion</h2>
            <p className="mb-6 text-gray-700">
              Are you sure you want to delete this file?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
