import { Graph } from "./graph.js";

let custom_ids = -1;

export async function load_graph(max_edge_dst) {
    console.log("Loading graph...")
    
    let elements = await get_sidewalk_json();
    console.log(`Loaded JSON with ${elements.length} elements.`);

    console.log("Building graph...")
    let graph = build_graph(elements, max_edge_dst);
    console.log(`Built graph with ${graph.order} nodes and ${graph.size} edges.`)

    await getNodeElevations(graph, max_edge_dst);
    calculateEdgeSlopes(graph);

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
    const file_prefix = max_edge_dst ? max_edge_dst : "unlimited"
    const elevations = await fetch(`/data/sidewalk_elevations_${file_prefix}.json`).then(
        (data)=>data.json()
    ).catch(async e => {
        console.log("Fetching Node Elevations");
        return fetchElevationsFromAPI(graph);
    });
     
    window.elevationText = elevations;

    let i = 0; 
    for (const node of graph.iterVertices()) {
        node.elevation = elevations[i];
        if (node.tags == undefined) node.tags = {};
        node.tags.ele = elevations[i];
        i++;
    }

    console.log("Loaded node elevations");
}

function calculateEdgeSlopes(graph) {
    for (const [n1, n2] of graph.iterEdgeNodes()) {
        const edgeData = graph.getEdge(n1, n2);
        const ele1 = graph.getVertex(n1).elevation;
        const ele2 = graph.getVertex(n2).elevation;
        const slope = Math.abs(ele2 - ele1) / edgeData.length;
        edgeData.slope = slope;
        edgeData.elevation = Math.abs(ele2 - ele1);
        edgeData.tags.slope = slope;
    }
}

function add_node_to_graph(graph, node) {
    const node_data = {
        id: node.id,
        latlon: [node.lat, node.lon],
        tags: node.tags
    };

    if (node.tags != undefined) {
        if (node.tags.barrier == "kerb") {
            let ramp = false;
            ramp |= node.tags.kerb == "flush";
            ramp |= node.tags.kerb == "lowered";
            ramp |= node.tags.kerb == "no";
            node.tags.ramp = ramp ? "yes" : "no";
        }
    }

    graph.addVertex(node.id, node_data);
}

const pathTypes = {
    paved: [
        "paved",
        "asphalt",
        "chipseal",
        "concrete",
        "concrete:lanes",
        "concrete:plates",
        "paving_stones",
        "bricks",
        "metal",
    ],
    unpaved: [
        "unpaved",
        "compacted",
        "fine_gravel",
        "gravel",
        "pebblestone",
    ],
    cobblestone: [
        "unhewn_cobblestone",
        "cobblestone",
        "sett",
    ],
    dirt: [
        "ground",
        "dirt",
        "earth",
        "grass",
        "grass-paver",
        "mud",
        "sand",
        "rock",
    ]
}

function add_way_to_graph(graph, way, max_dst) {
    const nodes = way.nodes;

    if (way.tags.footway == "crossing") {
        let hasMarkings = way.tags.crossing != undefined && way.tags.crossing != "unmarked" && way.tags["crossing:markings"] != "no";
        let hasTactile = way.tags.tactile_paving == "yes";
        let hasButton = way.tags.button_operated == "yes" || way.tags.flashing_lights == "button";
        let hasSignal = way.tags.crossing == "traffic_signals" || way.tags["crossing:signals"] == "yes";
        let hasSounds = way.tags["traffic_signals:sound"] == "yes";
        
        for (let i = 0; i < nodes.length; i++) {
            let node = graph.getVertex(nodes[i]);
            if (node.tags == undefined) continue;
            if (node.tags.highway != "crossing") continue;
            hasMarkings ||= node.tags.crossing != undefined && node.tags.crossing != "unmarked";
            hasMarkings &&= node.tags["crossing:markings"] != "no";
            hasTactile ||= node.tags.tactile_paving == "yes";
            hasButton ||= node.tags.button_operated == "yes" || node.tags.flashing_lights == "button";
            hasSignal ||= node.tags.crossing == "traffic_signals" || node.tags["crossing:signals"] == "yes";
            hasSounds ||= node.tags["traffic_signals:sound"] == "yes";
        }

        hasSignal ||= hasButton;

        way.tags.hasMarkings = hasMarkings;
        way.tags.hasTactile = hasTactile;
        way.tags.hasSignal = hasSignal;
        way.tags.hasSounds = hasSounds;
    }

    way.tags.pathType = "other";
    if (way.tags.surface == undefined) way.tags.pathType = "unkown";
    outer: for (const type in pathTypes) {
        for (const surfaceType of pathTypes[type]) {
            if (way.tags.surface == surfaceType) {
                way.tags.pathType = type;
                break outer;
            }
        }
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
                    tags: { ...way.tags },
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
            tags: { ...way.tags },
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
export function haversine([lat1, lon1], [lat2, lon2]) {
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