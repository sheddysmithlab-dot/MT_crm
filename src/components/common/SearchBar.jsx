import { useState } from 'react';
import { Search, X } from 'lucide-react';
import Button from '@/components/ui/Button';

const SearchBar = ({ onSearch, onReset, searchFields = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = () => {
    onSearch(searchTerm);
  };

  const handleReset = () => {
    setSearchTerm('');
    onReset();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mb-4">
      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Search by ${searchFields.join(', ') || 'name, phone, etc.'}`}
            className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-red focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <Button onClick={handleSearch} size="sm">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
        <Button onClick={handleReset} variant="secondary" size="sm">
          <X className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
};

export default SearchBar;
