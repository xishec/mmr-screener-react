import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import Papa from "papaparse";

function App() {
  const [priceData, setPriceData] = useState([]);
  const [csvFiles, setCsvFiles] = useState([]);
  const [selectedCsv, setSelectedCsv] = useState(null);
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    const loadCsvFiles = async () => {
      const filesAvailable = [];
      const today = new Date();
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        const filename = `screen_results_${yyyy}-${mm}-${dd}.csv`;
        try {
          const response = await fetch(`/data/screen_results/${filename}`);
          const contentType = response.headers.get("Content-Type");
          // Check if response is OK and appears to be CSV
          if (
            !response.ok ||
            (contentType && contentType.includes("text/html"))
          ) {
            throw new Error(`File ${filename} not found`);
          }
          filesAvailable.push(filename);
        } catch (error) {
          // console.log(`Failed ${filename}`);
        }
      }
      setCsvFiles(filesAvailable);
      if (filesAvailable.length > 0) {
        setSelectedCsv(filesAvailable[0]);
      }
    };

    loadCsvFiles();
  }, []);

  // Load and parse CSV data for the selected CSV file
  useEffect(() => {
    const loadCsvData = async () => {
      if (!selectedCsv) return;
      try {
        const response = await fetch(`/data/screen_results/${selectedCsv}`);
        const csvText = await response.text();
        Papa.parse(csvText, {
          header: true,
          dynamicTyping: true,
          // In Papa.parse complete callback
          complete: (results) => {
            const formattedData = results.data
              .map((row) => ({
                ticker: row["Ticker"], 
                marketCap: row["Market Cap"],
                date: row["Date"],
              }));
            console.log("Formatted Data:", formattedData);
            setPriceData(formattedData);
          },
        });
      } catch (error) {
        console.error(`Error loading CSV data from ${selectedCsv}:`, error);
      }
    };

    loadCsvData();
  }, [selectedCsv]);


  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Trading View Charts</h1>

      <div className="mb-4">
        <label htmlFor="csv-select" className="mr-2">
          Select CSV:
        </label>
        <select
          id="csv-select"
          value={selectedCsv || ""}
          onChange={(e) => setSelectedCsv(e.target.value)}
          className="border p-1"
        >
          {csvFiles.map((file) => (
            <option key={file} value={file}>
              {file}
            </option>
          ))}
        </select>
      </div>

      <div
        ref={chartContainerRef}
        className="w-full border"
        style={{ height: "400px" }}
      />

      {priceData.length === 0 && <p>Loading CSV data...</p>}
    </div>
  );
}

export default App;
