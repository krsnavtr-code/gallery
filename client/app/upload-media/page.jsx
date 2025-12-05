"use client";

import { useState, useEffect, useRef } from "react";
import {
  FiUpload,
  FiLoader,
  FiTag,
  FiChevronDown,
} from "react-icons/fi";
import { toast } from "react-hot-toast";

const AVAILABLE_TAGS = ["Brand", "Home", "Gallery"];

const MediaGallery = () => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [editingTags, setEditingTags] = useState(null);
  const [lastUploadCount, setLastUploadCount] = useState(0);
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);
  const tagMenuRef = useRef(null);

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

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/media`,
          {
            method: "POST",
            credentials: "include",
            body: formData,
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to upload ${fileObj.name}`);
        }

        return response.json();
      });

      await Promise.all(uploadPromises);
      // Clear only the successfully uploaded files and track the last upload count
      setFiles(prevFiles => prevFiles.filter(file => !file.isNew));
      setLastUploadCount(newFiles.length);
      toast.success(`Successfully uploaded ${newFiles.length} file${newFiles.length !== 1 ? 's' : ''}!`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
    }
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
          <h2 className="text-2xl font-bold">Media Uploads </h2>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
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

      {/* Success message */}
      {lastUploadCount > 0 && (
        <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md">
          <p>✅ Successfully uploaded {lastUploadCount} file{lastUploadCount !== 1 ? 's' : ''}!</p>
        </div>
      )}
    </div>
  );
};

export default MediaGallery;
