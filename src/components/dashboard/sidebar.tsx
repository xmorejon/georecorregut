'use client';

import Papa, { ParseResult } from 'papaparse';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger, } from '@/components/ui/tabs';
import { Download, Globe, Heart, BookmarkCheck, Search, Trash2, Upload, ChevronDown, MapPinPlus, Medal } from 'lucide-react';
import { useAppContext } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';
import { geocodeCityCountry } from '@/ai/flows/places-flow';
import { Sidebar, SidebarContent, SidebarHeader } from '@/components/ui/sidebar';
import { Location } from '@/lib/types';
import { PlaceSearchResults } from './place-search-results';
import { ChangeEvent, useMemo } from 'react';
import { countriesByContinent } from '@/data/countriesData';

import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog'; // Import modal components

interface UserRankingData {
  userId: string;
  userName: string;
  rank: number;
  totalPoints: number;
  continentsVisitedCount: number;
  continentsVisitedPoints: number;
  countriesVisitedCount: number;
  countriesVisitedPoints: number;
  isCurrentUser: boolean;
}

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
    allUsersUniqueLocations,
    user,
  } = useAppContext();

  const [isCountriesModalOpen, setIsCountriesModalOpen] = useState(false); // State for modal visibility
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false); // State for modal visibility
  const [loadingRanking, setLoadingRanking] = useState(false);

  // State to keep track of which continents are expanded
  const [expandedContinents, setExpandedContinents] = useState<{ [key: string]: boolean }>({});
  const { toast } = useToast();

  const uniqueContinents = useMemo(() => {
    const continents = locations.map(l => l.continent).filter(c => c && c !== 'Unknown');
    return [...new Set(continents)];
  }, [locations]);

  const uniqueCountries = useMemo(() => {
    const countries = locations.map(l => l.country).filter(c => c && c !== 'Unknown');
    return [...new Set(countries)];
  }, [locations]);

  // Calculate points for all users
  const userPoints = useMemo(() => {

    if (!allUsersUniqueLocations) return [];

    return Object.entries(allUsersUniqueLocations).map(([userId, data]) => {
      const continentPoints = data.continents.length * 10; // 10 points per continent
      const countryPoints = data.countries.length; // 1 point per country
      const userName = data.userName;
      return {
        userId,
        userName,
        points: continentPoints + countryPoints,
      };
    });
  }, [allUsersUniqueLocations]);
  
  // Calculate and sort ranking data for all users
  const sortedRankingData = useMemo(() => {
    if (!user || userPoints.length === 0) return [];

    // Sort users by points in descending order
    const sortedUsers = [...userPoints].sort((a, b) => b.points - a.points);

    // Enhance the data with rank and other details
    const rankingWithDetails: UserRankingData[] = sortedUsers.map((userPoint, index) => {
      const userData = allUsersUniqueLocations?.[userPoint.userId];

      const continentsVisitedCount = userData?.continents.length || 0;
      const countriesVisitedCount = userData?.countries.length || 0;

      const continentsVisitedPoints = continentsVisitedCount * 10;
      const countriesVisitedPoints = countriesVisitedCount;

      return {
        userId: userPoint.userId,
        userName: userPoint.userName,
        rank: index + 1,
        totalPoints: userPoint.points,
        continentsVisitedCount,
        continentsVisitedPoints,
        countriesVisitedCount,
        countriesVisitedPoints,
        isCurrentUser: userPoint.userId === user.uid,
        };
    });
    return rankingWithDetails;
  }, [user, userPoints, allUsersUniqueLocations]); // Dependencies

  // Sort locations by Continent and then Country
  const sortedLocationsByContinentAndCountry = useMemo(() => {
    if (!locations) return [];
    return [...locations].sort((a, b) => {
      // Handle potential null or undefined continents/countries
      const continentA = a.continent || '';
      const continentB = b.continent || '';
      const countryA = a.country || '';
      const countryB = b.country || '';

      // Sort by continent first
      if (continentA < continentB) return -1;
      if (continentA > continentB) return 1;

      // If continents are the same, sort by country
      if (countryA < countryB) return -1;
      if (countryA > countryB) return 1;

      return 0; // If both continent and country are the same
    });
  }, [locations]);

  // Get the set of visited country names from user's locations
  const visitedCountryNames = useMemo(() => {
    if (!locations) return new Set();
    return new Set(locations.map(location => location.country).filter(country => country));
  }, [locations]);

  // Process static country data, mark visited status, and calculate visited count per continent
  const countriesWithVisitStatusAndVisitedCount = useMemo(() => {
    return countriesByContinent.map(continentData => {
      const countries = continentData.countries.map(country => ({
        name: country,
        visited: visitedCountryNames.has(country),
      }));
      const visitedCount = countries.filter(country => country.visited).length;
      return {
        continent: continentData.continent,
        countries: countries,
        visitedCount: visitedCount,
        totalCount: continentData.countries.length,
      };
    });
  }, [visitedCountryNames]);

  // Calculate total number of countries from static data
  const totalCountries = useMemo(() => {
    return countriesByContinent.reduce((count, continentData) => {
      return count + continentData.countries.length;
    }, 0);
  }, []);

  // Keep groupedVisitedCountries for potential other uses, but modal will use countriesWithVisitStatus
  const groupedVisitedCountries = useMemo(() => {
    if (!sortedLocationsByContinentAndCountry) return {};
    return sortedLocationsByContinentAndCountry.reduce((acc: { [key: string]: string[] }, location) => {
      if (location.country && location.continent) {
        if (!acc[location.continent]) {
          acc[location.continent] = [];
        }
        if (!acc[location.continent].includes(location.country)) {
          acc[location.continent].push(location.country);
        }
      }
      return acc;
    }, {});
  }, [sortedLocationsByContinentAndCountry]);

  // Determine rank and current user's points
  const userRank = useMemo(() => {
    if (!user || userPoints.length === 0) return null;

    // Sort users by points in descending order
    const sortedUsers = [...userPoints].sort((a, b) => b.points - a.points);

    // Find the current user's entry
    const currentUserEntry = sortedUsers.find(entry => entry.userId === user.uid);

    if (!currentUserEntry) return null;

    // Determine rank (1-based index)
    const rank = sortedUsers.findIndex(entry => entry.userId === user.uid) + 1;
    const totalUsers = sortedUsers.length;
    const currentUserPoints = currentUserEntry.points;

    return {
      rank,
      totalUsers,
      currentUserPoints,
    };
  }, [user, userPoints]);
    
  // Function to toggle the expanded state of a continent
  const handleContinentClick = (continent: string) => {
    setExpandedContinents(prevState => ({
      ...prevState,
      [continent]: !prevState[continent],
    }));
  };
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent the click from selecting the location
    deleteLocation(id);
  }

  const handleDetail = () => {
    setIsCountriesModalOpen(true); // Open the countries modal
  }

  const handleRanking = () => {
    setIsRankingModalOpen(true); // Open the ranking modal
  }  

  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent the click from selecting the location
    const locationToToggle = filteredLocations.find(location => location.id === id);
    if (locationToToggle) { // Pass the location ID and the new favorite status
      toggleFavoriteStatus(id, !locationToToggle.isFavorite);
    }

  }
  
  const handleImportJSONFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImportJSON(file);
    }
  }

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
                  await addLocation(newLocation, undefined, undefined, false);
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
    });
  }

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
    <div>
      <Sidebar>
        <SidebarContent>
          <Tabs defaultValue="stats" className="flex flex-col h-full" onValueChange={setActiveTab}>
            <SidebarHeader>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="stats"><Globe className="h-4 w-4 mr-1 inline-block" /> {t('stats')}</TabsTrigger>
                <TabsTrigger value="search"><MapPinPlus className="h-4 w-4 mr-1 inline-block" /> {t('search')}</TabsTrigger>
                <TabsTrigger value="data"><Download className="h-4 w-4 mr-1 inline-block" /> {t('data')}</TabsTrigger>
              </TabsList>
            </SidebarHeader>
            
            <TabsContent value="stats" className="flex-1 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  <Card className="py-0">
                    <CardHeader className="py-1">
                      <CardTitle>{t('locationsVisited')}</CardTitle>
                    </CardHeader>
                    <CardContent className="py-1">
                      <p className="text-3xl font-bold">{locations.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="py-0">
                    <CardHeader className="py-1">
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
                  <Card className="py-0 flex-1">
                    <CardHeader className="py-1">
                      <CardTitle>{t('countriesVisited')}</CardTitle>
                      <CardDescription>
                        {((uniqueCountries.length / totalCountries) * 100).toFixed(1)}% of the world
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold mb-2">{uniqueCountries.length} / {totalCountries}</p>
                      <Progress value={(uniqueCountries.length / totalCountries) * 100} />
                      <div className="small-spacer"></div>
                      <Button variant="outline" className="w-full" onClick={handleDetail}>
                        <BookmarkCheck className="mr-2 h-4 w-4" /> {t('detail')}
                      </Button>
                    </CardContent>
                  </Card>
                  {userRank && (
                    <Card className="py-0">
                      <CardHeader className="py-2">
                        <CardTitle>{t('rankTitle')}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-xl font-bold">
                          {t('rankPrefix')}{userRank.rank} {t('rankSeparator')} {userRank.totalUsers} {t('rankSuffix')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {t('totalPointsPrefix')}
                          {userRank.currentUserPoints}
                          {t('totalPointsSuffix')}
                        </p>
                        <div className="small-spacer"></div>
                        <Button variant="outline" className="w-full" onClick={handleRanking}>
                          <Medal className="mr-2 h-4 w-4" /> {t('detail')}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

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
      <AlertDialog open={isCountriesModalOpen} onOpenChange={setIsCountriesModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('countriesVisited')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription asChild>
            <ScrollArea className="h-60">
              <div>
                {countriesWithVisitStatusAndVisitedCount.length > 0 ? (
                  countriesWithVisitStatusAndVisitedCount.map(continentData => (
                    <div key={continentData.continent}>
                      {/* Clickable Continent Title */}
                      <Button variant="ghost" className="w-full justify-between" onClick={() => handleContinentClick(continentData.continent)}>
                        <h3 className="text-md font-semibold mt-2">{continentData.continent} ({continentData.visitedCount} of {continentData.totalCount})</h3> {/* Display counts */}
                          <ChevronDown className="mr-2 h-4 w-4" />
                      </Button>
                      {/* Conditionally Render Countries List */}
                      {expandedContinents[continentData.continent] && (
                        <ul className="list-disc pl-5 ml-4">
                          {continentData.countries.map(country => (
                          <li key={country.name} className={country.visited ? 'text-green-600' : 'text-red-600'}>{country.name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                ) : (
                  <p>{t('noVisitedCountries')}</p>
                )}
              </div>
            </ScrollArea>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('close')}</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isRankingModalOpen} onOpenChange={setIsRankingModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('rankTitle')}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription asChild>
            <ScrollArea className="h-96"> {/* Increased height for potentially more ranking data */}
              <div className="space-y-4">
                {loadingRanking ? (
                  <p>{t('loadingRanking')}</p>
                ) : sortedRankingData.length > 0 ? (
                  <>
                    {/* Render Ranking Data */}
                    {sortedRankingData.map(userData => (
                      <Card key={userData.userId} className={userData.isCurrentUser ? 'border-blue-500' : ''}> {/* Highlight current user */}
                        <CardHeader className="py-1">
                          <CardTitle>
                            {userData.rank} - {userData.userName} {userData.isCurrentUser ? t('you') : ``}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="py-2">
                          <p>{t('totalPoints')}: {userData.totalPoints}</p>
                          <p>{t('continentsVisited')}: {userData.continentsVisitedCount} ({userData.continentsVisitedPoints} {t('points')})</p>
                          <p>{t('countriesVisited')}: {userData.countriesVisitedCount} ({userData.countriesVisitedPoints} {t('points')})</p>
                        </CardContent>
                      </Card>
                    ))}
                  </>
                ) : (
                  <p>{t('noResults')}</p>
                )}
              </div>
            </ScrollArea>
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('close')}</AlertDialogCancel>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
