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
  const [totalProfit, setTotalProfit] = useState(0);
  const [totalTradeCount, setTotalTradeCount] = useState(0);
  const [dataMap, setDataMap] = useState({});

  // Load available JSON file names from the last 30 days.
  const loadJsonFiles = async () => {
    const newAvailableFile = {};
    const today = new Date();
    for (let i = 0; i < 150; i++) {
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

    let totalSignal = 0;
    let winningSignal = 0;
    let totalProfit = 0;
    let totalDuration = 0;

    const newDataMap = {};

    Object.entries(screenResults)
      .sort((a, b) => new Date(b[0]) - new Date(a[0]))
      .forEach(([date, screenResult]) => {
        newDataMap[date] = {};
        Object.entries(screenResult).forEach(([ticker, data]) => {
          const tickerData = {};

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
              if (!isFiltered) setTotalTradeCount((prev) => prev + 1);
              continue;
            }

            holdingDuration++;
            highest = Math.max(highest, close);

            if (close < buyPrice * (1 + stopLoss / 100)) {
              profit = (close - buyPrice) / buyPrice;
              reason = `stop loss ${stopLoss}% after ${holdingDuration} days`;
              setTotalProfit((prev) => prev + profit);
              break;
            } else if (close > buyPrice * (1 + takeProfit / 100)) {
              if (close < highest * (1 - trailingStop / 100)) {
                profit = (close - buyPrice) / buyPrice;
                reason = `trailing stop ${trailingStop}% after ${holdingDuration} days`;
                setTotalProfit((prev) => prev + profit);
                break;
              }
              break;
            } else if (i === candles.length - 1) {
              profit = (close - buyPrice) / buyPrice;
              reason = `holding`;
              setTotalProfit((prev) => prev + profit);
              break;
            }
          }

          const isWin = profit >= 0;
          if (isWin) setTotalWin((prev) => prev + 1);

          const opacity = Math.abs(profit) / 0.15;
          // console.log(exitDate, date, holdingDuration);

          newDataMap[date][ticker] = {
            profit,
            reason,
            opacity,
            isWin,
            isFiltered,
          };
        });
      });

    setDataMap(newDataMap);
  }, [enterPercentage, screenResults, stopLoss, takeProfit, trailingStop]);

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
          <span>Enter at :</span>
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
            onChange={(e) => setEnterPercentage(Number(e.target.value))}
            sx={{ width: "100px" }}
          />
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
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr min-content",
            gap: "1rem",
            justifyItems: "end",
            alignItems: "center",
          }}
        >
          <span style={{ margin: "0 0 0.5rem 0" }}>Win Rate :</span>
          <span style={{ margin: "0 0 0.5rem 0" }}>
            {((totalWin / totalTradeCount) * 100).toFixed(1)}%
          </span>
          <span style={{ margin: "0 0 0.5rem 0" }}>Average Profit :</span>
          <span style={{ margin: "0 0 0.5rem 0" }}>
            {(totalProfit / totalTradeCount).toFixed(1)}%
          </span>
        </div>
      </div>

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
                        <span>{`${toPercentage(profit)} ${reason}`}</span>

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
