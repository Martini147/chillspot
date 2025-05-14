import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import './Map.css';

const tileLayers = {
  streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://osm.org/">OpenStreetMap</a> contributors',
  },
  satellite: {
    base: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics',
    },
    labels: {
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      attribution: '',
    },
  },
};

const DEFAULT_CENTER = [48.1485965, 17.1077477];

// 🖼️ custom marker icon
const markerIcon = new L.Icon({
  iconUrl: '/marker-icon.png',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

export default function Map() {
  const [markers, setMarkers] = useState([]);
  const [adding, setAdding] = useState(false);
  const [tempMarkerPos, setTempMarkerPos] = useState(null);
  const [currentLayer, setCurrentLayer] = useState('satellite');
  const [tempData, setTempData] = useState({
    title: '',
    description: '',
    image: null,
  });

  // Fetch markers from the database
  useEffect(() => {
    const fetchMarkers = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/markers');
        const data = await response.json();
        setMarkers(data);
      } catch (error) {
        console.error('Error fetching markers:', error);
      }
    };

    fetchMarkers();
  }, []);

  const MapControls = () => {
    const map = useMap();
    const handleAddSpot = () => {
      setAdding(true);
      setTempMarkerPos(map.getCenter());
      setTempData({ title: '', description: '', image: null });
    };

    return (
      <div className="map-controls">
        <button onClick={handleAddSpot}>
          <img src="/pin-plus.png" alt="Add" />
          Add Spot
        </button>
        <button 
          onClick={() => setCurrentLayer('streets')}
          className={currentLayer === 'streets' ? 'active' : ''}
        >
          <img src="/streets-icon.png" alt="Streets" />
          Streets
        </button>
        <button 
          onClick={() => setCurrentLayer('satellite')}
          className={currentLayer === 'satellite' ? 'active' : ''}
        >
          <img src="/satellite-icon.png" alt="Satellite" />
          Satellite
        </button>
      </div>
    );
  };

  const handleSave = async () => {
    if (!tempData.title) {
      alert('Please enter a title.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', tempData.title);
      formData.append('description', tempData.description);
      formData.append('lat', tempMarkerPos[0]);
      formData.append('lng', tempMarkerPos[1]);
      if (tempData.image) {
        formData.append('image', tempData.image);
      }

      const response = await fetch('http://localhost:5000/api/markers', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save marker');
      }

      const newMarker = await response.json();
      setMarkers([...markers, newMarker]);
      setAdding(false);
      setTempMarkerPos(null);
      setTempData({ title: '', description: '', image: null });
    } catch (error) {
      console.error('Error saving marker:', error);
      alert('Failed to save marker. Please try again.');
    }
  };

  const handleCancel = () => {
    setAdding(false);
    setTempMarkerPos(null);
    setTempData({ title: '', description: '', image: null });
  };

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={10}
      style={{ height: '100vh', width: '100%' }}
    >
      {currentLayer === 'streets' && (
        <TileLayer
          url={tileLayers.streets.url}
          attribution={tileLayers.streets.attribution}
        />
      )}

      {currentLayer === 'satellite' && (
        <>
          <TileLayer
            url={tileLayers.satellite.base.url}
            attribution={tileLayers.satellite.base.attribution}
          />
          <TileLayer
            url={tileLayers.satellite.labels.url}
          />
        </>
      )}

      <MapControls />

      {markers.map((m) => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={markerIcon}>
          <Popup>
            <strong>{m.title}</strong>
            <p>{m.description}</p>
            {m.image_url && (
              <img src={`http://localhost:5000${m.image_url}`} alt="Spot" style={{ width: '100%', marginTop: '5px' }} />
            )}
          </Popup>
        </Marker>
      ))}

      {adding && tempMarkerPos && (
        <Marker
          position={tempMarkerPos}
          icon={markerIcon}
          draggable={true}
          eventHandlers={{
            dragend: (e) => {
              setTempMarkerPos([
                e.target.getLatLng().lat,
                e.target.getLatLng().lng,
              ]);
            },
          }}
        >
          <Popup closeOnClick={false} autoClose={false}>
            <div className="form-container">
              <p className="form-warning">
                ⚠️ <strong>Drag the marker</strong> to the desired location before saving.
              </p>
              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={tempData.title}
                  onChange={(e) =>
                    setTempData({ ...tempData, title: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  value={tempData.description}
                  onChange={(e) =>
                    setTempData({ ...tempData, description: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">Upload image</label>
                <input
                  type="file"
                  className="form-file-input"
                  accept="image/*"
                  onChange={(e) =>
                    setTempData({ ...tempData, image: e.target.files[0] })
                  }
                />
              </div>
              {tempData.image && (
                <div className="form-group">
                  <img
                    src={URL.createObjectURL(tempData.image)}
                    alt="Preview"
                    className="image-preview"
                  />
                </div>
              )}
              <div className="button-container">
                <button onClick={handleSave} className="map-button save-button">
                  <img src="/check-mark.png" alt="Save" width="20" height="20" />
                  Save
                </button>
                <button onClick={handleCancel} className="map-button cancel-button">
                  <img src="/cancel-icon.png" alt="Cancel" width="20" height="20" />
                  Cancel
                </button>
              </div>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
