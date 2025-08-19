'use client';

import { useEffect, useState, useMemo } from 'react';
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import GeoJsonLayer from '../map/geojson-layer';
import { useAppContext } from '@/contexts/app-context';

const mapStyles = [
    {
        "featureType": "all",
        "elementType": "geometry",
        "stylers": [
            {
                "color": "#f0f4f7"
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.text.fill",
        "stylers": [
            {
                "gamma": 0.01
            },
            {
                "lightness": 20
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.text.stroke",
        "stylers": [
            {
                "saturation": -31
            },
            {
                "lightness": -33
            },
            {
                "weight": 2
            },
            {
                "gamma": 0.8
            }
        ]
    },
    {
        "featureType": "all",
        "elementType": "labels.icon",
        "stylers": [
            {
                "visibility": "off"
            }
        ]
    },
    {
        "featureType": "landscape",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": 30
            },
            {
                "saturation": 30
            }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [
            {
                "saturation": 20
            }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": 20
            },
            {
                "saturation": -20
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [
            {
                "lightness": 10
            },
            {
                "saturation": -30
            }
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [
            {
                "saturation": 25
            },
            {
                "lightness": 25
            }
        ]
    },
    {
        "featureType": "water",
        "elementType": "all",
        "stylers": [
            {
                "lightness": -20
            }
        ]
    }
];

export default function InteractiveMap() {
  const { locations, selectedLocation, setSelectedLocation, activeTab, setSearchTerm, setLocations } = useAppContext();
  const [countriesGeoJSON, setCountriesGeoJSON] = useState<any>(null);
  const favoritePinColor = {
    background: 'hsl(var(--destructive))',
    borderColor: 'hsl(var(--destructive-foreground))',
    glyphColor: 'hsl(var(--destructive-foreground))',
  };
  const defaultPinColor = { background: 'hsl(var(--primary))', borderColor: 'hsl(var(--primary-foreground))', glyphColor: 'hsl(var(--primary-foreground))' };
  const [showGeoJsonLayer, setShowGeoJsonLayer] = useState(false);

  useEffect(() => {
    fetch('/geo/countries.geojson')
      .then((res) => res.json())
      .then((data) => setCountriesGeoJSON(data));
  }, []);
  const visitedCountries = useMemo(() => {
    if (!countriesGeoJSON || !locations) return null;

    const visitedCountryNames = new Set(locations.map(location => location.country.toLowerCase()));
    console.log('visitedCountryNames:', visitedCountryNames);

    return {
      type: 'FeatureCollection',
      features: countriesGeoJSON.features.filter((feature: any) =>
        {
          return visitedCountryNames.has(feature.properties.name.toLowerCase()); // Assuming the country name property is 'name'
        }
      ),
    };
 }, [countriesGeoJSON, locations]);

  const countryLayerOptions = useMemo(() => {
    return {
      id: 'visited-countries',
      data: visitedCountries,
      strokeColor: '#000',
      strokeOpacity: 0.5,
      strokeWeight: 1,
    fillColor: '#FF7F7F', // Using the primary color for visited countries
    fillOpacity: 0.5,
    };
  }, [visitedCountries]);


  const [mapCenter, setMapCenter] = useState({ lat: 41.3851, lng: 2.1734 });
  const [zoom, setZoom] = useState(3);

  // Calculate pin scale based on zoom level
  const pinScale = useMemo(() => {
    // Adjust these values to control the scaling behavior
    const minScale = 0.7;
    const maxScale = 1.3;
    return minScale + (maxScale - minScale) * ((zoom - 3) / (12 - 3)); // Assuming min zoom 3 and max zoom 12 for scaling
  }, [zoom]);
  useEffect(() => {
    if (selectedLocation) {
      setMapCenter({ lat: selectedLocation.lat, lng: selectedLocation.lng });
      setZoom(12);
    }
  }, [selectedLocation]);

  useEffect(() => {
    setShowGeoJsonLayer(!!countriesGeoJSON && !!visitedCountries);
  }, [countriesGeoJSON, visitedCountries]);

  const sortedLocations = useMemo(() => {
    if (!locations) return [];
    return [...locations].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return 1;
      if (!a.isFavorite && b.isFavorite) return -1;
      return 0;
    });
  }, [locations]);
  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Map
        center={mapCenter}
        zoom={zoom}
        gestureHandling={'greedy'}
        disableDefaultUI={true}
        onCameraChanged={(ev) => {
            setZoom(ev.detail.zoom);
            setMapCenter(ev.detail.center);
        }}
        mapId={'d27278e9260e59e02fcdda7a'}
      >
        {activeTab !== 'statistics' &&
          sortedLocations.map((location) => (
            <AdvancedMarker
              key={location.id}
              position={{ lat: location.lat, lng: location.lng }}
              onClick={() => {
                setSelectedLocation(location);
                setSearchTerm(location.name);
              }}
            >
                <Pin {...(location.isFavorite ? favoritePinColor : defaultPinColor)}
 scale={pinScale}
                />
            </AdvancedMarker>
          ))}
        {showGeoJsonLayer && (
            <GeoJsonLayer data={countryLayerOptions.data} options={countryLayerOptions} />
        )}
      </Map>
    </div>
  );
}
