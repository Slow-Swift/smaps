export class GraphDataConfigurator {

    constructor(map) {
        this.map = map;
        this.saveList = document.getElementById('save-list');
        this.nodeFilters = document.getElementById('node-filters');
        this.edgeFilters = document.getElementById('edge-filters');
        this.filterMenu = document.getElementById('filter-menu');
        this.saveMenu = document.getElementById('save-menu');
        this.bboxConfirmer = document.getElementById('bbox-confirmer');

        this.selectedNodeFilter = null;
        this.selectedEdgeFilter = null;
        this.selectedItem = null;
        this.bbox = [[49.225, -122.945], [49.196 , -122.895]];
        this.bboxVisual = L.rectangle(this.bbox);

        document.getElementById('add-node-filter-btn').addEventListener('click', this.#addNodeFilter.bind(this));
        document.getElementById('add-edge-filter-btn').addEventListener('click', this.#addEdgeFilter.bind(this));
        document.getElementById('save-config-btn').addEventListener('click', this.#onSaveConfigPressed.bind(this))
        document.getElementById('load-config-btn').addEventListener('click', this.#onLoadConfigPressed.bind(this));
        document.getElementById('delete-config-btn').addEventListener('click', this.#deleteSaveItem.bind(this))
        document.getElementById('delete-node-filter-btn').onclick = () => {
            this.selectedNodeFilter?.remove();
            this.selectedNodeFilter = null;
        }
        document.getElementById('delete-edge-filter-btn').onclick = () => {
            this.selectedEdgeFilter?.remove();
            this.selectedEdgeFilter = null;
        }
        document.getElementById('apply-filters-btn').addEventListener('click', this.#applyConfig.bind(this));

        document.getElementById('change-bbox-btn').addEventListener('click', this.#onChangeBBoxPressed.bind(this));
        this.bboxConfirmer.getElementsByTagName('button')[0].addEventListener('click', this.#finishChangeBBox.bind(this));


        this.#initializeSaveList();
        this.#loadLastConfig();
        this.#applyConfig();
    }

    showFilterMenu() { this.filterMenu.style.display = 'block'; }
    hideFilterMenu() { this.filterMenu.style.display = 'none'; }
    showSaveMenu() { this.saveMenu.style.display = 'block'; }
    hideSaveMenu() { this.saveMenu.style.display = 'none'; }

    #onChangeBBoxPressed() {
        this.hideFilterMenu();
        this.bboxConfirmer.style.display = 'block';

        this.map.setClickListener((e) => {
            this.bbox[0] = [e.latlng.lat, e.latlng.lng];
            this.bboxVisual.setBounds(this.bbox);
        });
        this.map.setRightClickListener((e) => {
            this.bbox[1] = [e.latlng.lat, e.latlng.lng];
            this.bboxVisual.setBounds(this.bbox);
        });
        this.map.addLayer(this.bboxVisual);
    }

    #finishChangeBBox() {
        this.map.resetClickListener();
        this.map.resetRightClickListener();
        this.bboxVisual.remove();
        this.bboxConfirmer.style.display = 'none';
        this.showFilterMenu();

        this.#setBBox(this.bbox);
    }

    #addNodeFilter() {
        const filter = createFilter();
        filter.onclick = (e) => {
            if (e.target != filter) return 

            const newlySelected = this.selectedNodeFilter == filter ? null : filter;
            this.selectedNodeFilter?.classList.remove('selected');
            this.selectedNodeFilter = newlySelected;
            newlySelected?.classList.add('selected');
        }
        filter.addEventListener('contextmenu', (e) => { e.preventDefault(); switchFilterMode(filter); }, false);

        this.nodeFilters.appendChild(filter);
        return filter;
    }
    
    #addEdgeFilter() {
        const filter = createFilter();
        filter.onclick = (e) => {
            if (e.target != filter) return 

            const newlySelected = this.selectedEdgeFilter == filter ? null : filter;
            this.selectedEdgeFilter?.classList.remove('selected');
            this.selectedEdgeFilter = newlySelected;
            newlySelected?.classList.add('selected');
        }
        filter.addEventListener('contextmenu', (e) => { e.preventDefault(); switchFilterMode(filter); }, false);

        this.edgeFilters.appendChild(filter);
        return filter;
    }

    #deleteSaveItem() {
        if (this.selectedSaveItem == null) return;

        removeConfiguration(this.selectedSaveItem.index);
        this.selectedSaveItem = null;
        this.#initializeSaveList();
    }

    #initializeSaveList() {
        const configurations = getSavedConfigurations();
        
        this.saveList.replaceChildren();
        for (let i = configurations.length - 1; i >= 0; i--) {
            const configurationName = configurations[i][0];

            const saveItem = document.createElement('div');
            const label = document.createElement('h4');
            label.textContent = configurationName;
            
            saveItem.index = i;
            saveItem.appendChild(label);
            saveItem.onclick = (e) => this.#onSaveItemClicked(saveItem);
            saveItem.classList.add('save-item');
            this.saveList.appendChild(saveItem);
        }
    }

    #onSaveItemClicked(item) {
        const newlySelected = this.selectedSaveItem == item ? null : item;

        this.selectedSaveItem?.classList.remove('selected');
        this.selectedSaveItem = newlySelected;
        newlySelected?.classList.add('selected');
    }

    #onSaveConfigPressed() {
        this.#saveConfiguration(document.getElementById('save-name-input').value);
        this.#initializeSaveList();
    }

    #onLoadConfigPressed() {
        const config = getConfiguration(this.selectedSaveItem.index);
        this.#setUIConfiguration(config);
        this.#applyConfig();
        this.hideSaveMenu();
    }

    #setUIConfiguration(configuration) {
        this.nodeFilters.replaceChildren();
        for (const nodeFilter of configuration.nodeFilters) {
            const nodeFilterElement = this.#addNodeFilter();
            nodeFilterElement.checkbox.checked = nodeFilter.visible ?? true;
            nodeFilterElement.tagInput.value = nodeFilter.tag ?? "Any";
            nodeFilterElement.valueInput.value = nodeFilter.value ?? "Any";
            nodeFilterElement.range1Input.value = nodeFilter.rangeMin ?? 0;
            nodeFilterElement.range2Input.value = nodeFilter.rangeMax ?? 0;
            nodeFilterElement.color1Input.value = nodeFilter.color ?? "#3388ff";
            nodeFilterElement.color2Input.value = nodeFilter.color2 ?? "#3388ff";

            if (nodeFilter.gradient ?? false) {
                switchFilterMode(nodeFilterElement);
            }
        }

        this.edgeFilters.replaceChildren();
        for (const edgeFilter of configuration.edgeFilters) {
            const edgeFilterElement = this.#addEdgeFilter();
            edgeFilterElement.checkbox.checked = edgeFilter.visible ?? true;
            edgeFilterElement.tagInput.value = edgeFilter.tag ?? "Any";
            edgeFilterElement.valueInput.value = edgeFilter.value ?? "Any";
            edgeFilterElement.range1Input.value = edgeFilter.rangeMin ?? 0;
            edgeFilterElement.range2Input.value = edgeFilter.rangeMax ?? 0;
            edgeFilterElement.color1Input.value = edgeFilter.color ?? "#3388ff";
            edgeFilterElement.color2Input.value = edgeFilter.color2 ?? "#3388ff";

            if (edgeFilter.gradient ?? false) {
                switchFilterMode(edgeFilterElement);
            }
        }

        document.getElementById('node-size-spinner').setValue(configuration.nodeSize);
        document.getElementById('edge-size-spinner').setValue(configuration.edgeSize);
        this.#setBBox(configuration.bbox);
    }

    #setBBox(bbox) {
        this.bbox = bbox;
        this.bboxVisual.setBounds(bbox);
        const [[y1, x1], [y2, x2]] = bbox;
        document.getElementById('lat-range').textContent = `${y1.toFixed(3)} | ${y2.toFixed(3)}`;
        document.getElementById('lon-range').textContent = `${x1.toFixed(3)} | ${x2.toFixed(3)}`;
    }

    #saveConfiguration(name) {
        addConfiguration([name, this.#getUIConfiguration()]);
    }

    #getUIConfiguration() {
        const filterInfo = {};
        filterInfo.bbox = this.bbox;
        filterInfo.nodeSize = document.getElementById('node-size-spinner').getValue();
        filterInfo.edgeSize = document.getElementById('edge-size-spinner').getValue();
    
        const nodeFilterContainer = document.getElementById('node-filters');
        const edgeFilterContainer = document.getElementById('edge-filters');
        filterInfo.nodeFilters = getFiltersFromDocElement(nodeFilterContainer);
        filterInfo.edgeFilters = getFiltersFromDocElement(edgeFilterContainer);
    
        return filterInfo;
    }

    #saveLastConfig() {
        const config = this.#getUIConfiguration();
        localStorage.setItem('lastConfig', JSON.stringify(config));
    }

    #loadLastConfig() {
        const config = JSON.parse(localStorage.getItem('lastConfig') ?? '{}');
        if (config.bbox == undefined) {
            config.bbox = this.bbox;
            config.nodeSize = 1;
            config.edgeSize = 3;
            config.nodeFilters = [{visible: true, tag: 'Any', value: 'Any', color: '#00BB00'}];
            config.edgeFilters = [{visible: true, tag: 'Any', value: 'Any', color: '#3388ff'}];
        }
        this.#setUIConfiguration(config);
    }

    #applyConfig() {
        this.#saveLastConfig();
        window.graphDataLayer.setFilters(this.#getUIConfiguration());
        window.graphDataLayer.applyFilters();
    }
}

