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

  const handleImageUpload = async (file: File) => {
    try {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return null;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return null;
      }

      setIsUploading(true);
      setUploadProgress(0);

      console.log('Uploading file:', {
        name: file.name,
        type: file.type,
        size: `${(file.size / 1024 / 1024).toFixed(2)}MB`
      });

      const fileRef = storageRef(storage, `events/${Date.now()}-${file.name}`);
      const uploadTask = uploadBytesResumable(fileRef, file);

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            console.error('Upload error details:', {
              code: error.code,
              message: error.message,
              serverResponse: error.serverResponse
            });
            toast.error(`Upload failed: ${error.message}`);
            setIsUploading(false);
            reject(error);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              setImageUrl(downloadUrl);
              setIsUploading(false);
              toast.success('Image uploaded successfully!');
              resolve(downloadUrl);
            } catch (error) {
              console.error('Error getting download URL:', error);
              toast.error('Failed to get download URL');
              setIsUploading(false);
              reject(error);
            }
          }
        );
      });
    } catch (error) {
      console.error('Error initiating upload:', error);
      toast.error('Failed to initiate upload');
      setIsUploading(false);
      return null;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isUploading) {
      toast.error('Please wait for image upload to complete');
      return;
    }

    if (!imageUrl) {
      toast.error('Please upload an image');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        title,
        time,
        date: date ? format(date, 'yyyy-MM-dd') : undefined,
        description,
        imageUrl,
        type: event?.type || 'special'
      });
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
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

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
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
            <div>
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
            <div
              ref={dropZoneRef}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer ${
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

              {imageUrl ? (
                <div className="relative">
                  <img
                    src={imageUrl}
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
                  <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4 text-sm text-gray-600">
                    <p className="font-semibold text-blue-600">Click to upload</p>
                    <p className="mt-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    PNG, JPG, GIF up to 5MB
                  </p>
                </div>
              )}

              {isUploading && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-2 text-center">
                    Uploading: {Math.round(uploadProgress)}%
                  </p>
                </div>
              )}
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