import { useState } from 'react';
import axios from 'axios';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';  // Lägg till denna import
import './App.css';

const App = () => {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url) return;
    
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const cleanedUrl = url.trim();
      const response = await axios.post('http://localhost:3000/scrape', { 
        url: cleanedUrl
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to analyze website');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <h1 className="title">Website Content Analyzer</h1>
      
      <form onSubmit={handleSubmit} className="form">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Enter website URL (e.g., https://example.com)"
          className="url-input"
          pattern="https?://.+"
          title="Must include http:// or https://"
          required
        />
        <button 
          type="submit" 
          className="analyze-button"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Analyzing...
            </>
          ) : 'Analyze'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="results">
          {/* Existing result sections remain the same */}
          {/* ... */}

          <details className="json-viewer">
            <summary>View Raw Data</summary>
            <JsonView 
              data={result}  // ändrat från src till data
              style={{ backgroundColor: '#fff', padding: '1rem' }}  // monokai-liknande bakgrund
            />
          </details>
        </div>
      )}
    </div>
  );
};

export default App;