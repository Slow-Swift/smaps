export class GraphDataLayer {
    constructor(map) {
        this.map = map;
        this.visible = false;
        this.nodes = [];
        this.edges = [];
        this.mapLayer = L.layerGroup();
        this.#setupGraphData();
        this.filterInfo = false;
    }

    toggleVisible() {
        this.visible = !this.visible;
        if (this.visible) {
            this.map.addLayer(this.mapLayer);
        } else {
            this.mapLayer.remove();
        }

        return this.visible;
    }

    applyFilters() {
        if (this.filterInfo == null) return;

        for (let edge of this.edges) {
            if (!isEdgeInBox(edge, this.filterInfo.bbox)) {
                edge.removeFrom(this.mapLayer);
                continue;
            }

            const [visible, color] = filter(edge.tags, this.filterInfo.edgeFilters);

            if (!visible) {
                edge.removeFrom(this.mapLayer);
            } else {
                edge.addTo(this.mapLayer);
                edge.setStyle({color: color, weight: this.filterInfo.edgeSize});
            }
        }

        for (let node of this.nodes) {
            if (!isInBox(node.getLatLng(), this.filterInfo.bbox)) {
                node.removeFrom(this.mapLayer);
                continue;
            } 

            let [visible, color] = filter(node.tags, this.filterInfo.nodeFilters);
            if (node.tags.ele) {
                const heightPercent = Math.floor(node.tags.ele * 255 / 120);
                // color = `#${(heightPercent).toString(16)}00${(255 - heightPercent).toString(16)}`;
            } 

 
            if (!visible) {
                node.removeFrom(this.mapLayer);
            } else {
                node.addTo(this.mapLayer);
                node.setRadius(this.filterInfo.nodeSize);
                node.setStyle({color: color});
            }
        }
    }

    setFilters(filters) {
        this.filterInfo = filters;
    }

    #setupGraphData() {
        const graph = this.map.graph;

        for (let edge of graph.iterEdgeNodes()) {
            const edgeData = graph.getEdge(edge[0], edge[1]);
            const node1 = graph.getVertex(edge[0]);
            const node2 = graph.getVertex(edge[1]);
            const line = L.polyline([node1.latlon, node2.latlon]).addTo(this.mapLayer);
            line.tags = edgeData.tags; 
            this.edges.push(line);
            line.bindPopup(createMessage(`Way ${edgeData.way_id}`, edgeData.tags, [`Length ${edgeData.length}`]));
        }
    
        for (let node of graph.iterVertices()) {
            const circle = L.circle(node.latlon,{ fillOpacity: 1, radius: .5 }).addTo(this.mapLayer);
            circle.tags = node.tags;
            this.nodes.push(circle);
            circle.bindPopup(createMessage(`Node: ${node.id}`, node.tags));
        }
    }
}

function createMessage(header, tags, extraInfo=[]) {
    let message = `<h3>${header}</h3>`;
    for (const ei of extraInfo) {
        message += `<p>${ei}</p>`;
    }
    if (tags != undefined) {
        message += "<p>Tags:</br>";
        for (let tag in tags) {
            message += `${tag}: ${tags[tag]}</br>`
        }
        message += "</p>"
    }
    return message;  
}

function isEdgeInBox(edge, bbox) {
    for (let latlng of edge.getLatLngs()) {
        if (isInBox(latlng, bbox)) 
            return true;
    }
    return false;
}

function isInBox(latlon, bbox) {
    const [[y1, x1], [y2, x2]] = bbox;
    const y = latlon.lat;
    const x = latlon.lng;
    return (x >= x1) && (x <= x2) && (y <= y1) && (y >= y2);
}

/**
 * Filter the tags of a graph element by the provided filters.
 * @param {*} tags The tags that the filters apply to
 * @param {*} filters The filters to apply
 * @returns [visible, color]: The visibility and color settings of the last filter that matches.
 *                             If no filter matches then [false, 'black']
 */
function filter(tags, filters) {
    for (let i=filters.length-1; i>=0; i--) {
        const filter = filters[i];
        if (filter.tag.length == 0) continue;
        
        if (doesFilterMatch(filter, tags)) {
            const filterColor = filter.color.length == 0 ? "#00f" : filter.color;
            return [filter.visible, filterColor];
        }
    }

    return [false, 'black'];
}

function doesFilterMatch(filter, tags) {
    const isTagEmpty = (filter.tag.length == 0) || (filter.tag.toLowerCase() == "any");
    
    if (!isTagEmpty && (tags == undefined || tags[filter.tag] == undefined)) return false;

    const isValueEmpty = (filter.value.length == 0) || (filter.value.toLowerCase() == "any");
    if (isValueEmpty) return true;

    return tags[filter.tag] == filter.value;
}