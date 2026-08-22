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
    const cityList = document.getElementById('builderCityList');
    if (cityList) {
        const cityDiv = document.createElement('div');
        cityDiv.style.cssText = "padding: 10px 12px; background: white; border: 1px solid var(--border); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-top: 6px;";

        const infoDiv = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = `Stop: ${cityData.name}`;

        const stateDiv = document.createElement('div');
        stateDiv.style.cssText = "font-size: 11px; color: var(--muted);";
        stateDiv.textContent = cityData.state;

        infoDiv.appendChild(strong);
        infoDiv.appendChild(stateDiv);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = "btn btn-danger btn-sm";
        deleteBtn.style.cssText = "padding: 2px 6px; font-size: 10px;";
        deleteBtn.textContent = "×";
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            triggerDeleteConfirmation('City', cityData.name, () => {
                cityDiv.remove();
                showToast('City removed', 'warning');
            });
        });

        cityDiv.appendChild(infoDiv);
        cityDiv.appendChild(deleteBtn);
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

        const timeDiv = document.createElement('div');
        timeDiv.className = 'timeline-time';
        timeDiv.textContent = `Scheduled — ${activityData.time}`;

        const titleDiv = document.createElement('div');
        titleDiv.className = 'timeline-title';
        titleDiv.textContent = activityData.name;

        const metaDiv = document.createElement('div');
        metaDiv.className = 'timeline-meta';
        metaDiv.textContent = `Category: ${activityData.category}`;

        const actionDiv = document.createElement('div');
        actionDiv.style.cssText = "margin-top: 8px; display: flex; gap: 8px; align-items: center;";

        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'badge badge-success';
        badgeSpan.textContent = `₹${activityData.cost}`;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-danger btn-sm';
        removeBtn.style.cssText = "padding: 2px 8px; font-size: 11px;";
        removeBtn.textContent = 'Remove';
        removeBtn.addEventListener('click', () => {
            triggerDeleteConfirmation('Activity', activityData.name, () => {
                item.remove();
                showToast('Activity removed', 'warning');
            });
        });

        actionDiv.appendChild(badgeSpan);
        actionDiv.appendChild(removeBtn);

        item.appendChild(timeDiv);
        item.appendChild(titleDiv);
        item.appendChild(metaDiv);
        item.appendChild(actionDiv);

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

        const tdName = document.createElement('td');
        tdName.textContent = expenseData.name;

        const tdCat = document.createElement('td');
        const badgeCat = document.createElement('span');
        badgeCat.className = 'badge badge-primary';
        badgeCat.textContent = expenseData.category;
        tdCat.appendChild(badgeCat);

        const tdDate = document.createElement('td');
        tdDate.textContent = expenseData.date;

        const tdAmount = document.createElement('td');
        tdAmount.textContent = `₹${expenseData.amount.toLocaleString()}`;

        const tdAction = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.style.cssText = "padding: 2px 8px; font-size: 11px;";
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            triggerDeleteConfirmation('Expense', expenseData.name, () => {
                row.remove();
                showToast('Expense deleted', 'warning');
            });
        });
        tdAction.appendChild(deleteBtn);

        row.appendChild(tdName);
        row.appendChild(tdCat);
        row.appendChild(tdDate);
        row.appendChild(tdAmount);
        row.appendChild(tdAction);

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
