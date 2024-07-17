import { Graph } from "./graph.js";

let custom_ids = -1;

export async function load_graph(max_edge_dst) {
    console.log("Loading graph...")
    
    let elements = await get_sidewalk_json();
    console.log(`Loaded JSON with ${elements.length} elements.`);

    console.log("Building graph...")
    let graph = build_graph(elements, max_edge_dst);
    console.log(`Built graph with ${graph.order} nodes and ${graph.size} edges.`)

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

    // Add all the edges that make up the way
    for (let i = 0, j = 1; j < nodes.length; i++, j++) {
        // Calculate edge length
        let node_0 = graph.getVertex(nodes[i]);
        const node_1 = graph.getVertex(nodes[j]);
        const distance = haversine(node_0.latlon, node_1.latlon);

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

                const distance = haversine(node_0.latlon, node_1.latlon);
                const edge_data = {
                    way_id: way.id,
                    tags: way.tags,
                    length: distance,
                };
                graph.addEdge(node_0.id, newNode.id, edge_data);
                node_0 = newNode;
            }
        }

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
 * From: https://stackoverflow.com/questions/14560999/using-the-haversine-formula-in-javascript
 * @param {number[]} latlonA [lat, lon] pointA.
 * @param {number[]} latlonB [lat, lon] pointB.
 * @returns {number} The distance between point A and B.
 */
function haversine([lat1, lon1], [lat2, lon2]) {
    const toRadian = angle => angle * Math.PI / 180;
    const distance = (a, b) => toRadian(b - a); 
    const EARTH_RADIUS_METERS = 6371e3;

    const dlat = distance(lat1, lat2);
    const dlon = distance(lon1, lon2);

    // Haversine Formula:
    const a = 
        Math.pow(Math.sin(dlat / 2), 2) +
        Math.pow(Math.sin(dlon / 2), 2) * Math.cos(toRadian(lat1)) * Math.cos(toRadian(lat2));
    const c = 2 * Math.asin(Math.sqrt(a));

    return c * EARTH_RADIUS_METERS;

}