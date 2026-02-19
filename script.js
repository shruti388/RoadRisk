const API_BASE = "https://roadrisk-xtdc.onrender.com";

// ==================== AUTH GUARD ====================
// Runs on every page (except login/signup) — redirects if not logged in
async function checkAuth() {
  try {
    const res = await fetch(API_BASE + "/api/auth/status", { credentials: "include" });
    const data = await res.json();
    if (!data.loggedIn) {
      alert("⚠️ Please login first!");
      window.location.href = "loginsignup.html";
      return false;
    }
    return true;
  } catch (err) {
    alert("Cannot connect to server. Make sure the backend is running.");
    window.location.href = "loginsignup.html";
    return false;
  }
}

// ==================== LOGOUT ====================
async function logout() {
  await fetch(API_BASE + "/api/auth/logout", { method: "POST", credentials: "include" });
  // Clear all localStorage
  localStorage.clear();
  // Also clear sessionStorage for extra safety
  sessionStorage.clear();
  window.location.href = "loginsignup.html";
}

// ==================== PAGE 1 → PAGE 2 (index.html) ====================
function getWeather() {
  const city = document.getElementById("cityInput").value.trim();

  if (city === "") {
    alert("⚠️ Please enter a city name!");
    return;
  }

  // Use backend proxy instead of direct API call (keeps API key secure)
  fetch(`${API_BASE}/api/weather/${encodeURIComponent(city)}`, {
    credentials: "include"
  })
    .then(response => {
      if (!response.ok) {
        if (response.status === 404) {
          alert("❌ City not found! Please enter a valid city name.");
        } else {
          alert("❌ Weather service error. Please try again.");
        }
        throw new Error("Weather fetch failed");
      }
      return response.json();
    })
    .then(data => {
      localStorage.setItem("weatherData", JSON.stringify(data));
      localStorage.setItem("city", city);

      // Save city to database (Page 1 data)
      fetch(API_BASE + "/api/searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ city: city }),
      })
        .then(res => res.json())
        .then(result => {
          // Store the search ID so we can update it on later pages
          localStorage.setItem("searchId", result.searchId);
          window.location.href = "weather.html";
        })
        .catch(err => {
          console.error("DB save error:", err);
          window.location.href = "weather.html";
        });
    })
    .catch(error => {
      console.log(error);
    });
}


// ==================== PAGE 2 (weather.html) ====================
function showWeather() {
  const data = JSON.parse(localStorage.getItem("weatherData"));

  document.getElementById("temp").innerText =
    ` 🌡️ Temperature: ${data.main.temp} °C`;

  document.getElementById("wind").innerText =
    `💨 Wind Speed: ${data.wind.speed} m/s`;

  document.getElementById("humidity").innerText =
    `💧 Humidity: ${data.main.humidity}%`;

  document.getElementById("condition").innerText =
    ` 🌤️ Condition: ${data.weather[0].main}`;

  // Save weather details to database (Page 2 data)
  const searchId = localStorage.getItem("searchId");
  if (searchId) {
    fetch(API_BASE + "/api/searches/" + searchId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        temperature: data.main.temp,
        wind_speed: data.wind.speed,
        humidity: data.main.humidity,
        weather_condition: data.weather[0].main,
      }),
    }).catch(err => console.error("DB update error:", err));
  }

  setTimeout(() => {
    window.location.href = "risk.html";
  }, 8000);
}

