import React, { useEffect, useState } from "react";

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
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        justifyContent: "center",
        alignItems: "flex-start",
        minHeight: "100vh",
        width: "95%",
        gap: "1rem",
        padding: "1rem",
      }}
    >
      <div style={{}}>
        <h1>Screen Results Charts</h1>
        <button
          onClick={handleReload}
          style={{
            padding: "8px 16px",
            color: "black",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Reload
        </button>
      </div>

      {loading && <p>Loading json data...</p>}

      {!loading &&
        Object.entries(screenResults)
          .sort((a, b) => new Date(b[0]) - new Date(a[0]))
          .map(([date, screenResult]) => {
            return (
              <div key={date}>
                <h2>signals on {date}</h2>
                {Object.entries(screenResult).map(([ticker, data]) => {
                  return data ? (
                    <div
                      style={{
                        marginBottom: "40px",
                        display: "grid",
                        gridTemplateColumns: "auto",
                        gap: "10px",
                      }}
                      key={ticker}
                    >
                      <div>
                        <a
                          href={`https://www.tradingview.com/symbols/${
                            ExchangeMap[data.exchange]
                          }:${ticker}/?timeframe=6M`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: data.gain >= 0 ? "#1976d2" : "#d32f2f",
                            textDecoration: "none",
                            fontWeight: "bold",
                            padding: "4px 8px",
                            border: `1px solid ${
                              data.gain >= 0 ? "#1976d2" : "#d32f2f"
                            }`,
                            borderRadius: "4px",
                            display: "inline-block",
                            marginTop: "8px",
                          }}
                        >
                          {`${ticker} ${data.gain >= 0 ? "+" : ""}
                          ${(data.gain * 100).toFixed(2)}% in 
                          ${Math.floor(
                            (new Date() - new Date(date)) /
                              (1000 * 60 * 60 * 24)
                          )}
                          days`}
                        </a>
                      </div>

                      <div>
                        <a
                          href={`https://www.tradingview.com/symbols/${
                            ExchangeMap[data.exchange]
                          }:${ticker}/financials-overview/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: `#444`,
                            border: `1px solid #444`,
                            textDecoration: "none",
                            fontWeight: "bold",
                            padding: "4px 8px",
                            borderRadius: "4px",
                            display: "inline-block",
                            marginTop: "8px",
                          }}
                        >
                          Financials
                        </a>
                      </div>
                      <div>Signal date: {date}</div>
                      <div>Mark signals: {data.score.split(" ")[0]}</div>
                      <div>My signals: {data.score.split(" ")[1]}</div>
                      <div>Currency: {data.currency}</div>
                      <div>Summary: {data.summary}</div>
                    </div>
                  ) : (
                    <p key={ticker}>No chart data found for ticker: {ticker}</p>
                  );
                })}
              </div>
            );
          })}
    </div>
  );
}

export default App;
