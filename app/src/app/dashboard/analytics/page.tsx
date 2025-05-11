'use client';

// Dashboard analytics page

export default function AnalyticsPage() {

  return (
    <div className="py-10">
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-100">Analytics Dashboard</h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="px-4 py-8 sm:px-0">
            <div className="bg-gray-800 shadow overflow-hidden sm:rounded-lg p-6">
              <p className="text-gray-300 mb-4">
                Track the performance of your content across all platforms.
              </p>
              
              <div className="mt-6 border-t border-gray-700 pt-6">
                <h2 className="text-xl font-semibold text-gray-100 mb-4">Performance Overview</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="bg-blue-900/20 p-4 rounded-lg">
                    <h3 className="font-medium text-blue-300 mb-2">Total Reach</h3>
                    <p className="text-3xl font-bold text-blue-400">0</p>
                    <p className="text-blue-400 text-sm mt-2">Across all platforms</p>
                  </div>
                  
                  <div className="bg-green-900/20 p-4 rounded-lg">
                    <h3 className="font-medium text-green-300 mb-2">Engagement Rate</h3>
                    <p className="text-3xl font-bold text-green-400">0%</p>
                    <p className="text-green-400 text-sm mt-2">Average across content</p>
                  </div>
                  
                  <div className="bg-purple-900/20 p-4 rounded-lg">
                    <h3 className="font-medium text-purple-300 mb-2">Top Platform</h3>
                    <p className="text-3xl font-bold text-purple-400">-</p>
                    <p className="text-purple-400 text-sm mt-2">No data available</p>
                  </div>
                </div>
                
                <div className="bg-gray-700 p-4 rounded-lg h-64 flex items-center justify-center">
                  <p className="text-gray-300">Performance charts will be displayed here</p>
                </div>
              </div>
              
              <div className="mt-8 border-t border-gray-700 pt-6">
                <h2 className="text-xl font-semibold text-gray-100 mb-4">Content Performance</h2>
                <p className="text-gray-400 italic">No content analytics available yet. Publish content to see performance metrics.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
