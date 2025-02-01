import { useState } from 'react';
import axios from 'axios';
import ReactJson from 'react-json-view';
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
      const response = await axios.post('http://localhost:3000/scrape', { 
        url: encodeURIComponent(url)
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
          {/* Main Content Section */}
          <section className="section">
            <h2 className="section-title">{result.title || 'No Title Found'}</h2>
            <p className="description">{result.description || 'No description available'}</p>
          </section>

          {/* Keywords Section */}
          {result.keywords?.length > 0 && (
            <section className="section">
              <h3 className="section-subtitle">Keywords</h3>
              <div className="keywords-container">
                {result.keywords.map((keyword, index) => (
                  <span key={index} className="keyword">
                    {keyword}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Projects Section */}
          {result.projects?.length > 0 && (
            <section className="section">
              <h3 className="section-subtitle">Projects</h3>
              <div className="projects-grid">
                {result.projects.map((project, index) => (
                  <div key={index} className="project-card">
                    <h4 className="project-title">{project.name || 'Untitled Project'}</h4>
                    <p className="project-description">{project.description || 'No description available'}</p>
                    {project.technologies?.length > 0 && (
                      <div className="technologies">
                        {project.technologies.map((tech, techIndex) => (
                          <span key={techIndex} className="tech-tag">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Contact Section */}
          {(result.contact?.email || result.contact?.social_media?.length > 0) && (
            <section className="section">
              <h3 className="section-subtitle">Contact Information</h3>
              <div className="contact-info">
                {result.contact.email && (
                  <a href={`mailto:${result.contact.email}`} className="contact-link">
                    {result.contact.email}
                  </a>
                )}
                {result.contact.social_media?.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link"
                  >
                    {social.platform}
                  </a>
                ))}
              </div>
            </section>
          )}

          {/* Word Frequency Section */}
          {result.word_frequency && (
            <section className="section">
              <h3 className="section-subtitle">Word Frequency Analysis</h3>
              <div className="word-frequency">
                <div className="common-words">
                  <h4>Most Common Words:</h4>
                  <div className="word-cloud">
                    {result.word_frequency.most_common_words.map((word, index) => (
                      <span key={index} className="word-tag">
                        {word}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Raw JSON Viewer */}
          <details className="json-viewer">
            <summary>View Raw Data</summary>
            <ReactJson
              src={result}
              theme="monokai"
              displayDataTypes={false}
              collapsed={true}
              style={{ padding: '1rem' }}
            />
          </details>
        </div>
      )}
    </div>
  );
};

export default App;