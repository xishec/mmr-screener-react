import React, { useEffect, useState } from "react";
import "./App.css";

const ExchangeMap = {
  NYQ: "NYSE",
  NMS: "NASDAQ",
};

function App() {
  const [availableFiles, setAvailableFiles] = useState({});
  const [screenResults, setScreenResults] = useState({});
  const [loading, setLoading] = useState(true);


  // Load available JSON file names from the last 30 days.
  const loadJsonFiles = async () => {
    const newAvailableFile = {};
    const today = new Date();
    for (let i = 0; i < 100; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      const filename = `screen_results_${yyyy}-${mm}-${dd}.json`;
      try {
        const response = await fetch(`/data/${filename}`);
        const contentType = response.headers.get("Content-Type");
        if (
          !response.ok ||
          (contentType && contentType.includes("text/html"))
        ) {
          throw new Error(`File ${filename} not found`);
        }
        newAvailableFile[date.toISOString().split("T")[0]] = filename;
      } catch (error) {
        // Ignore missing files.
      }
    }
    setAvailableFiles(newAvailableFile);
  };

  const handleReload = () => {
    setLoading(true);
    setScreenResults({});
    loadJsonFiles();
  };

  useEffect(() => {
    loadJsonFiles();
  }, []);

  // Load JSON content for the selected file.
  useEffect(() => {
    if (availableFiles.length === 0) return;

    const loadJsonData = async () => {
      const newScreenResults = {};
      await Promise.all(
        Object.entries(availableFiles).map(async ([date, file]) => {
          try {
            const response = await fetch(`/data/${file}`);
            const json = await response.json();
            newScreenResults[date] = json;
          } catch (error) {
            console.error(`Failed to load json /data/${file}`, error);
          }
        })
      );
      console.log("Loaded screen results:", newScreenResults);
      if (Object.keys(newScreenResults).length > 0) setLoading(false);
      setScreenResults(newScreenResults);
    };

    loadJsonData();
  }, [availableFiles]);

  return (
    <div className="app-container">
      <div className="header">
        <h1>mmr-screener</h1>
        <button onClick={handleReload} className="reload-button">
          Reload Data
        </button>
      </div>

      {loading && (
        <div className="loading">
          <p>Loading market data...</p>
        </div>
      )}

      {!loading &&
        Object.entries(screenResults)
          .sort((a, b) => new Date(b[0]) - new Date(a[0]))
          .map(([date, screenResult]) => {
            return (
              <div key={date} className="date-section">
                <h2 className="date-title">Signals on {date}</h2>
                {Object.entries(screenResult).map(([ticker, data]) => {
                  return data ? (
                    <div className="stock-card" key={ticker}>
                      <div className="stock-links">
                        <a
                          href={`https://www.tradingview.com/symbols/${
                            ExchangeMap[data.exchange]
                          }:${ticker}/?timeframe=6M`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`stock-link ${
                            data.gain >= 0 ? "gain-positive" : "gain-negative"
                          }`}
                        >
                          {`${ticker} ${data.gain >= 0 ? "+" : ""}${(
                            data.gain * 100
                          ).toFixed(2)}% in ${Math.floor(
                            (new Date() - new Date(date)) / (1000 * 60 * 60 * 24)
                          )} days`}
                        </a>
                        <a
                          href={`https://www.tradingview.com/symbols/${
                            ExchangeMap[data.exchange]
                          }:${ticker}/financials-overview/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="stock-link financials-link"
                        >
                          Financials
                        </a>
                      </div>

                      <div className="stock-info">
                        <div className="info-item">
                          <span className="info-label">Mark Signals:</span>{" "}
                          {data.score.split(" ")[0]}
                        </div>
                        <div className="info-item">
                          <span className="info-label">My Signals:</span>{" "}
                          {data.score.split(" ")[1]}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={ticker} className="stock-card">
                      <p>No chart data found for ticker: {ticker}</p>
                    </div>
                  );
                })}
              </div>
            );
          })}
    </div>
  );
}

export default App;
