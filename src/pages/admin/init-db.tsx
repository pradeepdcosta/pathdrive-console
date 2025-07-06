import { useState } from "react";
import { Layout } from "~/components/Layout";
import { api } from "~/utils/api";

export default function InitializeDatabase() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const initMutation = api.admin.initializeDatabase.useMutation({
    onSuccess: (data) => {
      setMessage(data.message);
      setError("");
      setLoading(false);
    },
    onError: (error) => {
      setError(error.message);
      setMessage("");
      setLoading(false);
    },
  });

  const handleInitialize = () => {
    setLoading(true);
    setMessage("");
    setError("");
    initMutation.mutate();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Initialize Database
              </h1>
              <p className="text-gray-600">
                Set up the database with admin users and sample data for production deployment
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">What this will create:</h3>
                <ul className="text-blue-800 text-sm space-y-1">
                  <li>• Admin user: admin@pathdrive.com (password: admin123)</li>
                  <li>• Sample user: user@example.com (password: user123)</li>
                  <li>• Basic user roles and permissions</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-900 mb-2">⚠️ Important:</h3>
                <p className="text-yellow-800 text-sm">
                  This should only be run once when first deploying to production. 
                  Running this multiple times is safe - it will skip if data already exists.
                </p>
              </div>

              {message && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-700 font-medium">{message}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 font-medium">Error: {error}</p>
                </div>
              )}

              <button
                onClick={handleInitialize}
                disabled={loading}
                className="w-full bg-red-800 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Initializing Database..." : "Initialize Database"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}