function getFiltersFromDocElement(container) {
    const filters = [];
    for (const filterElement of container.children) {
        const filterData = {
            gradient: filterElement.mode == "gradient",
            visible:    filterElement.checkbox.checked,
            tag:        filterElement.tagInput.value.trim(),
            value:      filterElement.valueInput.value.trim(),
            rangeMin:   Number(filterElement.range1Input.value),
            rangeMax:   Number(filterElement.range2Input.value),
            color:      filterElement.color1Input.value.trim(),
            color2:      filterElement.color2Input.value.trim(),
        };
        filters.push(filterData);
    }
    return filters;
}

function addConfiguration(configuration) { 
    const configurations = getSavedConfigurations();
    configurations.push(configuration);
    saveConfigurations(configurations);
}

function getConfiguration(index) {
    return getSavedConfigurations()[index][1];
}

function removeConfiguration(index) {
    const configurations = getSavedConfigurations();
    configurations.splice(index, 1);
    saveConfigurations(configurations);
}

function getSavedConfigurations() {
    return JSON.parse(localStorage.getItem('configurations') ?? '[]');
}

function saveConfigurations(configurations) {
    localStorage.setItem('configurations', JSON.stringify(configurations));
}

function createFilter() {
    let filter = document.createElement('div');
    let cbWrapper = document.createElement('div');
    let checkbox = document.createElement('input');
    let tagInput = document.createElement('input');
    let valueInput = document.createElement('input');
    let range1Input = document.createElement('input');
    let range2Input = document.createElement('input');
    let color1Input = document.createElement('input');
    let color2Input = document.createElement('input');

    filter.classList.add('tag-filter');
    cbWrapper.style.display = "inline-block";
    checkbox.classList.add("tag-cb");

    checkbox.type = "checkbox";
    tagInput.type = "text";
    valueInput.type = "text";
    range1Input.type = "text";
    range2Input.type = "text";
    color1Input.type = "color";
    color2Input.type = "color";

    tagInput.classList.add("tag-input");
    valueInput.classList.add("tag-input");
    range1Input.classList.add("tag-input", "small-input");
    range2Input.classList.add("tag-input", "small-input");
    color1Input.classList.add("tag-input");
    color2Input.classList.add("tag-input");

    tagInput.placeholder = "Tag";
    valueInput.placeholder = "Value";
    range1Input.placeholder = "Min";
    range2Input.placeholder = "Max";
    color1Input.placeholder = "Color";
    color2Input.placeholder = "Color";
    color1Input.value = "#3388ff";
    color2Input.value = "#3388ff";

    filter.appendChild(cbWrapper);
    filter.appendChild(tagInput);
    filter.appendChild(valueInput);
    filter.appendChild(color1Input);
    cbWrapper.appendChild(checkbox);

    filter.checkbox = checkbox;
    filter.tagInput = tagInput;
    filter.valueInput = valueInput;
    filter.range1Input = range1Input;
    filter.range2Input = range2Input;
    filter.color1Input = color1Input;
    filter.color2Input = color2Input;
    filter.mode = "match";
 
    return filter;
}

function switchFilterMode(filter) {
    filter.mode = filter.mode == "match" ? "gradient" : "match";

    if (filter.mode == "gradient") {
        filter.valueInput?.parentElement?.removeChild(filter.valueInput);
        filter.insertBefore(filter.range1Input, filter.color1Input);
        filter.insertBefore(filter.range2Input, filter.color1Input);
        filter.appendChild(filter.color2Input);
    } else {
        filter.range1Input?.parentElement?.removeChild(filter.range1Input);
        filter.range2Input?.parentElement?.removeChild(filter.range2Input);
        filter.color2Input?.parentElement?.removeChild(filter.color2Input);
        filter.insertBefore(filter.valueInput, filter.color1Input);
    }
}