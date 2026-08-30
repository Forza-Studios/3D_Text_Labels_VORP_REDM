// DOM Elements
const appContainer = document.getElementById('app-container');
const navButtons = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const closeBtn = document.getElementById('close-btn');

// Input Controls
const inputText = document.getElementById('label-text');
const sliderZOffset = document.getElementById('slider-z-offset');
const sliderScale = document.getElementById('slider-scale');
const sliderDistance = document.getElementById('slider-distance');
const colorPresets = document.querySelectorAll('.color-preset');
const colorPicker = document.getElementById('color-picker');
const toggleShadow = document.getElementById('toggle-shadow');
const toggleOutline = document.getElementById('toggle-outline');

// Value badges
const valZOffset = document.getElementById('val-z-offset');
const valScale = document.getElementById('val-scale');
const valDistance = document.getElementById('val-distance');
const lblCount = document.getElementById('lbl-count');

// Preview Elements
const previewTextElement = document.getElementById('preview-text-element');

// Search & List Elements
const searchLabels = document.getElementById('search-labels');
const labelsTbody = document.getElementById('labels-list-tbody');
const deleteAllBtn = document.getElementById('delete-all-btn');
const createBtn = document.getElementById('create-btn');

let currentLabelsList = [];
let selectedColor = '#ffffff';
let editingLabelId = null;
let editingCoords = null;

// Hex to RGB conversion helper
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}

// RGB to Hex conversion helper
function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// NUI Messages Listener
window.addEventListener('message', function(event) {
    const data = event.data;
    if (data.action === "open") {
        appContainer.style.display = 'block';
        currentLabelsList = data.labels || [];
        updateLabelsCount();
        renderLabelsList(currentLabelsList);
        
        // Reset Inputs & Edit state
        resetCreateMode();
        inputText.value = "Admin Announcement";
        sliderZOffset.value = 0.0;
        sliderScale.value = 0.35;
        sliderDistance.value = 15.0;
        selectedColor = '#ffffff';
        colorPicker.value = '#ffffff';
        toggleShadow.checked = true;
        toggleOutline.checked = false;
        
        // Reset color preset selection
        colorPresets.forEach(btn => btn.classList.remove('active'));
        if (colorPresets[0]) colorPresets[0].classList.add('active');
        
        // Reset font
        document.querySelector('input[name="font-type"][value="1"]').checked = true;
        document.querySelectorAll('.font-card').forEach(c => c.classList.remove('active'));
        document.querySelectorAll('.font-card')[0].classList.add('active');

        updatePreview();
    } else if (data.action === "close") {
        appContainer.style.display = 'none';
        resetCreateMode();
    } else if (data.action === "updateLabels") {
        currentLabelsList = data.labels || [];
        updateLabelsCount();
        renderLabelsList(currentLabelsList);
    }
});

// Update label count in UI
function updateLabelsCount() {
    lblCount.textContent = currentLabelsList.length;
}

// Close NUI Panel
function closePanel() {
    fetch(`https://${GetParentResourceName()}/coi_label:closeUI`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({})
    });
}

closeBtn.addEventListener('click', closePanel);

// Escape key listener to close menu
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' || event.key === 'Esc') {
        closePanel();
    }
});

// Tab Switching
navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const tabName = btn.getAttribute('data-tab');
        
        navButtons.forEach(b => b.classList.remove('active'));
        tabContents.forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');

        if (tabName === 'create') {
            // Reset Edit state if they click "Create Label" tab while editing
            if (editingLabelId !== null) {
                resetCreateMode();
                inputText.value = "Admin Announcement";
                sliderZOffset.value = 0.0;
                sliderScale.value = 0.35;
                sliderDistance.value = 15.0;
                selectedColor = '#ffffff';
                colorPicker.value = '#ffffff';
                colorPresets.forEach(btn => btn.classList.remove('active'));
                if (colorPresets[0]) colorPresets[0].classList.add('active');
                document.querySelector('input[name="font-type"][value="1"]').checked = true;
                fontCards.forEach(c => c.classList.remove('active'));
                document.querySelectorAll('.font-card')[0].classList.add('active');
                toggleShadow.checked = true;
                toggleOutline.checked = false;
                updatePreview();
            }
        }
    });
});

// Font Card Radio selection behavior
const fontCards = document.querySelectorAll('.font-card');
fontCards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    card.addEventListener('click', () => {
        fontCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        radio.checked = true;
        updatePreview();
    });
});

