/**
 * GlobeTrotter - Master State Engine, Interactions & City-Strict Logic
 * Modular functions for dynamic frontend interaction & future Django view integration.
 */

// Global Application State (Integration-Ready Frontend Data Store)
window.GLOBETROTTER_STATE = {
    trip: {
        id: "trip-101",
        title: "Golden Triangle Explorer",
        targetBudget: 25000,
        startDate: "2026-10-20",
        endDate: "2026-10-28",
        description: "Curated multi-city heritage and cultural journey.",
        shareToken: "gt-share-883921"
    },
    stops: [
        {
            id: "stop-goa",
            cityId: "goa",
            cityName: "Goa",
            stateName: "Goa, India",
            startDate: "2026-10-20",
            endDate: "2026-10-23",
            activities: [
                { id: "act-1", activityId: "goa-baga", name: "Baga Beach", category: "Sightseeing", cost: 0, time: "09:00 AM", duration: "2.0 Hours" },
                { id: "act-2", activityId: "goa-fort-aguada", name: "Fort Aguada", category: "Heritage & Monuments", cost: 300, time: "02:00 PM", duration: "2.5 Hours" }
            ]
        },
        {
            id: "stop-mumbai",
            cityId: "mumbai",
            cityName: "Mumbai",
            stateName: "Maharashtra, India",
            startDate: "2026-10-24",
            endDate: "2026-10-28",
            activities: [
                { id: "act-3", activityId: "mumbai-gateway", name: "Gateway of India", category: "Heritage & Monuments", cost: 0, time: "10:00 AM", duration: "1.5 Hours" }
            ]
        }
    ],
    expenses: [
        { id: "exp-1", name: "Hotel Imperial Stay (3 Nights)", category: "Stay", amount: 10500, date: "Oct 12, 2026" },
        { id: "exp-2", name: "Gatimaan Express Train", category: "Transport", amount: 3000, date: "Oct 14, 2026" }
    ],
    activeTargetStopId: null
};

// Generic Modal Confirmation Handler
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

// Initialize Application on Page Load
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    renderCityCatalogSearch();
    renderActivitySearchCatalog();
    renderItineraryBuilderStops();
    renderExpenseTable();
    recalculateBudget();
    updateTripReadiness();
    syncCalendarView();
}

// -------------------------------------------------------------
// 1. CITY SEARCH & CATALOG DISCOVERY
// -------------------------------------------------------------

function renderCityCatalogSearch() {
    const container = document.getElementById('citySearchResultsContainer');
    if (!container) return;

    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }

    if (typeof GLOBETROTTER_CITIES === 'undefined') return;

    GLOBETROTTER_CITIES.forEach(city => {
        const item = document.createElement('div');
        item.className = 'city-search-item';
        item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-bottom: 1px solid var(--border); cursor: pointer;";

        const left = document.createElement('div');
        const strong = document.createElement('strong');
        strong.textContent = city.name;

        const spanState = document.createElement('span');
        spanState.style.cssText = "font-size: 11px; color: var(--muted); margin-left: 6px;";
        spanState.textContent = `(${city.state}, ${city.country})`;

        const meta = document.createElement('div');
        meta.style.cssText = "font-size: 11px; color: var(--muted); margin-top: 2px;";
        meta.textContent = `${city.activitiesCount} Activities • Cost: ${city.costIndex}`;

        left.appendChild(strong);
        left.appendChild(spanState);
        left.appendChild(meta);

        const badge = document.createElement('span');
        badge.className = city.costIndex === 'High' ? 'badge badge-warning' : (city.costIndex === 'Low' ? 'badge badge-success' : 'badge badge-primary');
        badge.textContent = `Cost: ${city.costIndex}`;

        item.appendChild(left);
        item.appendChild(badge);

        item.addEventListener('click', () => {
            selectCityForModal(city.id);
        });

        container.appendChild(item);
    });
}

