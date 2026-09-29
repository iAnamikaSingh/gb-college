const PLACE = { lat: 25.300882870559324, lng: 83.66134031389998 }; // replace with your fixed place , 

function haversineKm(a, b) {
  const R = 6371, toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const btn = document.getElementById('locate-btn');
const out = document.getElementById('distance-result');

btn.addEventListener('click', () => {
  if (!('geolocation' in navigator)) {
    out.textContent = 'Your browser does not support location access.';
    return;
  }

  out.textContent = 'Getting your location...';

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const user = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const km = haversineKm(user, PLACE);
      out.innerHTML =
        `You are about <strong>${km.toFixed(1)} km</strong> away (straight line). ` +
        `<a target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&origin=${user.lat},${user.lng}&destination=${PLACE.lat},${PLACE.lng}">Get directions</a>`;
    },
    (err) => {
      const messages = {
        1: 'Location permission was denied. Allow it in your browser settings to see the distance.',
        2: 'Your location could not be determined.',
        3: 'Getting your location timed out. Please try again.'
      };
      out.textContent = messages[err.code] || 'Something went wrong.';
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
});