import { RouteFilter, RouteFilterFunction, RouteProfile } from "./route_profile.js";

export class RouteProfileMenu {
    #menu_element = null;
    #create_menu = null;
    #node_filters_element = null;
    #edge_filters_element = null;
    #node_filters = null;
    #edge_filters = null;
    #profileListElement = null;
    #profiles = [];
    #editingIndex = null;
    #selectedProfileIndex = 0;

    constructor() {
        this.#menu_element = document.getElementById('profile-menu');
        this.#create_menu = document.getElementById('create-profile-menu');
        this.#node_filters_element = document.getElementById('node-profile-filters');
        this.#edge_filters_element = document.getElementById('edge-profile-filters');
        this.#profileListElement = document.getElementById('profile-list');
        document.getElementById('create-profile-btn').onclick = this.showCreateMenu.bind(this);
        document.getElementById('create-profile-done-btn').onclick = this.#onDoneCreatePressed.bind(this);
        document.getElementById('edit-profile-btn').onclick = this.#onEditPressed.bind(this);
        document.getElementById('delete-profile-btn').onclick = this.#onDeletePressed.bind(this);
        this.#initializeProfileList();

        const createCloseBtn = document.getElementById("close-create-profile-btn");
        createCloseBtn.addEventListener('click', () => this.#editingIndex = null);
    }

    showCreateMenu() {
        document.getElementById('profile-name-input').value = '';
        this.#create_menu.style.display = 'block';
        this.#node_filters = new FilterVisual();
        this.#edge_filters = new FilterVisual();
        this.#node_filters_element.replaceChildren(this.#node_filters.element);
        this.#edge_filters_element.replaceChildren(this.#edge_filters.element);
    }

    getRouteProfile() {
        const nodeFilter = this.#node_filters.getRouteFilter();
        const edgeFilter = this.#edge_filters.getRouteFilter();
        return new RouteProfile(nodeFilter, edgeFilter);
    }

    #initializeProfileList() {
        const profiles = loadProfiles();
        this.#profiles = profiles;

        this.#profileListElement.replaceChildren();
        this.#selectedProfileIndex = localStorage.getItem('selectedProfileIndex') ?? 0;
        
        if (this.#selectedProfileIndex < 0) {
            this.#selectedProfileIndex = 0;
        }
        if (this.#selectedProfileIndex >= profiles.length) {
            this.#selectedProfileIndex = profiles.length - 1;
        }
        window.profile = this.#profiles[this.#selectedProfileIndex][1];

        this.selectedSaveItem = null;
        for (let i=profiles.length - 1; i >= 0; i--) {
            const profileName = profiles[i][0];
            const profileItem = document.createElement('div');
            const label = document.createElement('h4');
            label.textContent = profileName;

            profileItem.index = i;
            profileItem.appendChild(label);
            profileItem.onclick = (e) => this.#profileItemClicked(profileItem);
            profileItem.classList.add('save-item');
            this.#profileListElement.appendChild(profileItem);

            if (i == this.#selectedProfileIndex) {
                profileItem.classList.add('selected');
                this.selectedSaveItem = profileItem;
            }
        }
    }

    #profileItemClicked(item) {
        const newlySelected = this.selectedSaveItem == item ? null : item;
        this.selectedSaveItem?.classList.remove('selected');
        this.selectedSaveItem = newlySelected;
        this.#selectedProfileIndex = this.selectedSaveItem.index;
        window.profile = this.#profiles[this.#selectedProfileIndex][1];
        localStorage.setItem('selectedProfileIndex', this.#selectedProfileIndex);
        newlySelected?.classList.add('selected'); 
    }

    #onDoneCreatePressed() {
        this.#create_menu.style.display = 'none';

        const name = document.getElementById('profile-name-input').value;
        if (name.trim().length == 0) return;
        const profile = this.getRouteProfile();

        if (this.#editingIndex != null) {
            this.#profiles[this.#editingIndex] = [name, profile];
            this.#editingIndex = null;
        } else {
            this.#profiles.push([name, profile]);
        }

        saveProfiles(this.#profiles);
        this.#initializeProfileList();
    }

