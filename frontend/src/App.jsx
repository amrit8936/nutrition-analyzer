import { useEffect, useState } from 'react';



const sampleMeals = [
  { label: '🥗 Mixed Salad', query: 'mixed garden salad with olive oil dressing' },
  { label: '🍗 Chicken Dinner', query: 'grilled chicken breast with broccoli and rice' },
  { label: '🍕 Pizza Slice', query: 'slice of pepperoni pizza' },
  { label: '🍔 Cheeseburger', query: 'double cheeseburger with fries' },
  { label: '🥑 Salmon Toast', query: 'avocado toast with smoked salmon' },
];

function App() {
  const [meal, setMeal] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState('Ready');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'light';
  });
  const [isDragging, setIsDragging] = useState(false);

  // Advanced daily dashboard tracking states
  const [geminiActive, setGeminiActive] = useState(false);
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('mealHistory');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Load API Key Configuration Status
  useEffect(() => {
    fetch('/api/status')
      .then(res => res.json())
      .then(data => setGeminiActive(data.geminiActive))
      .catch(err => console.error('Error fetching API status:', err));
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('mealHistory', JSON.stringify(history));
  }, [history]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const handleImageChange = (file) => {
    setError('');
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file.');
        return;
      }
      setImageFile(file);
      setMeal(''); // Clear text when image is selected
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result);
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview('');
    }
  };

  const handleFileInputChange = (event) => {
    const file = event.target.files[0] || null;
    handleImageChange(file);
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0] || null;
    handleImageChange(file);
  };

  const triggerSampleSearch = async (queryText) => {
    setMeal(queryText);
    setImageFile(null);
    setImagePreview('');
    await executeSearch(queryText, null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await executeSearch(meal, imageFile);
  };

  const executeSearch = async (searchMeal, fileObj) => {
    setResult(null);
    setError('');
    
    if (!searchMeal.trim() && !fileObj) {
      setError('Please provide a description or drop an image first.');
      return;
    }

    setIsLoading(true);
    setStatus('Analyzing...');

    try {
      let url = '/api/nutrition';
      let options;

      if (fileObj) {
        url = '/api/nutrition';
        const formData = new FormData();
        formData.append('image', fileObj);
        if (searchMeal.trim()) {
          formData.append('meal', searchMeal.trim());
        }
        options = {
          method: 'POST',
          body: formData,
        };
      } else {
        url = `/api/nutrition?meal=${encodeURIComponent(searchMeal.trim())}`;
        options = {
          method: 'GET',
        };
      }

      const response = await fetch(url, options);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || 'Failed to analyze nutrition data.');
      }

      const data = await response.json();
      setResult(data);
      setStatus('Success');

      // Auto-log to history
      const newLogItem = {
        id: Date.now().toString(),
        meal: data.raw?.meal || searchMeal.trim() || 'Uploaded Image Meal',
        calories: data.calories,
        protein: data.protein,
        carbs: data.carbs,
        fat: data.fat,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: data.raw?.source || 'AI Engine'
      };
      setHistory(prev => [newLogItem, ...prev]);

    } catch (err) {
      setError(err.message);
      setStatus('Failed');
    } finally {
      setIsLoading(false);
    }
  };

  const clearForm = () => {
    setMeal('');
    setImageFile(null);
    setImagePreview('');
    setResult(null);
    setError('');
    setStatus('Ready');
  };

  const deleteHistoryItem = (id) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  const clearHistory = () => {
    if (window.confirm('Are you sure you want to clear your daily tracking history?')) {
      setHistory([]);
    }
  };

  // Helper macro percentages (for single meal display)
  const targetCalories = 2000;
  const targetProtein = 130;
  const targetCarbs = 250;
  const targetFat = 70;

  const calPercent = result ? Math.min(Math.round((result.calories / targetCalories) * 100), 100) : 0;
  const proteinPercent = result ? Math.min(Math.round((result.protein / targetProtein) * 100), 100) : 0;
  const carbsPercent = result ? Math.min(Math.round((result.carbs / targetCarbs) * 100), 100) : 0;
  const fatPercent = result ? Math.min(Math.round((result.fat / targetFat) * 100), 100) : 0;

  // Daily aggregate calculation
  const dailyCalories = history.reduce((sum, item) => sum + item.calories, 0);
  const dailyProtein = history.reduce((sum, item) => sum + Number(item.protein), 0);
  const dailyCarbs = history.reduce((sum, item) => sum + Number(item.carbs), 0);
  const dailyFat = history.reduce((sum, item) => sum + Number(item.fat), 0);

  const dailyCalPercent = Math.min(Math.round((dailyCalories / targetCalories) * 100), 100);
  const dailyProteinPercent = Math.min(Math.round((dailyProtein / targetProtein) * 100), 100);
  const dailyCarbsPercent = Math.min(Math.round((dailyCarbs / targetCarbs) * 100), 100);
  const dailyFatPercent = Math.min(Math.round((dailyFat / targetFat) * 100), 100);

  return (
    <div className="page-shell">
      <header className="site-header">
        <div className="logo-area">
          <span className="logo-dot"></span>
          <strong>Bite Nutrition</strong>
        </div>
        <button type="button" className="theme-toggle-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'light' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
      </header>



      <main className="main-content">
        <section className="hero-section">
          <div className="hero-content">
            <span className="eyebrow-pill">⚡ Real-time Nutrition Tracker</span>
            <h1>Analyze your meals instantly.</h1>
            <p>Upload a food picture or type what you ate to calculate serving size, ingredients, and total nutrition profile immediately.</p>
            
            <div className="chips-wrapper">
              <span className="chips-label">Try searching:</span>
              <div className="chips-container">
                {sampleMeals.map((m) => (
                  <button 
                    key={m.label} 
                    type="button" 
                    className="sample-chip"
                    onClick={() => triggerSampleSearch(m.query)}
                    disabled={isLoading}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="interactive-container" id="analyze">
            <div className="grid-split">
              {/* Form Input Section */}
              <div className="card form-card">
                <div className="card-header">
                  <h3>Analyze Food</h3>
                  <button type="button" className="clear-btn" onClick={clearForm} title="Reset Form">
                    Clear
                  </button>
                </div>
                
                <form onSubmit={handleSubmit} className="meal-form">
                  <div className="form-group">
                    <label htmlFor="meal-description">Describe your meal</label>
                    <textarea
                      id="meal-description"
                      name="meal"
                      value={meal}
                      onChange={(e) => {
                        setMeal(e.target.value);
                        if (imageFile) {
                          setImageFile(null);
                          setImagePreview('');
                        }
                      }}
                      placeholder="e.g. 2 wheat chapatis, 1 bowl dal tadka, and stir-fried paneer"
                      rows={3}
                      disabled={isLoading}
                    />
                  </div>

                  <div className="form-separator">
                    <span>or upload photo</span>
                  </div>

                  <div className="form-group">
                    <label 
                      className={`file-drop-zone ${isDragging ? 'dragging' : ''} ${imagePreview ? 'has-preview' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
                      <input 
                        type="file" 
                        id="image-file" 
                        name="image" 
                        accept="image/*" 
                        onChange={handleFileInputChange}
                        disabled={isLoading}
                        style={{ display: 'none' }}
                      />
                      
                      {imagePreview ? (
                        <div className="preview-container">
                          <img src={imagePreview} alt="Selected meal preview" className="uploaded-preview" />
                          <div className="preview-overlay">
                            <span>Change Photo</span>
                          </div>
                        </div>
                      ) : (
                        <div className="drop-prompt">
                          <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          <strong>Drag & drop meal image</strong>
                          <span>or click to browse from device</span>
                        </div>
                      )}
                    </label>
                  </div>

                  {error && (
                    <div className="error-message">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <button 
                    type="submit" 
                    className={`submit-btn ${isLoading ? 'btn-loading' : ''}`} 
                    disabled={isLoading || (!meal.trim() && !imageFile)}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner"></span>
                        Analyzing Meal...
                      </>
                    ) : (
                      'Analyze Nutrition'
                    )}
                  </button>
                </form>
              </div>

              {/* Result Visualization Section */}
              <div className="card result-card">
                <div className="card-header">
                  <h3>Nutrition Analysis</h3>
                </div>

                <div className="result-body">
                  {isLoading ? (
                    <div className="analysis-state">
                      <div className="radar-animation">
                        <div className="radar-sweep"></div>
                        <div className="radar-dot dot-1"></div>
                        <div className="radar-dot dot-2"></div>
                      </div>
                      <h4>Extracting nutrients...</h4>
                      <p>Calculating calories and analyzing ingredients</p>
                    </div>
                  ) : result ? (
                    <div className="result-success-content">
                      <div className="analyzed-meal-title">
                        <span>IDENTIFIED MEAL</span>
                        <h4>{result.raw?.meal || meal || 'Uploaded Image Meal'}</h4>
                      </div>

                      {/* Calorie Large Display with Radial Meter */}
                      <div className="calorie-gauge-wrapper">
                        <div className="calorie-ring-container">
                          <svg className="progress-ring-svg" width="160" height="160">
                            <circle className="progress-ring-bg" cx="80" cy="80" r="70" />
                            <circle 
                              className="progress-ring-bar" 
                              cx="80" 
                              cy="80" 
                              r="70" 
                              strokeDasharray={`${2 * Math.PI * 70}`}
                              strokeDashoffset={`${2 * Math.PI * 70 * (1 - calPercent / 100)}`}
                            />
                          </svg>
                          <div className="calorie-ring-text">
                            <strong className="calories-num">{result.calories}</strong>
                            <span>kcal</span>
                          </div>
                        </div>
                        <div className="calorie-meta">
                          <h5>Total Energy</h5>
                          <p>{calPercent}% of 2000 kcal daily budget</p>
                        </div>
                      </div>

                      {/* Macronutrients Breakdown Grid */}
                      <div className="macro-bar-grid">
                        {/* Protein */}
                        <div className="macro-bar-card protein">
                          <div className="macro-header">
                            <span className="macro-dot"></span>
                            <strong>Protein</strong>
                            <span className="macro-val">{result.protein}g</span>
                          </div>
                          <div className="macro-progress-track">
                            <div className="macro-progress-fill" style={{ width: `${proteinPercent}%` }}></div>
                          </div>
                          <div className="macro-footer">
                            <span>{result.protein * 4} kcal</span>
                            <span>Target: 130g</span>
                          </div>
                        </div>

                        {/* Carbs */}
                        <div className="macro-bar-card carbs">
                          <div className="macro-header">
                            <span className="macro-dot"></span>
                            <strong>Carbs</strong>
                            <span className="macro-val">{result.carbs}g</span>
                          </div>
                          <div className="macro-progress-track">
                            <div className="macro-progress-fill" style={{ width: `${carbsPercent}%` }}></div>
                          </div>
                          <div className="macro-footer">
                            <span>{result.carbs * 4} kcal</span>
                            <span>Target: 250g</span>
                          </div>
                        </div>

                        {/* Fat */}
                        <div className="macro-bar-card fat">
                          <div className="macro-header">
                            <span className="macro-dot"></span>
                            <strong>Fat</strong>
                            <span className="macro-val">{result.fat}g</span>
                          </div>
                          <div className="macro-progress-track">
                            <div className="macro-progress-fill" style={{ width: `${fatPercent}%` }}></div>
                          </div>
                          <div className="macro-footer">
                            <span>{result.fat * 9} kcal</span>
                            <span>Target: 70g</span>
                          </div>
                        </div>
                      </div>

                      {result.raw?.imageUploaded && result.raw?.filename && (
                        <div className="upload-metadata">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                          </svg>
                          <span>Analyzed image: {result.raw.filename}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="analysis-state empty">
                      <div className="empty-state-graphic">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                        </svg>
                      </div>
                      <h4>No analysis loaded</h4>
                      <p>Enter meal details or drop a photo to extract real-time macros.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Daily Dashboard & Tracker Section */}
        <section className="dashboard-section" id="dashboard">
          <div className="dashboard-intro">
            <h2>Today's Intake Dashboard</h2>
            <p>Your logged meals and cumulative daily targets track automatically below.</p>
          </div>

          <div className="dashboard-grid">
            {/* Daily Totals Tracker */}
            <div className="card dashboard-card">
              <div className="card-header">
                <h3>Daily Tracker Summary</h3>
                <span className="summary-date-badge">Today</span>
              </div>
              <div className="dashboard-body">
                <div className="daily-stats-row">
                  <div className="daily-calorie-ring-wrapper">
                    <svg className="progress-ring-svg-large" width="160" height="160">
                      <defs>
                        <linearGradient id="calGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="var(--primary)" />
                          <stop offset="100%" stopColor="#10b981" />
                        </linearGradient>
                      </defs>
                      <circle className="progress-ring-bg-large" cx="80" cy="80" r="70" />
                      <circle 
                        className="progress-ring-bar-large" 
                        cx="80" 
                        cy="80" 
                        r="70" 
                        stroke="url(#calGradient)"
                        strokeDasharray={`${2 * Math.PI * 70}`}
                        strokeDashoffset={`${2 * Math.PI * 70 * (1 - dailyCalPercent / 100)}`}
                      />
                    </svg>
                    <div className="daily-calorie-ring-text">
                      <strong className="daily-calories-num">{dailyCalories}</strong>
                      <span className="daily-calories-unit">/ {targetCalories} kcal</span>
                      <span className="daily-calories-percent">{dailyCalPercent}%</span>
                    </div>
                  </div>
                  <div className="daily-calorie-meta">
                    <h4>Daily Calorie Intake</h4>
                    <p>Calculated from all logged meals for today. Standard goal target: 2000 kcal.</p>
                  </div>
                </div>

                <div className="daily-macros-list">
                  {/* Protein */}
                  <div className="daily-macro-item protein">
                    <div className="daily-macro-header">
                      <span className="macro-indicator"></span>
                      <strong>Protein</strong>
                      <span>{dailyProtein.toFixed(1)}g / {targetProtein}g</span>
                    </div>
                    <div className="daily-macro-progress-track">
                      <div className="daily-macro-progress-fill" style={{ width: `${dailyProteinPercent}%` }}></div>
                    </div>
                  </div>

                  {/* Carbs */}
                  <div className="daily-macro-item carbs">
                    <div className="daily-macro-header">
                      <span className="macro-indicator"></span>
                      <strong>Carbohydrates</strong>
                      <span>{dailyCarbs.toFixed(1)}g / {targetCarbs}g</span>
                    </div>
                    <div className="daily-macro-progress-track">
                      <div className="daily-macro-progress-fill" style={{ width: `${dailyCarbsPercent}%` }}></div>
                    </div>
                  </div>

                  {/* Fat */}
                  <div className="daily-macro-item fat">
                    <div className="daily-macro-header">
                      <span className="macro-indicator"></span>
                      <strong>Fat</strong>
                      <span>{dailyFat.toFixed(1)}g / {targetFat}g</span>
                    </div>
                    <div className="daily-macro-progress-track">
                      <div className="daily-macro-progress-fill" style={{ width: `${dailyFatPercent}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Food History Log */}
            <div className="card log-card">
              <div className="card-header">
                <h3>Today's Food Log</h3>
                {history.length > 0 && (
                  <button type="button" className="clear-log-btn" onClick={clearHistory}>
                    Reset Day
                  </button>
                )}
              </div>
              <div className="log-body">
                {history.length === 0 ? (
                  <div className="empty-log-state">
                    <div className="empty-log-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 20h9M3 20v-8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2v8M12 11v6M9 14h6" />
                      </svg>
                    </div>
                    <h4>Log is empty</h4>
                    <p>Enter meal details above to automatically log and aggregate your daily tracking.</p>
                  </div>
                ) : (
                  <div className="log-items-container">
                    {history.map((item) => (
                      <div key={item.id} className="log-row">
                        <div className="log-row-details">
                          <div className="log-row-header">
                            <span className="log-time-stamp">{item.timestamp}</span>
                          </div>
                          <h4>{item.meal}</h4>
                          <div className="log-row-nutrients">
                            <span>🔥 {item.calories} kcal</span>
                            <span>🥩 P: {item.protein}g</span>
                            <span>🍞 C: {item.carbs}g</span>
                            <span>🥑 F: {item.fat}g</span>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          className="delete-log-row-btn" 
                          onClick={() => deleteHistoryItem(item.id)}
                          title="Delete logged meal"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="site-footer">
        <p>© 2026 Bite Nutrition. All rights reserved.</p>
      </footer>
    </div>
  );
}

export default App;
