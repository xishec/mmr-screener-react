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
      lineColor = "#2962FF",
      textColor = "black",
      areaTopColor = "#2962FF",
      areaBottomColor = "rgba(41, 98, 255, 0.28)",
    } = {},
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
      height: 300,
    });

    const newSeries = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
    });
    newSeries.setData(data);

    // Add a marker on the 10th last data point if available
    if (data && data.length >= 10) {
      const markerData = data[data.length - 10];
      const markers = [
        {
          time: markerData.time,
          position: "inBar",
          color: "#f68410",
          shape: "circle",
          text: "signal",
        },
      ];
      createSeriesMarkers(newSeries, markers);
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [
    data,
    backgroundColor,
    lineColor,
    textColor,
    areaTopColor,
    areaBottomColor,
  ]);

  return <div ref={chartContainerRef} />;
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
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedData, setSelectedData] = useState({});
  const [loading, setLoading] = useState(false);

  // Load available JSON file names from the last 30 days.
  useEffect(() => {
    const loadJsonFiles = async () => {
      const filesAvailable = [];
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
          filesAvailable.push(filename);
        } catch (error) {
          // Ignore missing files.
        }
      }
      setAvailableFiles(filesAvailable);
      if (filesAvailable.length > 0) {
        setSelectedFile(filesAvailable[0]);
      }
    };

    loadJsonFiles();
  }, []);

  // Load JSON content for the selected file.
  useEffect(() => {
    if (!selectedFile) return;
    const loadJsonData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/data/${selectedFile}`);
        const json = await response.json();
        // Assumes the JSON structure is an array of objects: { ticker, data }
        setSelectedData(json);
        console.log("Loaded json data", json);
      } catch (error) {
        console.error("Failed to load json", error);
        setSelectedData({});
      }
      setLoading(false);
    };

    loadJsonData();
  }, [selectedFile]);

  return (
    <div className="p-4" style={{ maxWidth: "80vw" }}>
      <h1 className="text-2xl font-bold mb-4">Trading View Charts</h1>
      <div className="mb-4">
        <label htmlFor="json-select" className="mr-2">
          Select json:
        </label>
        <select
          id="json-select"
          value={selectedFile}
          onChange={(e) => setSelectedFile(e.target.value)}
          className="border p-1"
        >
          {availableFiles.map((file) => (
            <option key={file} value={file}>
              {file}
            </option>
          ))}
        </select>
      </div>
      {loading && <p>Loading json data...</p>}
      {!loading && selectedData.length === 0 && <p>No data available.</p>}
      

      {Object.entries(selectedData).map(([ticker, data]) => {
        // Transform the candles data only once
        const filteredData = transformCandles(data.price_data.candles);
        return data ? (
          <div key={ticker} className="mb-8">
            <h2 key={ticker} className="text-xl font-bold mb-4">
              {ticker}
            </h2>
            <ChartComponent key={ticker} data={filteredData} />
          </div>
        ) : (
          <p key={ticker}>No chart data found for ticker: {ticker}</p>
        );
      })}
    </div>
  );
}

export default App;
