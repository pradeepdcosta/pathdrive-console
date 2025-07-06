import { useState, useEffect } from "react";
import { api } from "~/utils/api";
import { type Location, type Capacity } from "@prisma/client";

interface RouteFilters {
  aEndRegion: string;
  aEndCity: string;
  aEndId: string;
  bEndRegion: string;
  bEndCity: string;
  bEndId: string;
  capacity: Capacity | "";
}

interface RouteSelectorProps {
  onFiltersChange: (filters: RouteFilters) => void;
  onSearch: () => void;
}

export function RouteSelector({ onFiltersChange, onSearch }: RouteSelectorProps) {
  const [filters, setFilters] = useState<RouteFilters>({
    aEndRegion: "",
    aEndCity: "",
    aEndId: "",
    bEndRegion: "",
    bEndCity: "",
    bEndId: "",
    capacity: "",
  });

  const { data: regions } = api.location.getRegions.useQuery();
  
  const { data: aEndCities } = api.location.getCitiesByRegion.useQuery(
    { region: filters.aEndRegion },
    { enabled: !!filters.aEndRegion }
  );
  
  const { data: bEndCities } = api.location.getCitiesByRegion.useQuery(
    { region: filters.bEndRegion },
    { enabled: !!filters.bEndRegion }
  );
  
  const { data: aEndLocations } = api.location.getLocationsByCity.useQuery(
    { region: filters.aEndRegion, city: filters.aEndCity },
    { enabled: !!filters.aEndRegion && !!filters.aEndCity }
  );
  
  const { data: bEndLocations } = api.location.getLocationsByCity.useQuery(
    { region: filters.bEndRegion, city: filters.bEndCity },
    { enabled: !!filters.bEndRegion && !!filters.bEndCity }
  );

  const updateFilter = (key: keyof RouteFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    
    if (key === "aEndRegion") {
      newFilters.aEndCity = "";
      newFilters.aEndId = "";
    } else if (key === "aEndCity") {
      newFilters.aEndId = "";
    } else if (key === "bEndRegion") {
      newFilters.bEndCity = "";
      newFilters.bEndId = "";
    } else if (key === "bEndCity") {
      newFilters.bEndId = "";
    }
    
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleSearch = () => {
    onSearch();
  };

  const isSearchDisabled = !filters.aEndRegion || !filters.bEndRegion;

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Route Selection</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* A End Selection */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">A End (Origin)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Region
              </label>
              <select
                value={filters.aEndRegion}
                onChange={(e) => updateFilter("aEndRegion", e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Select Region</option>
                {regions?.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <select
                value={filters.aEndCity}
                onChange={(e) => updateFilter("aEndCity", e.target.value)}
                disabled={!filters.aEndRegion}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100"
              >
                <option value="">Select City</option>
                {aEndCities?.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                value={filters.aEndId}
                onChange={(e) => updateFilter("aEndId", e.target.value)}
                disabled={!filters.aEndCity}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100"
              >
                <option value="">Select Location</option>
                {aEndLocations?.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* B End Selection */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-4">B End (Destination)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Region
              </label>
              <select
                value={filters.bEndRegion}
                onChange={(e) => updateFilter("bEndRegion", e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Select Region</option>
                {regions?.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <select
                value={filters.bEndCity}
                onChange={(e) => updateFilter("bEndCity", e.target.value)}
                disabled={!filters.bEndRegion}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100"
              >
                <option value="">Select City</option>
                {bEndCities?.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <select
                value={filters.bEndId}
                onChange={(e) => updateFilter("bEndId", e.target.value)}
                disabled={!filters.bEndCity}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 disabled:bg-gray-100"
              >
                <option value="">Select Location</option>
                {bEndLocations?.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.type})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity Selection */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Capacity Requirement (Optional)
        </label>
        <select
          value={filters.capacity}
          onChange={(e) => updateFilter("capacity", e.target.value)}
          className="block w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">Any Capacity</option>
          <option value="TEN_G">10G</option>
          <option value="HUNDRED_G">100G</option>
          <option value="FOUR_HUNDRED_G">400G</option>
        </select>
      </div>

      {/* Search Button */}
      <div className="mt-6">
        <button
          onClick={handleSearch}
          disabled={isSearchDisabled}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-800 hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Search Routes
        </button>
      </div>
    </div>
  );
}