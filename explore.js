(() => {
  const statusEl = document.getElementById("exploreStatus");
  const mapEl = document.getElementById("exploreMap");
  const listEl = document.getElementById("exploreListItems");
  const btnEnable = document.getElementById("btnEnableLocation");
  const btnRescan = document.getElementById("btnRescan");

  if (!mapEl || !statusEl || !listEl) return;

  let map = null;
  let playerMarker = null;
  let spawnMarkers = [];
  let lastCenter = { lat: 40.7128, lng: -74.0060 };

  const councils = ["N","E","S","W"];
  const ranks = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  const suits = ["Hearts","Spades","Diamonds","Clubs"];

  function setStatus(text) {
    statusEl.textContent = text;
  }

  function initMap(center) {
    if (!window.L) {
      setStatus("Map library failed to load. Check your connection.");
      return;
    }
    if (map) {
      map.setView([center.lat, center.lng], 16);
      return;
    }
    map = window.L.map(mapEl, {
      zoomControl: true,
      attributionControl: false
    }).setView([center.lat, center.lng], 16);

    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19
    }).addTo(map);
  }

  function setPlayerMarker(center) {
    if (!map) return;
    if (!playerMarker) {
      playerMarker = window.L.circleMarker([center.lat, center.lng], {
        radius: 8,
        color: "#00ffa6",
        weight: 2,
        fillColor: "#00ffa6",
        fillOpacity: 0.35
      }).addTo(map);
      playerMarker.bindPopup("You are here");
    } else {
      playerMarker.setLatLng([center.lat, center.lng]);
    }
  }

  function clearSpawns() {
    spawnMarkers.forEach(marker => marker.remove());
    spawnMarkers = [];
    listEl.innerHTML = "";
  }

  function randomSpawn(center, radiusMeters) {
    const r = radiusMeters;
    const latOffset = (Math.random() - 0.5) * (r * 2) / 111111;
    const lngOffset = (Math.random() - 0.5) * (r * 2) / (111111 * Math.cos(center.lat * Math.PI / 180));
    return {
      lat: center.lat + latOffset,
      lng: center.lng + lngOffset
    };
  }

  function spawnCards(center) {
    if (!map) return;
    clearSpawns();
    const count = 12;
    for (let i = 0; i < count; i += 1) {
      const pos = randomSpawn(center, 350);
      const suit = suits[Math.floor(Math.random() * suits.length)];
      const council = councils[Math.floor(Math.random() * councils.length)];
      const rank = ranks[Math.floor(Math.random() * ranks.length)];
      const label = `${rank} of ${suit} (${council})`;

      const marker = window.L.circleMarker([pos.lat, pos.lng], {
        radius: 7,
        color: "#ffb34a",
        weight: 2,
        fillColor: "#ffb34a",
        fillOpacity: 0.25
      }).addTo(map);
      marker.bindPopup(`Signal: ${label}<br/><small>Tap to engage</small>`);
      spawnMarkers.push(marker);

      const row = document.createElement("div");
      row.className = "explore-item";
      row.innerHTML = `<span>${label}</span><span class="tag">Signal</span>`;
      listEl.appendChild(row);
    }
  }

  function handleLocationSuccess(position) {
    lastCenter = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    setStatus("Location locked. Scanning for card signals...");
    initMap(lastCenter);
    setPlayerMarker(lastCenter);
    spawnCards(lastCenter);
  }

  function handleLocationError() {
    setStatus("Location unavailable. Showing a default area.");
    initMap(lastCenter);
    setPlayerMarker(lastCenter);
    spawnCards(lastCenter);
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      handleLocationError();
      return;
    }
    navigator.geolocation.getCurrentPosition(handleLocationSuccess, handleLocationError, {
      enableHighAccuracy: true,
      timeout: 8000
    });
  }

  btnEnable?.addEventListener("click", requestLocation);
  btnRescan?.addEventListener("click", () => {
    if (!map) {
      requestLocation();
      return;
    }
    setStatus("Rescanning nearby streets...");
    spawnCards(lastCenter);
  });

  // Boot with a default view so the panel isn't empty
  initMap(lastCenter);
})();
