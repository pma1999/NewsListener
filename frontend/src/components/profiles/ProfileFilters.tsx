import React, { useState, useEffect, useMemo } from 'react';
import type { PredefinedCategory } from '@/types/api';
import { Input } from '@/components/common/Input';
import { Select } from '@/components/common/Select';
import { Search, Filter } from 'lucide-react';

interface ProfileFiltersProps {
  allProfiles: PredefinedCategory[];
  onFilterChange: (filteredProfiles: PredefinedCategory[]) => void;
}

const ProfileFilters: React.FC<ProfileFiltersProps> = ({ allProfiles, onFilterChange }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');

  const uniqueThemes = useMemo(() => {
    const themes = new Set<string>();
    allProfiles.forEach(profile => {
      if (profile.theme) themes.add(profile.theme);
    });
    return Array.from(themes).sort().map(theme => ({ value: theme, label: theme }));
  }, [allProfiles]);

  const uniqueRegions = useMemo(() => {
    const regions = new Set<string>();
    allProfiles.forEach(profile => {
      if (profile.region) regions.add(profile.region);
    });
    return Array.from(regions).sort().map(region => ({ value: region, label: region }));
  }, [allProfiles]);

  useEffect(() => {
    let filtered = allProfiles;

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(profile => 
        profile.name.toLowerCase().includes(lowerSearchTerm) ||
        (profile.description && profile.description.toLowerCase().includes(lowerSearchTerm)) ||
        (profile.theme && profile.theme.toLowerCase().includes(lowerSearchTerm)) ||
        (profile.region && profile.region.toLowerCase().includes(lowerSearchTerm)) ||
        (profile.topics && profile.topics.some(topic => topic.toLowerCase().includes(lowerSearchTerm))) ||
        (profile.keywords && profile.keywords.some(keyword => keyword.toLowerCase().includes(lowerSearchTerm)))
      );
    }

    if (selectedTheme) {
      filtered = filtered.filter(profile => profile.theme === selectedTheme);
    }

    if (selectedRegion) {
      filtered = filtered.filter(profile => profile.region === selectedRegion);
    }

    onFilterChange(filtered);
  }, [searchTerm, selectedTheme, selectedRegion, allProfiles, onFilterChange]);

  return (
    <div className="p-4 mb-6 bg-gray-850 rounded-xl shadow-lg border border-gray-700">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="md:col-span-1">
          <label htmlFor="searchProfiles" className="block text-sm font-medium text-purple-300 mb-1">Search Profiles</label>
          <div className="relative">
            <Input 
              id="searchProfiles"
              type="text"
              placeholder="Search by name, topic, keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>

        <div>
            <Select
                label="Filter by Theme"
                name="themeFilter"
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                options={[{ value: '', label: 'All Themes' }, ...uniqueThemes]}
                className="w-full"
            />
        </div>
        <div>
            <Select
                label="Filter by Region"
                name="regionFilter"
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                options={[{ value: '', label: 'All Regions' }, ...uniqueRegions]}
                className="w-full"
            />
        </div>
      </div>
    </div>
  );
};

export default ProfileFilters; 