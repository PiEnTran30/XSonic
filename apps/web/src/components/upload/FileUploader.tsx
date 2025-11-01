"use client";

import { useState, useCallback } from "react";
import { Upload, X, File, CheckCircle, AlertCircle } from "lucide-react";

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

interface FileUploaderProps {
  onUploadComplete?: (jobId: string, fileUrl: string) => void;
  maxSizeMB?: number;
  acceptedTypes?: string[];
  toolId: string;
  parameters?: any;
}

export function FileUploader({
  onUploadComplete,
  maxSizeMB = 200,
  acceptedTypes = ["audio/*", "video/*"],
  toolId,
  parameters = {},
}: FileUploaderProps) {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFiles = Array.from(e.dataTransfer.files);
      handleFiles(droppedFiles);
    },
    [maxSizeMB]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        handleFiles(selectedFiles);
      }
    },
    [maxSizeMB]
  );

  const handleFiles = (newFiles: File[]) => {
    const validFiles: FileWithPreview[] = [];
    const newErrors: Record<string, string> = {};

    newFiles.forEach((file) => {
      const id = Math.random().toString(36).substring(7);
      
      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        newErrors[id] = `File too large. Max size: ${maxSizeMB}MB`;
        return;
      }

      // Validate file type
      const fileType = file.type;
      const isValidType = acceptedTypes.some((type) => {
        if (type.endsWith("/*")) {
          return fileType.startsWith(type.replace("/*", ""));
        }
        return fileType === type;
      });

      if (!isValidType) {
        newErrors[id] = `Invalid file type. Accepted: ${acceptedTypes.join(", ")}`;
        return;
      }

      validFiles.push(Object.assign(file, { id }));
    });

    setFiles((prev) => [...prev, ...validFiles]);
    setErrors((prev) => ({ ...prev, ...newErrors }));
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[id];
      return newErrors;
    });
    setUploadProgress((prev) => {
      const newProgress = { ...prev };
      delete newProgress[id];
      return newProgress;
    });
  };

  const uploadFile = async (file: FileWithPreview) => {
    try {
      setUploadProgress((prev) => ({ ...prev, [file.id]: 10 }));

      // Create FormData
      const formData = new FormData();
      formData.append("file", file);
      formData.append("toolId", toolId);
      formData.append("parameters", JSON.stringify(parameters));

      setUploadProgress((prev) => ({ ...prev, [file.id]: 30 }));

      // Upload to API
      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      setUploadProgress((prev) => ({ ...prev, [file.id]: 80 }));

      if (!uploadRes.ok) {
        const error = await uploadRes.json();
        throw new Error(error.error || "Failed to upload file");
      }

      const result = await uploadRes.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to upload file");
      }

      setUploadProgress((prev) => ({ ...prev, [file.id]: 100 }));

      if (onUploadComplete) {
        onUploadComplete(result.job.id, result.fileUrl);
      }

      return { success: true, jobId: result.job.id, fileUrl: result.fileUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setErrors((prev) => ({ ...prev, [file.id]: message }));
      return { success: false, error: message };
    }
  };

  const handleUpload = async () => {
    setUploading(true);
    
    for (const file of files) {
      setUploadProgress((prev) => ({ ...prev, [file.id]: 0 }));
      await uploadFile(file);
    }
    
    setUploading(false);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="w-full space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors cursor-pointer"
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={handleFileInput}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium mb-2">
            Drop files here or click to browse
          </p>
          <p className="text-sm text-gray-400">
            Max size: {maxSizeMB}MB • Accepted: {acceptedTypes.join(", ")}
          </p>
        </label>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => {
            const progress = uploadProgress[file.id] || 0;
            const error = errors[file.id];
            const isComplete = progress === 100;

            return (
              <div
                key={file.id}
                className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
              >
                <File className="h-8 w-8 text-blue-400 flex-shrink-0" />
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                  
                  {/* Progress Bar */}
                  {progress > 0 && !error && (
                    <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                  
                  {/* Error Message */}
                  {error && (
                    <p className="text-xs text-red-400 mt-1">{error}</p>
                  )}
                </div>

                {/* Status Icon */}
                {isComplete && !error && (
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                )}
                {error && (
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                )}
                
                {/* Remove Button */}
                {!uploading && (
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
        >
          {uploading ? "Uploading..." : `Upload ${files.length} file(s)`}
        </button>
      )}
    </div>
  );
}