    #onDeletePressed() {
        if (this.selectedSaveItem == null) return;
        if (this.#editingIndex != null) return;

        this.#profiles.splice(this.selectedSaveItem.index, 1);
        saveProfiles(this.#profiles);

        this.selectedSaveItem = null;
        this.#initializeProfileList();
    }

    #onEditPressed() {
        if (this.selectedSaveItem == null) return;
        this.#editingIndex = this.selectedSaveItem.index;

        const [profileName, profile] = this.#profiles[this.selectedSaveItem.index];

        document.getElementById('profile-name-input').value = profileName;
        this.#create_menu.style.display = 'block';
        this.#node_filters = FilterVisual.createFromRouteFilter(profile.nodeFilter);
        this.#edge_filters = FilterVisual.createFromRouteFilter(profile.edgeFilter);
        this.#node_filters_element.replaceChildren(this.#node_filters.element);
        this.#edge_filters_element.replaceChildren(this.#edge_filters.element);
    }
}

class FilterVisual {
    #filter = null;
    #filterOptions = null;
    #currentType = null;
    #tagInput = null;
    #valueInput = null;
    #addButton = null;
    #deleteButton = null;
    #childFilters = [];
    #childFiltersElement = null;
    #depth = 0;
    #parent = null;
    #dropdown = null;
    #acceptToggle = null;
    #accept = true;

    constructor(depth=0) {
        this.#filter = document.createElement('div');
        this.#filterOptions = document.createElement('div');
        this.#filterOptions.style.paddingLeft = (depth * 20) + "px";
        this.#dropdown = new Dropdown();
  
        this.#filter.classList.add('route-filter');
        this.#filterOptions.classList.add('filter-options'); 
        
        for (const option in RouteFilterFunction) {
            this.#dropdown.addOptionText(RouteFilterFunction[option]); 
        } 

        this.#dropdown.onChange = this.#onTypeChange.bind(this);

        this.#filter.appendChild(this.#filterOptions);
        this.#filterOptions.appendChild(this.#dropdown);

        this.#tagInput = document.createElement('input');
        this.#tagInput.type = "text"; 
        this.#tagInput.classList.add('rounded-input');
        this.#tagInput.placeholder = "Tag";

        this.#valueInput = document.createElement('input');
        this.#valueInput.type = "text";
        this.#valueInput.classList.add('rounded-input');
        this.#valueInput.placeholder = "Value";

        this.#addButton = document.createElement('div');
        this.#addButton.classList.add("round-btn");
        this.#addButton.classList.add("btn-add");
        this.#addButton.onclick = this.#onAddFilterPressed.bind(this);
        
        this.#deleteButton = document.createElement('div');
        this.#deleteButton.classList.add("round-btn");
        this.#deleteButton.classList.add("btn-delete");
        this.#deleteButton.onclick = this.#onDeletePressed.bind(this);

        this.#childFiltersElement = document.createElement('div');
        this.#childFiltersElement.classList.add('filter-children');

        this.#acceptToggle = document.createElement('div');
        this.#acceptToggle.classList.add('toggle-btn');
        this.#acceptToggle.innerText = "Accept If";
        this.#acceptToggle.addEventListener('click', () => {
            this.#accept = !this.#accept;
            this.#acceptToggle.innerText = this.#accept ? "Accept If" : "Reject If";
        })

        this.#depth = depth;
        this.#dropdown.selected = RouteFilterFunction.ALL;
        this.#onTypeChange(RouteFilterFunction.ALL);
    }

    static createFromRouteFilter(routeFilter, depth=0) {
        const filter = new FilterVisual(depth);
        filter.type = routeFilter.filterFunction;
        filter.accept = routeFilter.allow;
        filter.#tagInput.value = routeFilter.tag;
        filter.#valueInput.value = routeFilter.value;

        if (routeFilter.filters) {
            for (const subfilter of routeFilter.filters) {
                const child = FilterVisual.createFromRouteFilter(subfilter, depth+1);
                filter.#childFiltersElement.appendChild(child.element);
                filter.#childFilters.push(child);
                child._setParent(filter);
            }
        }

        return filter;
    }

    get element() {
        return this.#filter;
    }

    set type(value) {
        this.#dropdown.selected = value;
        this.#onTypeChange(value);
    }

    set accept(value) {
        this.#accept = value;
        this.#acceptToggle.innerText = this.#accept ? "Accept If" : "Reject If";
    }

    getRouteFilter() {
        const subfilters = [];
        for (const subfilter of this.#childFilters) {
            subfilters.push(subfilter.getRouteFilter());
        }

        const tag = this.#tagInput.value;
        const value = this.#valueInput.value;

        switch (this.#currentType) {
            case RouteFilterFunction.ANY:
            case RouteFilterFunction.ALL:
            case RouteFilterFunction.NONE: 
                return new RouteFilter(this.#currentType, this.#accept, subfilters);
            default:
                return new RouteFilter(this.#currentType, this.#accept, tag, value);
        }
    }

    #onTypeChange(type) {
        switch(type) {
            case RouteFilterFunction.ALL:
            case RouteFilterFunction.ANY:
            case RouteFilterFunction.NONE:
                this.#tagInput.parentElement?.removeChild(this.#tagInput);
                this.#valueInput.parentElement?.removeChild(this.#valueInput);
                this.#deleteButton.parentElement?.removeChild(this.#deleteButton); 
                this.#filterOptions.insertBefore(this.#acceptToggle, this.#filterOptions.firstChild);
                this.#filterOptions.appendChild(this.#addButton);
                this.#filter.appendChild(this.#childFiltersElement);
                break;
            case RouteFilterFunction.IN:
            case RouteFilterFunction.NOT_IN:
                this.#acceptToggle.parentElement?.removeChild(this.#acceptToggle);
                this.#valueInput.parentElement?.removeChild(this.#valueInput);
                this.#addButton.parentElement?.removeChild(this.#addButton);
                this.#deleteButton.parentElement?.removeChild(this.#deleteButton); 
                this.#childFiltersElement.parentElement?.removeChild(this.#childFiltersElement);
                this.#filterOptions.appendChild(this.#tagInput);
                break;
            default:
                this.#acceptToggle.parentElement?.removeChild(this.#acceptToggle);
                this.#addButton.parentElement?.removeChild(this.#addButton);
                this.#deleteButton.parentElement?.removeChild(this.#deleteButton); 
                this.#childFiltersElement.parentElement?.removeChild(this.#childFiltersElement);
                this.#filterOptions.appendChild(this.#tagInput);
                this.#filterOptions.appendChild(this.#valueInput);
        }
        if (this.#depth > 0) this.#filterOptions.appendChild(this.#deleteButton);

        this.#currentType = type;
    }

    #onAddFilterPressed() {
        const child = new FilterVisual(this.#depth + 1);
        this.#childFiltersElement.appendChild(child.element);
        this.#childFilters.push(child);
        child._setParent(this);
    }

    #onDeletePressed() {
        this.#parent?._deleteChildFilter(this);
    }

    _deleteChildFilter(filter) {
        this.#childFiltersElement.removeChild(filter.element);
        const index = this.#childFilters.indexOf(filter);
        this.#childFilters[index] = this.#childFilters[this.#childFilters.length-1];
        this.#childFilters.pop();
    }

    _setParent(parent) {
        this.#parent = parent;
    }
}

