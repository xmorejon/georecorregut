'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Globe, Loader, Plus, Search, Trash2, Upload } from 'lucide-react';
import { useAppContext } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';
import { Sidebar, SidebarContent, SidebarHeader } from '../ui/sidebar';
import { PlaceSearchResults } from './place-search-results';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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
    setActiveTab,
  } = useAppContext();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);

  const uniqueContinents = useMemo(() => {
    const continents = locations.map(l => l.continent).filter(c => c && c !== 'Unknown');
    return [...new Set(continents)];
  }, [locations]);

  const uniqueCountries = useMemo(() => {
    const countries = locations.map(l => l.country).filter(c => c && c !== 'Unknown');
    return [...new Set(countries)];
  }, [locations]);

  const handleRecordLocation = () => {
    if (!navigator.geolocation) {
      toast({ variant: 'destructive', title: t('errorRecording'), description: 'Geolocation is not supported by your browser.' });
      return;
    }

    setIsRecording(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        addLocation({
          name: 'Current Location',
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }, undefined, () => setIsRecording(false));
      },
      () => {
        toast({ variant: 'destructive', title: t('errorRecording'), description: 'Unable to retrieve your location.' });
        setIsRecording(false);
      }
    );
  };
  
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

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteLocation(id);
  }

  return (
    <Sidebar className="hidden md:block w-80 border-r bg-background" side="left" collapsible="icon">
        <SidebarContent>
            <Tabs defaultValue="search" className="flex flex-col h-full" onValueChange={setActiveTab}>
                <SidebarHeader>
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="search"><Search className="h-4 w-4 mr-1 inline-block"/> {t('search')}</TabsTrigger>
                    <TabsTrigger value="stats"><Globe className="h-4 w-4 mr-1 inline-block"/> {t('stats')}</TabsTrigger>
                    <TabsTrigger value="data"><Download className="h-4 w-4 mr-1 inline-block"/> {t('data')}</TabsTrigger>
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
                                  className="cursor-pointer rounded-lg border p-3 hover:bg-accent transition-colors flex justify-between items-center group"
                              >
                                <div>
                                  <p className="font-semibold">{location.name}</p>
                                  <p className="text-sm text-muted-foreground">{location.country}</p>
                                </div>

                                <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 opacity-50 group-hover:opacity-100" onClick={(e) => handleDelete(e, location.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                  
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
                     <Button className="w-full" onClick={handleRecordLocation} disabled={isRecording}>
                        {isRecording ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        {t('recordLocation')}
                    </Button>
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('importData')}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button variant="outline" className="w-full"><Upload className="mr-2 h-4 w-4" />{t('importCSV')}</Button>
                            <Button variant="outline" className="w-full"><Upload className="mr-2 h-4 w-4" />{t('importGoogle')}</Button>
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
