'use client';

import { useState } from 'react';
import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Plus, Loader } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Place } from '@/lib/types';

export function PlaceSearchResults() {
  const {
    t,
    placeSearchResults,
    isSearchingPlaces,
    addPlaceAsLocation,
    previewPlace,
    searchTerm,
    locations
  } = useAppContext();
  const { toast } = useToast();
  const [addingId, setAddingId] = useState<string | null>(null);

  const handleAddLocation = (place: Place) => {
    if (locations.some(loc => loc.id === place.id)) {
        toast({
            variant: 'default',
            title: 'Location Already Exists',
            description: `${place.name} is already in your list.`,
        });
        return;
    }
    setAddingId(place.id);
    addPlaceAsLocation(place, () => setAddingId(null));
  };

  if (isSearchingPlaces) {
    return <p className="text-center text-muted-foreground">{t('searching')}</p>;
  }

  if (searchTerm.length > 2 && placeSearchResults.length === 0 && !isSearchingPlaces) {
    return <p className="text-center text-muted-foreground">{t('noResults')}</p>;
  }
  
  if (placeSearchResults.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold">{t('searchResults')}</h2>
      {placeSearchResults.map((place) => (
        <div
          key={place.id}
          className="cursor-pointer rounded-lg border p-3 hover:bg-accent/50 transition-colors flex justify-between items-center"
          onMouseEnter={() => previewPlace(place)}
        >
          <div>
            <p className="font-semibold">{place.name}</p>
            <p className="text-sm text-muted-foreground">{place.address}</p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="shrink-0 h-8 w-8"
            disabled={addingId === place.id}
            onClick={(e) => {
              e.stopPropagation();
              handleAddLocation(place);
            }}
          >
            {addingId === place.id ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
