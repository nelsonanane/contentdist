'use client'

import Link from 'next/link'

export default function Verification() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Check your email
          </h2>
          <div className="mt-6 rounded-md bg-blue-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Verification email sent</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    We've sent a verification link to your email address. Please check your inbox and click the link to verify your account.
                  </p>
                  <p className="mt-2">
                    If you don't see the email, check your spam folder. The link will expire in 24 hours.
                  </p>
                </div>
                <div className="mt-4">
                  <Link
                    href="/signin"
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Return to sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
