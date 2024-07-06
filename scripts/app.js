'use strict';

import { load_graph, find_closest_node } from "./graph_loader.js";
import { MOA_Star } from "./moastar.js";
import { Heap } from "./heap.js";
window.onload = on_load;
window.Heap = Heap;

async function on_load() {
    console.log("Loaded");
    initialize();
    window.graph = await load_graph();
}

function initialize() {
    let map = L.map('map').setView([49.21, -122.92], 15);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    create_markers(map);
}

function create_markers(map) {
    const green_icon = L.icon({
        iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        shadowSize: [41, 41]
    })
    
    const start_marker = L.marker([0, 0], {opacity: 0}).addTo(map);
    const end_marker = L.marker([0, 0], {opacity: 0, icon: green_icon}).addTo(map);
    const start_node_marker = L.circleMarker([0,0], {opacity: 1, fillOpacity: 1, radius: 10 }).addTo(map);
    const end_node_marker = L.circleMarker([0,0], {opacity: 0, fillOpacity: 0, radius: 10, color: 'green', fillColor: 'green'}).addTo(map);
    
    map.on('click', (e) => update_marker(start_marker, start_node_marker, e.latlng));
    
    map.on('contextmenu', (e) => update_marker(end_marker, end_node_marker, e.latlng));
}

function update_marker(pos_marker, node_marker, pos) {
    pos_marker.setLatLng(pos);
    pos_marker.setOpacity(1);
    node_marker.setStyle({opacity: 1, fillOpacity: 1})

    const nearest_node = find_closest_node(window.graph, [pos.lat, pos.lng]);
    node_marker.setLatLng(nearest_node.latlon);
}
