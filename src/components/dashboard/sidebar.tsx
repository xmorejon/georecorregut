'use client';

import Papa, { ParseResult } from 'papaparse';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger, } from '@/components/ui/tabs';
import { Download, Globe, Heart, Loader, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useAppContext } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { geocodeCityCountry } from '@/ai/flows/places-flow';
import { Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar';
import { Settings } from 'lucide-react';
import { Location } from '@/lib/types';
import { PlaceSearchResults } from './place-search-results'; // Ensure this import is correct
import { ChangeEvent, useMemo, useState } from 'react';

export default function DashboardSidebar() {
  const {
    t,
    searchTerm,
    setSearchTerm,
    filteredLocations,
    locations,
    setSelectedLocation,
    addLocation,
    deleteLocation,
    toggleFavoriteStatus,
    setActiveTab,
    handleImportJSON,
  } = useAppContext();
  const { toast } = useToast();

  const uniqueContinents = useMemo(() => {
    const continents = locations.map(l => l.continent).filter(c => c && c !== 'Unknown');
    return [...new Set(continents)];
  }, [locations]);

  const uniqueCountries = useMemo(() => {
    const countries = locations.map(l => l.country).filter(c => c && c !== 'Unknown');
    return [...new Set(countries)];
  }, [locations]);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent the click from selecting the location
    deleteLocation(id);
  }

  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent the click from selecting the location
    const locationToToggle = filteredLocations.find(location => location.id === id);
    if (locationToToggle) { // Pass the location ID and the new favorite status
 toggleFavoriteStatus(id, !locationToToggle.isFavorite);
    }

  }
  
  const handleImportJSONFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImportJSON(file);
    }
  };

  // Handles the CSV file import
  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    Papa.parse(file, {
      header: true, // Assuming the first row is headers (Country, City)
      skipEmptyLines: true,
      delimiter: ';', // Add this line to specify semicolon as delimiter
      complete: async (results: ParseResult<{ [key: string]: string }>) => {
        // Inside the complete callback
        const importedLocations: string[] = [];
        const failedLocations: string[] = [];
        let rowNumber = 1; // To track the row number in the CSV

        // Process each row from the CSV data
        for (const row of results.data as { [key: string]: string }[]) {
          rowNumber++; // Increment row number for each data row
          const { Country, City } = row;
          const country = Country?.trim() || '';
          const city = City?.trim() || '';

          let isFavorite = false;
          const favoriteValue = row.Favorite?.trim();
          if (favoriteValue) {
            isFavorite = ['TRUE', 'True', 'Yes', 'yes', '1'].includes(favoriteValue);
          }

          // Check if both city and country are provided
          if (country && city) {
            try {
              // Call the geocodeCityCountry function from the AI flow
              
              const geocodeResult = await geocodeCityCountry(city, country);

              if (geocodeResult) {
                // Construct the Location object
                const newLocation: Location = {
                  id: geocodeResult.id || Date.now().toString(), // Use the ID returned by geocoding or generate one
                  name: geocodeResult.name,
                  country: geocodeResult.country,
                  continent: geocodeResult.continent || 'Unknown', // Default to Unknown if continent is not provided
                  lat: geocodeResult.lat,
                  lng: geocodeResult.lng,
                  date: new Date().toISOString(), // Set date to current date to match Location type
                  isFavorite: isFavorite,
                }; 

                // Check for duplicates based on name and country (case-insensitive) before adding
                const isDuplicate = locations.some(
                  location => location.name.toLowerCase() === newLocation.name.toLowerCase() && location.country.toLowerCase() === newLocation.country.toLowerCase()
                );

                if (isDuplicate) {
                  failedLocations.push(`Row ${rowNumber}: ${city}, ${country} - Duplicate location, skipped`);
                } else {
                  // Add the location to Firebase
                  await addLocation(newLocation);
                  importedLocations.push(`${geocodeResult.name}, ${geocodeResult.country}`);
                }
              } else {
                // Location not found
                failedLocations.push(`Row ${rowNumber}: ${city}, ${country} - Location not found`);
              }
            } catch (error) {
              // Handle any errors during geocoding or adding to Firebase
              failedLocations.push(`Row ${rowNumber}: ${city}, ${country} - Error processing row: ${error}`);
            }
          }
        }
        // Log results to console
        console.log('CSV Import Results:');
        if (importedLocations.length > 0) {
          console.log('Successfully Imported:', importedLocations);
          toast({ title: `${importedLocations.length} locations imported successfully!` });
        }
        if (failedLocations.length > 0) {
          console.error('Failed to Import:', failedLocations);
          toast({
            variant: 'destructive',
            title: `${failedLocations.length} locations failed to import.`,
            description: 'Check console for details.',
          });
        }
      },
      error: (err: Error) => { // This error callback should be a separate property
        toast({ variant: 'destructive', title: 'Error parsing CSV', description: err.message });
      }
    });;
  };;
  
  const handleExport = () => {
    const dataStr = JSON.stringify(locations, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'georecorregut_data.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    toast({ title: t('dataExported') });
  }


  return (
    <Sidebar className="hidden md:block w-80 border-r bg-background" side="left" collapsible="icon">
      <SidebarContent>
        <Tabs defaultValue="search" className="flex flex-col h-full" onValueChange={setActiveTab}>
          <SidebarHeader>
            <TabsList className="grid w-full grid-cols-3">
              {/* Restored the Settings tab */}
              <TabsTrigger value="search"><Search className="h-4 w-4 mr-1 inline-block" /> {t('search')}</TabsTrigger>
              <TabsTrigger value="stats"><Globe className="h-4 w-4 mr-1 inline-block" /> {t('stats')}</TabsTrigger>
              <TabsTrigger value="data"><Download className="h-4 w-4 mr-1 inline-block" /> {t('data')}</TabsTrigger>
            </TabsList>
          </SidebarHeader>

          <TabsContent value="search" className="flex-1 overflow-hidden">
            <div className="flex flex-col h-full p-4 pt-0">
              <div className="relative mb-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={t('searchPlaceholder')}
                  className="pl-8"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  <PlaceSearchResults />

                  <h2 className="text-lg font-semibold mt-4 pt-4 border-t">{t('myLocations')}</h2>
                  {filteredLocations.length > 0 ? (
                    filteredLocations
                      .sort((a, b) => {
                        if (a.country < b.country) return -1;
                        if (a.country > b.country) return 1;
                        return a.name.localeCompare(b.name);
                      }).map(location => (
                        <div
                          key={location.id}
                          onClick={() => setSelectedLocation(location)}
                          className="cursor-pointer rounded-lg border p-2 hover:bg-accent transition-colors flex justify-between items-center group"
                        >
                          <div>
                            <p className="font-semibold">{location.name}</p>
                            <p className="text-sm text-muted-foreground">{location.country}</p>
                          </div>

                          <div className="flex items-center">
                            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 opacity-50 group-hover:opacity-100" onClick={(e) => handleToggleFavorite(e, location.id)}>
                              <Heart className={`h-4 w-4 ${location.isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-500'}`} />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 opacity-50 group-hover:opacity-100" onClick={(e) => handleDelete(e, location.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>

                          </div>

                        </div>
                      ))
                  ) : (
                    searchTerm.length === 0 && <p className="text-center text-muted-foreground">{t('noLocations')}</p>
                  )}
                  {filteredLocations.length === 0 && searchTerm.length > 0 && <p className="text-center text-muted-foreground">{t('noResults')}</p>}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('locationsVisited')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{locations.length}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('continentsVisited')}</CardTitle>
                    <CardDescription>
                      {((uniqueContinents.length / 7) * 100).toFixed(0)}% of the world
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold mb-2">{uniqueContinents.length} / 7</p>
                    <Progress value={(uniqueContinents.length / 7) * 100} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>{t('countriesVisited')}</CardTitle>
                    <CardDescription>
                      {((uniqueCountries.length / 195) * 100).toFixed(1)}% of the world
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold mb-2">{uniqueCountries.length} / 195</p>
                    <Progress value={(uniqueCountries.length / 195) * 100} />
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="data" className="flex-1 overflow-hidden">
            <div className="h-full p-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{t('importData')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <CardDescription>{t('csvFormatInfo')}</CardDescription>
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    id="csv-import-input"
                    onChange={handleImportCSV} />
                  <Button variant="outline" className="w-full" onClick={() => document.getElementById('csv-import-input')?.click()}><Upload className="mr-2 h-4 w-4" />{t('importCSV')}</Button>
                </CardContent>
                <CardContent className="space-y-2">
                  <CardDescription>{t('jsonFormatInfo')}</CardDescription>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    id="json-import-input"
                    onChange={handleImportJSONFile} />
                  <Button variant="outline" className="w-full" onClick={() => document.getElementById('json-import-input')?.click()}><Upload className="mr-2 h-4 w-4" />{t('importJSON')}</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{t('exportData')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full" onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" /> {t('exportAsJSON')}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </SidebarContent>
    </Sidebar>
  );
}