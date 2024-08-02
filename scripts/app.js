'use strict';

import { haversine, load_graph } from "./graph_loader.js";
import { MOA_Star } from "./moastar.js";
import { Vector } from "./vector.js";
import { MapManager } from "./map_manager.js";
import { GraphDataLayer } from "./graph_data_layer.js";
import { GraphDataConfigurator } from "./graph_data_configurator.js";
import { RouteProfileMenu } from "./route_profile_menu.js";

window.onload = on_load;

async function on_load() {
    console.log("Loaded");
    await initialize_graph();
    window.map = new MapManager(graph);
    window.graphDataLayer = new GraphDataLayer(window.map);
    window.gdc = new GraphDataConfigurator(window.map);
    setup_callbacks();
    initialize_interactive_elements();
    window.routeProfileMenu = new RouteProfileMenu();
}

async function initialize_graph() {
    window.graph = await load_graph(30);
    for (let edge_data of window.graph.iterEdges()) {
        let length = edge_data.length;
        let crossing = edge_data.elevation;
        let weight = new Vector(length, crossing);
        edge_data.weight = weight;
    }

    window.namoa_star = new MOA_Star(
        window.graph, 
        (v) => {
            v = graph.getVertex(v);
            return new Vector(
                haversine(v.latlon, window.targetNode.latlon),
                Math.abs(v.elevation - window.targetNode.elevation),
                0,
            );
        },
        (from, to) => {
            let edge = graph.getEdge(from, to);
            let weight = new Vector(
                edge.length,
                edge.elevation,
                edge.tags.slope,
            );
            return weight;
        },
        (cost1, cost2) => {
            return new Vector(
                cost1[0] + cost2[0],
                cost1[1] + cost2[1],
                Math.max(cost1[2], cost2[2]),
            );
        },
        3,
    );
}

function on_show_data_pressed() {
    const visible = window.graphDataLayer.toggleVisible();
    this.innerHTML = visible ? "Hide Graph Data" : "Show Graph Data";
}

function updateRouteDropdown(route_count) {
    const dropdownContent = document.getElementById('routeDropdownContent');
    dropdownContent.innerHTML = ''; // Clear existing options

    for (let i = 1; i <= route_count; i++) {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.name = 'routes';
        checkbox.value = `Route ${i}`;
        checkbox.checked = true;
        checkbox.addEventListener('change', () => window.map.setRouteVisibility(i - 1, checkbox.checked));
        label.addEventListener('mouseover', () => window.map.setRouteBold(i-1, true));
        label.addEventListener('mouseout', () => window.map.setRouteBold(i-1, false));
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` Route ${i}`));
        dropdownContent.appendChild(label);
    }
}

function setup_callbacks() { 
    window.updateRouteDropdown = updateRouteDropdown;
    document.getElementById('btn-calculate-routes').onclick = () => window.map.pathfind(window.profile); 
    document.getElementById("show-data-btn").onclick = on_show_data_pressed;

    window.show_filters = () => window.gdc.showFilterMenu();
    window.hide_filters = () => window.gdc.hideFilterMenu();
    window.show_save_menu = () => window.gdc.showSaveMenu();
    window.hide_save_menu = () => window.gdc.hideSaveMenu();
    window.show_profile_menu = () => document.getElementById('profile-menu').style.display = 'block';
    window.hideMenu = (btn) => { 
        btn.closest('.floating-window').style.display = 'none' 
    };
}

function initialize_interactive_elements() {
    const collapsibles = document.getElementsByClassName("collapsible");

    function setCollabsibleActive(collapsible, active) {
        if (active) {
            collapsible.classList.add('active');
        } else {
            collapsible.classList.remove('active');
        }

        const content = collapsible.nextElementSibling;
        let height = content.scrollHeight + 5;
        height = "300px";
        content.style.maxHeight = active ? height : 0;
    }

    for (const collapsible of collapsibles) {
        collapsible.addEventListener("click", function() {
            setCollabsibleActive(this, !this.classList.contains('active'));
            for (const collapsible of collapsibles) {
                if (collapsible != this)
                    setCollabsibleActive(collapsible, false);
            }
        });
    }

    const numSpinners = document.getElementsByClassName("num-in");
    for (const numSpinner of numSpinners) {
        const min = parseInt(numSpinner?.attributes?.min?.value);
        const max = parseInt(numSpinner?.attributes?.max?.value);
        const buttons = numSpinner.getElementsByTagName('span');
        for (const button of buttons) {
            button.onclick = () => {
                if (button.classList.contains('disabled')) return;
                const value = button.classList.contains('minus') ? -1 : 1;
                const input = button.parentElement.getElementsByClassName('in-num')[0];
                const current = parseFloat(input.value)
                const newValue = current + value;
                input.value = newValue;
                for (const b of button.parentElement.getElementsByTagName('span'))
                    b.classList.remove('disabled');

                if (newValue == max || newValue == min) {
                    button.classList.add('disabled');
                }

                numSpinner.onchanged?.(newValue);
            }
        }
    }

    for (const draggable of document.getElementsByClassName('draggable')) {
        setupDraggable(draggable);
    }
}

//* From: https://www.w3schools.com/howto/howto_js_draggable.asp
function setupDraggable(element) {
    const dragArea = element.getElementsByClassName('draggable-header')[0] ?? element;
    dragArea.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e.preventDefault();

        document.onmouseup = closeDragEvent;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        element.style.top = (element.offsetTop + e.movementY) + "px";
        element.style.left = (element.offsetLeft + e.movementX) + "px";
    }

    function closeDragEvent() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}