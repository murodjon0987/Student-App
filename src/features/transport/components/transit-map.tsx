"use client";

import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  mode: string;
  color?: string;
}

export interface MapLine {
  id: string;
  color: string;
  mode: string;
  geometry: [number, number][];
}

interface Props {
  stops: MapStop[];
  lines: MapLine[];
  showBus?: boolean;
  routeCoords?: [number, number][];
  userLocation?: { lat: number; lng: number } | null;
  focus?: { lat: number; lng: number; zoom?: number } | null;
  onSelectStop?: (id: string) => void;
  className?: string;
}

const METRO_FALLBACK = "#6366f1";
const BUS_COLOR = "#0ea5e9";

export default function TransitMap({
  stops,
  lines,
  showBus = false,
  routeCoords,
  userLocation,
  focus,
  onSelectStop,
  className,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const layersRef = React.useRef<L.LayerGroup | null>(null);
  const userRef = React.useRef<L.Marker | null>(null);
  const routeRef = React.useRef<L.Polyline | null>(null);
  const didFitRef = React.useRef(false);

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [41.311, 69.279],
      zoom: 12,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    layersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    setTimeout(() => map.invalidateSize(), 200);

    return () => {
      map.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    const map = mapRef.current;
    const group = layersRef.current;
    if (!map || !group) return;

    group.clearLayers();
    const renderer = L.canvas({ padding: 0.5 });

    for (const line of lines) {
      if (!line.geometry || line.geometry.length < 2) continue;
      const isMetro = line.mode === "METRO";
      if (!isMetro && !showBus) continue;
      L.polyline(line.geometry as [number, number][], {
        color: line.color,
        weight: isMetro ? 5 : 3,
        opacity: isMetro ? 0.9 : 0.5,
        interactive: false,
      }).addTo(group);
    }

    const bounds = L.latLngBounds([]);

    for (const stop of stops) {
      if (stop.mode !== "METRO" && !showBus) continue;
      const isMetro = stop.mode === "METRO";
      bounds.extend([stop.lat, stop.lng]);

      if (isMetro) {
        const color = stop.color ?? METRO_FALLBACK;
        const marker = L.marker([stop.lat, stop.lng], {
          icon: L.divIcon({
            className: "",
            html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,.45)"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8],
          }),
        });
        marker.bindTooltip(stop.name, { direction: "top" });
        if (onSelectStop) marker.on("click", () => onSelectStop(stop.id));
        marker.addTo(group);
      } else {
        L.circleMarker([stop.lat, stop.lng], {
          renderer,
          radius: 4,
          color: BUS_COLOR,
          weight: 1,
          fillColor: BUS_COLOR,
          fillOpacity: 0.7,
        })
          .bindTooltip(stop.name, { direction: "top" })
          .on("click", () => onSelectStop?.(stop.id))
          .addTo(group);
      }
    }

    if (!didFitRef.current && bounds.isValid() && !focus) {
      map.fitBounds(bounds.pad(0.15));
      didFitRef.current = true;
    }
  }, [stops, lines, showBus, onSelectStop, focus]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (userRef.current) {
      userRef.current.remove();
      userRef.current = null;
    }
    if (!userLocation) return;
    userRef.current = L.marker([userLocation.lat, userLocation.lng], {
      icon: L.divIcon({
        className: "",
        html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      }),
    })
      .bindTooltip("Sizning joylashuvingiz")
      .addTo(map);
    map.setView([userLocation.lat, userLocation.lng], 14);
  }, [userLocation]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (routeRef.current) {
      routeRef.current.remove();
      routeRef.current = null;
    }
    if (!routeCoords || routeCoords.length < 2) return;
    routeRef.current = L.polyline(routeCoords, {
      color: "#7c3aed",
      weight: 6,
      opacity: 0.85,
      dashArray: "1 10",
      lineCap: "round",
    }).addTo(map);
    map.fitBounds(routeRef.current.getBounds().pad(0.2));
  }, [routeCoords]);

  React.useEffect(() => {
    if (!focus || !mapRef.current) return;
    mapRef.current.setView([focus.lat, focus.lng], focus.zoom ?? 15);
  }, [focus]);

  return <div ref={containerRef} className={className} />;
}
