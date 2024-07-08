

const GREATER = 1;
const EQUAL = 0;
const LESS = -1;

export class Vector extends Array {
    add(other) {
        let result = new Vector(this.length);
        for (let i=0; i<this.length; i++) {
            result[i] = this[i] + other[i];
        }
        return result;
    }

    truncated() {
        return this.splice(1);
    }

    inspect(depth, opts) {
        return this.toString();
    }

    get [Symbol.toStringTag]() {
        return this.toString();
    }

    toString() {
        return `<${this.join(', ')}>`;
    }

    static compareLex(vectorA, vectorB) {
        for (let i=0; i<vectorA.length; i++) {
            let comparison = vectorA[i] - vectorB[i]
            if (comparison != 0) return comparison;
        }
    
        return 0;
    }

    /**
     * Compare two vectors and determine if either dominates the other
     * @param {list[Number]} vectorA The first vector
     * @param {list[Number]} vectorB The second vector
     * @returns GREATER (1) if A is pareto-greater than B, LESS (-1) if B is pareto-greater than A, or EQUAL (0)
     *          if neither dominates the other
     */
    static compareDom(vectorA, vectorB) {
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

    static compareTruncatedDom(vectorA, vectorB) {
        let aGreater = true;
        let bGreater = true;

        for (let i = 1; i < vectorA.length; i++) {
            aGreater &= vectorA[i] >= vectorB[i];
            bGreater &= vectorA[i] <= vectorB[i];
        }

        if (aGreater && !bGreater) return GREATER;
        if (bGreater && !aGreater) return LESS;
        return EQUAL;
    }

    static zeros(length) {
        return new Vector(length).fill(0);
    }

    static equals(vectorA, vectorB) {
        return this.compareLex(vectorA, vectorB) == 0;
    }
}