'use client';

// Content management page

export default function ContentPage() {

  return (
    <div className="py-10">
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">Content Management</h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="px-4 py-8 sm:px-0">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
              <p className="text-gray-700 mb-4">
                This is where you&apos;ll manage your content for distribution across platforms.
              </p>
              
              <div className="mt-6 border-t border-gray-200 pt-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Content</h2>
                <p className="text-gray-500 italic">No content items yet. Create your first content piece to get started.</p>
                
                <button className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  Create New Content
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
