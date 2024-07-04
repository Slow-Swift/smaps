import { Graph } from "./graph.js";

export class MOA_Star {

    /**
     * 
     * @param {Graph} graph The graph to pathfind on
     * @param {Function} heuristic Function to get heuritic for each node
     * @param {Number} dimensions The number of objectives to optimize on
     * @param {string} weight_label The name of the weight in the node data
     */
    constructor(graph, heuristic, dimensions, weight_label='w') {
        this.graph = graph;
        this.heuristic = heuristic;
        this.dimensions = dimensions;
        this.weightLabel = weightLabel;
        this.openNodes = [];
        this.paths = new Map();
    }

    pathfind(start, end) {
        this.setup_start();
        this.setup_end();

        let node = this.getNextNode();
        while (node != null) {
            this.processNode(node);
            node = this.getNextNode();
        }

        return this.getSolutionPaths();
    }

    processNode(node) {
        if (node.isTarget) this.processTargetNode(node);
        else this.expandNode(node);
    }

    expandNode(node) {
        for (neighbor of self.graph.iterNeighbors(node)) {
            let edgeWeight = self.getEdgeWeight(node, neighbor);
        }
    }

    getEdgeWeight(node1, node2) {
        return this.graph.getEdge(node1, node2)[this.weightLabel];
    }

    getPaths(node) {
        return this.paths.get(node) ?? [];
    }

}

const GREATER = 1;
const EQUAL = 0;
const LESS = -1;

/**
 * Compare two vectors and determine if either dominates the other
 * @param {list[Number]} vectorA The first vector
 * @param {list[Number]} vectorB The second vector
 * @returns GREATER (1) if A dominates B, LESS (-1) if B dominates A, or EQUAL (0)
 *          if neither dominates the other
 */
function compareVectors(vectorA, vectorB) {
    let aGreater = true;
    let bGreater = true;

    for (let i = 0; i < vectorA.length; i++) {
        aGreater &= vectorA[i] >= vectorB[i];
        bGreater &= vectorA[i] <= vectorB[i];
    }

    if (aGreater && !bGreater) return GREATER;
    if (bGreater && !aGreater) return LESS;
    return EQUAL;
}

/**
 * Find the list of non-dominated vectors in a list of vectors
 * Complexity: O(nlog(n)) where n = vectors.length
 * @param {list[]} vectors The list of vectors
 * @param {Number} start The index of the first vector to consider
 * @param {Number} end The index of the last vector to consider + 1
 * @param {Number} threshold The threshold beyond which recursion is used
 * @returns {list[]} The non-domainted vectors
 */
function getNonDominated(vectors, start=0, end=-1, threshold=10) {
    if (end < 0) end = vectors.length;

    // For a small number of vectors it is faster to do it the simple way
    if (end - start < threshold) {
        let nonDominated = [];

        // Just compare all pairs of vectors to each other and take the non-dominated ones
        outer: for (let i=start; i<end; i++) {
            for (let j=start; j<end; j++) {
                if (i==j) continue;
                if (compareVectors(vectors[i], vectors[j]) == LESS)
                    continue outer;
            }
            nonDominated.push(vectors[i]);
        }
        return nonDominated;
    }

    // Split the vectors in two and recursively find the non-dominated vectors
    const mid = Math.ceil((start + end) / 2);
    const nondomLeft = getNonDominated(vectors, start, mid, threshold);
    const nondomRight = getNonDominated(vectors, mid, end, threshold);
    return nondomLeft.concat(nondomRight);
}