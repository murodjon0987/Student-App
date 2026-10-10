"use client";

import * as React from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { cn } from "@/lib/utils";

export interface MapListing {
  id: string;
  lat: number;
  lng: number;
  title: string;
  price: number;
  currency: string;
}

interface Props {
  listings?: MapListing[];
  center?: { lat: number; lng: number };
  zoom?: number;
  pickMode?: boolean;
  value?: { lat: number; lng: number } | null;
  onPick?: (lat: number, lng: number) => void;
  activeId?: string | null;
  onSelect?: (id: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  className?: string;
}

const DEFAULT_CENTER: [number, number] = [41.3111, 69.2797];

function formatPrice(price: number, currency: string) {
  if (currency === "USD") return `$${price}`;
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)} mln`;
  if (price >= 1_000) return `${Math.round(price / 1_000)}k`;
  return String(price);
}

function priceIcon(price: number, currency: string, active: boolean) {
  const label = formatPrice(price, currency);
  const background = active ? "#4f46e5" : "#ffffff";
  const color = active ? "#ffffff" : "#111827";
  const border = active ? "#4f46e5" : "#e5e7eb";
  return L.divIcon({
    className: "",
    html: `<div style="transform:translate(-50%,-100%);background:${background};color:${color};border:1px solid ${border};border-radius:999px;padding:3px 9px;font-size:12px;font-weight:600;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.25)">${label}</div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export default function HousingMap({
  listings = [],
  center,
  zoom = 12,
  pickMode = false,
  value,
  onPick,
  activeId,
  onSelect,
  userLocation,
  className,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const markersRef = React.useRef<Map<string, L.Marker>>(new Map());
  const pickRef = React.useRef<L.Marker | null>(null);
  const userRef = React.useRef<L.Marker | null>(null);
  const onSelectRef = React.useRef(onSelect);
  const onPickRef = React.useRef(onPick);
  const didFitRef = React.useRef(false);

  React.useEffect(() => {
    onSelectRef.current = onSelect;
    onPickRef.current = onPick;
  });

  React.useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: center ? [center.lat, center.lng] : DEFAULT_CENTER,
      zoom,
      zoomControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      if (!pickRef.current) return;
      pickRef.current.setLatLng(event.latlng);
      onPickRef.current?.(event.latlng.lat, event.latlng.lng);
    });

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);

    const markers = markersRef.current;

    return () => {
      map.remove();
      mapRef.current = null;
      markers.clear();
      pickRef.current = null;
      userRef.current = null;
    };
  }, [center, zoom]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || pickMode) return;

    for (const marker of markersRef.current.values()) marker.remove();
    markersRef.current.clear();

    const bounds = L.latLngBounds([]);

    for (const listing of listings) {
      bounds.extend([listing.lat, listing.lng]);
      const marker = L.marker([listing.lat, listing.lng], {
        icon: priceIcon(
          listing.price,
          listing.currency,
          listing.id === activeId
        ),
      });
      marker.bindTooltip(listing.title, { direction: "top", offset: [0, -28] });
      marker.on("click", () => onSelectRef.current?.(listing.id));
      marker.addTo(map);
      markersRef.current.set(listing.id, marker);
    }

    if (!didFitRef.current && bounds.isValid() && listings.length > 0) {
      map.fitBounds(bounds.pad(0.2));
      didFitRef.current = true;
    }
  }, [listings, activeId, pickMode]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !activeId) return;
    const marker = markersRef.current.get(activeId);
    if (marker) {
      map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 14), {
        duration: 0.6,
      });
      marker.openTooltip();
    }
  }, [activeId]);

  React.useEffect(() => {
    const map = mapRef.current;
    if (!map || !pickMode) return;

    if (!pickRef.current) {
      pickRef.current = L.marker(
        value ? [value.lat, value.lng] : map.getCenter(),
        {
          draggable: true,
          icon: L.divIcon({
            className: "",
            html: `<div style="transform:translate(-50%,-100%);display:flex;align-items:center;justify-content:center;width:30px;height:30px;background:#4f46e5;border:3px solid #fff;border-radius:50% 50% 50% 0;rotate:-45deg;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 30],
          }),
        }
      ).addTo(map);
      pickRef.current.on("dragend", () => {
        const pos = pickRef.current?.getLatLng();
        if (pos) onPickRef.current?.(pos.lat, pos.lng);
      });
    }

    if (value) {
      pickRef.current.setLatLng([value.lat, value.lng]);
      map.setView([value.lat, value.lng], Math.max(map.getZoom(), 14));
    }
  }, [pickMode, value]);

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
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgba(37,99,235,.25)"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      }),
    })
      .bindTooltip("Siz")
      .addTo(map);
  }, [userLocation]);

  return (
    <div ref={containerRef} className={cn("relative isolate z-0", className)} />
  );
}