function selectCityForModal(cityId) {
    const city = getCityById(cityId);
    if (!city) return;

    const nameInput = document.getElementById('modalCityName');
    const stateInput = document.getElementById('modalCityState');
    const idInput = document.getElementById('modalCityId');

    if (nameInput) nameInput.value = city.name;
    if (stateInput) stateInput.value = `${city.state}, ${city.country}`;
    if (idInput) idInput.value = city.id;

    clearFieldError(nameInput);
}

function filterCityResults(query) {
    const costFilter = document.getElementById('cityCostFilter')?.value || '';
    const filtered = searchCities(query, costFilter);

    const items = document.querySelectorAll('.city-search-item');
    let count = 0;

    items.forEach((item, index) => {
        if (GLOBETROTTER_CITIES[index]) {
            const city = GLOBETROTTER_CITIES[index];
            const isMatch = filtered.some(fc => fc.id === city.id);
            item.style.display = isMatch ? 'flex' : 'none';
            if (isMatch) count++;
        }
    });

    const emptyMsg = document.getElementById('citySearchEmpty');
    if (emptyMsg) {
        emptyMsg.style.display = count === 0 ? 'block' : 'none';
    }
}

function openAddCityModalWithData(cityId) {
    if (cityId) {
        selectCityForModal(cityId);
    }
    openModal('addCityModal');
}

function handleAddCitySubmit(event) {
    if (event) event.preventDefault();

    const nameInput = document.getElementById('modalCityName');
    const stateInput = document.getElementById('modalCityState');
    const idInput = document.getElementById('modalCityId');

    clearFieldError(nameInput);

    if (!nameInput.value.trim()) {
        setFieldError(nameInput, 'City name is required');
        return false;
    }

    const cityId = idInput?.value || nameInput.value.trim().toLowerCase().replace(/\s+/g, '-');
    const cityName = nameInput.value.trim();
    const stateName = stateInput ? stateInput.value.trim() : 'India';

    const newStop = {
        id: `stop-${Date.now()}`,
        cityId: cityId,
        cityName: cityName,
        stateName: stateName,
        startDate: "2026-10-24",
        endDate: "2026-10-26",
        activities: []
    };

    window.GLOBETROTTER_STATE.stops.push(newStop);
    renderItineraryBuilderStops();
    recalculateBudget();
    updateTripReadiness();
    closeModal('addCityModal');

    showToast(`${cityName} added to itinerary`, 'success');
    return false;
}

// -------------------------------------------------------------
// 2. CITY-STRICT ACTIVITY SEARCH & MODALS
// -------------------------------------------------------------

function renderActivitySearchCatalog() {
    const tableBody = document.getElementById('activityCatalogTableBody');
    const citySelect = document.getElementById('activityCityFilter');

    if (citySelect && citySelect.options.length <= 1) {
        GLOBETROTTER_CITIES.forEach(city => {
            const opt = document.createElement('option');
            opt.value = city.id;
            opt.textContent = `${city.name} (${city.state})`;
            citySelect.appendChild(opt);
        });
    }

    filterActivityCatalogTable();
}

