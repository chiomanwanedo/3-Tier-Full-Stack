// frontend/src/components/ClusterMap.jsx
import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

export default function ClusterMap({ campgrounds }) {
  const el = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!el.current || !mapboxgl.accessToken) return;

    const features = (campgrounds || [])
      .filter(c => c?.geometry?.coordinates?.length === 2)
      .map(c => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: c.geometry.coordinates },
        properties: {
          id: c._id,
          title: c.title || c.name || "Campground",
          location: c.location || "",
          price: typeof c.price === "number" ? `$${c.price}` : ""
        }
      }));

    const geojson = { type: "FeatureCollection", features };

    const map = new mapboxgl.Map({
      container: el.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [-98.5, 39.8],
      zoom: 3
    });
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("camps", {
        type: "geojson",
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50
      });

      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "camps",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#20a4f3",
          "circle-radius": ["step", ["get", "point_count"], 18, 10, 22, 25, 28],
          "circle-opacity": 0.9
        }
      });

      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "camps",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12
        },
        paint: { "text-color": "#ffffff" }
      });

      map.addLayer({
        id: "unclustered-point",
        type: "circle",
        source: "camps",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": "#11b4da",
          "circle-radius": 6,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#fff"
        }
      });

      map.on("click", "clusters", e => {
        const f = map.queryRenderedFeatures(e.point, { layers: ["clusters"] })[0];
        map.getSource("camps").getClusterExpansionZoom(f.properties.cluster_id, (err, z) => {
          if (!err) map.easeTo({ center: f.geometry.coordinates, zoom: z });
        });
      });

      map.on("click", "unclustered-point", e => {
        const f = e.features[0];
        const p = f.properties || {};
        new mapboxgl.Popup()
          .setLngLat(f.geometry.coordinates)
          .setHTML(`<strong>${p.title || "Campground"}</strong><br>${p.location || ""} ${p.price || ""}`)
          .addTo(map);
      });
    });

    return () => map.remove();
  }, [campgrounds]);

  return <div ref={el} style={{ height: 520, width: "100%", borderRadius: 14, overflow: "hidden", border: "1px solid #1e2633" }} />;
}
