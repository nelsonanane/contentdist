'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function Dashboard() {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/signin')
    }
  }, [user, isLoading, router])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // If user is not authenticated and not loading, the useEffect will redirect
  if (!user) {
    return null
  }

  // User is authenticated, show dashboard
  return (
    <div className="min-h-screen bg-gray-50">

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Welcome to your dashboard</h2>
          <p className="text-gray-600 mb-6">
            You&apos;re now signed in to your ContentDist account. From here, you can manage your content distribution across multiple platforms.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-800 mb-2">Projects</h3>
              <p className="text-blue-600 text-sm mb-3">
                Create and manage your content projects
              </p>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-500">
                View projects
              </button>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-medium text-green-800 mb-2">Content</h3>
              <p className="text-green-600 text-sm mb-3">
                Create, schedule, and publish your content
              </p>
              <button className="text-sm font-medium text-green-600 hover:text-green-500">
                Manage content
              </button>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-medium text-purple-800 mb-2">Analytics</h3>
              <p className="text-purple-600 text-sm mb-3">
                View performance metrics for your content
              </p>
              <button className="text-sm font-medium text-purple-600 hover:text-purple-500">
                View analytics
              </button>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">Account Information</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="font-medium">{user.user_metadata?.full_name || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Account Type</p>
                  <p className="font-medium">Free</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">GDPR Consent</p>
                  <p className="font-medium">
                    {user.user_metadata?.data_processing_consent ? 'Provided' : 'Not provided'}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex space-x-4">
                <button className="text-sm font-medium text-blue-600 hover:text-blue-500">
                  Update profile
                </button>
                <button className="text-sm font-medium text-red-600 hover:text-red-500">
                  Privacy settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
