"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  fetchDailySales,
  fetchLowestStock,
  fetchPeakSales,
  fetchSalesHistory,
  fetchWeeklySales,
  fetchTop50Orders,
  fetchTop5MenuItems,
  fetchTop5Ingredients,
  fetchAllMenuItems,
  generateXReport as generateXReportAPI,
} from "@/lib/api";
import { logout } from "@/lib/auth";
import { useRequireAuth } from "@/lib/useAuth";
import AccessibilityMenu from "@/components/AccessibilityMenu";
import styles from "./reports.module.css";

export default function ReportsPage() {
  const router = useRouter();
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [queryResults, setQueryResults] = useState(null);
  const [allMenuItems, setAllMenuItems] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [xReportDate, setXReportDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [xReportData, setXReportData] = useState(null);
  const [loadingXReport, setLoadingXReport] = useState(false);

  useRequireAuth(router);

  const queries = [
    { id: "daily-sales", label: "Daily Sales" },
    { id: "lowest-stock", label: "Lowest Stock" },
    { id: "peak-sales", label: "Peak Sales" },
    { id: "sales-history", label: "Sales History Ascending" },
    { id: "weekly-sales", label: "Weekly Sales" },
    { id: "top-50-orders", label: "Top 50 Recent Orders" },
    { id: "top-5-menu-items", label: "Top 5 Most Ordered Menu Items" },
    { id: "top-5-ingredients", label: "Top 5 Most Used Ingredients" },
  ];

  const handleQueryClick = async (queryId) => {
    setSelectedQuery(queryId);
    setLoading(true);
    setError(null);
    setQueryResults(null);

    try {
      let results;
      switch (queryId) {
        case "daily-sales":
          results = await fetchDailySales();
          break;
        case "lowest-stock":
          results = await fetchLowestStock();
          break;
        case "peak-sales":
          results = await fetchPeakSales();
          break;
        case "sales-history":
          results = await fetchSalesHistory();
          break;
        case "weekly-sales":
          results = await fetchWeeklySales();
          break;
        case "top-50-orders":
          results = await fetchTop50Orders();
          break;
        case "top-5-menu-items":
          const [top5Results, allItemsResults] = await Promise.all([
            fetchTop5MenuItems(),
            fetchAllMenuItems(),
          ]);
          results = top5Results;
          setAllMenuItems(allItemsResults);
          break;
        case "top-5-ingredients":
          results = await fetchTop5Ingredients();
          break;
        default:
          results = null;
      }
      setQueryResults(results);
      // Clear allMenuItems when switching away from top-5-menu-items
      if (queryId !== "top-5-menu-items") {
        setAllMenuItems(null);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch report data");
      console.error("Error fetching report:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatXReportDate = (dateString) => {
    // dateString is in YYYY-MM-DD format
    // Parse it directly to avoid timezone issues
    const [year, month, day] = dateString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleXReportGenerate = async () => {
    setLoadingXReport(true);
    setXReportData(null);
    setError(null);
    try {
      const report = await generateXReportAPI(xReportDate);
      setXReportData(report);
    } catch (err) {
      setError(err.message || "Failed to generate X-Report");
      console.error("Error generating X-Report:", err);
    } finally {
      setLoadingXReport(false);
    }
  };

  const handleLogout = () => {
    logout(router);
  };

  const renderQueryResults = () => {
    if (loading) {
      return <div className={styles.loading}>Loading report data...</div>;
    }

    if (error) {
      return <div className={styles.error}>{error}</div>;
    }

    if (!queryResults) {
      return (
        <div className={styles.emptyResults}>
          Select a query from the left column to view results
        </div>
      );
    }

    const query = queries.find((q) => q.id === selectedQuery);
    if (!query) return null;

    switch (selectedQuery) {
      case "daily-sales":
        // Prepare data for bar chart
        const chartData = queryResults.map((row) => ({
          date: new Date(row.day).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          revenue: parseFloat(row.total_revenue || 0),
          orders: parseInt(row.total_orders || 0),
        }));

        return (
          <div className={styles.resultsContainer}>
            <h3 className={styles.resultsTitle}>Daily Sales</h3>
            {chartData.length > 0 && (
              <div style={{ marginBottom: "30px", height: "400px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis
                      label={{
                        value: "Revenue ($)",
                        angle: -90,
                        position: "insideLeft",
                      }}
                      style={{ fontSize: "12px" }}
                    />
                    <Tooltip
                      formatter={(value, name) => {
                        if (name === "revenue") {
                          return [`$${value.toFixed(2)}`, "Revenue"];
                        }
                        return [value, "USD"];
                      }}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Bar
                      dataKey="revenue"
                      fill="#dc2626"
                      name="Revenue ($)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <table className={styles.resultsTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Orders</th>
                  <th>Total Revenue ($)</th>
                </tr>
              </thead>
              <tbody>
                {queryResults.map((row, idx) => (
                  <tr key={idx}>
                    <td>{new Date(row.day).toLocaleDateString()}</td>
                    <td>{row.total_orders}</td>
                    <td>${parseFloat(row.total_revenue || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "lowest-stock":
        return (
          <div className={styles.resultsContainer}>
            <h3 className={styles.resultsTitle}>Lowest Stock Items</h3>
            <table className={styles.resultsTable}>
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {queryResults.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.product_id}</td>
                    <td>{row.product_name}</td>
                    <td>{row.category}</td>
                    <td className={row.stock < 10 ? styles.lowStock : ""}>
                      {row.stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "peak-sales":
        return (
          <div className={styles.resultsContainer}>
            <h3 className={styles.resultsTitle}>Peak Sales</h3>
            <table className={styles.resultsTable}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Total Orders</th>
                  <th>Daily Total ($)</th>
                </tr>
              </thead>
              <tbody>
                {queryResults.map((row, idx) => (
                  <tr key={idx}>
                    <td>{new Date(row.day).toLocaleDateString()}</td>
                    <td>{row.total_orders}</td>
                    <td>${parseFloat(row.daily_total || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "sales-history":
        return (
          <div className={styles.resultsContainer}>
            <h3 className={styles.resultsTitle}>Sales History Ascending</h3>
            <table className={styles.resultsTable}>
              <thead>
                <tr>
                  <th>Hour Start</th>
                  <th>Orders Count</th>
                  <th>Total Sales ($)</th>
                </tr>
              </thead>
              <tbody>
                {queryResults.map((row, idx) => (
                  <tr key={idx}>
                    <td>{new Date(row.hour_start).toLocaleString()}</td>
                    <td>{row.orders_count}</td>
                    <td>${parseFloat(row.total_sales || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "weekly-sales":
        return (
          <div className={styles.resultsContainer}>
            <h3 className={styles.resultsTitle}>Weekly Sales</h3>
            <table className={styles.resultsTable}>
              <thead>
                <tr>
                  <th>Week Start</th>
                  <th>Total Orders</th>
                  <th>Total Revenue ($)</th>
                </tr>
              </thead>
              <tbody>
                {queryResults.map((row, idx) => (
                  <tr key={idx}>
                    <td>{new Date(row.week_start).toLocaleDateString()}</td>
                    <td>{row.total_orders}</td>
                    <td>${parseFloat(row.total_revenue || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "top-50-orders":
        return (
          <div className={styles.resultsContainer}>
            <h3 className={styles.resultsTitle}>Top 50 Recent Orders</h3>
            <table className={styles.resultsTable}>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Order Time</th>
                  <th>Total ($)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {queryResults.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.order_id}</td>
                    <td>{new Date(row.order_time).toLocaleString()}</td>
                    <td>${parseFloat(row.total || 0).toFixed(2)}</td>
                    <td>{row.order_status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "top-5-menu-items":
        // Prepare data for pie chart - show all items individually
        const top5ProductIds = new Set(
          queryResults.map((item) => item.product_id)
        );
        const pieChartData = allMenuItems
          ? allMenuItems.map((item) => ({
              name: item.product_name,
              value: parseInt(item.order_count),
              isTop5: top5ProductIds.has(item.product_id),
            }))
          : [];

        // Sort by value (descending) to ensure top 5 are first
        const sortedChartData = [...pieChartData].sort(
          (a, b) => b.value - a.value
        );

        // Generate colors: vibrant for top 5, muted for others
        const generateColor = (index, isTop5) => {
          if (isTop5) {
            // Vibrant colors for top 5
            const vibrantColors = [
              "#dc2626", // Red
              "#3b82f6", // Blue
              "#10b981", // Green
              "#f59e0b", // Amber
              "#8b5cf6", // Purple
            ];
            return vibrantColors[index % 5];
          } else {
            // Muted colors for other items - generate a palette
            const mutedColors = [
              "#94a3b8", // Slate
              "#a8a29e", // Stone
              "#cbd5e1", // Light slate
              "#d1d5db", // Gray
              "#e2e8f0", // Light slate
            ];
            return mutedColors[index % mutedColors.length];
          }
        };

        return (
          <div className={styles.resultsContainer}>
            <h3 className={styles.resultsTitle}>
              Top 5 Most Ordered Menu Items
            </h3>
            {sortedChartData.length > 0 && (
              <div style={{ marginBottom: "30px", height: "500px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sortedChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, isTop5 }) => {
                        // Show labels for all items, but emphasize top 5
                        // Truncate long names for better readability
                        const displayName =
                          name.length > 20
                            ? `${name.substring(0, 20)}...`
                            : name;
                        return isTop5
                          ? `${displayName}: ${value}`
                          : `${displayName}: ${value}`;
                      }}
                      outerRadius={140}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {sortedChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={generateColor(index, entry.isTop5)}
                          opacity={entry.isTop5 ? 1 : 0.6}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} orders`, name]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: "12px" }}
                      formatter={(value, entry) => {
                        const data = sortedChartData.find(
                          (d) => d.name === value
                        );
                        // Truncate long names in legend
                        const displayName =
                          value.length > 25
                            ? `${value.substring(0, 25)}...`
                            : value;
                        return data?.isTop5 ? (
                          <span
                            style={{ fontWeight: "bold", color: entry.color }}
                          >
                            {displayName}
                          </span>
                        ) : (
                          <span style={{ opacity: 1, color: entry.color }}>
                            {displayName}
                          </span>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <table className={styles.resultsTable}>
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Product Name</th>
                  <th>Order Count</th>
                </tr>
              </thead>
              <tbody>
                {queryResults.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.product_id}</td>
                    <td>{row.product_name}</td>
                    <td>{row.order_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      case "top-5-ingredients":
        return (
          <div className={styles.resultsContainer}>
            <h3 className={styles.resultsTitle}>Top 5 Most Used Ingredients</h3>
            <table className={styles.resultsTable}>
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Product Name</th>
                  <th>Usage Count</th>
                  <th>Current Stock</th>
                </tr>
              </thead>
              <tbody>
                {queryResults.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.product_id}</td>
                    <td>{row.product_name}</td>
                    <td>{row.usage_count}</td>
                    <td>{row.stock !== null ? row.stock : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.reportsContainer}>
      <div className={styles.reportsLayout}>
        {/* Left Column - Query List */}
        <div className={styles.queriesColumn}>
          <h2 className={styles.columnTitle}>Common Queries</h2>
          <div className={styles.queriesList}>
            {queries.map((query) => (
              <button
                key={query.id}
                onClick={() => handleQueryClick(query.id)}
                className={`${styles.queryButton} ${
                  selectedQuery === query.id ? styles.queryButtonActive : ""
                }`}
              >
                {query.label}
              </button>
            ))}
          </div>
        </div>

        {/* Middle Column - Results */}
        <div className={styles.resultsColumn}>{renderQueryResults()}</div>

        {/* Right Column - X-Report Generator */}
        <div className={styles.xReportColumn}>
          <h2 className={styles.columnTitle}>X-Report Generator</h2>
          <div className={styles.xReportForm}>
            <label className={styles.dateLabel}>
              Select Date:
              <input
                type="date"
                value={xReportDate}
                onChange={(e) => setXReportDate(e.target.value)}
                className={styles.dateInput}
              />
            </label>
            <button
              onClick={handleXReportGenerate}
              className={styles.generateButton}
              disabled={loadingXReport}
            >
              {loadingXReport ? "Generating..." : "Generate X-Report"}
            </button>
          </div>

          {xReportData && (
            <div className={styles.xReportResults}>
              <h3 className={styles.xReportTitle}>
                X-Report for {formatXReportDate(xReportDate)}
              </h3>
              <table className={styles.xReportTable}>
                <thead>
                  <tr>
                    <th>Hour</th>
                    <th>Sales ($)</th>
                    <th>Returns ($)</th>
                    <th>Cancelled Orders</th>
                    <th>Order Count</th>
                  </tr>
                </thead>
                <tbody>
                  {xReportData.map((row, idx) => (
                    <tr key={idx}>
                      <td>{row.hour}</td>
                      <td>${row.sales}</td>
                      <td>${row.returns}</td>
                      <td>{row.cancelledOrders}</td>
                      <td>{row.orderCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Bar - Same as Manager View */}
      <div className={styles.bottomBar}>
        <div className={styles.leftActions}>
          <AccessibilityMenu />
          <button
            onClick={handleLogout}
            className={styles.logoutIconButton}
            aria-label="Logout"
            title="Logout"
          >
            <Image src="/logout.svg" alt="Logout" width={28} height={28} />
          </button>
          <div className={styles.divider}></div>
          <div className={styles.managerActions}>
            <button
              onClick={() => router.push("/manager")}
              className={styles.navButton}
              title="Back to Manager View"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => router.push("/manager")}
              className={`${styles.navButton} ${styles.navButtonActive}`}
              title="Reports"
            >
              Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
