import { useState } from "react";
import { type Route, type Location, type RouteCapacity, type Capacity } from "@prisma/client";

interface RouteWithDetails extends Route {
  aEnd: Location;
  bEnd: Location;
  capacities: RouteCapacity[];
}

interface RouteResultsProps {
  routes: RouteWithDetails[];
  onSelectRoute: (route: RouteWithDetails, capacity: RouteCapacity) => void;
}

const capacityLabels: Record<Capacity, string> = {
  TEN_G: "10G",
  HUNDRED_G: "100G",
  FOUR_HUNDRED_G: "400G",
};

export function RouteResults({ routes, onSelectRoute }: RouteResultsProps) {
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  if (routes.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="text-center">
          <div className="text-gray-400 text-lg mb-2">📍</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Routes Found</h3>
          <p className="text-gray-500">
            No routes match your current selection criteria. Try adjusting your filters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-medium text-gray-900">Available Routes</h2>
        <p className="text-sm text-gray-500 mt-1">
          {routes.length} route{routes.length !== 1 ? 's' : ''} found
        </p>
      </div>
      
      <div className="divide-y divide-gray-200">
        {routes.map((route) => (
          <div key={route.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{route.name}</h3>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-medium">{route.aEnd.name}</span>
                  <span className="mx-2">→</span>
                  <span className="font-medium">{route.bEnd.name}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {route.aEnd.city}, {route.aEnd.region} → {route.bEnd.city}, {route.bEnd.region}
                </div>
                {route.distance && (
                  <div className="text-xs text-gray-500 mt-1">
                    Distance: {route.distance} km
                  </div>
                )}
              </div>
              <div className="flex space-x-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {route.aEnd.type}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {route.bEnd.type}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {route.capacities.map((capacity) => (
                <div
                  key={capacity.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-gray-900">
                      {capacityLabels[capacity.capacity]}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        ${capacity.pricePerUnit.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">per unit</div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-3">
                    {capacity.availableUnits} units available
                  </div>
                  
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("🔥 Button clicked for route:", route.id, "capacity:", capacity.id);
                      console.log("🔥 Calling onSelectRoute function...");
                      onSelectRoute(route, capacity);
                    }}
                    className="w-full bg-red-800 text-white text-sm font-medium py-2 px-4 rounded-md hover:bg-red-900 transition-colors"
                  >
                    Select This Option
                  </button>
                </div>
              ))}
            </div>

            {route.capacities.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                No capacity available for this route
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}