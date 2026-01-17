(() => {
    // get styles from script element
    const style = {
        backgroundColor: document.currentScript.getAttribute('background-color') || 'white',
        defaultColor: document.currentScript.getAttribute('default-color') || 'black',
        selectedColor: document.currentScript.getAttribute('selected-color') || 'white',
        selectedHighlight: document.currentScript.getAttribute('selected-highlight') || '#007bff'
    };
    const dialPopupBox = document.createElement('div');
    dialPopupBox.classList.add('dialPopupBox', 'hidden');
    dialPopupBox.innerHTML = `
        <div class="dialPopupBackgroundDimmer"></div>
        <div class="dial-container">
            <div class="dial"></div>
            <div class="select-btn">Select</div>
        </div>
    `;
    document.body.appendChild(dialPopupBox);
    
    const dial = dialPopupBox.querySelector('.dial');
    const selectBtn = dialPopupBox.querySelector('.select-btn');
    
    const promptSlider = document.createElement('input');
    promptSlider.type = 'hidden';
    promptSlider.classList.add('dial-select');
    document.body.appendChild(promptSlider);
    
    function initSelectSwiper() {
        function makeEmptyOption() {
            let newOption = document.createElement('div');
            newOption.innerHTML = '';
            newOption.classList.add('not-a-valid-option');
            return newOption;
        }
        function scrollToOption(option) {
            const optionTop = option.offsetTop;
            const containerHeight = dial.clientHeight;
            const itemHeight = option.clientHeight;
            const scrollTo = optionTop - (containerHeight / 2) + (itemHeight / 2);
            dial.scrollTo({
                top: scrollTo,
                behavior: 'smooth'
            });
        }
        const dial_selects = Array.from(document.querySelectorAll('.dial-select'));
        let current_dial_input = null;
        dial_selects.forEach(dial_select => {
            dial_select.addEventListener('click', () => {
                dial_select.blur();
                // fill in dial
                dial.innerHTML = '';
                const options = dial_select.getAttribute('data-options').split(',');
                dial.appendChild(makeEmptyOption());
                dial.appendChild(makeEmptyOption());
                options.forEach(option => {
                    let newOption = document.createElement('div');
                    newOption.innerHTML = option;
                    if (String(option).trim()==String(dial_select.value).trim()) {
                        newOption.classList.add('selected');
                    }
                    // console.log(newOption);
                    
                    newOption.onclick = () => {
                        // console.log(newOption);
                        if (!current_dial_input) { return; }
                        // remove current selected item
                        dialPopupBox.querySelector('.dial div.selected').classList.remove('selected');
                        newOption.classList.add('selected');
                        scrollToOption(newOption);
                        highlightSelectedItem(newOption);
                    };
                    dial.appendChild(newOption);
                });
                dial.appendChild(makeEmptyOption());
                dial.appendChild(makeEmptyOption());
                // show dial popup
                current_dial_input = dial_select;
                dialPopupBox.classList.remove('hidden');
        
                // Scroll to the pre-selected item and highlight it
                const selectedItem = dialPopupBox.querySelector('.dial div.selected');
                if (selectedItem) {
                    const selectedItemTop = selectedItem.offsetTop;
                    const containerHeight = dial.clientHeight;
                    const itemHeight = selectedItem.clientHeight;
                    const scrollTo = selectedItemTop - (containerHeight / 2) + (itemHeight / 2);
                    dial.scrollTo(0, scrollTo);
                }
                highlightSelectedItem();
            });
        });
        dial.addEventListener('scroll', () => {
            highlightSelectedItemDebounced();
            adjustFontSize();
        });
        const highlightSelectedItemDebounced = debounce(highlightSelectedItem, 100);

        let current_listener = null;
        dialPopupBox.addChooseListener = callback => current_listener = callback;
        dialPopupBox.triggerListener = () => {
            if (current_listener) {
                current_listener(current_dial_input.value);
            }
            current_listener = null;
        };
        
        if (document.currentScript.getAttribute('select-button') === 'true') {
            selectBtn.style.display = 'block';
            selectBtn.addEventListener('click', () => {
                dialPopupBox.classList.add('hidden');
                dialPopupBox.triggerListener();
            });
            dialPopupBox.querySelector('.dialPopupBackgroundDimmer').addEventListener('click', () => {
                dialPopupBox.classList.add('hidden');
            });
        } else {
            selectBtn.style.display = 'none';
            dialPopupBox.querySelector('.dialPopupBackgroundDimmer').addEventListener('click', () => {
                dialPopupBox.classList.add('hidden');
                dialPopupBox.triggerListener();
            });
        }

        
        function adjustFontSize() {
            const dialRect = dial.getBoundingClientRect();
            const dialCenter = dialRect.top + dialRect.height / 2;
        
            dial.querySelectorAll('div:not(.not-a-valid-option)').forEach(item => {
                const rect = item.getBoundingClientRect();
                const itemCenter = rect.top + rect.height / 2;
                const distance = Math.abs(itemCenter - dialCenter);
        
                // Adjust the font size based on the distance from the center
                const maxFontSize = 30; // Maximum font size
                const minFontSize = 8; // Minimum font size
                const maxDistance = dialRect.height / 2;
        
                let fontSize = maxFontSize - (distance / maxDistance) * (maxFontSize - minFontSize);
                fontSize = Math.max(minFontSize, fontSize); // Ensure the font size does not go below the minimum
        
                item.style.fontSize = `${fontSize}px`;
            });
        }
        
        function highlightSelectedItem(closestItem = null) {
            if (!closestItem) {
                let closestDistance = Infinity;
                dial.querySelectorAll('div:not(.not-a-valid-option)').forEach((item) => {
                    const rect = item.getBoundingClientRect();
                    const dialRect = dial.getBoundingClientRect();
                    const distance = Math.abs(rect.top + rect.height / 2 - (dialRect.top + dialRect.height / 2));
                    
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestItem = item;
                    }
                });
            }
            dial.querySelectorAll('div:not(.not-a-valid-option)').forEach(item => {
                item.classList.remove('selected');
                item.style.color = style.defaultColor;
                item.style.backgroundColor = style.backgroundColor;
            });
            if (closestItem) {
                closestItem.classList.add('selected');
                closestItem.style.color = style.selectedColor;
                closestItem.style.backgroundColor = style.selectedHighlight;
                current_dial_input.value = closestItem.innerHTML.trim();
                scrollToOption(closestItem);
            }
            adjustFontSize();
        }
        
        // Debounce function to limit the rate of function execution
        function debounce(func, wait) {
            let timeout;
            return function (...args) {
                clearTimeout(timeout);
                timeout = setTimeout(() => func.apply(this, args), wait);
            };
        }
    }
    function promptNewSlider(optionsObject) {
        const options = Object.entries(optionsObject)
        
        promptSlider.value = options[0][0];
        promptSlider.setAttribute('data-options', options.map(option => option[0]).join(','));
        promptSlider.click();

        return new Promise(resolve => {
            dialPopupBox.addChooseListener((val) =>{
                resolve(optionsObject[val]);
            });
        });
    }
    window.selectSwiper = {
        init: initSelectSwiper,
        prompt: promptNewSlider
    }
    if (!document.currentScript.getAttribute('init-manually'))
        initSelectSwiper();
})();