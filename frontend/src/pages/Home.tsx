import { useState, useEffect } from 'react';
import '../styles/Home.scss';
import { useDemonList } from '../hooks/useAREDL';
import type { Demon } from '../hooks/useAREDL';
import DemonCard from '../components/DemonCard';

export default function Home() {
  const { demons, loading, error, fetchAllDemons, searchDemons } = useDemonList();
  const [search, setSearch] = useState('');
  const [filteredDemons, setFilteredDemons] = useState<Demon[]>([]);

  useEffect(() => {
    fetchAllDemons();
  }, []);

  useEffect(() => {
    setFilteredDemons(demons);
  }, [demons]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearch(query);
    if (query.length > 2) {
      searchDemons(query);
    } else if (query.length === 0) {
      setFilteredDemons(demons);
    }
  };

  return (
    <div className="home">
      <div className="search-section">
        <h1>AREDL Demon Browser</h1>
        <input
          type="text"
          placeholder="Search demons..."
          value={search}
          onChange={handleSearch}
          className="search-input"
        />
      </div>

      {error && <div className="error">{error}</div>}
      {loading && <div className="loading">Loading demons...</div>}

      <div className="demons-grid">
        {filteredDemons.map(demon => (
          <DemonCard key={demon.id} demon={demon} />
        ))}
      </div>
    </div>
  );
}
