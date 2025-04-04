import React, { useEffect, useRef, useState } from "react";
import {
  createChart,
  LineSeries,
  AreaSeries,
  ColorType,
} from "lightweight-charts";

// function ChartComponent({ ticker, data }) {
//   const chartContainerRef = useRef(null);
//   const chartRef = useRef(null);

//   useEffect(() => {
//     if (!chartContainerRef.current || !data || data.length === 0) return;

//     // Remove existing chart if any.
//     if (chartRef.current) {
//       chartRef.current.remove();
//     }

//     const chart = createChart(chartContainerRef.current, {
//       width: chartContainerRef.current.clientWidth,
//       height: 400,
//       layout: {
//         backgroundColor: "#ffffff",
//         textColor: "#333",
//       },
//       grid: {
//         vertLines: { color: "#e0e0e0" },
//         horzLines: { color: "#e0e0e0" },
//       },
//       timeScale: {
//         timeVisible: true,
//         secondsVisible: false,
//       },
//     });

//     chartRef.current = chart;

//     const lineSeries = chart.addSeries(LineSeries);
//     lineSeries.setData([
//       { time: "2019-04-11", value: 80.01 },
//       { time: "2019-04-12", value: 96.63 },
//       { time: "2019-04-13", value: 76.64 },
//       { time: "2019-04-14", value: 81.89 },
//       { time: "2019-04-15", value: 74.43 },
//       { time: "2019-04-16", value: 80.01 },
//       { time: "2019-04-17", value: 96.63 },
//       { time: "2019-04-18", value: 76.64 },
//       { time: "2019-04-19", value: 81.89 },
//       { time: "2019-04-20", value: 74.43 },
//     ]);

//     // const candleSeries = chart.addCandlestickSeries({
//     //   upColor: "#26a69a",
//     //   downColor: "#ef5350",
//     //   borderVisible: false,
//     //   wickUpColor: "#26a69a",
//     //   wickDownColor: "#ef5350",
//     // });

//     // candleSeries.setData(data);
//     chart.timeScale().fitContent();

//     const handleResize = () => {
//       chart.applyOptions({ width: chartContainerRef.current.clientWidth });
//     };

//     window.addEventListener("resize", handleResize);
//     return () => {
//       window.removeEventListener("resize", handleResize);
//       if (chartRef.current) {
//         chartRef.current.remove();
//       }
//     };
//   }, [data]);

//   return (
//     <div style={{ marginBottom: "2rem" }}>
//       <h2>{ticker}</h2>
//       <div
//         ref={chartContainerRef}
//         style={{ border: "1px solid #ccc", height: "400px" }}
//       />
//     </div>
//   );
// }

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
    chart.timeScale().fitContent();

    const newSeries = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
    });
    newSeries.setData(data);

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

const initialData = [
  { time: "2018-12-22", value: 32.51 },
  { time: "2018-12-23", value: 31.11 },
  { time: "2018-12-24", value: 27.02 },
  { time: "2018-12-25", value: 27.32 },
  { time: "2018-12-26", value: 25.17 },
  { time: "2018-12-27", value: 28.89 },
  { time: "2018-12-28", value: 25.46 },
  { time: "2018-12-29", value: 23.92 },
  { time: "2018-12-30", value: 22.68 },
  { time: "2018-12-31", value: 22.67 },
];

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
    <div className="p-4">
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
        return data ? (
          // <ChartComponent key={ticker} ticker={ticker} data={data} />
          <ChartComponent data={initialData}></ChartComponent>
        ) : (
          <p key={ticker}>No chart data found for ticker: {ticker}</p>
        );
      })}
    </div>
  );
}

export default App;