function filterActivityCatalogTable() {
    const cityFilter = document.getElementById('activityCityFilter')?.value || 'goa';
    const catFilter = document.getElementById('activityCategoryFilter')?.value || '';
    const searchQuery = document.getElementById('activitySearchInput')?.value.trim().toLowerCase() || '';
    const tableBody = document.getElementById('activityCatalogTableBody');

    if (!tableBody) return;

    while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
    }

    const cityActivities = getActivitiesByCityId(cityFilter);

    const filtered = cityActivities.filter(act => {
        const matchesCat = !catFilter || act.category === catFilter;
        const matchesSearch = !searchQuery || act.name.toLowerCase().includes(searchQuery) || act.description.toLowerCase().includes(searchQuery);
        return matchesCat && matchesSearch;
    });

    if (filtered.length === 0) {
        const row = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.className = 'text-center text-muted';
        td.style.padding = '20px';
        td.textContent = 'No matching activities found for this selected city.';
        row.appendChild(td);
        tableBody.appendChild(row);
        return;
    }

    filtered.forEach(act => {
        const row = document.createElement('tr');

        const tdName = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = act.name;
        const descDiv = document.createElement('div');
        descDiv.style.cssText = "font-size: 11px; color: var(--muted);";
        descDiv.textContent = act.description;
        tdName.appendChild(strong);
        tdName.appendChild(descDiv);

        const tdDest = document.createElement('td');
        const cityObj = getCityById(act.cityId);
        tdDest.textContent = cityObj ? `${cityObj.name}, ${cityObj.state}` : act.cityId;

        const tdCat = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'badge badge-primary';
        badge.textContent = act.category;
        tdCat.appendChild(badge);

        const tdDur = document.createElement('td');
        tdDur.textContent = act.duration;

        const tdCost = document.createElement('td');
        tdCost.textContent = act.cost === 0 ? 'Free' : `₹${act.cost.toLocaleString()}`;

        const tdAction = document.createElement('td');
        const addBtn = document.createElement('button');
        addBtn.className = 'btn btn-primary btn-sm';
        addBtn.textContent = '+ Add to Trip';
        addBtn.addEventListener('click', () => {
            openAddActivityModalWithData(act.cityId, act.id);
        });
        tdAction.appendChild(addBtn);

        row.appendChild(tdName);
        row.appendChild(tdDest);
        row.appendChild(tdCat);
        row.appendChild(tdDur);
        row.appendChild(tdCost);
        row.appendChild(tdAction);

        tableBody.appendChild(row);
    });
}

function openAddActivityModalWithData(cityId, activityId, targetStopId) {
    const city = getCityById(cityId) || GLOBETROTTER_CITIES[0];
    window.GLOBETROTTER_STATE.activeTargetStopId = targetStopId || window.GLOBETROTTER_STATE.stops[0]?.id;

    // Update City Badge Notice
    const badgeElem = document.getElementById('activityModalCityBadge');
    if (badgeElem) {
        badgeElem.textContent = `📍 Showing activities ONLY for: ${city.name} (${city.state})`;
    }

    // Populate City-Strict Activity Select
    const selectElem = document.getElementById('modalActivitySelect');
    if (selectElem) {
        while (selectElem.firstChild) {
            selectElem.removeChild(selectElem.firstChild);
        }

        const defaultOpt = document.createElement('option');
        defaultOpt.value = "";
        defaultOpt.textContent = `-- Choose ${city.name} Activity --`;
        selectElem.appendChild(defaultOpt);

        city.activities.forEach(act => {
            const opt = document.createElement('option');
            opt.value = act.id;
            opt.textContent = `${act.name} (₹${act.cost} • ${act.duration})`;
            if (activityId && act.id === activityId) {
                opt.selected = true;
            }
            selectElem.appendChild(opt);
        });
    }

    if (activityId) {
        onActivitySelectChange(activityId, city.id);
    } else {
        document.getElementById('modalActivityName').value = "";
        document.getElementById('modalActivityCost').value = "0";
    }

    openModal('addActivityModal');
}

function onActivitySelectChange(activityId, cityIdHint) {
    if (!activityId) return;

    let targetAct = null;
    GLOBETROTTER_CITIES.forEach(c => {
        const found = c.activities.find(a => a.id === activityId);
        if (found) targetAct = found;
    });

    if (!targetAct) return;

    const nameInput = document.getElementById('modalActivityName');
    const costInput = document.getElementById('modalActivityCost');
    const catInput = document.getElementById('modalActivityCategory');
    const durInput = document.getElementById('modalActivityDuration');
    const descInput = document.getElementById('modalActivityDesc');

    if (nameInput) nameInput.value = targetAct.name;
    if (costInput) costInput.value = targetAct.cost;
    if (catInput) catInput.value = targetAct.category;
    if (durInput) durInput.value = targetAct.duration;
    if (descInput) descInput.value = targetAct.description;

    clearFieldError(nameInput);
    clearFieldError(costInput);
}

