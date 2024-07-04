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
        this.edges.set(v1 < v2 ? [v1,v2] : [v2, v1], data);
    }

    iterNeighbors(node) {
        return this.adj.get(node).values();
    }

    getVertex(id) {
        return this.vertices.get(id);
    }

    getEdge(v1, v2) {
        return this.edges.get(v1 < v2 ? [v1, v2] : [v2, v1]);
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