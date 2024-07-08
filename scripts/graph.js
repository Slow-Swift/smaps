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
        this.edges.set(this.#hash_edge(v1, v2), data);
    }

    iterNeighbors(node) {
        return this.adj.get(node).values();
    }

    iterEdges() {
        return this.edges.values();
    }

    getVertex(id) {
        return this.vertices.get(id);
    }

    getEdge(v1, v2) {
        return this.edges.get(this.#hash_edge(v1, v2));
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

    #hash_edge(v1, v2) {
        let v1n = BigInt(v1);
        let v2n = BigInt(v2);

        // We combine both indices into a single big integer
        // because if we use arrays as hash keys then the references
        // will be different and the edge can never be retrieved from the Map
        return (v1 < v2) ? (v1n << 32n) | v2n : (v2n << 32n) | v1n;
    }
}