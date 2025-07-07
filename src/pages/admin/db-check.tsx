import { Layout } from "~/components/Layout";
import { api } from "~/utils/api";

export default function DatabaseCheck() {
  const { data: dbStatus, isLoading } = api.admin.checkDatabase.useQuery();

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Database Status Check
              </h1>
              <p className="text-gray-600">
                Check which database tables exist in production
              </p>
            </div>

            {isLoading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Checking database...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dbStatus && Object.entries(dbStatus).map(([table, status]: [string, any]) => (
                  <div 
                    key={table}
                    className={`p-4 rounded-lg border ${
                      status.exists 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium text-gray-900">{table} Table</h3>
                      <span className={`px-2 py-1 rounded text-sm ${
                        status.exists 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {status.exists ? 'EXISTS' : 'MISSING'}
                      </span>
                    </div>
                    {status.exists ? (
                      <p className="text-sm text-green-700 mt-1">
                        Records: {JSON.stringify(status.count)}
                      </p>
                    ) : (
                      <p className="text-sm text-red-700 mt-1">
                        Error: {status.error}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}