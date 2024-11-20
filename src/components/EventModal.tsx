import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Link as LinkIcon, ImageIcon } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { Event } from '../types';
import { format } from 'date-fns';
import { storage } from '../lib/firebase';
import { ref as storageRef, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { toast } from 'sonner';

interface EventModalProps {
  event?: Event;
  onClose: () => void;
  onSave: (event: Partial<Event>) => Promise<void>;
  isEditing?: boolean;
}

const EventModal: React.FC<EventModalProps> = ({ event, onClose, onSave, isEditing }) => {
  const [title, setTitle] = useState(event?.title || '');
  const [time, setTime] = useState(event?.time || '');
  const [date, setDate] = useState<Date | null>(event?.date ? new Date(event.date) : null);
  const [description, setDescription] = useState(event?.description || '');
  const [imageUrl, setImageUrl] = useState(event?.imageUrl || '');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [localImageUrl, setLocalImageUrl] = useState<string>('');

  const handleImageUpload = async (file: File) => {
    try {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      // Create local preview URL
      const previewUrl = URL.createObjectURL(file);
      setLocalImageUrl(previewUrl);
      setImageFile(file);
      setImageUrl(''); // Clear any existing Firebase URL
      toast.success('Image added successfully!');
    } catch (error) {
      console.error('Error handling image:', error);
      toast.error('Failed to handle image');
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      await handleImageUpload(file);
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await handleImageUpload(file);
      } catch (error) {
        console.error('Error in file change handler:', error);
      }
    }
  };

  const handleImageUrlSubmit = async (url: string) => {
    try {
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
      const hasValidExtension = validExtensions.some(ext => url.toLowerCase().endsWith(ext));
      
      if (!hasValidExtension) {
        toast.error('Image URL must end with .jpg, .jpeg, .png, .gif, or .webp');
        return;
      }

      // Test if image loads
      const img = new Image();
      img.onload = () => {
        setLocalImageUrl(url);
        setImageFile(null);
        setImageUrl(''); // Clear any existing Firebase URL
        toast.success('Image URL added successfully!');
      };
      img.onerror = () => {
        toast.error('Invalid image URL or image not accessible');
      };
      img.src = url;
    } catch (error) {
      console.error('Error adding image URL:', error);
      toast.error('Failed to add image URL');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!localImageUrl) {
      toast.error('Please add an image');
      return;
    }

    setLoading(true);
    setIsUploading(true);
    try {
      let finalImageUrl = imageUrl;

      // If we have a new image (either file or URL), upload it
      if (localImageUrl && !imageUrl) {
        if (imageFile) {
          // Upload file to Firebase Storage
          const fileRef = storageRef(storage, `events/${Date.now()}-${imageFile.name}`);
          const uploadTask = uploadBytesResumable(fileRef, imageFile);
          
          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadProgress(progress);
            }
          );

          await uploadTask;
          finalImageUrl = await getDownloadURL(uploadTask.snapshot.ref);
        } else {
          // Direct URL case
          finalImageUrl = localImageUrl;
        }
      }

      await onSave({
        title,
        time,
        date: date ? format(date, 'yyyy-MM-dd') : undefined,
        description,
        imageUrl: finalImageUrl,
        type: event?.type || 'special'
      });
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    } finally {
      setLoading(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        {isUploading && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 rounded-lg">
            <div className="bg-white p-6 rounded-lg shadow-xl text-center">
              <h3 className="text-lg font-semibold mb-4">Uploading Event...</h3>
              <div className="w-64 h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="mt-2 text-sm text-gray-600">{Math.round(uploadProgress)}%</p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold">
            {isEditing ? 'Edit Event' : 'Add New Event'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            type="button"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Event Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                disabled={event?.isPermanent}
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <label htmlFor="time" className="block text-sm font-medium text-gray-700">
                  Time
                </label>
                <input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              {!event?.isPermanent && (
                <div className="flex-1">
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                    Date
                  </label>
                  <DatePicker
                    id="date"
                    selected={date}
                    onChange={(date: Date | null) => setDate(date)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    dateFormat="MMMM d, yyyy"
                    minDate={new Date()}
                    required
                  />
                </div>
              )}
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Image
              </label>
              <div className="flex justify-between items-center mb-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Upload className="h-5 w-5 mr-2" />
                  Upload Image
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = window.prompt('Enter image URL (must end with .jpg, .jpeg, .png, .gif, or .webp)');
                    if (url) handleImageUrlSubmit(url);
                  }}
                  className="flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  <LinkIcon className="h-5 w-5 mr-2" />
                  Use URL
                </button>
              </div>
              <div
                ref={dropZoneRef}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {localImageUrl || imageUrl ? (
                  <div className="relative">
                    <img
                      src={localImageUrl || imageUrl}
                      alt="Event preview"
                      className="mx-auto max-h-48 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageUrl('');
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Drag and drop an image here, or click to select
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EventModal;