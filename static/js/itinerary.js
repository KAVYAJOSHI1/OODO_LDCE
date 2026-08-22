/**
 * GlobeTrotter - Itinerary & Data Integration Handlers
 * Modular functions designed for easy Django view endpoint wiring
 */

// Generic confirmation modal trigger
let currentDeleteCallback = null;

function triggerDeleteConfirmation(itemType, itemName, callback) {
    const titleElem = document.getElementById('deleteModalTitle');
    const msgElem = document.getElementById('deleteModalMessage');

    if (titleElem) titleElem.textContent = `Delete ${itemType}?`;
    if (msgElem) msgElem.textContent = `Are you sure you want to delete "${itemName}"? This action cannot be undone.`;

    currentDeleteCallback = callback;
    openModal('deleteConfirmationModal');
}

function handleConfirmDelete() {
    if (currentDeleteCallback) {
        currentDeleteCallback();
        currentDeleteCallback = null;
    }
    closeModal('deleteConfirmationModal');
}

// Prefill and Open City Modal
function openAddCityModalWithData(cityName, stateName) {
    const nameInput = document.getElementById('modalCityName');
    const stateInput = document.getElementById('modalCityState');
    if (nameInput) nameInput.value = cityName || '';
    if (stateInput) stateInput.value = stateName || 'India';
    clearFieldError(nameInput);
    openModal('addCityModal');
}

// Add City Handler
function handleAddCitySubmit(event) {
    if (event) event.preventDefault();

    const cityNameInput = document.getElementById('modalCityName');
    const cityStateInput = document.getElementById('modalCityState');

    clearFieldError(cityNameInput);

    if (!cityNameInput.value.trim()) {
        setFieldError(cityNameInput, 'City name is required');
        return false;
    }

    const cityData = {
        name: cityNameInput.value.trim(),
        state: cityStateInput ? cityStateInput.value.trim() : 'India',
        costIndex: '6.5/10'
    };

    addCity(cityData);
    closeModal('addCityModal');
    return false;
}

function addCity(cityData) {
    // Visually append city stop to Itinerary Builder UI if list exists
    const cityList = document.getElementById('builderCityList');
    if (cityList) {
        const cityDiv = document.createElement('div');
        cityDiv.style.cssText = "padding: 10px 12px; background: white; border: 1px solid var(--border); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-top: 6px;";
        cityDiv.innerHTML = `
            <div>
                <strong>Stop: ${cityData.name}</strong>
                <div style="font-size: 11px; color: var(--muted);">${cityData.state}</div>
            </div>
            <button class="btn btn-danger btn-sm" style="padding: 2px 6px; font-size: 10px;" onclick="triggerDeleteConfirmation('City', '${cityData.name}', () => { this.parentElement.remove(); showToast('City removed', 'warning'); })">×</button>
        `;
        cityList.appendChild(cityDiv);
    }

    showToast('City added successfully!', 'success');
}

// Prefill and Open Activity Modal
function openAddActivityModalWithData(activityName, cost, category) {
    const nameInput = document.getElementById('modalActivityName');
    const costInput = document.getElementById('modalActivityCost');
    const catInput = document.getElementById('modalActivityCategory');
    if (nameInput) nameInput.value = activityName || '';
    if (costInput) costInput.value = cost || '';
    if (catInput && category) catInput.value = category;
    clearFieldError(nameInput);
    clearFieldError(costInput);
    openModal('addActivityModal');
}

// Add Activity Handler
function handleAddActivitySubmit(event) {
    if (event) event.preventDefault();

    const nameInput = document.getElementById('modalActivityName');
    const costInput = document.getElementById('modalActivityCost');
    const timeInput = document.getElementById('modalActivityTime');

    clearFieldError(nameInput);
    clearFieldError(costInput);

    let isValid = true;
    if (!nameInput.value.trim()) {
        setFieldError(nameInput, 'Activity name is required');
        isValid = false;
    }
    if (!costInput.value || costInput.value < 0) {
        setFieldError(costInput, 'Please enter a valid cost');
        isValid = false;
    }

    if (!isValid) return false;

    const activityData = {
        name: nameInput.value.trim(),
        cost: costInput.value,
        time: timeInput.value || '10:00 AM',
        category: document.getElementById('modalActivityCategory')?.value || 'Sightseeing'
    };

    addActivity(activityData);
    closeModal('addActivityModal');
    return false;
}

function addActivity(activityData) {
    const timeline = document.getElementById('builderTimeline');
    if (timeline) {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
            <div class="timeline-time">Scheduled — ${activityData.time}</div>
            <div class="timeline-title">${activityData.name}</div>
            <div class="timeline-meta">Category: ${activityData.category}</div>
            <div style="margin-top: 8px; display: flex; gap: 8px; align-items: center;">
                <span class="badge badge-success">₹${activityData.cost}</span>
                <button class="btn btn-danger btn-sm" style="padding: 2px 8px; font-size: 11px;" onclick="triggerDeleteConfirmation('Activity', '${activityData.name}', () => { this.closest('.timeline-item').remove(); showToast('Activity removed', 'warning'); })">Remove</button>
            </div>
        `;
        timeline.appendChild(item);
    }

    showToast('Activity added successfully!', 'success');
}

// Add Expense Handler
function handleAddExpenseSubmit(event) {
    if (event) event.preventDefault();

    const nameInput = document.getElementById('modalExpenseName');
    const amountInput = document.getElementById('modalExpenseAmount');
    const catInput = document.getElementById('modalExpenseCategory');

    clearFieldError(nameInput);
    clearFieldError(amountInput);

    let isValid = true;
    if (!nameInput.value.trim()) {
        setFieldError(nameInput, 'Expense description is required');
        isValid = false;
    }
    if (!amountInput.value || amountInput.value < 0) {
        setFieldError(amountInput, 'Enter a valid positive amount');
        isValid = false;
    }

    if (!isValid) return false;

    const expenseData = {
        name: nameInput.value.trim(),
        amount: parseFloat(amountInput.value),
        category: catInput ? catInput.value : 'Other',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    addExpense(expenseData);
    closeModal('addExpenseModal');
    return false;
}

function addExpense(expenseData) {
    const tableBody = document.getElementById('expenseTableBody');
    if (tableBody) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${expenseData.name}</td>
            <td><span class="badge badge-primary">${expenseData.category}</span></td>
            <td>${expenseData.date}</td>
            <td>₹${expenseData.amount.toLocaleString()}</td>
            <td><button class="btn btn-danger btn-sm" style="padding: 2px 8px; font-size: 11px;" onclick="triggerDeleteConfirmation('Expense', '${expenseData.name}', () => { this.closest('tr').remove(); showToast('Expense deleted', 'warning'); })">Delete</button></td>
        `;
        tableBody.appendChild(row);
    }

    showToast('Expense added successfully!', 'success');
}

// City Search Filter (Frontend UI utility)
function filterCityResults(searchTerm) {
    const term = searchTerm.toLowerCase();
    const items = document.querySelectorAll('.city-search-item');
    let found = 0;
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(term)) {
            item.style.display = 'flex';
            found++;
        } else {
            item.style.display = 'none';
        }
    });

    const emptyElem = document.getElementById('citySearchEmpty');
    if (emptyElem) {
        emptyElem.style.display = found === 0 ? 'block' : 'none';
    }
}