function handleAddActivitySubmit(event) {
    if (event) event.preventDefault();

    const nameInput = document.getElementById('modalActivityName');
    const costInput = document.getElementById('modalActivityCost');
    const timeInput = document.getElementById('modalActivityTime');
    const catInput = document.getElementById('modalActivityCategory');
    const durInput = document.getElementById('modalActivityDuration');

    clearFieldError(nameInput);
    clearFieldError(costInput);

    let isValid = true;
    if (!nameInput.value.trim()) {
        setFieldError(nameInput, 'Activity name is required');
        isValid = false;
    }
    if (costInput.value === "" || parseFloat(costInput.value) < 0) {
        setFieldError(costInput, 'Please enter a valid cost');
        isValid = false;
    }

    if (!isValid) return false;

    const stopId = window.GLOBETROTTER_STATE.activeTargetStopId || window.GLOBETROTTER_STATE.stops[0]?.id;
    const targetStop = window.GLOBETROTTER_STATE.stops.find(s => s.id === stopId) || window.GLOBETROTTER_STATE.stops[0];

    if (!targetStop) {
        showToast('Please add a city stop first', 'error');
        return false;
    }

    // Check overlap conflict warning
    const timeVal = timeInput.value || "09:00";
    const existingConflict = targetStop.activities.find(a => a.time === timeVal);
    if (existingConflict) {
        showToast(`⚠ Activities overlap at ${timeVal} on this day!`, 'warning');
    }

    const newActivity = {
        id: `act-${Date.now()}`,
        activityId: `custom-${Date.now()}`,
        name: nameInput.value.trim(),
        category: catInput ? catInput.value : 'Sightseeing',
        cost: parseFloat(costInput.value),
        time: timeVal,
        duration: durInput ? durInput.value : '2.0 Hours'
    };

    targetStop.activities.push(newActivity);
    renderItineraryBuilderStops();
    recalculateBudget();
    updateTripReadiness();
    syncCalendarView();
    closeModal('addActivityModal');

    showToast(`✓ ${newActivity.name} added to ${targetStop.cityName} itinerary`, 'success');
    return false;
}

// -------------------------------------------------------------
// 3. ITINERARY BUILDER & HTML5 DRAG & DROP
// -------------------------------------------------------------

