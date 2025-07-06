import { useState } from "react";
import { Layout } from "~/components/Layout";
import { api } from "~/utils/api";

export default function FixSchema() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fixMutation = api.admin.fixSchema.useMutation({
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

  const handleFix = () => {
    setLoading(true);
    setMessage("");
    setError("");
    fixMutation.mutate();
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Fix Database Schema
              </h1>
              <p className="text-gray-600">
                Add missing PostgreSQL enum types required for user registration
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-900 mb-2">What this will fix:</h3>
                <ul className="text-yellow-800 text-sm space-y-1">
                  <li>• Add UserRole enum type (USER, ADMIN)</li>
                  <li>• Add EndpointType enum type (POP, DC, CLS)</li>
                  <li>• Add Capacity enum type (TEN_G, HUNDRED_G, FOUR_HUNDRED_G)</li>
                  <li>• Add OrderStatus and PaymentStatus enum types</li>
                  <li>• Update User table to use proper enum types</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">When to use this:</h3>
                <p className="text-blue-800 text-sm">
                  Run this if you get "type does not exist" errors during user registration.
                  This is safe to run multiple times.
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
                onClick={handleFix}
                disabled={loading}
                className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Fixing Schema..." : "Fix Database Schema"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}