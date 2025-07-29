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
  const [enterPercentage, setEnterPercentage] = useState(2.5);
  const [stopLoss, setStopLoss] = useState(-2.5);
  const [trailingStop, setTrailingStop] = useState(-5);
  const [takeProfit, setTakeProfit] = useState(100);
  const [totalWin, setTotalWin] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalTradeCount, setTotalTradeCount] = useState(0);
  const [dataMap, setDataMap] = useState({});

  // Load available JSON file names from the last 30 days.
  const loadJsonFiles = async () => {
    const newAvailableFile = {};
    const today = new Date();
    for (let i = 0; i < 300; i++) {
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

  const toPercentage = (value) =>
    `${value > 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;

  useEffect(() => {
    if (Object.keys(screenResults).length === 0) return;

    let newTotalWin = 0;
    let newTotalTradeCount = 0;
    let newTotalProfit = 0;
    let newTotalDuration = 0;

    const newDataMap = {};

    Object.entries(screenResults)
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .forEach(([date, screenResult]) => {
        newDataMap[date] = {};
        Object.entries(screenResult).forEach(([ticker, data]) => {
          const filtered_candles = data.filtered_candles;
          let profit = 0;
          let signalPrice = -1;
          let isFiltered = false;
          let buyPrice = -1;
          let highest = -1;
          let reason = "";

          const candles = filtered_candles.sort(
            (a, b) => a.datetime - b.datetime
          );

          let holdingDuration = 0;
          for (let i = 0; i < candles.length; i++) {
            const close = candles[i].close;

            if (i === 0) {
              signalPrice = close;
              continue;
            }

            if (i === 1) {
              buyPrice = close;
              isFiltered = buyPrice < signalPrice * (1 + enterPercentage / 100);
              if (!isFiltered) newTotalTradeCount++;
              continue;
            }

            holdingDuration++;
            highest = Math.max(highest, close);

            if (close < buyPrice * (1 + stopLoss / 100)) {
              profit = (close - buyPrice) / buyPrice;
              reason = `stop loss ${stopLoss}% after ${holdingDuration} days`;
              if (!isFiltered) {
                newTotalProfit += profit;
                newTotalDuration += holdingDuration;
              }
              break;
            } else if (i === candles.length - 1) {
              profit = (close - buyPrice) / buyPrice;
              reason = `holding`;
              if (!isFiltered) {
                newTotalProfit += profit;
                newTotalDuration += holdingDuration;
              }
              break;
            }
          }

          const isWin = profit >= 0;
          if (isWin && !isFiltered && profit > 0) {
            newTotalWin++;
            console.log(
              `Win for ${ticker} on ${date}: ${toPercentage(profit)}`
            );
          }

          const opacity = Math.abs(profit) / 0.15;

          newDataMap[date][ticker] = {
            profit,
            reason,
            opacity,
            isWin,
            isFiltered,
          };
        });
      });

    console.log("totalTradeCount", newTotalTradeCount);
    console.log("totalWin", newTotalWin);
    console.log("totalProfit", newTotalProfit);
    console.log("totalDuration", newTotalDuration);

    setTotalWin(newTotalWin);
    setTotalTradeCount(newTotalTradeCount);
    setTotalProfit(newTotalProfit);
    setTotalDuration(newTotalDuration);

    setDataMap(newDataMap);
  }, [enterPercentage, screenResults, stopLoss, takeProfit, trailingStop]);

  return (
    <div className="app-container">
      <header className="header">
        <h1>MMR Screener</h1>
        
        <div className="controls-section">
          <div className="control-group">
            <span className="control-label">Enter if 2nd day is:</span>
            <TextField
              type="number"
              size="small"
              variant="outlined"
              slotProps={{
                input: {
                  min: -25,
                  max: 25,
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                },
              }}
              value={enterPercentage}
              onChange={(e) => setEnterPercentage(Number(e.target.value))}
              sx={{ width: "100px" }}
            />
          </div>
          
          <div className="control-group">
            <span className="control-label">Stop Loss:</span>
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
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Win Rate</span>
            <span className="stat-value">
              {((totalWin / totalTradeCount) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Average Profit</span>
            <span className="stat-value">
              {((totalProfit / totalTradeCount) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Total Trades</span>
            <span className="stat-value">{totalTradeCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Avg Duration</span>
            <span className="stat-value">
              {(totalDuration / totalTradeCount).toFixed(1)} days
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Annualized</span>
            <span className="stat-value">
              {(
                (((totalProfit / totalTradeCount) * 100).toFixed(1) /
                  (totalDuration / totalTradeCount).toFixed(1)) *
                250
              ).toFixed(1)}%
            </span>
          </div>
        </div>
      </header>

      {loading && (
        <div className="loading">
          <p>Loading market data...</p>
        </div>
      )}

      {!loading &&
        Object.keys(dataMap).length > 0 &&
        Object.entries(screenResults)
          .sort((a, b) => new Date(b[0]) - new Date(a[0]))
          .map(([date, screenResult]) => {
            const nbDaysSinceSignal = Math.floor(
              (new Date(Object.keys(availableFiles)[0]) - new Date(date)) /
                (1000 * 60 * 60 * 24)
            );
            return (
              <div key={date} className="date-section">
                <h2 className="date-title">
                  {`Signals ${nbDaysSinceSignal} days ago, on ${date}`}
                </h2>
                <div className="cards">
                  {Object.entries(screenResult).map(([ticker, data]) => {
                    const { profit, reason, opacity, isWin, isFiltered } =
                      dataMap[date][ticker];

                    return data ? (
                      <div
                        className={`stock-card ${isWin ? 'win' : 'loss'}`}
                        style={{
                          opacity: isFiltered ? 0.1 : 1,
                          background: isWin
                            ? `linear-gradient(135deg, rgba(72, 187, 120, ${Math.min(opacity, 0.4)}) 0%, rgba(56, 178, 172, ${Math.min(opacity, 0.4)}) 100%)`
                            : `linear-gradient(135deg, rgba(245, 101, 101, ${Math.min(opacity, 0.4)}) 0%, rgba(237, 137, 54, ${Math.min(opacity, 0.4)}) 100%)`,
                        }}
                      >
                        <span className="ticker">{ticker}</span>
                        <span className="profit-info">{`${toPercentage(profit)} ${reason}`}</span>

                        <a
                          href={`https://www.tradingview.com/symbols/${
                            ExchangeMap[data.exchange]
                          }:${ticker}/?timeframe=6M`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View Chart"
                        >
                          {isWin ? "📈" : "📉"}
                        </a>
                        <a
                          href={`https://www.tradingview.com/symbols/${
                            ExchangeMap[data.exchange]
                          }:${ticker}/financials-overview/`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="View Financials"
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