function renderItineraryBuilderStops() {
    const listElem = document.getElementById('builderCityList');
    const timelineElem = document.getElementById('builderTimeline');

    if (!listElem && !timelineElem) return;

    if (listElem) {
        while (listElem.firstChild) {
            listElem.removeChild(listElem.firstChild);
        }

        window.GLOBETROTTER_STATE.stops.forEach((stop, index) => {
            const cityDiv = document.createElement('div');
            cityDiv.className = 'builder-city-stop-item';
            cityDiv.setAttribute('draggable', 'true');
            cityDiv.dataset.stopId = stop.id;
            cityDiv.dataset.index = index;
            cityDiv.style.cssText = "padding: 10px 12px; background: white; border: 1px solid var(--border); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; cursor: grab; margin-top: 8px;";

            const left = document.createElement('div');
            const dragIcon = document.createElement('span');
            dragIcon.style.cssText = "margin-right: 8px; color: var(--muted); font-size: 14px;";
            dragIcon.textContent = "☰";

            const strong = document.createElement('strong');
            strong.textContent = `Stop ${index + 1}: ${stop.cityName}`;

            const stateDiv = document.createElement('div');
            stateDiv.style.cssText = "font-size: 11px; color: var(--muted); margin-left: 20px;";
            stateDiv.textContent = `${stop.stateName} (${stop.activities.length} activities)`;

            left.appendChild(dragIcon);
            left.appendChild(strong);
            left.appendChild(stateDiv);

            const right = document.createElement('div');
            right.style.cssText = "display: flex; gap: 6px; align-items: center;";

            const addActBtn = document.createElement('button');
            addActBtn.className = "btn btn-secondary btn-sm";
            addActBtn.style.cssText = "padding: 2px 8px; font-size: 11px;";
            addActBtn.textContent = "+ Activity";
            addActBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                openAddActivityModalWithData(stop.cityId, null, stop.id);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = "btn btn-danger btn-sm";
            deleteBtn.style.cssText = "padding: 2px 6px; font-size: 10px;";
            deleteBtn.textContent = "×";
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                triggerDeleteConfirmation('City Stop', stop.cityName, () => {
                    deleteCityStop(stop.id);
                });
            });

            right.appendChild(addActBtn);
            right.appendChild(deleteBtn);

            cityDiv.appendChild(left);
            cityDiv.appendChild(right);

            // Drag and Drop Event Listeners
            cityDiv.addEventListener('dragstart', handleDragStart);
            cityDiv.addEventListener('dragover', handleDragOver);
            cityDiv.addEventListener('drop', handleDrop);

            listElem.appendChild(cityDiv);
        });
    }

    if (timelineElem) {
        while (timelineElem.firstChild) {
            timelineElem.removeChild(timelineElem.firstChild);
        }

        window.GLOBETROTTER_STATE.stops.forEach(stop => {
            const stopHeader = document.createElement('div');
            stopHeader.style.cssText = "padding: 8px 12px; background: var(--primary-light); border-left: 4px solid var(--primary); border-radius: 4px; font-weight: 700; color: var(--primary-dark); margin: 16px 0 8px 0; display: flex; justify-content: space-between;";

            const title = document.createElement('span');
            title.textContent = `📍 Stop: ${stop.cityName} (${stop.stateName})`;

            const dates = document.createElement('span');
            dates.style.cssText = "font-size: 12px; opacity: 0.8;";
            dates.textContent = `${stop.startDate} to ${stop.endDate}`;

            stopHeader.appendChild(title);
            stopHeader.appendChild(dates);
            timelineElem.appendChild(stopHeader);

            if (stop.activities.length === 0) {
                const emptyItem = document.createElement('div');
                emptyItem.style.cssText = "padding: 12px; color: var(--muted); font-size: 12px; font-style: italic;";
                emptyItem.textContent = `⚠ No activities planned for ${stop.cityName} yet. Click "+ Activity" above to add experiences.`;
                timelineElem.appendChild(emptyItem);
            } else {
                stop.activities.forEach(act => {
                    const item = document.createElement('div');
                    item.className = 'timeline-item';

                    const timeDiv = document.createElement('div');
                    timeDiv.className = 'timeline-time';
                    timeDiv.textContent = `Scheduled — ${act.time}`;

                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'timeline-title';
                    titleDiv.textContent = act.name;

                    const metaDiv = document.createElement('div');
                    metaDiv.className = 'timeline-meta';
                    metaDiv.textContent = `Category: ${act.category} • Duration: ${act.duration}`;

                    const actionDiv = document.createElement('div');
                    actionDiv.style.cssText = "margin-top: 8px; display: flex; gap: 8px; align-items: center;";

                    const badgeSpan = document.createElement('span');
                    badgeSpan.className = 'badge badge-success';
                    badgeSpan.textContent = act.cost === 0 ? 'Free' : `₹${act.cost.toLocaleString()}`;

                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'btn btn-danger btn-sm';
                    removeBtn.style.cssText = "padding: 2px 8px; font-size: 11px;";
                    removeBtn.textContent = 'Remove';
                    removeBtn.addEventListener('click', () => {
                        triggerDeleteConfirmation('Activity', act.name, () => {
                            deleteActivityFromStop(stop.id, act.id);
                        });
                    });

                    actionDiv.appendChild(badgeSpan);
                    actionDiv.appendChild(removeBtn);

                    item.appendChild(timeDiv);
                    item.appendChild(titleDiv);
                    item.appendChild(metaDiv);
                    item.appendChild(actionDiv);

                    timelineElem.appendChild(item);
                });
            }
        });
    }
}

