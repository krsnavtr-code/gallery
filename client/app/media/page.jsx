"use client";

import { useState, useEffect, useRef } from "react";
import {
  FiUpload,
  FiImage,
  FiVideo,
  FiFile,
  FiTrash2,
  FiX,
  FiLoader,
  FiDownload,
  FiCopy,
  FiTag,
  FiChevronDown,
} from "react-icons/fi";
import { toast } from "react-hot-toast";

const AVAILABLE_TAGS = ["Brand", "Home", "Gallery"];

const MediaGallery = () => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [editingTags, setEditingTags] = useState(null);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);
  const tagMenuRef = useRef(null);

  // Fetch all media files
  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/media`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch media: ${response.status} ${response.statusText}`
        );
      }

      const { data } = await response.json();
      console.log("Fetched media:", data);

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

  // Handle drag events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === dropRef.current) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Handle dropped files
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      processFiles(droppedFiles);
    }
  };

  // Process selected files
  const processFiles = (fileList) => {
    const selectedFiles = Array.from(fileList);
    const newFiles = selectedFiles.map((file) => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      type: file.type.split("/")[0] || "file",
      size: file.size,
      url: URL.createObjectURL(file),
      isNew: true,
    }));

    setFiles((prevFiles) => [...newFiles, ...prevFiles]);
  };

  // Handle file selection
  const handleFileChange = (e) => {
    processFiles(e.target.files);
  };

  // Toggle tag for a file
  const toggleTag = (fileId, tag) => {
    setFiles((prevFiles) =>
      prevFiles.map((file) => {
        if (file.id === fileId || file._id === fileId) {
          const newTags = file.tags?.includes(tag)
            ? file.tags.filter((t) => t !== tag)
            : [...(file.tags || []), tag];

          // If this is an existing file (not new), update on server
          if (file._id) {
            updateFileTags(file._id, newTags);
          }

          return { ...file, tags: newTags };
        }
        return file;
      })
    );
  };

  // Update file tags on server
  const updateFileTags = async (fileId, tags) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/media/${fileId}/tags`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tags }),
      });

      if (!response.ok) {
        throw new Error("Failed to update tags");
      }
    } catch (error) {
      console.error("Error updating tags:", error);
      toast.error("Failed to update tags");
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    const newFiles = files.filter((file) => file.isNew);
    if (newFiles.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = newFiles.map(async (fileObj) => {
        const formData = new FormData();
        formData.append("file", fileObj.file);
        if (fileObj.tags?.length) {
          formData.append("tags", JSON.stringify(fileObj.tags));
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/media`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${fileObj.name}`);
        }

        return response.json();
      });

      await Promise.all(uploadPromises);
      toast.success("Files uploaded successfully!");

      // Refresh the media list
      await fetchMedia();
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  // Handle file deletion
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/media/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete file");
      }

      setFiles(files.filter((file) => file._id !== id));
      toast.success("File deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete file");
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

  // Render tag with pill style
  const renderTag = (tag, fileId) => (
    <span
      key={tag}
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 mr-1 mb-1"
      onClick={(e) => {
        e.stopPropagation();
        setTagFilter(tag);
      }}
    >
      {tag}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleTag(fileId, tag);
        }}
        className="ml-1.5 text-blue-500 hover:text-blue-700"
      >
        &times;
      </button>
    </span>
  );

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
              <div className="absolute right-0 mt-1 w-48 bg-[var(--container-color-in)] rounded-md shadow-lg z-10 border border-[var(--border-color)]">
                <div className="p-2">
                  <div
                    className="px-4 py-2 cursor-pointer text-sm text-[var(--text-color)] hover:bg-[var(--container-color)] rounded cursor-pointer"
                    onClick={() => {
                      setTagFilter("");
                      setEditingTags(null);
                    }}
                  >
                    All Files
                  </div>
                  {AVAILABLE_TAGS.map((tag) => (
                    <div
                      key={tag}
                      className={`px-4 py-2 cursor-pointer text-sm ${
                        tagFilter === tag
                          ? "bg-[var(--container-color)] font-medium"
                          : "text-[var(--text-color)]"
                      } hover:bg-[var(--container-color)] rounded cursor-pointer`}
                      onClick={() => {
                        setTagFilter(tagFilter === tag ? "" : tag);
                        setEditingTags(null);
                      }}
                    >
                      {tag}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-[var(--button-bg-color)] text-[var(--button-color)] rounded-md hover:bg-[var(--button-hover-color)] flex items-center gap-2 cursor-pointer"
              disabled={isUploading}
            >
              <FiUpload />
              Add Media
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              onChange={handleFileChange}
            />

            {files.some((file) => file.isNew) && (
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="px-4 py-2 bg-[var(--button-bg-color)] text-[var(--button-color)] rounded-md hover:bg-[var(--button-hover-color)] flex items-center gap-2 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <FiLoader className="animate-spin" />
                    Uploading...
                  </>
                ) : (
                  `Upload ${files.filter((f) => f.isNew).length} New File${
                    files.filter((f) => f.isNew).length !== 1 ? "s" : ""
                  }`
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        ref={dropRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-3 text-center mb-6 transition-colors ${
          isDragging
            ? "border-[var(--border-color)] bg-[var(--container-color-in)]"
            : "border-[var(--border-color)] hover:border-[var(--text-color)] hover:bg-[var(--container-color-in)]"
        }`}
      >
        <div className="flex flex-col items-center justify-center space-y-2">
          <FiUpload className="text-lg text-[var(--text-color)]" />
          <p className="text-[var(--text-color)]">
            {isDragging
              ? "Drop files here"
              : "Drag and drop files here or click to browse"}
          </p>
          <p className="text-sm text-[var(--text-color)]">
            Supports images, videos, and other media files
          </p>
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
        <div className="h-[calc(100vh-200px)] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredFiles.map((file) => (
            <div key={file._id || file.id} className="group relative h-[00px]">
              <div className="aspect-square bg-[var(--container-color-in)] rounded-md overflow-hidden border border-[var(--border-color)]">
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
                    className="w-full h-full object-cover"
                  />
                ) : file.type?.startsWith("video") ||
                  file.mimetype?.startsWith("video") ? (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--container-color-in)]">
                    <FiVideo className="h-12 w-12 text-[var(--text-color)]" />
                  </div>
                ) : file.type === "pdf" || file.mimetype?.includes("pdf") ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--container-color-in)] p-4">
                    <div className="bg-[var(--container-color)] p-4 rounded-full mb-2">
                      <FiFile className="h-12 w-12 text-[var(--logo-bg-color)]" />
                    </div>
                    <span className="text-xs text-center text-[var(--text-color)] truncate w-full px-2">
                      {file.originalname || "PDF Document"}
                    </span>
                  </div>
                ) : file.type === "csv" || file.mimetype?.includes("csv") ? (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--container-color-in)]">
                    <FiFile className="h-12 w-12 text-[var(--text-color)]" />
                  </div>
                ) : file.type === "html" || file.mimetype?.includes("html") ? (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--container-color-in)]">
                    <FiFile className="h-12 w-12 text-[var(--text-color)]" />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[var(--container-color-in)]">
                    <FiFile className="h-12 w-12 text-[var(--text-color)]" />
                  </div>
                )}

                <div className="absolute inset-0 bg-transparent bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => setSelectedFile(file)}
                    className="p-2 bg-[var(--container-color-in)] border-[var(--text-color)] border-[1px] bg-opacity-90 rounded-full hover:bg-opacity-100 cursor-pointer"
                    title="View"
                  >
                    <FiImage className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(file._id || file.id)}
                    className="p-2 bg-[var(--container-color-in)] border-[var(--text-color)] border-[1px] bg-opacity-90 rounded-full hover:bg-opacity-100 cursor-pointer"
                    title="Download"
                  >
                    <FiDownload className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      const fileUrl = file.path
                        ? `process.env.NEXT_PUBLIC_API_URL + "${file.path}"`
                        : `"${file.url}"`;
                      navigator.clipboard.writeText(fileUrl);
                      toast.success(
                        "URL with environment variable copied to clipboard!"
                      );
                    }}
                    className="p-2 bg-[var(--container-color-in)] border-[var(--text-color)] border-[1px] bg-opacity-90 rounded-full hover:bg-opacity-100 cursor-pointer"
                    title="Copy URL"
                  >
                    <FiCopy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(file._id || file.id)}
                    className="p-2 bg-[var(--container-color-in)] border-[var(--text-color)] border-[1px] bg-opacity-90 rounded-full hover:bg-opacity-100 cursor-pointer"
                    title="Delete"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs text-[var(--text-color)] truncate">
                {file.originalname}
              </div>
              <div className="flex flex-wrap mt-1">
                {file.tags?.map((tag) => renderTag(tag, file.id || file._id))}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingTags(
                      editingTags === file.id ? null : file.id || file._id
                    );
                  }}
                  className="text-xs text-gray-500 hover:text-blue-500 flex items-center"
                >
                  <FiTag className="mr-1" />
                  {file.tags?.length ? "Edit" : "Add Tag"}
                </button>
              </div>

              {/* Tag dropdown */}
              {editingTags === (file.id || file._id) && (
                <div
                  ref={tagMenuRef}
                  className="absolute z-10 mt-1 w-48 bg-[var(--container-color-in)] rounded-md shadow-lg border border-[var(--border-color)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-2">
                    {AVAILABLE_TAGS.map((tag) => (
                      <div
                        key={tag}
                        className="flex items-center px-4 py-2 text-sm text-[var(--text-color)] hover:bg-[var(--container-color)] rounded cursor-pointer"
                        onClick={() => {
                          toggleTag(file.id || file._id, tag);
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!file.tags?.includes(tag)}
                          readOnly
                          className="mr-2 rounded border-[var(--border-color)] text-blue-600 focus:ring-blue-500"
                        />
                        {tag}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-[var(--text-color)] mt-1">
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
    </div>
  );
};

export default MediaGallery;
