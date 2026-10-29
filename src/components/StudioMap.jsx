import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { studio } from '../data/studio.js'

export default function StudioMap() {
  const el = useRef(null)

  useEffect(() => {
    const map = L.map(el.current, { scrollWheelZoom: false }).setView(studio.coords, 17)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)

    const icon = L.divIcon({
      className: 'pin',
      html: '<span>Nara</span>',
      iconSize: [64, 76],
      iconAnchor: [32, 76],
      popupAnchor: [0, -70],
    })
    L.marker(studio.coords, { icon, title: studio.name, alt: studio.name })
      .addTo(map)
      .bindPopup(`<strong>${studio.name}</strong><br>${studio.address}<br><a href="${studio.mapsUrl}" target="_blank" rel="noreferrer">Abrir en Google Maps</a>`)

    // Zoom con la rueda solo cuando la persona ya está usando el mapa
    map.on('focus click', () => map.scrollWheelZoom.enable())
    map.on('blur mouseout', () => map.scrollWheelZoom.disable())

    // El contenedor cambia de tamaño al animarse o al girar el teléfono: recentrar en el pin
    const ro = new ResizeObserver(() => {
      map.invalidateSize()
      map.setView(studio.coords, map.getZoom(), { animate: false })
    })
    ro.observe(el.current)
    return () => {
      ro.disconnect()
      map.remove()
    }
  }, [])

  return (
    <div ref={el} className="map" role="region" aria-label={`Mapa con la ubicación de ${studio.name}`}>
      <noscript>
        <a href={studio.mapsUrl}>Ver la ubicación en Google Maps</a>
      </noscript>
    </div>
  )
}
