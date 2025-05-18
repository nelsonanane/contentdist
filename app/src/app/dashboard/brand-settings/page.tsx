'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { brandSettingsService, BrandSettings } from '@/lib/database';

export default function BrandSettingsPage() {
  const { user } = useAuth();
  const [brandName, setBrandName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#4F46E5'); // Default indigo color
  const [secondaryColor, setSecondaryColor] = useState('#10B981'); // Default emerald color
  const [brandDescription, setBrandDescription] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load existing brand settings when component mounts
  useEffect(() => {
    async function loadBrandSettings() {
      if (!user) return;
      
      try {
        setIsLoadingData(true);
        const { data, error } = await brandSettingsService.getBrandSettings(user.id);
        
        if (error) {
          console.error('Error loading brand settings:', error);
          return;
        }
        
        if (data) {
          setBrandName(data.brand_name || '');
          setBrandDescription(data.brand_description || '');
          setPrimaryColor(data.primary_color || '#4F46E5');
          setSecondaryColor(data.secondary_color || '#10B981');
          if (data.logo_url) {
            setLogoPreview(data.logo_url);
          }
        }
      } catch (error) {
        console.error('Error loading brand settings:', error);
      } finally {
        setIsLoadingData(false);
      }
    }
    
    loadBrandSettings();
  }, [user]);

  // Handle file change for logo upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    
    setLogoFile(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage({
        type: 'error',
        text: 'You must be logged in to save brand settings.'
      });
      return;
    }
    
    setIsLoading(true);
    setMessage({ type: '', text: '' });

    try {
      let logoUrl = null;
      
      // Upload logo if a new file was selected
      if (logoFile) {
        const { url, error: uploadError } = await brandSettingsService.uploadLogo(user.id, logoFile);
        if (uploadError) {
          console.error('Error uploading logo:', uploadError);
          setMessage({
            type: 'error',
            text: 'Failed to upload logo. Please try again.'
          });
          setIsLoading(false);
          return;
        }
        logoUrl = url;
      }
      
      // Save brand settings
      const brandSettings: BrandSettings = {
        user_id: user.id,
        brand_name: brandName,
        brand_description: brandDescription,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        logo_url: logoUrl || logoPreview || undefined
      };
      
      const { error } = await brandSettingsService.saveBrandSettings(brandSettings);
      
      if (error) {
        console.error('Error saving brand settings:', error);
        setMessage({
          type: 'error',
          text: 'Failed to save brand settings. Please try again.'
        });
        return;
      }
      
      setMessage({ 
        type: 'success', 
        text: 'Brand settings saved successfully!' 
      });
    } catch (error) {
      console.error('Error saving brand settings:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to save brand settings. Please try again.' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="py-10">
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-100">Brand Settings</h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="px-4 py-8 sm:px-0">
            <div className="bg-gray-800 shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                {isLoadingData ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
                      <p className="mt-4 text-gray-300">Loading your brand settings...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    {message.text && (
                      <div className={`mb-4 p-4 rounded-md ${message.type === 'success' ? 'bg-green-900/30 text-green-300 border border-green-800' : 'bg-red-900/30 text-red-300 border border-red-800'}`}>
                        {message.text}
                      </div>
                    )}
                    
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <label htmlFor="brand-name" className="block text-sm font-medium text-gray-200">
                          Brand Name
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            id="brand-name"
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-700 bg-gray-700 text-gray-100 rounded-md placeholder-gray-400"
                            placeholder="Your Brand Name"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="brand-description" className="block text-sm font-medium text-gray-200">
                          Brand Description
                        </label>
                        <div className="mt-1">
                          <textarea
                            id="brand-description"
                            value={brandDescription}
                            onChange={(e) => setBrandDescription(e.target.value)}
                            rows={3}
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-700 bg-gray-700 text-gray-100 rounded-md placeholder-gray-400"
                            placeholder="Describe your brand"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                          <label htmlFor="primary-color" className="block text-sm font-medium text-gray-200">
                            Primary Color
                          </label>
                          <div className="mt-1 flex items-center">
                            <input
                              type="color"
                              id="primary-color"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="h-10 w-10 rounded-md border-gray-700 bg-gray-700"
                            />
                            <input
                              type="text"
                              value={primaryColor}
                              onChange={(e) => setPrimaryColor(e.target.value)}
                              className="ml-2 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-700 bg-gray-700 text-gray-100 rounded-md"
                            />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="secondary-color" className="block text-sm font-medium text-gray-200">
                            Secondary Color
                          </label>
                          <div className="mt-1 flex items-center">
                            <input
                              type="color"
                              id="secondary-color"
                              value={secondaryColor}
                              onChange={(e) => setSecondaryColor(e.target.value)}
                              className="h-10 w-10 rounded-md border-gray-700 bg-gray-700"
                            />
                            <input
                              type="text"
                              value={secondaryColor}
                              onChange={(e) => setSecondaryColor(e.target.value)}
                              className="ml-2 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-700 bg-gray-700 text-gray-100 rounded-md"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-200">
                          Brand Logo
                        </label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-600 border-dashed rounded-md bg-gray-700/30">
                          {logoPreview ? (
                            <div className="text-center">
                              <div className="mb-3">
                                <img 
                                  src={logoPreview} 
                                  alt="Logo preview" 
                                  className="mx-auto h-32 w-auto object-contain" 
                                />
                              </div>
                              <div className="flex justify-center">
                                <label
                                  htmlFor="file-upload"
                                  className="relative cursor-pointer bg-gray-600 rounded-md font-medium text-indigo-300 hover:text-indigo-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 focus-within:ring-offset-gray-800 px-3 py-1"
                                >
                                  <span>Change logo</span>
                                  <input 
                                    id="file-upload" 
                                    name="file-upload" 
                                    type="file" 
                                    className="sr-only" 
                                    onChange={handleFileChange}
                                    accept="image/png,image/jpeg,image/gif"
                                  />
                                </label>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1 text-center">
                              <svg
                                className="mx-auto h-12 w-12 text-gray-300"
                                stroke="currentColor"
                                fill="none"
                                viewBox="0 0 48 48"
                                aria-hidden="true"
                              >
                                <path
                                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                                  strokeWidth={2}
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              <div className="flex text-sm text-gray-300">
                                <label
                                  htmlFor="file-upload"
                                  className="relative cursor-pointer bg-gray-600 rounded-md font-medium text-indigo-300 hover:text-indigo-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 focus-within:ring-offset-gray-800"
                                >
                                  <span>Upload a file</span>
                                  <input 
                                    id="file-upload" 
                                    name="file-upload" 
                                    type="file" 
                                    className="sr-only" 
                                    onChange={handleFileChange}
                                    accept="image/png,image/jpeg,image/gif"
                                  />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                              </div>
                              <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          className="bg-gray-700 py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-200 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-800 mr-3"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading}
                          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-800 disabled:bg-indigo-800 disabled:text-indigo-200"
                        >
                          {isLoading ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
