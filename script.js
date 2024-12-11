// Initialize the map using Leaflet with OpenStreetMap tiles
const map = L.map("map").setView([-20.0, 60.0], 5); // Centered on the Indian Ocean

// Add OpenStreetMap tiles to the map
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: "© OpenStreetMap",
}).addTo(map);

// Define routes
const routes = {
  "mumbai-mombasa": [
    [
      [18.76, 72.70], [10.0, 70.0], [5.0, 60.0], [-1.0, 45.0], [-4.0435, 39.6682]
    ],
    [
      [18.76, 72.70], [14.0, 68.0], [8.0, 62.0], [0.0, 50.0], [-4.0435, 39.6682]
    ],
    [
      [18.76, 72.70], [20.0, 72.0], [10.0, 64.0], [0.0, 52.0], [-4.0435, 39.6682]
    ]
  ],
  "mumbai-durban": [
    [
      [18.76, 72.70], [15.0, 70.0], [5.0, 60.0], [-10.0, 50.0], [-29.8587, 31.0218]
    ],
    [
      [18.76, 72.70], [14.0, 68.0], [8.0, 62.0], [-15.0, 45.0], [-29.8587, 31.0218]
    ],
    [
      [18.76, 72.70], [12.0, 66.0], [5.0, 60.0], [-20.0, 40.0], [-29.8587, 31.0218]
    ]
  ],
  
  

  "chennai-durban": [
    [
      [13.0827, 80.2707], [10.0, 85.0], [-10.0, 80.0], [-20.0, 65.0], [-29.8587, 31.0218]
    ],
    [
      [13.0827, 80.2707], [8.0, 90.0], [-15.0, 75.0], [-25.0, 55.0], [-29.8587, 31.0218]
    ],
    [
      [13.0827, 80.2707], [7.0, 92.0], [-12.0, 77.0], [-22.0, 63.0], [-29.8587, 31.0218]
    ]
  ],
  "kochi-colombo": [
    [
      [9.65, 76.2], [7.5, 77.5], [6.5, 78.5], [5.5, 79.0], [4.5, 80.0], [6.9271, 79.8612]
    ],
    [
      [9.65, 76.2], [8.0, 77.2], [7.0, 78.0], [6.5, 79.0], [6.0, 79.5], [6.9271, 79.8612]
    ]
  ],
  "mumbai-muscat": [
  [
    [18.9647, 72.8258], [17.0, 70.0], [15.0, 67.0], [22.0, 61.0], [23.5880, 58.3829]
  ],
  [
    [18.9647, 72.8258], [16.5, 71.5], [14.0, 68.5], [20.5, 62.0], [23.5880, 58.3829]
  ],
  [
    [18.9647, 72.8258], [17.5, 70.5], [15.5, 66.5], [21.5, 61.5], [23.5880, 58.3829]
  ]
],
"mumbai-singapore": [
    [
      [18.76, 72.70], [15.0, 74.5], [10.0, 76.0], [1.3521, 103.8198]
    ],
    [ 
      [18.76, 72.70], [16.0, 75.5], [12.0, 77.5], [1.3521, 103.8198]
    ],
    [
      [18.76, 72.70], [17.0, 76.0], [13.0, 78.0], [1.3521, 103.8198]
    ]
  ]

};

// Helper: Convert degrees to radians
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// Helper: Calculate distance using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of Earth in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 0.539957; // Convert to nautical miles
}

// Function to fetch weather data
async function fetchWeatherData(lat, lon) {
  const apiKey = "494d383d0c2c5b260c22cbf34a679fdb"; // Replace with your API key
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching weather data:", error);
    return null;
  }
}

// Function to update the fuel dashboard
function updateFuelDashboard(fuelConsumption, fuelEfficiency, estimatedTime) {
  document.getElementById("fuel-info").innerHTML = `
    <p><strong>Fuel Consumption:</strong> ${fuelConsumption.toFixed(2)} L</p>
    <p><strong>Fuel Efficiency:</strong> ${fuelEfficiency} L/Nautical Mile</p>
    <p><strong>Estimated Travel Time:</strong> ${estimatedTime} hours</p>
  `;
}

