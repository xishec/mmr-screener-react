import React, { useEffect, useState } from "react";
import "./App.css";
import { TextField, InputAdornment } from "@mui/material";

const ExchangeMap = {
  NYQ: "NYSE",
  NMS: "NASDAQ",
};

function App() {
  const [availableFiles, setAvailableFiles] = useState({});
  const [screenResults, setScreenResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [stopLoss, setStopLoss] = useState(-1);
  const [winRate, setWinRate] = useState(0);
  const [averageProfit, setAverageProfit] = useState(0);
  const [averageDuration, setAverageDuration] = useState(0);

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
      if (Object.keys(newScreenResults).length > 0) setLoading(false);
      setScreenResults(newScreenResults);
    };

    loadJsonData();
  }, [availableFiles]);

  useEffect(() => {
    if (Object.keys(screenResults).length === 0) return;

    let totalSignal = 0;
    let winningSignal = 0;
    let totalProfit = 0;
    let totalDuration = 0;

    Object.entries(screenResults)
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .forEach(([date, screenResult]) => {
        Object.entries(screenResult).forEach(([ticker, data]) => {
          const isFiltered = data.low_since_signal < stopLoss / 100;
          const isWin = data.gain >= 0;
          if (!isFiltered) {
            totalSignal += 1;
            if (isWin) {
              winningSignal += 1;
            }
            totalProfit += data.gain * 100;
            totalDuration +=
              (new Date() - new Date(date)) / (1000 * 60 * 60 * 24);
          }
        });
      });

    console.log("Total signals:", totalSignal);
    console.log("Winning signals:", winningSignal);
    console.log("Total profit:", totalProfit);
    console.log(" totalDuration:", totalDuration / totalSignal);

    setWinRate(totalSignal > 0 ? (winningSignal / totalSignal) * 100 : 0);
    setAverageProfit(totalSignal > 0 ? totalProfit / totalSignal : 0);
    setAverageDuration(totalSignal > 0 ? totalDuration / totalSignal : 0);
  }, [screenResults, stopLoss]);

  return (
    <div className="app-container">
      <div className="header">
        <h1>mmr-screener</h1>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr min-content",
            gap: "1rem",
            justifyItems: "end",
            alignItems: "center",
          }}
        >
          <span>Stop Loss :</span>
          <TextField
            type="number"
            size="small"
            variant="outlined"
            slotProps={{
              input: {
                min: -25,
                max: 0,
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              },
            }}
            value={stopLoss}
            onChange={(e) => setStopLoss(Number(e.target.value))}
            sx={{ width: "100px" }}
          />
          <span style={{ margin: "0 0 0.5rem 0" }}>Win Rate :</span>
          <span style={{ margin: "0 0 0.5rem 0" }}>{winRate.toFixed(1)}%</span>
          <span style={{ margin: "0 0 0.5rem 0" }}>Average Profit :</span>
          <span style={{ margin: "0 0 0.5rem 0" }}>
            {averageProfit.toFixed(1)}%
          </span>
          <span style={{ margin: "0 0 0.5rem 0" }}>Average Duration :</span>
          <span style={{ margin: "0 0 0.5rem 0" }}>
            {averageDuration.toFixed(1)} days
          </span>
        </div>
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
                    const isWin = data.gain >= 0;
                    const opacity = Math.abs(data.gain) / 0.15;
                    const toPercentage = (value) =>
                      `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
                    const isFiltered = data.low_since_signal < stopLoss / 100;

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
                          backgroundColor: isWin
                            ? `rgba(164, 227, 143, ${opacity})`
                            : `rgba(250, 112, 112, ${opacity})`,
                          color: "#444",
                          opacity: isFiltered ? 0.1 : 1,
                        }}
                      >
                        <span style={{ justifySelf: "center" }}>{ticker}</span>
                        <span>{`${toPercentage(data.gain)} ${
                          data.high_since_signal === -1
                            ? ""
                            : isWin
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
                          {isWin ? "📈" : "📉"}
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
