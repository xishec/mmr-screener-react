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
        newAvailableFile[`${yyyy}-${mm}-${dd}`] = filename;
      } catch (error) {
        // Ignore missing files.
      }
    }
    setAvailableFiles(newAvailableFile);
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
        {/* <button onClick={handleReload} className="reload-button">
          Reload Data
        </button> */}
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
                <h2 className="date-title">
                  {`Signals ${Math.floor(
                    (new Date() - new Date(date)) / (1000 * 60 * 60 * 24)
                  )} days ago, on ${date}`}
                </h2>
                <div className="cards">
                  {Object.entries(screenResult).map(([ticker, data]) => {
                    const gain = data.gain >= 0;
                    const opacity = Math.abs(data.gain) / 0.15;
                    const toPercentage = (value) =>
                      `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
                    const isFiltered = data.low_since_signal < -0.02;

                    return data ? (
                      <div
                        style={{
                          border: "1px solid #444",
                          padding: "0.25rem",
                          margin: "0.25rem",
                          borderRadius: "8px",
                          display: "grid",
                          gridTemplateColumns:
                            "75px 1fr min-content min-content",
                          justifyContent: "center",
                          alignItems: "center",
                          backgroundColor: gain
                            ? `rgba(164, 227, 143, ${opacity})`
                            : `rgba(250, 112, 112, ${opacity})`,
                          color: "#444",
                          opacity: isFiltered ? 0.1 : 1,
                        }}
                      >
                        <span style={{ justifySelf: "center" }}>{ticker}</span>
                        <span>{`${toPercentage(data.gain)} ${
                          gain
                            ? toPercentage(data.low_since_signal)
                            : toPercentage(data.high_since_signal)
                        }`}</span>

                        <a
                          href={`https://www.tradingview.com/symbols/${
                            ExchangeMap[data.exchange]
                          }:${ticker}/?timeframe=6M`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {gain ? "📈" : "📉"}
                        </a>
                        <a
                          href={`https://www.tradingview.com/symbols/${
                            ExchangeMap[data.exchange]
                          }:${ticker}/financials-overview/`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          🔍
                        </a>
                      </div>
                    ) : (
                      <div key={ticker} className="stock-card">
                        <p>No chart data found for ticker: {ticker}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
    </div>
  );
}

export default App;
