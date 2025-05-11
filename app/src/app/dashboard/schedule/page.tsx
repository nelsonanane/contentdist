'use client';

// Schedule management page

export default function SchedulePage() {

  return (
    <div className="py-10">
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-100">Content Schedule</h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="px-4 py-8 sm:px-0">
            <div className="bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6">
              <p className="text-gray-300 mb-4">
                Plan and schedule your content distribution across multiple platforms.
              </p>
              
              <div className="mt-6 border-t border-gray-700 pt-6">
                <h2 className="text-xl font-semibold text-gray-100 mb-4">Upcoming Schedule</h2>
                <p className="text-gray-400 italic">No scheduled content yet. Create your first scheduled post to get started.</p>
                
                <button className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-gray-800">
                  Schedule New Content
                </button>
              </div>
              
              <div className="mt-8 border-t border-gray-700 pt-6">
                <h2 className="text-xl font-semibold text-gray-100 mb-4">Calendar View</h2>
                <div className="bg-gray-700 p-4 rounded-lg h-64 flex items-center justify-center">
                  <p className="text-gray-300">Calendar view will be displayed here</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
