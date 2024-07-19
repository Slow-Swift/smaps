export class Graph {

    constructor() {
        this.vertices = new Map();
        this.edges = new Map();
        this.adj = new Map();
    }

    addVertex(id, vertex) {
        this.vertices.set(id, vertex);
        this.adj.set(id, new Set());
    }

    addEdge(v1, v2, data) {
        this.adj.get(v1).add(v2);
        this.adj.get(v2).add(v1);
        this.edges.set(hash_edge(v1, v2), data);

        if (hash_edge(v1, v2) == hash_edge(277046141, 1099050628)) {
            alert(v1);
            alert(v2);
        }
    }

    iterNeighbors(node) {
        return this.adj.get(node).values();
    }

    iterVertices() {
        return this.vertices.values();
    }

    iterEdges() {
        return this.edges.values();
    }

    iterEdgeNodes() {
        let keys = this.edges.keys();
        return {
            [Symbol.iterator]: function () {
                return {
                    keys: keys,

                    next() {
                        let n = this.keys.next();
                        if (n.done) { return { done: true }}
                        return { done: false, value: unhash_edge(n.value)}
                    }
                }
            }
        }
    }

    getVertex(id) {
        return this.vertices.get(id);
    }

    getEdge(v1, v2) {
        return this.edges.get(hash_edge(v1, v2));
    }

    get order() {
        return this.vertices.size;
    }

    get size() {
        return this.edges.size;
    }

    iter_vertices() {
        return this.vertices.entries()
    }
}

const BIT_OFFSET = 64n;

function hash_edge(v1, v2) {
    return (v1 < v2) ? `${v1},${v2}` : `${v2},${v1}`;
}

function unhash_edge(edge_hash) {
    const parts = edge_hash.split(',');
    return [Number(parts[0]), Number(parts[1])];
}