// ==================== PAGE 3 (risk.html) ====================
function showRisk() {
  const data = JSON.parse(localStorage.getItem("weatherData"));
  const condition = data.weather[0].main.toLowerCase();
  let score = 0;
  let name = "LOW";

  if (condition.includes("thunder")) { score = 90; name = "HIGH"; }
  else if (condition.includes("snow")) { score = 80; name = "HIGH"; }
  else if (condition.includes("rain")) { score = 60; name = "MODERATE"; }
  else if (condition.includes("fog")) { score = 50; name = "MODERATE"; }
  else { score = 20; name = "LOW"; }

  // Display score and risk category
  document.getElementById("riskScore").innerText = score;
  document.getElementById("riskName").innerText = name;

  // Change risk-box color based on category
  const riskBox = document.querySelector(".risk-box");
  if (name === "HIGH") riskBox.style.background = "rgba(255, 0, 0, 0.2)";
  else if (name === "MODERATE") riskBox.style.background = "rgba(255, 165, 0, 0.2)";
  else riskBox.style.background = "rgba(0, 255, 0, 0.2)";

  // Store condition text to display later
  localStorage.setItem("riskCondition", condition);

  // Save risk assessment to database (Page 3 data)
  const searchId = localStorage.getItem("searchId");
  if (searchId) {
    fetch(API_BASE + "/api/searches/" + searchId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        risk_score: score,
        risk_level: name,
      }),
    }).catch(err => console.error("DB update error:", err));
  }

  // Redirect to image page after 8 seconds
  setTimeout(() => {
    window.location.href = "image.html";
  }, 8000);
}

// Toggle weather condition display when button clicked
function toggleCondition() {
  const conditionDiv = document.getElementById("weatherCondition");
  const condition = localStorage.getItem("riskCondition");

  if (conditionDiv.style.display === "none" || conditionDiv.style.display === "") {
    conditionDiv.style.display = "block";
    const score = parseInt(document.getElementById("riskScore").innerText);
    let displayCondition = "";

    if (score >= 70) displayCondition = "Severe Weather Condition";
    else if (score >= 40) displayCondition = "Moderate Weather Condition";
    else displayCondition = "Normal Weather Condition";

    conditionDiv.innerText = `Weather: ${displayCondition} (${condition})`;
  } else {
    conditionDiv.style.display = "none";
  }
}

// ==================== PAGE 4 (image.html) ====================
function showImage() {
  const data = JSON.parse(localStorage.getItem("weatherData"));
  const condition = data.weather[0].main.toLowerCase();
  const img = document.getElementById("conditionImg");
  const riskLevelDiv = document.getElementById("riskLevel");
  const riskMessageDiv = document.getElementById("riskMessage");

  let riskLevel = "LOW";
  let riskMessage = "Safe to drive 🚗";
  let imgSrc = "clearCloud.jpg";

  if (condition.includes("thunder") || condition.includes("storm")) {
    imgSrc = "storm.jpg";
    riskLevel = "HIGH";
    riskMessage = "Avoid travel! ⚠️";
  } else if (condition.includes("snow")) {
    imgSrc = "snow.jpg";
    riskLevel = "HIGH";
    riskMessage = "High risk! Drive carefully! ❄️";
  } else if (condition.includes("rain")) {
    imgSrc = "rain.jpg";
    riskLevel = "MODERATE";
    riskMessage = "Moderate risk! Drive carefully 🌧️";
  } else if (condition.includes("fog")) {
    imgSrc = "fog.jpg";
    riskLevel = "MODERATE";
    riskMessage = "Moderate risk! Drive cautiously 🌫️";
  } else {
    imgSrc = "clearCloud.jpg";
    riskLevel = "LOW";
    riskMessage = "Safe to drive 🚗";
  }

  img.src = imgSrc;
  riskLevelDiv.innerText = `Risk Level: ${riskLevel}`;
  riskMessageDiv.innerText = riskMessage;

  // Save road condition to database (Page 4 data)
  const searchId = localStorage.getItem("searchId");
  if (searchId) {
    fetch(API_BASE + "/api/searches/" + searchId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        risk_message: riskMessage,
        condition_image: imgSrc,
      }),
    }).catch(err => console.error("DB update error:", err));
  }
}

// ==================== NAVIGATION ====================
function goBack() {
  window.location.href = "index.html";
}

function goToUpdate() {
  window.location.href = "update.html";
}




