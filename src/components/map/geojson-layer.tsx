import React, { useEffect, useRef } from 'react'; // Import useRef
import { useMap } from '@vis.gl/react-google-maps';

interface GeoJsonLayerProps {
  data: any | null;
  options?: google.maps.Data.StyleOptions | ((feature: google.maps.Data.Feature) => google.maps.Data.StyleOptions);
  showLayer: boolean;
}

const GeoJsonLayer: React.FC<GeoJsonLayerProps> = ({ data, options, showLayer }) => {
  const map = useMap();
  // Use useRef to persist the data layer instance across renders
  const dataLayerRef = useRef<google.maps.Data | null>(null);

  useEffect(() => {
    if (!map) return;

    // Create the data layer instance only once when the map is available
    if (!dataLayerRef.current) {
      console.log("Creating new google.maps.Data layer."); // Log creation
      dataLayerRef.current = new google.maps.Data();
      dataLayerRef.current.setMap(map);
    }

    const dataLayer = dataLayerRef.current;

    // Cleanup function to remove the layer when the component unmounts
    return () => {
      if (dataLayer) {
        console.log("Cleaning up google.maps.Data layer."); // Log cleanup
        dataLayer.setMap(null);
        dataLayerRef.current = null; // Clear the ref
      }
    };
  }, [map]); // Depend only on the map instance

  useEffect(() => {

    console.log("GeoJsonLayer data dependency changed:", data);

    if (!dataLayerRef.current || !data){
      console.warn("Skipping data update: dataLayerRef.current or data is null.");
      return;
    }

    const dataLayer = dataLayerRef.current;

    // Clear existing features from the data layer
    dataLayer.forEach((feature) => {
      console.error("Clearing current feature:", feature.getProperty.name);
      dataLayer.remove(feature);
    });

    if (showLayer && data) { // Only add data if showLayer is true and data exists
      // Add the new GeoJSON data to the existing layer
      try {
          dataLayer.addGeoJson(data);
          console.log("Successfully added new GeoJSON data.");

          // Log the number of features in the data layer after adding
          let featureCount = 0;
          dataLayer.forEach(() => {
            featureCount++;
          });
          console.log("Features in data layer after adding:", featureCount);

      } catch (error) {
          console.error("Error adding GeoJSON data:", error);
          // Handle the error, maybe log or display a message
      }
    } else {
      console.log("showLayer is false or data is null, not adding GeoJSON data.");
      // If showLayer is false, the layer is already cleared above.
  }

  }, [data, showLayer]); // Depend on the data

  useEffect(() => {
    if (!dataLayerRef.current) return;

    const dataLayer = dataLayerRef.current;

    // Set or update the style on the existing layer
    if (options) {
      dataLayer.setStyle(options);
    } else {
        // Optionally set a default style or clear the style if options become null
        dataLayer.setStyle({}); // Clear style
    }

  }, [options]); // Depend on the options

  return null; // This component doesn't render any visual elements directly
};

export default GeoJsonLayer;
