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
            nodeFilterElement.children[0].children[0].checked = nodeFilter.visible;
            nodeFilterElement.children[1].value = nodeFilter.tag;
            nodeFilterElement.children[2].value = nodeFilter.value;
            nodeFilterElement.children[3].value = nodeFilter.color;
        }

        this.edgeFilters.replaceChildren();
        for (const edgeFilter of configuration.edgeFilters) {
            const edgeFilterElement = this.#addEdgeFilter();
            edgeFilterElement.children[0].children[0].checked = edgeFilter.visible;
            edgeFilterElement.children[1].value = edgeFilter.tag;
            edgeFilterElement.children[2].value = edgeFilter.value;
            edgeFilterElement.children[3].value = edgeFilter.color;
        }

        document.getElementById('node-size-input').value = configuration.nodeSize;
        document.getElementById('edge-size-input').value = configuration.edgeSize;
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
        filterInfo.nodeSize = parseInt(document.getElementById('node-size-input').value);
        filterInfo.edgeSize = parseInt(document.getElementById('edge-size-input').value);
    
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
            visible:    filterElement.children[0].children[0].checked,
            tag:        filterElement.children[1].value.trim(),
            value:      filterElement.children[2].value.trim(),
            color:      filterElement.children[3].value.trim(),
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
    const template = document.createElement('template');
    template.innerHTML = `
    <div class="tag-filter">
        <div style="display: inline-block;">
            <input type="checkbox" class="tag-cb" checked>
        </div>
        <input class="tag-input" type="text" placeholder="Tag">
        <input class="tag-input" type="text" placeholder="Value">
        <input class="tag-input" type="color" placeholder="Color..." value="#3388ff">
    </div>
    `

    const children = template.content.children;
    return children[0];
}