function saveProfiles(profiles) {
    const profileObjects = [];
    for (const profile of profiles) {
        const name = profile[0];
        const obj = profile[1].toJsonObject();
        profileObjects.push([name, obj]);
    }
    
    localStorage.setItem('profiles', JSON.stringify(profileObjects));
}

function loadProfiles() {
    let profiles = [];
    if (localStorage.getItem('profiles') === null) {
        profiles = getDefaultProfiles();
    } else {
        const profileObjects = JSON.parse(localStorage.getItem('profiles') ?? '[]');
        for (const [profileName, profileJson] of profileObjects) {
            profiles.push([profileName, RouteProfile.fromJsonObject(profileJson)]);
        }
    }

    return profiles;
}

function getDefaultProfiles() {
    return [
        [
            "Default",
            new RouteProfile(
                new RouteFilter(
                    RouteFilterFunction.ALL,
                    true,
                    "",
                    "",
                ),
                new RouteFilter(
                    RouteFilterFunction.ALL,
                    true,
                    "",
                    "",
                ),
            )
        ],
        [
            "Wheelchair",
            new RouteProfile(
                new RouteFilter(
                    RouteFilterFunction.ALL,
                    false,
                    [
                        new RouteFilter(
                            RouteFilterFunction.EQ,
                            true,
                            "barrier",
                            "kerb",
                        ),
                        new RouteFilter(
                            RouteFilterFunction.EQ,
                            true,
                            "kerb",
                            "raised",
                        )
                    ]
                ),
                new RouteFilter(
                    RouteFilterFunction.ANY,
                    true,
                    [
                        new RouteFilter(
                            RouteFilterFunction.NEQ,
                            true,
                            "highway",
                            "steps",
                        ),
                        new RouteFilter(
                            RouteFilterFunction.EQ,
                            true,
                            "ramp",
                            "yes",
                        )
                    ]
                )
            )
        ]
    ]
}