// Start editing a specific label
function startEditing(label) {
    editingLabelId = label.id;
    editingCoords = { x: label.x, y: label.y, z: label.z };

    inputText.value = label.text;
    sliderZOffset.value = label.z_offset;
    sliderScale.value = label.scale;
    sliderDistance.value = label.distance;

    selectedColor = rgbToHex(label.color_r, label.color_g, label.color_b);
    colorPicker.value = selectedColor;

    colorPresets.forEach(btn => {
        if (btn.getAttribute('data-color') === selectedColor) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const fontRadio = document.querySelector(`input[name="font-type"][value="${label.font}"]`);
    if (fontRadio) fontRadio.checked = true;
    fontCards.forEach(c => {
        const rad = c.querySelector('input[type="radio"]');
        if (rad && rad.value == label.font) {
            c.classList.add('active');
        } else {
            c.classList.remove('active');
        }
    });

    toggleShadow.checked = label.shadow === 1 || label.shadow === true;
    toggleOutline.checked = label.outline === 1 || label.outline === true;

    // Change Header & Button texts
    document.querySelector('#tab-create .tab-title').textContent = `Edit Label #${label.id}`;
    document.querySelector('#tab-create .tab-subtitle').textContent = `Modify label details. The live preview will appear at the label's origin location in the world.`;
    createBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" style="margin-right: 6px;">
            <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
        </svg>
        Update Label #${label.id}
    `;

    // Navigate to Create tab
    navButtons.forEach(b => b.classList.remove('active'));
    tabContents.forEach(c => c.classList.remove('active'));
    document.querySelector('.nav-btn[data-tab="create"]').classList.add('active');
    document.getElementById('tab-create').classList.add('active');

    updatePreview();
}

// Reset UI state to standard create mode
function resetCreateMode() {
    editingLabelId = null;
    editingCoords = null;
    document.querySelector('#tab-create .tab-title').textContent = "Design World Label";
    document.querySelector('#tab-create .tab-subtitle').textContent = "Configure label parameters and view real-time changes in the game world.";
    createBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" style="margin-right: 6px;">
            <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M17,13H13V17H11V13H7V11H11V7H13V11H17V13Z" />
        </svg>
        Place Label here
    `;
}

// Live Preview Update Logic
function updatePreview() {
    const textVal = inputText.value || " ";
    const zOffsetVal = parseFloat(sliderZOffset.value);
    const scaleVal = parseFloat(sliderScale.value);
    const distanceVal = parseFloat(sliderDistance.value);
    const fontVal = parseInt(document.querySelector('input[name="font-type"]:checked').value);
    const shadowVal = toggleShadow.checked;
    const outlineVal = toggleOutline.checked;
    
    // Update Badge text
    valZOffset.textContent = (zOffsetVal >= 0 ? '+' : '') + zOffsetVal.toFixed(2) + 'm';
    valScale.textContent = scaleVal.toFixed(2) + 'x';
    valDistance.textContent = distanceVal.toFixed(0) + '.0m';
    
    // Update HTML preview styling
    previewTextElement.textContent = textVal;
    previewTextElement.style.color = selectedColor;
    
    // Size representation in HTML
    previewTextElement.style.fontSize = `${14 + (scaleVal * 16)}px`;
    
    // Font classification in CSS
    if (fontVal === 1) {
        previewTextElement.style.fontFamily = "'Outfit', sans-serif";
        previewTextElement.style.fontStyle = "normal";
    } else if (fontVal === 0) {
        previewTextElement.style.fontFamily = "'Playfair Display', serif";
        previewTextElement.style.fontStyle = "italic";
    } else if (fontVal === 2) {
        previewTextElement.style.fontFamily = "'Great Vibes', cursive";
        previewTextElement.style.fontStyle = "normal";
    }
    
    // Shadows & outlines
    if (shadowVal) {
        previewTextElement.classList.add('preview-shadow');
    } else {
        previewTextElement.classList.remove('preview-shadow');
    }
    
    if (outlineVal) {
        previewTextElement.classList.add('preview-outline');
    } else {
        previewTextElement.classList.remove('preview-outline');
    }
    
    // Convert hex color to RGB for RedM DrawText rendering
    const rgb = hexToRgb(selectedColor);
    
    // Post to Client Lua for in-game live preview drawing
    fetch(`https://${GetParentResourceName()}/coi_label:updatePreview`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({
            text: textVal,
            z_offset: zOffsetVal,
            scale: scaleVal,
            distance: distanceVal,
            color: { r: rgb.r, g: rgb.g, b: rgb.b, a: 220 },
            font: fontVal,
            shadow: shadowVal,
            outline: outlineVal,
            editingId: editingLabelId,
            coords: editingCoords
        })
    });
}

// Add input listeners
inputText.addEventListener('input', updatePreview);
sliderZOffset.addEventListener('input', updatePreview);
sliderScale.addEventListener('input', updatePreview);
sliderDistance.addEventListener('input', updatePreview);
toggleShadow.addEventListener('change', updatePreview);
toggleOutline.addEventListener('change', updatePreview);

// Preset Color Selector
colorPresets.forEach(preset => {
    preset.addEventListener('click', () => {
        colorPresets.forEach(p => p.classList.remove('active'));
        preset.classList.add('active');
        selectedColor = preset.getAttribute('data-color');
        colorPicker.value = selectedColor;
        updatePreview();
    });
});

// Custom Color Picker Selector
colorPicker.addEventListener('input', (e) => {
    colorPresets.forEach(p => p.classList.remove('active'));
    selectedColor = e.target.value;
    updatePreview();
});

// Place / Update Label callback
createBtn.addEventListener('click', () => {
    const textVal = inputText.value;
    if (!textVal || textVal.trim() === "") return;
    
    const zOffsetVal = parseFloat(sliderZOffset.value);
    const scaleVal = parseFloat(sliderScale.value);
    const distanceVal = parseFloat(sliderDistance.value);
    const fontVal = parseInt(document.querySelector('input[name="font-type"]:checked').value);
    const shadowVal = toggleShadow.checked;
    const outlineVal = toggleOutline.checked;
    const rgb = hexToRgb(selectedColor);
    
    if (editingLabelId !== null) {
        // Edit Action
        fetch(`https://${GetParentResourceName()}/coi_label:updateLabel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify({
                id: editingLabelId,
                text: textVal,
                z_offset: zOffsetVal,
                scale: scaleVal,
                distance: distanceVal,
                color_r: rgb.r,
                color_g: rgb.g,
                color_b: rgb.b,
                color_a: 220,
                font: fontVal,
                shadow: shadowVal ? 1 : 0,
                outline: outlineVal ? 1 : 0
            })
        });
        resetCreateMode();
    } else {
        // Create Action
        fetch(`https://${GetParentResourceName()}/coi_label:saveLabel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify({
                text: textVal,
                z_offset: zOffsetVal,
                scale: scaleVal,
                distance: distanceVal,
                color_r: rgb.r,
                color_g: rgb.g,
                color_b: rgb.b,
                color_a: 220,
                font: fontVal,
                shadow: shadowVal ? 1 : 0,
                outline: outlineVal ? 1 : 0
            })
        });
    }
});

