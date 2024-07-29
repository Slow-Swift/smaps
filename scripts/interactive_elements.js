"use strict"

window.toggleDropdown = function(btn) {
    btn.nextElementSibling.firstElementChild.classList.toggle("show");
}

window.onclick = function(event) {
    if (!event.target.matches('.dropbtn')) { 
        let dropdowns = document.getElementsByClassName("dropdown-content");
        for (const dropdown of dropdowns) {
            if (dropdown.classList.contains('show')) {
                dropdown.classList.remove('show');
            }
        } 
    }
}