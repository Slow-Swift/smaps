// From https://www.sahinarslan.tech/posts/deep-dive-into-data-structures-using-javascript-heap-binary-heap

export class Heap {

    constructor(comparator) {
        this.heap = [];

        this.comparator = comparator || ((a,b) => a-b);
    }

    get size() {
        return this.heap.length;
    }

    get isEmpty() {
        return this.size == 0;
    }

    peek() {
        return this.heap[0];
    }

    insert(value) {
        this.heap.push(value);
        this.#heapifyUp();
    }

    removeMin() {
        if (this.isEmpty) return null;

        const bottom = this.size - 1;
        this.#swap(0, bottom);
        const poppedValue = this.heap.pop();

        this.#heapifyDown();
        return poppedValue;
    }

    remove(value) {
        let popped;
        for (let i=0; i<this.size; i++) {
            if (value == this.heap[i]) {
                this.#swap(i, this.size - 1);
                popped = this.heap.pop();
                this.#heapifyDown(i);
                break;
            }
        }
        return popped;
    }

    /**
     * Removes a single item, matching filter from the heap
     * @param {Function} filter 
     * @returns 
     */
    removeWhere(filter) {
        let popped;
        for (let i=0; i<this.size; i++) {
            if (filter(this.heap[i])) {
                this.#swap(i, this.size - 1);
                popped = this.heap.pop();
                this.#heapifyDown(i);
                break;
            }
        }
        return popped;
    }

    clear() {
        this.heap = [];
    }

    #heapifyUp() {
        let nodeIndex = this.size - 1;

        while (nodeIndex > 0 && this.comparator(this.#parentValue(nodeIndex), this.heap[nodeIndex]) > 0) {
            const parentIndex = this.#parentIndex(nodeIndex);
            this.#swap(nodeIndex, parentIndex);
            nodeIndex = parentIndex;
        }
    }

    #heapifyDown(startIndex = 0) {
        let nodeIndex = startIndex;

        while (this.#hasLeftChild(nodeIndex)) {
            // Determine whether left or right child is smaller
            let smallerChildIndex = this.#leftChildIndex(nodeIndex);
            if (this.#hasRightChild(nodeIndex) && this.comparator(this.#leftChildValue(nodeIndex), this.#rightChildValue(nodeIndex)) > 0) {
                smallerChildIndex = this.#rightChildIndex(nodeIndex);
            }

            if (this.comparator(this.heap[nodeIndex], this.heap[smallerChildIndex]) <= 0) break;
            this.#swap(nodeIndex, smallerChildIndex);
            nodeIndex = smallerChildIndex;
        }
    }

    #parentIndex(i) { return Math.floor((i-1) / 2); }
    #leftChildIndex(i) { return 2 * i + 1; }
    #rightChildIndex(i) { return 2 * i + 2; }
    #hasParent(i) { return i < this.size && this.#parentIndex(i) >= 0; }
    #hasLeftChild(i) { return this.#leftChildIndex(i) < this.size; }
    #hasRightChild(i) { return this.#rightChildIndex(i) < this.size; }
    #parentValue(i) { return this.#hasParent(i) ? this.heap[this.#parentIndex(i)] : undefined; }
    #leftChildValue(i) { return this.#hasLeftChild(i) ? this.heap[this.#leftChildIndex(i)] : undefined; }
    #rightChildValue(i) { return this.#hasRightChild(i) ? this.heap[this.#rightChildIndex(i)] : undefined; }
    #swap(i, j) {
        const temp = this.heap[i];
        this.heap[i] = this.heap[j];
        this.heap[j] = temp;
    }

    displayHeap() {
        let result = [];
        let levelCount = 1; // Counter for how many elements should be on the current level.
        let currentLevel = []; // Temporary storage for elements on the current level.
    
        for (let i = 0; i < this.size; i++) {
          currentLevel.push(this.heap[i]);
    
          // If the current level is full (based on levelCount), add it to the result and reset currentLevel.
          if (currentLevel.length === levelCount) {
            result.push(currentLevel);
            currentLevel = [];
            levelCount *= 2; // The number of elements on each level doubles as we move down the tree.
          }
        }
    
        // If there are any elements remaining in currentLevel after exiting the loop, add them to the result.
        if (currentLevel.length > 0) {
          result.push(currentLevel);
        }
    
        return result;
      }
}