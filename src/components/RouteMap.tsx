import { useEffect, useRef } from 'react';

// Declare google as any to avoid TypeScript errors during build
declare const google: any;

interface RouteMapProps {
  aEndLocation?: {
    id: string;
    name: string;
    city: string;
    region: string;
    type: string;
    latitude: number;
    longitude: number;
  };
  bEndLocation?: {
    id: string;
    name: string;
    city: string;
    region: string;
    type: string;
    latitude: number;
    longitude: number;
  };
}

export function RouteMap({ aEndLocation, bEndLocation }: RouteMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Comprehensive Google Maps error suppression
    (window as any).gm_authFailure = () => {
      console.warn('Google Maps authentication failed');
    };
    
    // Override console.error to suppress Google Maps errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Google Maps') || message.includes('InvalidKeyMapError') || message.includes('APIKeyInvalidMapError')) {
        return; // Suppress Google Maps errors
      }
      originalConsoleError.apply(console, args);
    };

    // Suppress alert dialogs from Google Maps
    const originalAlert = window.alert;
    window.alert = (message) => {
      if (typeof message === 'string' && (
        message.includes('Google Maps') || 
        message.includes('API key') || 
        message.includes('own this website')
      )) {
        console.warn('Suppressed Google Maps alert:', message);
        return;
      }
      originalAlert(message);
    };

    // Initialize the map
    const initMap = () => {
      if (!mapRef.current) return;

      try {
        const defaultCenter = { lat: 39.8283, lng: -98.5795 }; // Center of US
        
        const map = new google.maps.Map(mapRef.current, {
        zoom: 4,
        center: defaultCenter,
        styles: [
          {
            featureType: "all",
            elementType: "geometry",
            stylers: [{ color: "#f5f5f5" }]
          },
          {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#ffffff" }]
          },
          {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#9ca3af" }]
          },
          {
            featureType: "administrative",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6b7280" }]
          },
          {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6b7280" }]
          },
          {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#c3dafe" }]
          },
          {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#4f46e5" }]
          }
        ]
        });

        mapInstanceRef.current = map;

        // Add markers and route if locations are provided
        if (aEndLocation && bEndLocation) {
          addMarkersAndRoute(map, aEndLocation, bEndLocation);
        } else {
          // Add some sample data center locations for demonstration
          addSampleDataCenters(map);
        }
      } catch (error) {
        console.warn('Failed to initialize Google Maps:', error);
        // Show fallback content
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div class="h-full flex items-center justify-center bg-gray-100">
              <div class="text-center p-8">
                <div class="text-gray-400 mb-4">
                  <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Map Service Error</h3>
                <p class="text-gray-600">Unable to initialize mapping service.</p>
              </div>
            </div>
          `;
        }
      }
    };

    // Load Google Maps API if not already loaded
    if (typeof google === 'undefined') {
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=geometry&callback=initGoogleMap`;
      script.async = true;
      
      // Set up global callback
      (window as any).initGoogleMap = () => {
        delete (window as any).initGoogleMap;
        initMap();
      };
      
      script.onerror = () => {
        console.warn('Failed to load Google Maps API');
        delete (window as any).initGoogleMap;
        // Show fallback content instead of error popup
        if (mapRef.current) {
          mapRef.current.innerHTML = `
            <div class="h-full flex items-center justify-center bg-gray-100">
              <div class="text-center p-8">
                <div class="text-gray-400 mb-4">
                  <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 class="text-lg font-medium text-gray-900 mb-2">Map Unavailable</h3>
                <p class="text-gray-600">Unable to load mapping service at this time.</p>
              </div>
            </div>
          `;
        }
      };
      document.head.appendChild(script);
    } else {
      initMap();
    }

    // Cleanup function to restore original functions
    return () => {
      console.error = originalConsoleError;
      window.alert = originalAlert;
    };
  }, [aEndLocation, bEndLocation]);

  const getLocationTypeLabel = (type: string) => {
    switch (type) {
      case 'POP':
        return 'Point of Presence';
      case 'DC':
        return 'Data Center';
      case 'CLS':
        return 'Cable Landing Station';
      default:
        return type;
    }
  };

  const getMarkerIcon = (locationType: string) => {
    switch (locationType) {
      case 'POP':
        return {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#dc2626', // Red for POP
          fillOpacity: 1,
          strokeColor: '#991b1b',
          strokeWeight: 2,
        };
      case 'DC':
        return {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#059669', // Green for Data Center
          fillOpacity: 1,
          strokeColor: '#047857',
          strokeWeight: 2,
        };
      case 'CLS':
        return {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#7c3aed', // Purple for Cable Landing Station
          fillOpacity: 1,
          strokeColor: '#5b21b6',
          strokeWeight: 2,
        };
      default:
        return {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#6b7280',
          fillOpacity: 1,
          strokeColor: '#4b5563',
          strokeWeight: 2,
        };
    }
  };

  const addMarkersAndRoute = (map: any, aEnd: any, bEnd: any) => {
    // Use actual coordinates from database
    const aEndCoords = { lat: aEnd.latitude, lng: aEnd.longitude };
    const bEndCoords = { lat: bEnd.latitude, lng: bEnd.longitude };

    // Create markers with different icons based on type
    const aMarker = new google.maps.Marker({
      position: aEndCoords,
      map: map,
      title: `${aEnd.name} (${aEnd.type}) - ${aEnd.city}, ${aEnd.region}`,
      icon: getMarkerIcon(aEnd.type)
    });

    const bMarker = new google.maps.Marker({
      position: bEndCoords,
      map: map,
      title: `${bEnd.name} (${bEnd.type}) - ${bEnd.city}, ${bEnd.region}`,
      icon: getMarkerIcon(bEnd.type)
    });

    // Draw line between points
    const routeLine = new google.maps.Polyline({
      path: [aEndCoords, bEndCoords],
      geodesic: true,
      strokeColor: '#dc2626',
      strokeOpacity: 1.0,
      strokeWeight: 3,
    });

    routeLine.setMap(map);

    // Adjust map bounds to show both markers
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(aEndCoords);
    bounds.extend(bEndCoords);
    map.fitBounds(bounds);

    // Add info windows with type information
    const aInfoWindow = new google.maps.InfoWindow({
      content: `<div class="p-2"><strong>${aEnd.name}</strong><br/><span class="text-sm text-gray-600">${getLocationTypeLabel(aEnd.type)}</span><br/>${aEnd.city}, ${aEnd.region}</div>`
    });

    const bInfoWindow = new google.maps.InfoWindow({
      content: `<div class="p-2"><strong>${bEnd.name}</strong><br/><span class="text-sm text-gray-600">${getLocationTypeLabel(bEnd.type)}</span><br/>${bEnd.city}, ${bEnd.region}</div>`
    });

    aMarker.addListener('click', () => {
      aInfoWindow.open(map, aMarker);
    });

    bMarker.addListener('click', () => {
      bInfoWindow.open(map, bMarker);
    });
  };

  const addSampleDataCenters = (map: any) => {
    const sampleLocations = [
      { name: "NYC Data Center", lat: 40.7128, lng: -74.0060, city: "New York", region: "NY", type: "DC" },
      { name: "LA POP", lat: 34.0522, lng: -118.2437, city: "Los Angeles", region: "CA", type: "POP" },
      { name: "Chicago Data Center", lat: 41.8781, lng: -87.6298, city: "Chicago", region: "IL", type: "DC" },
      { name: "Miami CLS", lat: 25.7617, lng: -80.1918, city: "Miami", region: "FL", type: "CLS" },
      { name: "Seattle POP", lat: 47.6062, lng: -122.3321, city: "Seattle", region: "WA", type: "POP" },
      { name: "Virginia Beach CLS", lat: 36.8529, lng: -75.9780, city: "Virginia Beach", region: "VA", type: "CLS" },
    ];

    sampleLocations.forEach(location => {
      const marker = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map: map,
        title: `${location.name} (${getLocationTypeLabel(location.type)})`,
        icon: getMarkerIcon(location.type)
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `<div class="p-2"><strong>${location.name}</strong><br/><span class="text-sm text-gray-600">${getLocationTypeLabel(location.type)}</span><br/>${location.city}, ${location.region}</div>`
      });

      marker.addListener('click', () => {
        infoWindow.open(map, marker);
      });
    });
  };


  return (
    <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200/50">
        <h3 className="text-xl font-bold text-gray-900 flex items-center">
          <svg className="w-6 h-6 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
          Network Route Visualization
        </h3>
        <p className="text-gray-600 mt-1">
          {aEndLocation && bEndLocation 
            ? `Route from ${aEndLocation.city}, ${aEndLocation.region} to ${bEndLocation.city}, ${bEndLocation.region}`
            : "Explore our network of data centers and ethernet routes across the region"
          }
        </p>
      </div>
      <div 
        ref={mapRef} 
        className="w-full h-96"
        style={{ minHeight: '400px' }}
      />
      <div className="p-4 bg-gray-50 text-sm text-gray-600">
        <div className="flex items-center space-x-6 flex-wrap">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
            <span>POP (Point of Presence)</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
            <span>Data Center</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-600 rounded-full mr-2"></div>
            <span>CLS (Cable Landing Station)</span>
          </div>
          {aEndLocation && bEndLocation && (
            <div className="flex items-center">
              <div className="w-6 h-0.5 bg-red-600 mr-2"></div>
              <span>Network Route</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}