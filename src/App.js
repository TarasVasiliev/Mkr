import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
} from "recharts";
import "./index.css";

const API_ENDPOINT = "http://localhost:8000/api";

export default function UrlShortenerApp() {
  const [currentView, setCurrentView] = useState("signin");
  const [authToken, setAuthToken] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [shortenedUrls, setShortenedUrls] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [notification, setNotification] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [setDataRefreshKey] = useState(0);
  const [urlInput, setUrlInput] = useState({ url: "" });
  const [signinCredentials, setSigninCredentials] = useState({
    username: "",
    password: "",
  });
  const [signupCredentials, setSignupCredentials] = useState({
    username: "",
    password: "",
    displayName: "",
  });
  const handleSignin = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("username", signinCredentials.username);
      formData.append("password", signinCredentials.password);
      const response = await fetch(`${API_ENDPOINT}/login`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }
      const data = await response.json();
      setAuthToken(data.access_token);
      setSigninCredentials({ username: "", password: "" });
      setErrorMsg("");
      await fetchUserInfo(data.access_token);
    } catch (err) {
      setErrorMsg("Invalid credentials. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };
  const handleSignup = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: signupCredentials.username,
          password: signupCredentials.password,
          full_name: signupCredentials.displayName,
        }),
      });
      setCurrentView("signin");
      setSignupCredentials({ username: "", password: "", displayName: "" });
      setErrorMsg("");
    } catch (err) {
      setErrorMsg("Username already exists.");
    } finally {
      setIsProcessing(false);
    }
  };
  const handleSignout = () => {
    setAuthToken("");
    setCurrentUser(null);
    setShortenedUrls([]);
    setCurrentView("signin");
  };
  const fetchUserInfo = async (token) => {
    try {
      const response = await fetch(`${API_ENDPOINT}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      setCurrentUser(data);
      setCurrentView("dashboard");
    } catch (err) {
      setErrorMsg("Failed to load user data");
      setAuthToken("");
    }
  };
  const fetchUrlList = async () => {
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/me/urls`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      setShortenedUrls(data);
    } catch (err) {
      setErrorMsg("Could not fetch URLs");
    } finally {
      setIsProcessing(false);
    }
  };
  const handleUrlRedirect = async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    fetchUrlList();
    setDataRefreshKey((prev) => prev + 1);
  };
  const shortenUrl = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/me/urls`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(urlInput),
      });
      setUrlInput({ url: "" });
      fetchUrlList();
    } catch (err) {
      setErrorMsg("URL shortening failed");
    } finally {
      setIsProcessing(false);
    }
  };
  useEffect(() => {
    if (authToken) {
      fetchUrlList();
    }
  }, [authToken]);

  const UrlAnalytics = ({ urlData }) => {
    const [analyticsData, setAnalyticsData] = useState([]);
    const [timeframe, setTimeframe] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const timeframes = [
      {
        id: 0,
        name: "Minutes",
        format: (date) =>
          `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")}`,
      },
      {
        id: 1,
        name: "Hours",
        format: (date) => `${date.toLocaleDateString()} ${date.getHours()}:00`,
      },
      {
        id: 2,
        name: "Days",
        format: (date) => date.toLocaleDateString(),
      },
    ];
    useEffect(() => {
      const fetchAnalytics = async () => {
        setIsLoading(true);
        try {
          const response = await fetch(
            `${API_ENDPOINT}/me/links/${urlData.short}/redirects`,
            {
              headers: { Authorization: `Bearer ${authToken}` },
            }
          );
          const clicks = await response.json();
          const selectedTimeframe = timeframes.find(
            (tf) => tf.id === timeframe
          );
          const groupedData = clicks.reduce((acc, timestamp) => {
            const date = new Date(timestamp);
            const key = selectedTimeframe.format(date);
            acc[key] = (acc[key] || 0) + 1;
            return acc;
          }, {});
          const chartData = Object.entries(groupedData)
            .map(([time, clicks]) => ({
              time,
              clicks,
            }))
            .sort((a, b) => new Date(a.time) - new Date(b.time));
          setAnalyticsData(chartData);
        } catch (err) {
          console.error("Analytics fetch failed");
        } finally {
          setIsLoading(false);
        }
      };
      fetchAnalytics();
    }, [urlData.short, timeframe, authToken]);
    return (
      <div className="mt-6">
        <div className="flex space-x-4">
          <div className="flex flex-col space-y-2 min-w-[100px]">
            <button
              className={`px-4 py-2 ${
                timeframe === 0
                  ? "bg-white text-black"
                  : "border border-white text-white"
              } transition-colors`}
              onClick={() => setTimeframe(0)}
            >
              Minutes
            </button>
            <button
              className={`px-4 py-2 ${
                timeframe === 1
                  ? "bg-white text-black"
                  : "border border-white text-white"
              } transition-colors`}
              onClick={() => setTimeframe(1)}
            >
              Hours
            </button>
            <div className="flex flex-col">
              <button
                className={`px-4 py-2 ${
                  timeframe === 2
                    ? "bg-white text-black"
                    : "border border-white text-white"
                } transition-colors`}
                onClick={() => setTimeframe(2)}
              >
                Days
              </button>
              <div className="text-white text-center text-sm mt-1">
                {urlData.redirects} clicks
              </div>
            </div>
          </div>
          <div className="flex-1">
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-white border-t-transparent"></div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={analyticsData}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#ffffff"
                      opacity={0.1}
                    />
                    <XAxis dataKey="time" stroke="#fff" />
                    <YAxis stroke="#fff" />
                    <ChartTooltip
                      contentStyle={{
                        backgroundColor: "#000",
                        border: "1px solid #fff",
                        color: "#fff",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="clicks"
                      stroke="#fff"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#fff" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  const renderUrlCard = (urlData) => (
    <div key={urlData.short} className="mb-6 p-6 bg-black border border-white">
      <div className="flex justify-between items-center mb-4">
        <p className="text-white truncate flex-1 mr-4">{urlData.url}</p>
      </div>

      <div className="flex items-center gap-2 bg-black border border-white p-3">
        <text className="flex-1 text-white">
          localhost:8000/{urlData.short}
        </text>
        <button
          onClick={() =>
            navigator.clipboard.writeText(
              `http://localhost:8000/${urlData.short}`
            )
          }
          className="p-2 hover:bg-white hover:text-black text-white border border-white"
        >
          Copy
        </button>
        <a
          href={`http://localhost:8000/${urlData.short}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleUrlRedirect}
          className="p-2 hover:bg-white hover:text-black text-white border border-white"
        >
          Open
        </a>
      </div>

      <UrlAnalytics urlData={urlData} />
    </div>
  );
  const renderSignin = () => (
    <div className="max-w-md mx-auto">
      <h2 className="text-3xl font-bold mb-2 text-white">Sign In</h2>

      <form onSubmit={handleSignin} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Username"
            className="w-full p-3 border border-white bg-black text-white placeholder-white/50"
            value={signinCredentials.username}
            onChange={(e) =>
              setSigninCredentials({
                ...signinCredentials,
                username: e.target.value,
              })
            }
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border border-white bg-black text-white placeholder-white/50"
            value={signinCredentials.password}
            onChange={(e) =>
              setSigninCredentials({
                ...signinCredentials,
                password: e.target.value,
              })
            }
            required
          />
        </div>
        <button
          type="submit"
          className="w-full bg-white text-black p-3 hover:bg-white/90 disabled:opacity-50"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent mx-auto"></div>
          ) : (
            "Sign In"
          )}
        </button>
        <button
          type="button"
          onClick={() => setCurrentView("signup")}
          className="w-full border border-white text-white p-3 hover:bg-white hover:text-black"
        >
          Create Account
        </button>
      </form>
    </div>
  );
  const renderSignup = () => (
    <div className="max-w-md mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-white">Create Account</h2>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <input
            type="text"
            placeholder="Username"
            className="w-full p-3 border border-white bg-black text-white placeholder-white/50"
            value={signupCredentials.username}
            onChange={(e) =>
              setSignupCredentials({
                ...signupCredentials,
                username: e.target.value,
              })
            }
            required
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 border border-white bg-black text-white placeholder-white/50"
            value={signupCredentials.password}
            onChange={(e) =>
              setSignupCredentials({
                ...signupCredentials,
                password: e.target.value,
              })
            }
            required
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="Your Displayed Name"
            className="w-full p-3 border border-white bg-black text-white placeholder-white/50"
            value={signupCredentials.displayName}
            onChange={(e) =>
              setSignupCredentials({
                ...signupCredentials,
                displayName: e.target.value,
              })
            }
          />
        </div>
        <button
          type="submit"
          className="w-full bg-white text-black p-3 hover:bg-white/90 disabled:opacity-50"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent mx-auto"></div>
          ) : (
            "Sign Up"
          )}
        </button>
        <button
          type="button"
          onClick={() => setCurrentView("signin")}
          className="w-full border border-white text-white p-3 hover:bg-white hover:text-black"
        >
          Back to Sign In
        </button>
      </form>
    </div>
  );
  const renderDashboard = () => (
    <div>
      <form onSubmit={shortenUrl} className="flex gap-4 mb-8">
        <div className="flex-1">
          <input
            type="url"
            placeholder="Enter URL"
            className="w-full p-3 border border-white bg-black text-white placeholder-white/50"
            value={urlInput.url}
            onChange={(e) => setUrlInput({ url: e.target.value })}
            required
          />
        </div>
        <button
          type="submit"
          className="px-8 py-3 bg-white text-black hover:bg-white/90 disabled:opacity-50 flex items-center gap-2"
          disabled={isProcessing}
        >
          {isProcessing ? (
            <div className="animate-spin h-5 w-5 border-2 border-black border-t-transparent"></div>
          ) : (
            "Make shorter"
          )}
        </button>
      </form>

      <div className="space-y-6">
        {shortenedUrls.map((url) => renderUrlCard(url))}
      </div>
    </div>
  );
  return (
    <div
      className="min-h-screen bg-black"
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
      }}
    >
      {authToken && (
        <header className="fixed top-0 left-0 right-0 bg-black border-b border-white">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <span className="font-bold text-xl text-white">Short</span>
                <span className="text-white">{currentUser?.username}</span>
              </div>

              <button
                onClick={handleSignout}
                className="p-2 hover:bg-white hover:text-black text-white"
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>
      )}

      <main
        className={`max-w-6xl mx-auto px-4 ${
          authToken ? "pt-24" : "pt-8"
        } pb-8`}
      >
        {errorMsg && (
          <div className="mb-6 p-4 border border-white text-white">
            {errorMsg}
          </div>
        )}
        {notification && (
          <div className="mb-6 p-4 border border-white text-white">
            {notification}
          </div>
        )}

        <div className="bg-black p-6">
          {currentView === "signin" && renderSignin()}
          {currentView === "signup" && renderSignup()}
          {currentView === "dashboard" && renderDashboard()}
        </div>
      </main>
    </div>
  );
}
