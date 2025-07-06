// Google Maps type declarations
declare global {
  interface Window {
    google: typeof google;
  }
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options: any);
      fitBounds(bounds: LatLngBounds): void;
      setCenter(latLng: LatLng): void;
      setZoom(zoom: number): void;
    }

    class Marker {
      constructor(options: any);
      addListener(event: string, handler: Function): void;
      setMap(map: Map | null): void;
    }

    class InfoWindow {
      constructor(options: any);
      open(map: Map, marker: Marker): void;
      close(): void;
    }

    class Polyline {
      constructor(options: any);
      setMap(map: Map | null): void;
    }

    class LatLngBounds {
      constructor();
      extend(latLng: LatLng): void;
    }

    interface LatLng {
      lat: number;
      lng: number;
    }

    enum SymbolPath {
      CIRCLE = 0,
      FORWARD_CLOSED_ARROW = 1,
      BACKWARD_CLOSED_ARROW = 2,
    }
  }
}

export {};