// Function to evaluate routes based on fuel and weather
async function evaluateRoutes(routePaths) {
  const fuelEfficiency = 8.5; // Liters per nautical mile

  let optimalRoute = null;
  let bestScore = Infinity;
  let optimalFuelConsumption = 0;

  for (const path of routePaths) {
    let totalDistance = 0;
    let weatherPenalty = 0;

    for (let i = 0; i < path.length - 1; i++) {
      totalDistance += calculateDistance(
        path[i][0], path[i][1],
        path[i + 1][0], path[i + 1][1]
      );
    }

    const weatherDataList = await Promise.all(
      path.map(([lat, lon]) => fetchWeatherData(lat, lon))
    );

    weatherDataList.forEach(data => {
      if (data) {
        const severity = data.wind.speed + (data.weather[0]?.main === "Rain" ? 5 : 0);
        weatherPenalty += severity;
      }
    });

    const fuelConsumption = totalDistance * fuelEfficiency;
    const score = fuelConsumption + weatherPenalty;

    if (score < bestScore) {
      bestScore = score;
      optimalRoute = path;
      optimalFuelConsumption = fuelConsumption; // Track the optimal fuel consumption
    }
  }

  return { path: optimalRoute, bestScore, optimalFuelConsumption };
}

// Function to draw all routes and highlight the optimal one
async function drawRoutes(routeKey) {
  const routePaths = routes[routeKey];
  if (!routePaths) {
    console.error("Invalid route key selected.");
    return;
  }

  const { path: optimalPath, optimalFuelConsumption } = await evaluateRoutes(routePaths);

  map.eachLayer((layer) => {
    if (layer instanceof L.Polyline || layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });

  for (const path of routePaths) {
    const color = path === optimalPath ? "green" : "blue";
    L.polyline(path, { color, weight: path === optimalPath ? 1 : 1 }).addTo(map);

    const weatherDataList = await Promise.all(
      path.map(([lat, lon]) => fetchWeatherData(lat, lon))
    );

    weatherDataList.forEach((data, index) => {
      if (data && data.weather[0]) {
        const [lat, lon] = path[index];
        const iconUrl = `http://openweathermap.org/img/wn/${data.weather[0].icon}.png`;
        L.marker([lat, lon], {
          icon: L.icon({
            iconUrl,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
          }),
        }).addTo(map);
      }
    });
  }

  // Update the fuel dashboard dynamically
  const totalDistance = calculateTotalDistance(optimalPath);
  const fuelEfficiency = 8.5; // Liters per nautical mile
  const fuelConsumption = totalDistance * fuelEfficiency;
  const estimatedTime = calculateEstimatedTime(totalDistance);

  updateFuelDashboard(fuelConsumption, fuelEfficiency, estimatedTime);

  // Fetch weather for the optimal route's destination
  if (optimalPath) fetchWeatherForDestination({ path: optimalPath });
}

// Fetch weather data for the destination of the optimal route
async function fetchWeatherForDestination(route) {
  const destination = route.path[route.path.length - 1]; // Get destination coordinates
  const [lat, lon] = destination;

  try {
    const data = await fetchWeatherData(lat, lon);  // Fetch weather data for destination
    if (!data) return;

    const weatherInfo = `
      <p><strong>Weather:</strong> ${data.weather[0].description}</p>
      <p><strong>Temperature:</strong> ${data.main.temp}°C</p>
      <p><strong>Wind Speed:</strong> ${data.wind.speed} m/s</p>
    `;
    
    // Display weather info in the designated weather section
    const weatherInfoContainer = document.getElementById("weather-info");
    weatherInfoContainer.innerHTML = `
      <div class="weather-destination">
        ${weatherInfo}
      </div>
    `;
  } catch (error) {
    console.error("Error fetching destination weather:", error);
  }
}

// Helper function to calculate total distance
function calculateTotalDistance(path) {
  let totalDistance = 0;
  for (let i = 0; i < path.length - 1; i++) {
    totalDistance += calculateDistance(
      path[i][0], path[i][1],
      path[i + 1][0], path[i + 1][1]
    );
  }
  return totalDistance;
}

// Helper function to calculate estimated travel time (in hours)
function calculateEstimatedTime(distance) {
  const averageSpeed = 15; // Assume average speed in knots
  const timeInHours = distance / averageSpeed; // Time = Distance / Speed
  return timeInHours.toFixed(2); // Round to 2 decimal places
}

// Event listener for route selection
document.getElementById("route-selector").addEventListener("change", function () {
  const selectedRoute = this.value;
  drawRoutes(selectedRoute);
});

// Initial setup
const initialRouteKey = "mumbai-mombasa";
drawRoutes(initialRouteKey);
