export const RouteFilterFunction = {
    ALL: 'ALL',
    ANY: 'ANY',
    NONE: 'NONE',
    EQ: 'EQ',
    NEQ: 'NEQ',
    IN: 'IN',
    NOT_IN: 'NOT_IN',
}

export class RouteProfile {
    constructor(nodeFilter, edgeFilter) {
        this.nodeFilter = nodeFilter;
        this.edgeFilter = edgeFilter;
    }

    isNodeAllowed(node) {
        if (this.nodeFilter == null || this.nodeFilter == undefined) return true;
        return this.nodeFilter.isAllowed(node.tags);
    }

    isEdgeAllowed(edge) {
        if (this.edgeFilter == null || this.edgeFilter == undefined) return true;
        return this.edgeFilter.isAllowed(edge.tags);
    }
}

export class RouteFilter {
    #filterFunction = null;
    #allow = null;
    #filters = null;
    #tag = null;
    #value = null;

    constructor(filterFunction, allow, arg1, arg2) {
        this.#filterFunction = filterFunction;
        this.#allow = allow;

        switch (filterFunction) {
            case RouteFilterFunction.ANY:
            case RouteFilterFunction.ALL:
            case RouteFilterFunction.NONE: 
                this.#filters = arg1;
                break;
            default:
                this.#tag = arg1;
                this.#value = arg2;
                break;
        }
    }

    isAllowed(tags) {
        if (tags == null || tags == undefined) return true;

        switch(this.#filterFunction) {
            case RouteFilterFunction.ALL: return this.#filterAll(tags);
            case RouteFilterFunction.ANY: return this.#filterAny(tags);
            case RouteFilterFunction.NONE: return !this.#filterAny(tags);
            case RouteFilterFunction.EQ: return tags[this.#tag] == this.#value;
            case RouteFilterFunction.NEQ: return tags[this.#tag] != this.#value;
            case RouteFilterFunction.IN: return tags.hasOwnProperty(this.#tag);
            case RouteFilterFunction.NOT_IN: return !tags.hasOwnProperty(this.#tag);
        }
    }

    #filterAll(tags) {
        for (const filter of this.#filters) {
            if (!filter.isAllowed(tags)) return !this.#allow;
        }
        return this.#allow;
    }

    #filterAny(tags) {
        for (const filter of this.#filters) {
            if (filter.isAllowed(tags)) return this.#allow;
        }
        return !this.#allow;
    }
}