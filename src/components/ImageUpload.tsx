'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Loader2, Eye, Trash2 } from 'lucide-react';

interface UploadedImage {
  url: string;
  publicId: string;
  alt: string;
  isPrimary: boolean;
  width: number;
  height: number;
  format: string;
  size: number;
  optimizedUrls: {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
    original: string;
  };
  responsiveUrls: {
    card: string;
    detail: string;
    hero: string;
    mobile: string;
  };
}

interface ImageUploadProps {
  onImagesChange: (images: UploadedImage[]) => void;
  existingImages?: UploadedImage[];
  maxImages?: number;
  folder?: string;
  className?: string;
}

export default function ImageUpload({
  onImagesChange,
  existingImages = [],
  maxImages = 10,
  folder = 'products',
  className = '',
}: ImageUploadProps) {
  const [images, setImages] = useState<UploadedImage[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<UploadedImage | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    setUploading(true);
    setError('');

    try {
      const uploadedImages: UploadedImage[] = [];

      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', folder);
        formData.append('alt', file.name.split('.')[0]);
        formData.append('isPrimary', (images.length + uploadedImages.length === 0).toString());

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }

        const data = await response.json();
        uploadedImages.push(data.image);
      }

      const newImages = [...images, ...uploadedImages];
      setImages(newImages);
      onImagesChange(newImages);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setUploading(false);
    }
  }, [images, maxImages, folder, onImagesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploading || images.length >= maxImages,
  });

  const removeImage = async (imageToRemove: UploadedImage) => {
    try {
      const response = await fetch('/api/upload/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicId: imageToRemove.publicId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }

      const newImages = images.filter(img => img.publicId !== imageToRemove.publicId);
      
      // If removed image was primary, make the first remaining image primary
      if (imageToRemove.isPrimary && newImages.length > 0) {
        newImages[0].isPrimary = true;
      }

      setImages(newImages);
      onImagesChange(newImages);
    } catch (error) {
      setError((error as Error).message);
    }
  };

  const setPrimaryImage = (imageToSetPrimary: UploadedImage) => {
    const newImages = images.map(img => ({
      ...img,
      isPrimary: img.publicId === imageToSetPrimary.publicId,
    }));
    
    setImages(newImages);
    onImagesChange(newImages);
  };

  const updateAltText = (imageToUpdate: UploadedImage, newAlt: string) => {
    const newImages = images.map(img =>
      img.publicId === imageToUpdate.publicId ? { ...img, alt: newAlt } : img
    );
    
    setImages(newImages);
    onImagesChange(newImages);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-neutral-300 hover:border-primary-400 hover:bg-neutral-50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          
          <div className="space-y-4">
            {uploading ? (
              <Loader2 className="h-12 w-12 text-primary-500 mx-auto animate-spin" />
            ) : (
              <Upload className="h-12 w-12 text-neutral-400 mx-auto" />
            )}
            
            <div>
              <p className="text-lg font-medium text-neutral-700">
                {uploading ? 'Uploading images...' : 'Drop images here or click to select'}
              </p>
              <p className="text-sm text-neutral-500 mt-1">
                Support JPG, PNG, WebP up to 10MB ({images.length}/{maxImages} images)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.publicId}
              className={`group relative bg-white rounded-xl border-2 p-2 transition-all duration-200 ${
                image.isPrimary ? 'border-primary-500 shadow-primary-200' : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              {/* Primary Badge */}
              {image.isPrimary && (
                <div className="absolute -top-2 -left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded-full font-medium z-10">
                  Primary
                </div>
              )}

              {/* Image */}
              <div className="relative aspect-square bg-neutral-100 rounded-lg overflow-hidden">
                <img
                  src={image.optimizedUrls.small}
                  alt={image.alt}
                  className="w-full h-full object-cover"
                />
                
                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center space-x-2">
                  <button
                    onClick={() => setPreviewImage(image)}
                    className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4 text-white" />
                  </button>
                  
                  {!image.isPrimary && (
                    <button
                      onClick={() => setPrimaryImage(image)}
                      className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                      title="Set as primary"
                    >
                      <ImageIcon className="h-4 w-4 text-white" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => removeImage(image)}
                    className="p-2 bg-red-500/80 rounded-full hover:bg-red-500 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                  </button>
                </div>
              </div>

              {/* Alt Text Input */}
              <div className="mt-2">
                <input
                  type="text"
                  value={image.alt}
                  onChange={(e) => updateAltText(image, e.target.value)}
                  placeholder="Alt text..."
                  className="w-full px-2 py-1 text-xs border border-neutral-200 rounded focus:border-primary-400 focus:ring-1 focus:ring-primary-200"
                />
              </div>

              {/* Image Info */}
              <div className="mt-1 text-xs text-neutral-500">
                {image.width}×{image.height} • {(image.size / 1024).toFixed(1)}KB
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-12 right-0 text-white hover:text-neutral-300 transition-colors"
            >
              <X className="h-8 w-8" />
            </button>
            
            <img
              src={previewImage.optimizedUrls.large}
              alt={previewImage.alt}
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-4 rounded-b-lg">
              <p className="font-medium">{previewImage.alt}</p>
              <p className="text-sm text-neutral-300">
                {previewImage.width}×{previewImage.height} • {previewImage.format.toUpperCase()} • 
                {(previewImage.size / 1024).toFixed(1)}KB
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}