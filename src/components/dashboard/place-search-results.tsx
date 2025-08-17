'use client';

import { useAppContext } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Place } from '@/lib/types';

export function PlaceSearchResults() {
  const {
    t,
    placeSearchResults,
    isSearchingPlaces,
    addPlaceAsLocation,
    searchTerm,
  } = useAppContext();
  const { toast } = useToast();

  const handleAddLocation = (place: Place) => {
    addPlaceAsLocation(place);
    toast({
      title: t('locationAdded'),
      description: `${place.name} ${t('hasBeenAdded')}`,
    });
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
        >
          <div>
            <p className="font-semibold">{place.name}</p>
            <p className="text-sm text-muted-foreground">{place.address}</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handleAddLocation(place);
            }}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