// Drag & Drop Handler Functions
let draggedIndex = null;

function handleDragStart(e) {
    draggedIndex = parseInt(this.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    return false;
}

function handleDrop(e) {
    if (e.stopPropagation) e.stopPropagation();

    const targetIndex = parseInt(this.dataset.index);
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
        const stops = window.GLOBETROTTER_STATE.stops;
        const [moved] = stops.splice(draggedIndex, 1);
        stops.splice(targetIndex, 0, moved);

        renderItineraryBuilderStops();
        syncCalendarView();
        showToast('✓ Stop order updated', 'success');
    }
    return false;
}

function deleteCityStop(stopId) {
    window.GLOBETROTTER_STATE.stops = window.GLOBETROTTER_STATE.stops.filter(s => s.id !== stopId);
    renderItineraryBuilderStops();
    recalculateBudget();
    updateTripReadiness();
    syncCalendarView();
    showToast('City stop removed', 'warning');
}

function deleteActivityFromStop(stopId, actId) {
    const stop = window.GLOBETROTTER_STATE.stops.find(s => s.id === stopId);
    if (stop) {
        stop.activities = stop.activities.filter(a => a.id !== actId);
        renderItineraryBuilderStops();
        recalculateBudget();
        updateTripReadiness();
        syncCalendarView();
        showToast('Activity removed', 'warning');
    }
}

// -------------------------------------------------------------
// 4. DYNAMIC BUDGET RECALCULATION & EXPENSES
// -------------------------------------------------------------

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
    if (!amountInput.value || parseFloat(amountInput.value) < 0) {
        setFieldError(amountInput, 'Enter a valid positive amount');
        isValid = false;
    }

    if (!isValid) return false;

    const newExpense = {
        id: `exp-${Date.now()}`,
        name: nameInput.value.trim(),
        amount: parseFloat(amountInput.value),
        category: catInput ? catInput.value : 'Other',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };

    window.GLOBETROTTER_STATE.expenses.push(newExpense);
    renderExpenseTable();
    recalculateBudget();
    updateTripReadiness();
    closeModal('addExpenseModal');

    showToast('Expense added successfully!', 'success');
    return false;
}

function renderExpenseTable() {
    const tableBody = document.getElementById('expenseTableBody');
    if (!tableBody) return;

    while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
    }

    window.GLOBETROTTER_STATE.expenses.forEach(exp => {
        const row = document.createElement('tr');

        const tdName = document.createElement('td');
        tdName.textContent = exp.name;

        const tdCat = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'badge badge-primary';
        badge.textContent = exp.category;
        tdCat.appendChild(badge);

        const tdDate = document.createElement('td');
        tdDate.textContent = exp.date;

        const tdAmount = document.createElement('td');
        tdAmount.textContent = `₹${exp.amount.toLocaleString()}`;

        const tdAction = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger btn-sm';
        deleteBtn.style.cssText = "padding: 2px 8px; font-size: 11px;";
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => {
            triggerDeleteConfirmation('Expense', exp.name, () => {
                deleteExpenseItem(exp.id);
            });
        });
        tdAction.appendChild(deleteBtn);

        row.appendChild(tdName);
        row.appendChild(tdCat);
        row.appendChild(tdDate);
        row.appendChild(tdAmount);
        row.appendChild(tdAction);

        tableBody.appendChild(row);
    });
}

function deleteExpenseItem(expId) {
    window.GLOBETROTTER_STATE.expenses = window.GLOBETROTTER_STATE.expenses.filter(e => e.id !== expId);
    renderExpenseTable();
    recalculateBudget();
    updateTripReadiness();
    showToast('Expense deleted', 'warning');
}

