import { useState, useEffect } from "react";
import { AdminLayout } from "~/components/admin/AdminLayout";
import { api } from "~/utils/api";
import { type Capacity } from "@prisma/client";

const capacityLabels: Record<Capacity, string> = {
  TEN_G: "10G",
  HUNDRED_G: "100G",
  FOUR_HUNDRED_G: "400G",
};

type FormData = Record<string, number>;

export default function AdminPricing() {
  const [selectedRouteId, setSelectedRouteId] = useState<string>("");
  const [formData, setFormData] = useState<FormData>({});

  const { data: routes } = api.route.getAdminRoutes.useQuery();
  const { data: capacities, refetch: refetchCapacities } = api.capacity.getByRoute.useQuery(
    { routeId: selectedRouteId },
    { enabled: !!selectedRouteId }
  );

  const updatePricing = api.capacity.updatePricing.useMutation({
    onSuccess: () => {
      console.log("Pricing updated successfully");
      refetchCapacities();
      alert("Pricing updated successfully!");
    },
    onError: (error) => {
      console.error("Error updating pricing:", error);
      alert("Error updating pricing: " + error.message);
    },
  });

  // Update form data when capacities change
  useEffect(() => {
    if (capacities) {
      const newFormData: FormData = {};
      for (const capacity of ["TEN_G", "HUNDRED_G", "FOUR_HUNDRED_G"] as Capacity[]) {
        const existing = capacities.find(c => c.capacity === capacity);
        newFormData[`${capacity}_price`] = existing?.pricePerUnit || 0;
        newFormData[`${capacity}_units`] = existing?.availableUnits || 0;
      }
      setFormData(newFormData);
    }
  }, [capacities]);

  // Reset form data when route selection changes
  useEffect(() => {
    if (selectedRouteId) {
      setFormData({});
    }
  }, [selectedRouteId]);

  const selectedRoute = routes?.find(r => r.id === selectedRouteId);

  const handleUpdatePricing = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRouteId) {
      console.log("No route selected");
      return;
    }

    const capacityData = [];

    for (const capacity of ["TEN_G", "HUNDRED_G", "FOUR_HUNDRED_G"] as Capacity[]) {
      const pricePerUnit = formData[`${capacity}_price`] || getCapacityValue(capacity, "pricePerUnit");
      const availableUnits = formData[`${capacity}_units`] || getCapacityValue(capacity, "availableUnits");

      console.log(`${capacity}: price=${pricePerUnit}, units=${availableUnits}`);

      if (pricePerUnit > 0 && availableUnits >= 0) {
        capacityData.push({
          capacity,
          pricePerUnit,
          availableUnits,
        });
      }
    }

    console.log("Capacity data to submit:", capacityData);

    if (capacityData.length > 0) {
      updatePricing.mutate({
        routeId: selectedRouteId,
        capacities: capacityData,
      });
    } else {
      console.log("No valid capacity data to submit");
    }
  };

  const handleInputChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const getCapacityValue = (capacity: Capacity, field: "pricePerUnit" | "availableUnits") => {
    const existing = capacities?.find(c => c.capacity === capacity);
    return existing?.[field] || 0;
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-xl font-semibold text-gray-900">Pricing & Capacity Management</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage pricing and available capacity for each route.
            </p>
          </div>
        </div>

        {/* Route Selection */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Select Route
            </h3>
            <div className="max-w-sm">
              <select
                id="route-select"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                value={selectedRouteId}
                onChange={(e) => setSelectedRouteId(e.target.value)}
              >
                <option value="">Select a route...</option>
                {routes?.map((route) => (
                  <option key={route.id} value={route.id}>
                    {route.name} ({route.aEnd.city} → {route.bEnd.city})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {selectedRouteId && capacities && capacities.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm">
            <div className="p-6 border-b border-gray-200/50">
              <h3 className="text-xl font-bold text-gray-900 flex items-center">
                <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Current Pricing Overview
              </h3>
              <p className="text-gray-600 mt-1">Active pricing configuration for this route</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {capacities.map((capacity) => (
                  <div key={capacity.id} className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200/50 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-lg font-bold text-gray-900">
                        {capacityLabels[capacity.capacity]}
                      </h4>
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Price per Unit</span>
                        <span className="text-lg font-bold text-indigo-600">${capacity.pricePerUnit.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Available Units</span>
                        <span className="text-lg font-bold text-gray-900">{capacity.availableUnits}</span>
                      </div>
                      <div className="border-t border-indigo-200 pt-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-gray-700">Total Value</span>
                          <span className="text-xl font-bold text-green-600">${(capacity.pricePerUnit * capacity.availableUnits).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 text-center pt-2 border-t border-indigo-200">
                        Updated: {new Date(capacity.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Pricing Update Form */}
        {selectedRouteId && (
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                Update Pricing & Capacity
              </h3>
              <form onSubmit={handleUpdatePricing} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  {(["FOUR_HUNDRED_G", "HUNDRED_G", "TEN_G"] as const).map((capacity) => (
                    <div key={capacity} className="bg-gray-50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">
                        {capacityLabels[capacity]}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Price per Unit ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData[`${capacity}_price`] !== undefined ? formData[`${capacity}_price`] : getCapacityValue(capacity, "pricePerUnit")}
                            onChange={(e) => handleInputChange(`${capacity}_price`, e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Available Units
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={formData[`${capacity}_units`] !== undefined ? formData[`${capacity}_units`] : getCapacityValue(capacity, "availableUnits")}
                            onChange={(e) => handleInputChange(`${capacity}_units`, e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={updatePricing.isPending}
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updatePricing.isPending ? "Updating..." : "Update Pricing"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
