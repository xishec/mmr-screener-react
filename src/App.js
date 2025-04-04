import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  AreaSeries,
  ColorType,
  createSeriesMarkers,
} from "lightweight-charts";

export const ChartComponent = (props) => {
  const {
    data,
    colors: {
      backgroundColor = "white",
      lineColor = "#rgb(0, 0, 0)",
      textColor = "black",
      areaTopColor = "rgba(41, 98, 255, 0)",
      areaBottomColor = "rgba(41, 98, 255, 0)",
    } = {},
    signalDate,
  } = props;

  const chartContainerRef = useRef();

  useEffect(() => {
    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      localization: {
        dateFormat: "yyyy-MM-dd",
      },
    });

    const newSeries = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
    });
    newSeries.setData(data);

    if (data.length > 50) {
      const last200 = data.slice(-50);
      chart.timeScale().setVisibleRange({
        from: last200[0].time,
        to: last200[last200.length - 1].time,
      });
    } else {
      chart.timeScale().fitContent();
    }

    const markers = [
      {
        time: signalDate,
        position: "inBar",
        color: "rgb(0, 255, 0)",
        shape: "circle",
        size: 1,
      },
    ];
    createSeriesMarkers(newSeries, markers);

    window.addEventListener("resize", handleResize);

    // Use IntersectionObserver to trigger a resize when the container becomes visible.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            handleResize();
            if (data.length > 50) {
              const last200 = data.slice(-50);
              chart.timeScale().setVisibleRange({
                from: last200[0].time,
                to: last200[last200.length - 1].time,
              });
            } else {
              chart.timeScale().fitContent();
            }
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(chartContainerRef.current);

    return () => {
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      chart.remove();
    };
  }, [
    data,
    backgroundColor,
    lineColor,
    textColor,
    areaTopColor,
    areaBottomColor,
    signalDate,
  ]);

  return <div style={{ width: "90%" }} ref={chartContainerRef} />;
};

// Transform the candles data to the same format as initialData: { time: "YYYY-MM-DD", value: <close> }
const transformCandles = (candles) => {
  return candles.map((candle) => {
    const date = new Date(candle.datetime * 1000); // convert seconds to milliseconds
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return {
      time: `${yyyy}-${mm}-${dd}`,
      value: candle.close,
    };
  });
};

function App() {
  const [availableFiles, setAvailableFiles] = useState({});
  const [screenResults, setScreenResults] = useState({});
  const [loading, setLoading] = useState(true);

  // Load available JSON file names from the last 30 days.
  useEffect(() => {
    const loadJsonFiles = async () => {
      const newAvailableFile = {};
      const today = new Date();
      for (let i = 0; i < 30; i++) {
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

    loadJsonFiles();
  }, []);

  // Load JSON content for the selected file.
  useEffect(() => {
    if (availableFiles.length === 0) return;

    const loadJsonData = async () => {
      setLoading(true);
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
      setLoading(false);
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
      <h1>Screen Results Charts</h1>

      {loading && <p>Loading json data...</p>}

      {!loading &&
        Object.entries(screenResults)
          .sort((a, b) => new Date(b[0]) - new Date(a[0]))
          .map(([date, screenResult]) => {
            return (
              <div key={date}>
                <h2>signals on {date}</h2>
                {Object.entries(screenResult).map(([ticker, data]) => {
                  const filteredData = transformCandles(
                    data.price_data.candles
                  );
                  return data ? (
                    <details
                      key={ticker}
                      style={{ cursor: "pointer", marginBottom: "10px" }}
                    >
                      <summary>
                        <span
                          style={{
                            fontWeight: "bold",
                            marginRight: "20px",
                          }}
                        >
                          {ticker}
                        </span>
                        Mark signals: {data.score.split(" ")[0]} {" "}
                        Bonus signals: {data.score.split(" ")[1]}
                      </summary>
                      <ChartComponent data={filteredData} signalDate={date} />
                    </details>
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