function recalculateBudget() {
    let activityTotal = 0;
    window.GLOBETROTTER_STATE.stops.forEach(s => {
        s.activities.forEach(a => {
            activityTotal += a.cost;
        });
    });

    let expenseTotal = 0;
    window.GLOBETROTTER_STATE.expenses.forEach(e => {
        expenseTotal += e.amount;
    });

    const totalSpent = activityTotal + expenseTotal;
    const targetBudget = window.GLOBETROTTER_STATE.trip.targetBudget;
    const remaining = targetBudget - totalSpent;
    const durationDays = 8;
    const avgPerDay = Math.round(totalSpent / durationDays);
    const utilPercent = Math.min(Math.round((totalSpent / targetBudget) * 100), 100);

    // Update DOM Elements if present
    const totalAllocElem = document.getElementById('statTotalAllocated');
    if (totalAllocElem) totalAllocElem.textContent = `₹${targetBudget.toLocaleString()}`;

    const totalSpentElem = document.getElementById('statTotalSpent');
    if (totalSpentElem) totalSpentElem.textContent = `₹${totalSpent.toLocaleString()}`;

    const remainingElem = document.getElementById('statRemaining');
    if (remainingElem) {
        remainingElem.textContent = `₹${remaining.toLocaleString()}`;
        remainingElem.style.color = remaining < 0 ? 'var(--danger)' : 'var(--success)';
    }

    const avgElem = document.getElementById('statAvgPerDay');
    if (avgElem) avgElem.textContent = `₹${avgPerDay.toLocaleString()}`;

    const progressBar = document.getElementById('budgetProgressBar');
    if (progressBar) progressBar.style.width = `${utilPercent}%`;

    const statusBadge = document.getElementById('budgetStatusBadge');
    if (statusBadge) {
        if (remaining < 0) {
            statusBadge.className = 'badge badge-danger';
            statusBadge.textContent = 'Over Budget';
            showToast(`⚠ Target budget exceeded by ₹${Math.abs(remaining).toLocaleString()}`, 'warning');
        } else {
            statusBadge.className = 'badge badge-success';
            statusBadge.textContent = 'Within Limit';
        }
    }
}

// -------------------------------------------------------------
// 5. TRIP READINESS & CALENDAR SYNC
// -------------------------------------------------------------

function updateTripReadiness() {
    let score = 20; // Trip Created

    if (window.GLOBETROTTER_STATE.stops.length > 0) score += 20;

    let hasActivities = false;
    window.GLOBETROTTER_STATE.stops.forEach(s => {
        if (s.activities.length > 0) hasActivities = true;
    });
    if (hasActivities) score += 20;

    if (window.GLOBETROTTER_STATE.expenses.length > 0 || hasActivities) score += 20;

    if (window.GLOBETROTTER_STATE.trip.shareToken) score += 20;

    const readinessBar = document.getElementById('tripReadinessProgressBar');
    const readinessText = document.getElementById('tripReadinessText');

    if (readinessBar) readinessBar.style.width = `${score}%`;
    if (readinessText) readinessText.textContent = `${score}% Ready`;
}

function syncCalendarView() {
    const calendarContainer = document.getElementById('calendarEventsContainer');
    if (!calendarContainer) return;

    while (calendarContainer.firstChild) {
        calendarContainer.removeChild(calendarContainer.firstChild);
    }

    window.GLOBETROTTER_STATE.stops.forEach(stop => {
        stop.activities.forEach(act => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.cssText = "margin-bottom: 10px; border-left: 4px solid var(--primary); padding: 12px 16px;";

            const header = document.createElement('div');
            header.style.cssText = "display: flex; justify-content: space-between; font-weight: 700; color: var(--dark);";
            header.textContent = `📍 ${stop.cityName} — ${act.name}`;

            const badge = document.createElement('span');
            badge.className = 'badge badge-primary';
            badge.textContent = act.category;
            header.appendChild(badge);

            const meta = document.createElement('div');
            meta.style.cssText = "font-size: 12px; color: var(--muted); margin-top: 4px;";
            meta.textContent = `Scheduled: ${act.time} • Est. Cost: ₹${act.cost.toLocaleString()}`;

            card.appendChild(header);
            card.appendChild(meta);

            calendarContainer.appendChild(card);
        });
    });
}
