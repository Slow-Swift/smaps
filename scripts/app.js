'use strict';

import { load_graph, find_closest_node } from "./graph_loader.js";
import { MOA_Star } from "./moastar.js";
import { Heap } from "./heap.js";
import { Graph } from "./graph.js";
import { Vector } from "./vector.js";
window.onload = on_load;
window.Heap = Heap;

async function on_load() {
    console.log("Loaded");
    initialize_map();
    await initialize_graph();
}

async function initialize_graph() {
    window.graph = await load_graph();
    for (let edge_data of window.graph.iterEdges()) {
        let length = edge_data.length;
        let crossing = edge_data.tags?.footway == "crossing" ? 1 : 0;
        let weight = new Vector(length, crossing);
        edge_data.weight = weight;
    }
    window.namoa_star = new MOA_Star(graph, (v) => Vector.zeros(2), 2, 'weight');
}

function initialize_map() {
    let map = L.map('map').setView([49.21, -122.92], 15);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    window.route_layer = L.layerGroup().addTo(map);

    create_markers(map);

    document.getElementById('btn-calculate-routes').onclick = on_calculate_routes_pressed;
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
    
    map.on('click', (e) => update_marker(start_marker, start_node_marker, e.latlng, true));
    
    map.on('contextmenu', (e) => update_marker(end_marker, end_node_marker, e.latlng, false));
}

function update_marker(pos_marker, node_marker, pos, is_start) {
    pos_marker.setLatLng(pos);
    pos_marker.setOpacity(1);
    node_marker.setStyle({opacity: 1, fillOpacity: 1})
    const nearest_node = find_closest_node(window.graph, [pos.lat, pos.lng]);
    node_marker.setLatLng(nearest_node.latlon);

    if (is_start) {
        window.start_node_id = nearest_node.id;
    } else {
        window.end_node_id = nearest_node.id;
    }
}

function on_calculate_routes_pressed() {
    const start_node_id = window.start_node_id;
    const end_node_id = window.end_node_id;
    if (start_node_id == undefined || end_node_id == undefined) {
        console.log("Does not have both start and end nodes.");
        return;
    }

    route_layer.clearLayers();

    console.log("Calculating Routes...");
    let paths = window.namoa_star.pathfind(start_node_id, end_node_id);
    console.log(`Found ${paths.length} paths.`);

    const colors = ['blue', 'green', 'red', 'yellow', 'orange']
    let i=0;
    for (let path of paths) {
        let [nodes, cost] = path;
        let positions = [];
        for (let node_id of nodes) {
            let node = window.graph.getVertex(node_id);
            positions.push(node.latlon);
        }

        L.polyline(positions, {color: colors[i % colors.length]}).addTo(route_layer);
        i++;
    }
}