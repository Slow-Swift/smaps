import { find_closest_node } from "./graph_loader.js";

export class MapManager {
    #clickListener = null;
    #rightClickListener = null;

    constructor(graph) {
        this.graph = graph;
        this.map = L.map('map').setView([49.21, -122.92], 15);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(this.map);

        this.#createMarkers();

        this.routes = [];
        this.routeLayer = L.layerGroup().addTo(this.map);

        this.map.on('click', this.#onclick.bind(this));
        this.map.on('contextmenu', this.#onrightclick.bind(this));
    }

    moveMarker(pos, isStart) {
        const posMarker = isStart ? this.startMarker : this.endMarker;
        const nodeMarker = isStart ? this.startNodeMarker : this.endNodeMarker;

        posMarker.setOpacity(1);
        posMarker.setLatLng(pos);
        const nearestNode = find_closest_node(this.graph, [pos.lat, pos.lng]);
        nodeMarker.setLatLng(nearestNode.latlon);
        nodeMarker.setStyle({opacity: 1, fillOpacity: 1})

        if (isStart) {
            this.startNodeId = nearestNode.id;
        } else {
            this.endNodeId = nearestNode.id;
        }
    }

    pathfind(profile) {
        if (this.startNodeId == undefined || this.endNodeId == undefined) {
            alert("Please choose a start and end location.");
            return;
        }

        this.routes = [];
        this.routeLayer.clearLayers();

        console.log("Calculating Routes...");
        const paths = window.namoa_star.pathfind(this.startNodeId, this.endNodeId, profile);
        console.log(`Found ${paths.length} paths.`);

        const colors = ['blue', 'green', 'red', 'yellow', 'orange']
        let i=0;
        for (let path of paths) {
            const [nodes, cost] = path;

            // Find the path positions
            const positions = [];
            for (let nodeId of nodes) {
                let node = this.graph.getVertex(nodeId);
                positions.push(node.latlon);
            }

            // Create a line for the positions
            const route = L.polyline(
                positions, 
                {
                    color: colors[i % colors.length], 
                    weight: 5,
                    bubblingMouseEvents: false
                }
            ).addTo(this.routeLayer);

            route.on("mouseover", (e) => route.setStyle({weight: 20}));
            route.on("mouseout", (e) => route.setStyle({weight: 5}));
            route.bindPopup(`<p><strong>Route ${i+1}</strong><br>Length: ${Math.round(cost[0])}<br>Elevation: ${cost[1]}</p>`);
            this.routes.push(route);
            i++;
        }

        window.updateRouteDropdown(paths.length);
    }

    setRouteVisibility(routeIndex, isVisible) {
        if (isVisible) {
            this.routes[routeIndex].addTo(this.routeLayer);
        } else {
            this.routes[routeIndex].remove();
        }
    }

    setRouteBold(routeIndex, isBold) {
        const weight = isBold ? 20 : 5;
        this.routes[routeIndex].setStyle({weight: weight});
    }

    addLayer(layer) {
        layer.addTo(this.map);
    }

    setClickListener(listener) {
        this.#clickListener = listener;
    }

    setRightClickListener(listener) {
        this.#rightClickListener = listener;
    }

    resetClickListener() { this.#clickListener = null }
    resetRightClickListener() { this.#rightClickListener = null }

    #createMarkers() {
        const greenIcon = L.icon({
            iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            shadowSize: [41, 41]
        });
    
        this.markerLayer = L.layerGroup().addTo(this.map);
        this.startMarker = L.marker([0, 0], {opacity: 0}).addTo(this.markerLayer);
        this.endMarker = L.marker([0, 0], {opacity: 0, icon: greenIcon}).addTo(this.markerLayer);
        this.startNodeMarker = L.circleMarker([0,0], {opacity: 0, fillOpacity: 0, radius: 10 }).addTo(this.markerLayer);
        this.endNodeMarker = L.circleMarker([0,0], {opacity: 0, fillOpacity: 0, radius: 10, color: 'green', fillColor: 'green'}).addTo(this.markerLayer);
    }

    #onclick(e) {
        if (this.#clickListener == null) {
            this.moveMarker(e.latlng, true);
        } else {
            this.#clickListener(e);
        }
    }

    #onrightclick(e) {
        if (this.#rightClickListener == null) {
            this.moveMarker(e.latlng, false);
        } else {
            this.#rightClickListener(e);
        }
    }
}