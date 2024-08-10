export const RouteFilterFunction = {
    ALL: 'All',
    ANY: 'Any',
    NONE: 'None',
    EQ: 'Equal',
    NEQ: 'Not Equal',
    IN: 'Has',
    NOT_IN: 'Not Has',
}

function RffFromString(str) {
    for (const rff in RouteFilterFunction) {
        if (RouteFilterFunction[rff] == str) return rff;
    }
}

export class RouteProfile {
    constructor(slopeProfile, crossingProfile, pathTypeProfile, nodeFilter, edgeFilter) {
        this.slopeProfile = slopeProfile;
        this.crossingProfile = crossingProfile;
        this.pathTypeProfile = pathTypeProfile;
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

    toJsonObject() {
        return {
            slope: this.slopeProfile,
            crossing: this.crossingProfile,
            pathType: this.pathTypeProfile,
            nodeFilter: this.nodeFilter.toJsonObject(),
            edgeFilter: this.edgeFilter.toJsonObject(),
        }
    }

    static fromJsonObject(json) {
        return new RouteProfile(
            json.slope,
            json.crossing,
            json.pathType,
            RouteFilter.fromJsonObject(json.nodeFilter), 
            RouteFilter.fromJsonObject(json.edgeFilter)
        );
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

    get filterFunction() { return this.#filterFunction; }
    get allow() { return this.#allow; }
    get filters() { return this.#filters; }
    get tag() { return this.#tag; }
    get value() { return this.#value; }

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

    static fromJsonObject(json) {
        const subfilters = [];
        for (const subfilter of json.filters) {
            subfilters.push(RouteFilter.fromJsonObject(subfilter));
        }

        const filterFunction = RouteFilterFunction[json.filterFunction];
        switch (filterFunction) {
            case RouteFilterFunction.ANY:
            case RouteFilterFunction.ALL:
            case RouteFilterFunction.NONE: 
                return new RouteFilter(filterFunction, json.allow, subfilters, json.value);
            default:
                return new RouteFilter(filterFunction, json.allow, json.tag, json.value);
        }
        
    }

    toJsonObject() {
        const filters = [];
        if (this.#filters) {
            for (const filter of this.#filters) {
                filters.push(filter.toJsonObject())
            }
        }

        return {
            filterFunction: RffFromString(this.#filterFunction),
            allow: this.#allow,
            filters: filters,
            tag: this.#tag,
            value: this.#value,
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