// Search functionality for list
searchLabels.addEventListener('input', (e) => {
    const filter = e.target.value.toLowerCase();
    const filtered = currentLabelsList.filter(label => 
        label.text.toLowerCase().includes(filter) || 
        label.created_by.toLowerCase().includes(filter) ||
        label.id.toString().includes(filter)
    );
    renderLabelsList(filtered);
});

// Render Labels in management tab
function renderLabelsList(labels) {
    labelsTbody.innerHTML = '';
    
    if (labels.length === 0) {
        labelsTbody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-state">No labels found active nearby</td>
            </tr>
        `;
        return;
    }
    
    labels.forEach(label => {
        const tr = document.createElement('tr');
        
        tr.innerHTML = `
            <td>${label.id}</td>
            <td>
                <div class="label-title-cell" style="color: rgb(${label.color_r}, ${label.color_g}, ${label.color_b})">${escapeHtml(label.text)}</div>
                <span class="label-subinfo-cell">By: ${escapeHtml(label.created_by)}</span>
            </td>
            <td>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span class="label-detail-badge">Z: ${label.z_offset >= 0 ? '+' : ''}${label.z_offset.toFixed(2)}m</span>
                    <span class="label-detail-badge">Size: ${label.scale.toFixed(2)}x</span>
                </div>
            </td>
            <td>${label.distance.toFixed(0)}m</td>
            <td>
                <div class="action-buttons">
                    <button class="action-icon-btn btn-teleport" title="Teleport to Label" data-id="${label.id}">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,6V11H6V13H11V18H13V13H18V11H13V6H11Z" />
                        </svg>
                    </button>
                    <button class="action-icon-btn btn-edit" title="Edit Label" data-id="${label.id}">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.07,6.19L3,17.25Z" />
                        </svg>
                    </button>
                    <button class="action-icon-btn btn-delete" title="Delete Label" data-id="${label.id}">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path fill="currentColor" d="M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19M8,9H16V19H8V9M15.5,4L14.5,3H9.5L8.5,4H5V6H19V4H15.5Z" />
                        </svg>
                    </button>
                </div>
            </td>
        `;
        
        // Teleport action listener
        tr.querySelector('.btn-teleport').addEventListener('click', () => {
            fetch(`https://${GetParentResourceName()}/coi_label:teleportTo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8'
                },
                body: JSON.stringify({ id: label.id })
            });
        });

        // Edit action listener
        tr.querySelector('.btn-edit').addEventListener('click', () => {
            startEditing(label);
        });
        
        // Delete action listener
        tr.querySelector('.btn-delete').addEventListener('click', () => {
            if (confirm(`Are you sure you want to delete label [${label.id}]?`)) {
                fetch(`https://${GetParentResourceName()}/coi_label:deleteLabel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json; charset=UTF-8'
                    },
                    body: JSON.stringify({ id: label.id })
                });
            }
        });
        
        labelsTbody.appendChild(tr);
    });
}

// Delete All click listener
deleteAllBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to delete ALL active labels in the database? This action cannot be undone.")) {
        fetch(`https://${GetParentResourceName()}/coi_label:deleteAll`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8'
            },
            body: JSON.stringify({})
        });
    }
});

// HTML escaping helper
function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

