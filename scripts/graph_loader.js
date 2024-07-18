import { Graph } from "./graph.js";

let custom_ids = -1;

export async function load_graph(max_edge_dst) {
    console.log("Loading graph...")
    
    let elements = await get_sidewalk_json();
    console.log(`Loaded JSON with ${elements.length} elements.`);

    console.log("Building graph...")
    let graph = build_graph(elements, max_edge_dst);
    console.log(`Built graph with ${graph.order} nodes and ${graph.size} edges.`)

    await getNodeElevations(graph);

    return graph;
}


/**
 * Find the closest node in a graph to a given point
 * @param {Graph} graph The graph the search in
 * @param {number[]} latlon [lat, lon] The position to search from
 * @returns {Object} The closest node in graph to latlon
 */
export function find_closest_node(graph, latlon) {
    let min_dst = Infinity;
    let closest_node;

    for (let [_, node] of graph.iter_vertices()) {
        const distance = haversine(latlon, node.latlon);
        if (distance < min_dst) {
            min_dst = distance;
            closest_node = node;
        }
    }

    return closest_node;
}

async function get_sidewalk_json() {
    let result = await fetch("/data/sidewalks.json").then(
        (data)=>data.json()
    );

    return result.elements; 
}

function build_graph(elements, max_edge_dst) {
    const graph = new Graph();

    // Add nodes to the graph
    for (let element of elements) {
        if (element.type == "node") {
            add_node_to_graph(graph, element);
        }
    }

    // Add edges to the graph
    for (let element of elements) {
        if (element.type == "way") {
            add_way_to_graph(graph, element, max_edge_dst);
        }
    }

    return graph;
}

async function getNodeElevations(graph, max_edge_dst) {
    const locations = []
    const data = {locations: locations};
    for (const node of graph.iter_vertices()) {
        locations.push({
            latitude: node[1].latlon[0],
            longitude: node[1].latlon[1],
        })
    }

    const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }

    const file_prefix = max_edge_dst ? max_edge_dst : "unlimited"
    const elevations = await fetch(`/data/sidewalk_elevations_${file_prefix}.json`).then(
        (data)=>data.json()
    ).catch(async e => {
        console.log("Fetching Node Elevations");
            const response = await fetch(
                "https://api.open-elevation.com/api/v1/lookup", 
                {
                    method: "POST",
                    headers: headers,
                    body: JSON.stringify(data)
                }
            ).then(
                (data)=>data.json()
            );
            console.log("Fetched Node Elevations");
            return response.results;
        }
    );
     
    window.elevationText = elevations;

    let i = 0; 
    for (const node of graph.iter_vertices()) {
        node[1].elevation = elevations[i].elevation;
        if (node[1].tags == undefined) node[1].tags = {};
        node[1].tags.ele = elevations[i].elevation;
        i++;
    }

    console.log("Loaded node elevations");
}

function add_node_to_graph(graph, node) {
    const node_data = {
        id: node.id,
        latlon: [node.lat, node.lon],
        tags: node.tags
    };

    graph.addVertex(node.id, node_data);
}

function add_way_to_graph(graph, way, max_dst) {
    const nodes = way.nodes;
    if (way.id == 1077846306) {
        console.log("hey");
    }

    // Add all the edges that make up the way
    for (let i = 0, j = 1; j < nodes.length; i++, j++) {
        // Calculate edge length
        let node_0 = graph.getVertex(nodes[i]);
        const node_1 = graph.getVertex(nodes[j]);
        let distance = haversine(node_0.latlon, node_1.latlon);

        if (max_dst && distance > max_dst) {
            let count = Math.ceil(distance / max_dst);
            let dlat = (node_1.latlon[0] - node_0.latlon[0]) / count;
            let dlon = (node_1.latlon[1] - node_0.latlon[1]) / count;
            for (let k=1; k<count; k++) {
                let newLat = node_0.latlon[0] + dlat;
                let newLon = node_0.latlon[1] + dlon;
                const newNode = {
                    id: custom_ids--,
                    lat: newLat,
                    lon: newLon,
                    latlon: [newLat, newLon],
                }
                add_node_to_graph(graph, newNode);

                const distance = haversine(node_0.latlon, newNode.latlon);
                const edge_data = {
                    way_id: way.id,
                    tags: way.tags,
                    length: distance,
                };
                graph.addEdge(node_0.id, newNode.id, edge_data);
                node_0 = newNode;
            }
        }
        distance = haversine(node_0.latlon, node_1.latlon);

        // Add edge to the graph
        const edge_data = {
            way_id: way.id,
            tags: way.tags,
            length: distance,
        };
        graph.addEdge(node_0.id, node_1.id, edge_data);
    }
}

/**
 * Calculates the haversine distance between point A and B.
 * From: https://www.movable-type.co.uk/scripts/latlong.html
 * @param {number[]} latlonA [lat, lon] pointA.
 * @param {number[]} latlonB [lat, lon] pointB.
 * @returns {number} The distance between point A and B.
 */
function haversine([lat1, lon1], [lat2, lon2]) {
    const EARTH_RADIUS_METERS = 6371e3;
    const lat1Radian = lat1 * Math.PI / 180;
    const lat2Radian = lat2 * Math.PI / 180;
    const dlatRadian = (lat2 - lat1) * Math.PI / 180;
    const dlonRadian = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dlatRadian / 2) * Math.sin(dlatRadian / 2) +
            Math.cos(lat1Radian) * Math.cos(lat2Radian) *
            Math.sin(dlonRadian / 2) * Math.sin(dlonRadian / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = EARTH_RADIUS_METERS * c;
    return distance;
}

window.haversine = haversine