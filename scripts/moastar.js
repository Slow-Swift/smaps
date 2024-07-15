import { Graph } from "./graph.js";
import { Heap } from "./heap.js";
import { Vector } from "./vector.js";

export class MOA_Star {

    /**
     * 
     * @param {Graph} graph The graph to pathfind on
     * @param {Function} heuristic Function to get heuritic for each node
     * @param {Number} dimensions The number of objectives to optimize on
     * @param {string} weightLabel The name of the weight in the node data
     */
    constructor(graph, heuristic, dimensions, weightLabel='w') {
        this.graph = graph;
        this.heuristic = heuristic;
        this.dimensions = dimensions;
        this.weightLabel = weightLabel;
        this.openLabels = new Heap((a,b) => Vector.compareLex(a[2], b[2]));
        this.costs = new Array();
        this.costs_t = new Array();
        this.nodeData = new Map();
        this.backpointers = new Map();
    }

    pathfind(start, end, profile) {
        this.profile = profile;
        this.#initializePathfinding(start, end);

        let label = this.#getNextLabel();
        while (label != null) {
            this.#processLabel(label);
            label = this.#getNextLabel();
        }

        return this.#getSolutionPaths();
    }

    #initializePathfinding(start, end) {
        this.openLabels.clear();
        this.nodeData.clear();
        this.costs = [];
        this.costs_t = [];
        this.#setup_start(start);
        this.#setup_end(end);
    }

    #getNextLabel() { 
        // Get the next lexicographic label
        let label = this.openLabels.removeMin(); 

        // Find a label that is not dominated by a solution cost
        while (label != null) {
            const [node, cost, f] = label;

            // Move cost from G_op(n) to G_cl(n)
            const nodeData = this.nodeData.get(node);
            remove(nodeData.open, (e) => Vector.equals(cost, e));
            nodeData.closed.push(cost);
            remove(nodeData.truncated, (v) => Vector.compareTruncatedDom(v, cost) == GREATER);
            nodeData.truncated.push(cost);

            if (!this.#costsDominate(f)) break;

            // Was dominated by a solution cost so try next label
            label = this.openLabels.removeMin(); 
        }
        
        return label;
    }

    #processLabel(label) {
        if (this.target == label[0]) {
            this.costs.push(label[1]);
            remove(this.costs_t, (v) => Vector.compareTruncatedDom(v, label[1]) == GREATER);
            this.costs_t.push(label[1]);
        }
        else this.#expandLabel(label);
    }

    #getSolutionPaths() {
        let paths = []
        for (let solution_cost of this.costs) {
            let currentNode = this.target;
            let path = [currentNode];
            paths.push([path, solution_cost]);
            while (solution_cost != null) {
                let backpointers = this.backpointers.get(solution_cost.toString());
                if (backpointers == undefined) { break; }

                for (let backpointer of backpointers) {
                    let [fromNode, toNode, costIndex] = backpointer;
                    if (fromNode != currentNode) continue;

                    currentNode = toNode;
                    solution_cost = this.nodeData.get(currentNode).closed[costIndex];
                    path.unshift(currentNode);
                    break;
                }
            }

        }

        return paths;
    }

    #expandLabel(label) {
        const [node, cost, f] = label;
        const nodeData = this.nodeData.get(node);
        for (let neighbor of this.graph.iterNeighbors(node)) {
            if (!this.#isEdgeTraversible(node, neighbor)) continue;
            const edgeWeight = this.#getEdgeWeight(node, neighbor);
            const pathCost = cost.add(edgeWeight);
            const solutionEstimate = pathCost.add(this.heuristic(neighbor));

            if (this.#costsDominate(solutionEstimate)) continue;

            if (!this.nodeData.has(neighbor)) {
                this.nodeData.set(neighbor, createNodeData(pathCost));
                this.openLabels.insert([neighbor, pathCost, solutionEstimate]);
                this.#addBackpointer(pathCost, node, neighbor, nodeData.closed.length - 1);
            } else {
                if(this.#insertNonDominated(neighbor, pathCost)) {
                    this.#addBackpointer(pathCost, node, neighbor, nodeData.closed.length - 1);
                }
            }
        }
    }

    #isEdgeTraversible(fromNode, toNode) {
        if (this.profile == null || this.profile == undefined) return true;
        if (!this.profile.isNodeAllowed(this.graph.getVertex(toNode))) return false;
        return this.profile.isEdgeAllowed(this.graph.getEdge(fromNode, toNode));
    }

    #getEdgeWeight(node1, node2) {
        return this.graph.getEdge(node1, node2)[this.weightLabel];
    }

    #setup_start(node) {
        this.openLabels.insert([node, Vector.zeros(this.dimensions), this.heuristic(node)])
        this.nodeData.set(node, createNodeData(Vector.zeros(this.dimensions)));
    }

    #setup_end(node) {
        this.target = node;
    }

    #costsDominate(cost) {
        for (let solution_cost in self.costs_t) {
            let comparison = Vector.compareTruncatedDom(solution_cost, cost);
            if (comparison == LESS) return true;
            if (comparison == EQUAL && solution_cost[0] < cost[0]) return true;
        }
        return false;
    }

    #insertNonDominated(node, cost) {
        let nodeData = this.nodeData.get(node);


        // We can use the truncated closed costs since this path is guaranteed to be lexicographically
        // greater than any path in closed
        for (let closed_cost of nodeData.truncated) {
            let comparison = Vector.compareDom(closed_cost, cost);
            // Dominated so do nothing
            if (comparison == LESS) return false;
            // if (comparison == EQUAL && closed_cost[0] < cost[0]) return false;

            // // Equal so do nothing but return true since it was kind of added
            // if (comparison == EQUAL && closed_cost[0] == cost[0]) return true;
            if (Vector.equals(closed_cost, cost)) return true;
        }

        let domainates = false;
        for (let open_cost of nodeData.open) {
            let comparison = Vector.compareDom(open_cost, cost);
            // Dominated so do nothing
            if (comparison == LESS) return false;

            // Equal so do nothing but return true since it was kind of added
            if (Vector.equals(open_cost, cost)) return true;

            if (comparison == GREATER) {
                domainates = true;
                this.openLabels.removeWhere((e) => (e[0] == node && Vector.equals(e[1], open_cost)))
            }
        }

        // Remove dominated labels from the open set
        if (domainates) {
            remove(nodeData.open, (v) => Vector.compareDom(v, cost) == GREATER)
        }

        nodeData.open.push(cost);
        this.openLabels.insert([node, cost, cost.add(this.heuristic(node))])
        return true;
    }

    #addBackpointer(cost, toNode, fromNode, costIndex) {
        const backpointer = [fromNode, toNode, costIndex];
        if (!this.backpointers.has(cost.toString())) {
            this.backpointers.set(cost.toString(), [backpointer])
        } else {
            this.backpointers.get(cost.toString()).push(backpointer);
        }
    }

}

const GREATER = 1;
const EQUAL = 0;
const LESS = -1;

function createNodeData(initialCost) {
    const nodeData = {
        open: new Array(),
        closed: new Array(),
        truncated: new Array()
    };

    if (initialCost != undefined) {
        nodeData.open.push(initialCost);
    }

    return nodeData;
}

function remove(list, shouldRemove) {
    let offset = 0;
    for (let i=0; i<list.length; i++) {
        if (shouldRemove(list[i])) offset++;
        else list[i - offset] = list[i];
    }
    list.length = list.length - offset;
}

