class Dropdown extends HTMLElement {
    #dropdown = null;
    #button = null;
    #dropdownContent = null;
    #observer = null;
    #selected = null;
    #name = null;
    #onChangeCallback = null;
    #optionElements = [];
    #connected = false;

    constructor() {
        super();
    }

    get selected() {
        return this.#selected;
    }

    set selected(value) {
        if (value == null || value == undefined) {
            this.#selected = null;
            if (this.#button) this.#button.textContent = this.#name;
        }

        this.#selected = value;
        if (this.#button) this.#button.textContent = this.#selected;
    }

    set onChange(callback) {
        this.#onChangeCallback = callback;
    }

    connectedCallback() {
        if (this.#dropdown) return;

        this.#name = this.getAttribute("name") ?? "Select...";
        
        // const shadow = this.attachShadow({ mode: "open" });
        this.#dropdown = document.createElement('div');
        this.#dropdown.classList.add('dropdown');

        this.#button = document.createElement('button');
        this.#button.classList.add('dropbtn');
        this.#button.onclick = this.toggle.bind(this);
        this.#button.textContent = this.#selected ?? this.#name;

        const dropdownContentWrapper = document.createElement('div'); 
        dropdownContentWrapper.classList.add('dropdown-wrapper');

        this.#dropdownContent = document.createElement('div');
        this.#dropdownContent.classList.add('dropdown-content');

        for (const child of this.children) {
            this.addOption(child);
        }
        this.replaceChildren();

        this.appendChild(this.#dropdown);
        this.#dropdown.appendChild(this.#button); 
        this.#dropdown.appendChild(dropdownContentWrapper);
        dropdownContentWrapper.appendChild(this.#dropdownContent);

        this.#observer = new MutationObserver(this.onMutation.bind(this));
        this.#observer.observe(this, {childList: true});

        this.#dropdownContent.replaceChildren(...this.#optionElements);
        this.#connected = true;
    }

    disconnectedCallback() {
        this.#observer.disconnect();
        this.#connected = false;
    }

    onMutation(mutations) { 
        for (const mutation of mutations) {
            for (const addedNode of mutation.addedNodes) { 
                if (addedNode.nodeType !== Node.ELEMENT_NODE) continue;
                console.log(addedNode);
                this.addOption(addedNode); 
            }
        }  
    }

    toggle() {
        this.#dropdownContent.classList.toggle("show");
    } 

    onOptionClick(option) {
        this.#selected = option.textContent;
        this.#button.textContent = this.#selected;
        this.#onChangeCallback?.(this.#selected);
    }

    addOption(element) {
        this.#optionElements.push(element); 
        if (this.#connected) {
            this.#dropdownContent.appendChild(element);
        }
        element.onclick = () => this.onOptionClick(element);
    }

    addOptionText(text) {
        const label = document.createElement('label');
        label.innerText = text;
        this.addOption(label);
    }
}

customElements.define("custom-dropdown", Dropdown);