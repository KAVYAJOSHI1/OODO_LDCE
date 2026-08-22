/**
 * GlobeTrotter - Master State Engine, Interactions & City-Strict Logic
 * Smart Time-Slot Scheduling & Conflict Resolution Engine with Ticket Constraints.
 */

// Global Application State (Logical & Geographically Accurate Route)
window.GLOBETROTTER_STATE = {
    trip: {
        id: "trip-101",
        title: "Golden Triangle Explorer",
        targetBudget: 35000,
        startDate: "2026-10-20",
        endDate: "2026-10-28",
        description: "Curated 8-day heritage journey covering Delhi, Agra, and Jaipur.",
        shareToken: "gt-share-883921"
    },
    // Logically consecutive destination stops with chronological auto-scheduled time slots
    stops: [
        {
            id: "stop-delhi",
            cityId: "delhi",
            cityName: "New Delhi",
            stateName: "Delhi, India",
            startDate: "2026-10-20",
            endDate: "2026-10-22",
            activities: [
                { id: "act-delhi-1", activityId: "delhi-qutub-minar", name: "Qutub Minar Complex", category: "Heritage & Monuments", cost: 600, time: "09:00 AM", duration: "2.0 Hours", ticketRequired: true },
                { id: "act-delhi-2", activityId: "delhi-chandni-chowk", name: "Chandni Chowk Food & Rickshaw Walk", category: "Food Walk", cost: 800, time: "11:30 AM", duration: "3.0 Hours", ticketRequired: false }
            ]
        },
        {
            id: "stop-agra",
            cityId: "agra",
            cityName: "Agra",
            stateName: "Uttar Pradesh, India",
            startDate: "2026-10-22",
            endDate: "2026-10-24",
            activities: [
                { id: "act-agra-1", activityId: "agra-taj-mahal", name: "Taj Mahal Sunrise Guided Tour", category: "Heritage & Monuments", cost: 1200, time: "06:00 AM", duration: "3.0 Hours", ticketRequired: true },
                { id: "act-agra-2", activityId: "agra-fort", name: "Agra Fort UNESCO Site Walk", category: "Heritage & Monuments", cost: 650, time: "09:30 AM", duration: "2.5 Hours", ticketRequired: true }
            ]
        },
        {
            id: "stop-jaipur",
            cityId: "jaipur",
            cityName: "Jaipur",
            stateName: "Rajasthan, India",
            startDate: "2026-10-24",
            endDate: "2026-10-28",
            activities: [
                { id: "act-jaipur-1", activityId: "jaipur-amer-fort", name: "Amer Fort Jeep Safari", category: "Heritage & Monuments", cost: 1500, time: "09:00 AM", duration: "3.5 Hours", ticketRequired: true },
                { id: "act-jaipur-2", activityId: "jaipur-hawa-mahal", name: "Hawa Mahal & Museum", category: "Heritage & Monuments", cost: 200, time: "01:00 PM", duration: "1.5 Hours", ticketRequired: false }
            ]
        }
    ],
    expenses: [
        { id: "exp-1", name: "Hotel Imperial New Delhi (2 Nights)", category: "Stay", amount: 7000, date: "Oct 20, 2026" },
        { id: "exp-2", name: "Gatimaan Express Train (Delhi -> Agra)", category: "Transport", amount: 1500, date: "Oct 22, 2026" },
        { id: "exp-3", name: "Heritage Hotel Agra (2 Nights)", category: "Stay", amount: 6000, date: "Oct 22, 2026" },
        { id: "exp-4", name: "Express Highway Cab (Agra -> Jaipur)", category: "Transport", amount: 2500, date: "Oct 24, 2026" },
        { id: "exp-5", name: "Taj Palace Jaipur (4 Nights)", category: "Stay", amount: 10000, date: "Oct 24, 2026" }
    ],
    activeTargetStopId: "stop-delhi"
};

// -------------------------------------------------------------
// TIME UTILITIES & SMART CONFLICT RESOLUTION
// -------------------------------------------------------------

function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 540; // 09:00 AM default
    const str = timeStr.trim().toUpperCase();
    
    // Handle 24-hr input format e.g. "09:00" or 12-hr format "09:00 AM"
    const isPM = str.includes("PM");
    const isAM = str.includes("AM");
    const cleanStr = str.replace(/(AM|PM)/g, "").trim();
    const parts = cleanStr.split(":");
    
    let hours = parseInt(parts[0], 10) || 9;
    let minutes = parseInt(parts[1], 10) || 0;

    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    return hours * 60 + minutes;
}

function minutesToFormattedTime(totalMinutes) {
    let normalized = totalMinutes % (24 * 60);
    let hours = Math.floor(normalized / 60);
    let minutes = normalized % 60;
    const period = hours >= 12 ? "PM" : "AM";

    if (hours === 0) hours = 12;
    else if (hours > 12) hours -= 12;

    const hStr = hours < 10 ? `0${hours}` : `${hours}`;
    const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;

    return `${hStr}:${mStr} ${period}`;
}

function parseDurationToMinutes(durStr) {
    if (!durStr) return 120; // 2 hours default
    const match = durStr.match(/([\d.]+)/);
    if (!match) return 120;
    const val = parseFloat(match[1]);
    if (durStr.toLowerCase().includes("min")) return Math.round(val);
    return Math.round(val * 60);
}

function isTicketConstrainedActivity(actName) {
    if (!actName) return false;
    const name = actName.toLowerCase();
    return name.includes("taj mahal") || name.includes("qutub") || name.includes("fort") || name.includes("ticket") || name.includes("safari") || name.includes("museum") || name.includes("palace") || name.includes("skytree") || name.includes("louvre") || name.includes("eiffel") || name.includes("burj");
}

function resolveStopScheduleConflicts(stop) {
    if (!stop || !stop.activities || stop.activities.length === 0) return false;

    // 1. Sort activities chronologically by start time
    stop.activities.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

    let shiftOccurred = false;
    const bufferMinutes = 30; // 30 mins travel/check-in buffer

    for (let i = 0; i < stop.activities.length - 1; i++) {
        const current = stop.activities[i];
        const next = stop.activities[i + 1];

        const startMin = parseTimeToMinutes(current.time);
        const durMin = parseDurationToMinutes(current.duration);
        const endMin = startMin + durMin;

        const nextStartMin = parseTimeToMinutes(next.time);

        // Check if next activity overlaps with current activity + buffer
        if (nextStartMin < endMin + bufferMinutes) {
            const newNextStartMins = endMin + bufferMinutes;
            next.time = minutesToFormattedTime(newNextStartMins);
            shiftOccurred = true;
        }
    }

    return shiftOccurred;
}

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
    // Run conflict resolution on initial state stops
    window.GLOBETROTTER_STATE.stops.forEach(s => resolveStopScheduleConflicts(s));

    renderCityCatalogSearch();
    renderActivitySearchCatalog();
    renderItineraryBuilderStops();
    renderItineraryViewPage();
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
    items.forEach((item, index) => {
        if (GLOBETROTTER_CITIES[index]) {
            const city = GLOBETROTTER_CITIES[index];
            const isMatch = filtered.some(fc => fc.id === city.id);
            item.style.display = isMatch ? 'flex' : 'none';
        }
    });
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
    window.GLOBETROTTER_STATE.activeTargetStopId = newStop.id;

    renderItineraryBuilderStops();
    renderItineraryViewPage();
    recalculateBudget();
    updateTripReadiness();
    closeModal('addCityModal');

    showToast(`${cityName} added to itinerary`, 'success');
    return false;
}

// -------------------------------------------------------------
// 2. CITY-STRICT ACTIVITY SEARCH & SMART TIME MODALS
// -------------------------------------------------------------

function renderActivitySearchCatalog() {
    const tableBody = document.getElementById('activityCatalogTableBody');
    const citySelect = document.getElementById('activityCityFilter');

    if (citySelect && citySelect.options.length <= 1) {
        while (citySelect.firstChild) {
            citySelect.removeChild(citySelect.firstChild);
        }
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
    const cityFilter = document.getElementById('activityCityFilter')?.value || 'delhi';
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

        if (isTicketConstrainedActivity(act.name)) {
            const ticketBadge = document.createElement('span');
            ticketBadge.className = 'badge badge-warning';
            ticketBadge.style.cssText = 'margin-left: 8px; font-size: 10px;';
            ticketBadge.textContent = '🎟️ Ticket Slot';
            strong.appendChild(ticketBadge);
        }

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
    if (targetStopId) {
        window.GLOBETROTTER_STATE.activeTargetStopId = targetStopId;
    }

    let activeStop = window.GLOBETROTTER_STATE.stops.find(s => s.id === window.GLOBETROTTER_STATE.activeTargetStopId);
    if (!activeStop && window.GLOBETROTTER_STATE.stops.length > 0) {
        activeStop = window.GLOBETROTTER_STATE.stops[0];
        window.GLOBETROTTER_STATE.activeTargetStopId = activeStop.id;
    }

    const effectiveCityId = cityId || (activeStop ? activeStop.cityId : 'delhi');
    const city = getCityById(effectiveCityId) || GLOBETROTTER_CITIES[0];

    // Calculate smart next available start time for activeStop
    let suggestedStartTime = "09:00 AM";
    if (activeStop && activeStop.activities.length > 0) {
        const lastAct = activeStop.activities[activeStop.activities.length - 1];
        const lastStartMins = parseTimeToMinutes(lastAct.time);
        const lastDurMins = parseDurationToMinutes(lastAct.duration);
        const nextMins = lastStartMins + lastDurMins + 30; // 30 min buffer
        suggestedStartTime = minutesToFormattedTime(nextMins);
    }

    const timeInput = document.getElementById('modalActivityTime');
    if (timeInput) timeInput.value = suggestedStartTime;

    const badgeElem = document.getElementById('activityModalCityBadge');
    if (badgeElem) {
        badgeElem.textContent = `📍 Target Stop: ${activeStop ? activeStop.cityName : city.name} (${city.state}) • Auto-Suggested Slot: ${suggestedStartTime}`;
    }

    const selectElem = document.getElementById('modalActivitySelect');
    if (selectElem) {
        while (selectElem.firstChild) {
            selectElem.removeChild(selectElem.firstChild);
        }

        const defaultOpt = document.createElement('option');
        defaultOpt.value = "";
        defaultOpt.textContent = `-- Select ${city.name} Activity --`;
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
        onActivitySelectChange(activityId);
    } else {
        const nameInput = document.getElementById('modalActivityName');
        const costInput = document.getElementById('modalActivityCost');
        if (nameInput) nameInput.value = "";
        if (costInput) costInput.value = "0";
    }

    openModal('addActivityModal');
}

function onActivitySelectChange(activityId) {
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

    let targetStop = window.GLOBETROTTER_STATE.stops.find(s => s.id === window.GLOBETROTTER_STATE.activeTargetStopId);
    if (!targetStop && window.GLOBETROTTER_STATE.stops.length > 0) {
        targetStop = window.GLOBETROTTER_STATE.stops[0];
    }

    if (!targetStop) {
        showToast('Please add a destination stop to your trip first!', 'error');
        return false;
    }

    const timeVal = timeInput.value || "09:00 AM";
    const actName = nameInput.value.trim();
    const isTicketed = isTicketConstrainedActivity(actName);

    const newActivity = {
        id: `act-${Date.now()}`,
        activityId: `custom-${Date.now()}`,
        name: actName,
        category: catInput ? catInput.value : 'Sightseeing',
        cost: parseFloat(costInput.value),
        time: timeVal,
        duration: durInput ? durInput.value : '2.0 Hours',
        ticketRequired: isTicketed
    };

    targetStop.activities.push(newActivity);

    // Resolve conflicts and auto-shift downstream activities chronologically
    const wasShifted = resolveStopScheduleConflicts(targetStop);

    renderItineraryBuilderStops();
    renderItineraryViewPage();
    recalculateBudget();
    updateTripReadiness();
    syncCalendarView();
    closeModal('addActivityModal');

    if (wasShifted) {
        showToast(`⏱️ "${newActivity.name}" scheduled at ${newActivity.time}. Subsequent activities auto-shifted to avoid overlap (+30m transit buffer).`, 'info');
    } else {
        showToast(`✓ Added "${newActivity.name}" to ${targetStop.cityName} stop (${newActivity.time})`, 'success');
    }

    return false;
}

function quickAddActivityToActiveStop(activityId) {
    let targetStop = window.GLOBETROTTER_STATE.stops.find(s => s.id === window.GLOBETROTTER_STATE.activeTargetStopId);
    if (!targetStop && window.GLOBETROTTER_STATE.stops.length > 0) {
        targetStop = window.GLOBETROTTER_STATE.stops[0];
        window.GLOBETROTTER_STATE.activeTargetStopId = targetStop.id;
    }

    if (!targetStop) {
        showToast('Please add a city stop first', 'error');
        return;
    }

    const cityActivities = getActivitiesByCityId(targetStop.cityId);
    const act = cityActivities.find(a => a.id === activityId) || cityActivities[0];

    if (!act) {
        showToast('Activity not available for this city', 'error');
        return;
    }

    // Auto-calculate start time after last activity end time + 30 mins
    let nextStartTime = "09:00 AM";
    if (targetStop.activities.length > 0) {
        const lastAct = targetStop.activities[targetStop.activities.length - 1];
        const lastStartMins = parseTimeToMinutes(lastAct.time);
        const lastDurMins = parseDurationToMinutes(lastAct.duration);
        nextStartTime = minutesToFormattedTime(lastStartMins + lastDurMins + 30);
    }

    const isTicketed = isTicketConstrainedActivity(act.name);

    const newAct = {
        id: `act-${Date.now()}`,
        activityId: act.id,
        name: act.name,
        category: act.category,
        cost: act.cost,
        time: nextStartTime,
        duration: act.duration,
        ticketRequired: isTicketed
    };

    targetStop.activities.push(newAct);
    const wasShifted = resolveStopScheduleConflicts(targetStop);

    renderItineraryBuilderStops();
    renderItineraryViewPage();
    recalculateBudget();
    updateTripReadiness();
    syncCalendarView();

    if (wasShifted) {
        showToast(`⏱️ Added "${act.name}" at ${nextStartTime}. Schedule auto-adjusted to prevent overlap.`, 'info');
    } else {
        showToast(`✓ Added "${act.name}" to ${targetStop.cityName} (${nextStartTime})`, 'success');
    }
}

// -------------------------------------------------------------
// 3. ITINERARY BUILDER & PREVIEW PAGE MAPPING
// -------------------------------------------------------------

function renderItineraryViewPage() {
    const titleElem = document.getElementById('previewTripTitle');
    const routeSubtitleElem = document.getElementById('previewTripSubtitle');
    const overviewStatsElem = document.getElementById('previewOverviewStats');
    const container = document.getElementById('previewDaysContainer');

    if (!container && !titleElem) return;

    const state = window.GLOBETROTTER_STATE;
    const cityNames = state.stops.map(s => s.cityName).join(" ➔ ");
    let totalActs = 0;
    let totalActCost = 0;

    state.stops.forEach(s => {
        totalActs += s.activities.length;
        s.activities.forEach(a => {
            totalActCost += a.cost;
        });
    });

    let totalExpenseCost = 0;
    state.expenses.forEach(e => {
        totalExpenseCost += e.amount;
    });

    const grandTotalSpent = totalActCost + totalExpenseCost;
    const avgPerDay = Math.round(grandTotalSpent / 8);

    if (titleElem) titleElem.textContent = state.trip.title;
    if (routeSubtitleElem) {
        routeSubtitleElem.textContent = `📍 ${cityNames} • ${state.trip.startDate} to ${state.trip.endDate} (8 Days)`;
    }

    if (overviewStatsElem) {
        overviewStatsElem.textContent = `${state.stops.length} Cities • ${totalActs} Activities • ₹${grandTotalSpent.toLocaleString()} Total Budget (Avg. ₹${avgPerDay.toLocaleString()} / day)`;
    }

    if (container) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        state.stops.forEach((stop, index) => {
            let stopActTotal = 0;
            stop.activities.forEach(a => stopActTotal += a.cost);

            const card = document.createElement('div');
            card.className = 'card';
            card.style.marginBottom = '20px';

            const header = document.createElement('div');
            header.className = 'card-header';

            const left = document.createElement('div');

            const badge = document.createElement('span');
            badge.className = index === 0 ? 'badge badge-primary' : (index === 1 ? 'badge badge-warning' : 'badge badge-success');
            badge.textContent = `STOP ${index + 1}`;

            const title = document.createElement('span');
            title.style.cssText = "font-size: 16px; font-weight: 700; color: var(--dark); margin-left: 10px;";
            title.textContent = `${stop.cityName} (${stop.stateName})`;

            const sub = document.createElement('div');
            sub.style.cssText = "font-size: 12px; color: var(--muted); margin-top: 2px;";
            sub.textContent = `Dates: ${stop.startDate} to ${stop.endDate} (${stop.activities.length} activities scheduled)`;

            left.appendChild(badge);
            left.appendChild(title);
            left.appendChild(sub);

            const rightCost = document.createElement('span');
            rightCost.style.cssText = "font-weight: 600; color: var(--primary); font-size: 15px;";
            rightCost.textContent = `Est. ₹${stopActTotal.toLocaleString()}`;

            header.appendChild(left);
            header.appendChild(rightCost);
            card.appendChild(header);

            const timeline = document.createElement('div');
            timeline.className = 'timeline';
            timeline.style.marginTop = '12px';

            if (stop.activities.length === 0) {
                const emptyItem = document.createElement('div');
                emptyItem.style.cssText = "padding: 12px; color: var(--muted); font-size: 12px; font-style: italic;";
                emptyItem.textContent = `No scheduled activities for ${stop.cityName}.`;
                timeline.appendChild(emptyItem);
            } else {
                stop.activities.forEach(act => {
                    const item = document.createElement('div');
                    item.className = 'timeline-item';

                    const startMins = parseTimeToMinutes(act.time);
                    const durMins = parseDurationToMinutes(act.duration);
                    const endMins = startMins + durMins;
                    const endTimeStr = minutesToFormattedTime(endMins);

                    const tTime = document.createElement('div');
                    tTime.className = 'timeline-time';
                    tTime.textContent = `${act.time} – ${endTimeStr}`;

                    const tTitle = document.createElement('div');
                    tTitle.className = 'timeline-title';
                    tTitle.textContent = act.name;

                    if (act.ticketRequired || isTicketConstrainedActivity(act.name)) {
                        const ticketSpan = document.createElement('span');
                        ticketSpan.className = 'badge badge-warning';
                        ticketSpan.style.cssText = "margin-left: 8px; font-size: 10px;";
                        ticketSpan.textContent = '🎟️ Timed Ticket Slot';
                        tTitle.appendChild(ticketSpan);
                    }

                    const tMeta = document.createElement('div');
                    tMeta.className = 'timeline-meta';
                    tMeta.textContent = `${act.category} • Duration: ${act.duration} • Est: ${act.cost === 0 ? 'Free' : '₹' + act.cost.toLocaleString()}`;

                    item.appendChild(tTime);
                    item.appendChild(tTitle);
                    item.appendChild(tMeta);

                    timeline.appendChild(item);
                });
            }

            card.appendChild(timeline);
            container.appendChild(card);
        });
    }
}

function renderItineraryBuilderStops() {
    const listElem = document.getElementById('builderCityList');
    const availableElem = document.getElementById('builderAvailableActivities');
    const timelineElem = document.getElementById('builderTimeline');

    if (!listElem && !timelineElem && !availableElem) return;

    let activeStop = window.GLOBETROTTER_STATE.stops.find(s => s.id === window.GLOBETROTTER_STATE.activeTargetStopId);
    if (!activeStop && window.GLOBETROTTER_STATE.stops.length > 0) {
        activeStop = window.GLOBETROTTER_STATE.stops[0];
        window.GLOBETROTTER_STATE.activeTargetStopId = activeStop.id;
    }

    // 1. Render Left Column: Trip Stops List
    if (listElem) {
        while (listElem.firstChild) {
            listElem.removeChild(listElem.firstChild);
        }

        window.GLOBETROTTER_STATE.stops.forEach((stop, index) => {
            const isActive = activeStop && stop.id === activeStop.id;

            const cityDiv = document.createElement('div');
            cityDiv.className = 'builder-city-stop-item';
            cityDiv.setAttribute('draggable', 'true');
            cityDiv.dataset.stopId = stop.id;
            cityDiv.dataset.index = index;
            cityDiv.style.cssText = `padding: 10px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; margin-top: 8px; ${
                isActive 
                ? 'background: var(--primary-light); border-left: 4px solid var(--primary); border-top: 1px solid var(--border); border-right: 1px solid var(--border); border-bottom: 1px solid var(--border);'
                : 'background: white; border: 1px solid var(--border);'
            }`;

            cityDiv.addEventListener('click', () => {
                window.GLOBETROTTER_STATE.activeTargetStopId = stop.id;
                renderItineraryBuilderStops();
            });

            const left = document.createElement('div');
            const dragIcon = document.createElement('span');
            dragIcon.style.cssText = "margin-right: 8px; color: var(--muted); font-size: 14px; cursor: grab;";
            dragIcon.textContent = "☰";

            const strong = document.createElement('strong');
            strong.style.color = isActive ? 'var(--primary-dark)' : 'var(--dark)';
            strong.textContent = `Stop ${index + 1}: ${stop.cityName}`;

            const stateDiv = document.createElement('div');
            stateDiv.style.cssText = "font-size: 11px; color: var(--muted); margin-left: 22px;";
            stateDiv.textContent = `${stop.startDate} to ${stop.endDate} (${stop.activities.length} acts)`;

            left.appendChild(dragIcon);
            left.appendChild(strong);
            left.appendChild(stateDiv);

            const right = document.createElement('div');
            right.style.cssText = "display: flex; gap: 6px; align-items: center;";

            if (isActive) {
                const activeBadge = document.createElement('span');
                activeBadge.className = 'badge badge-primary';
                activeBadge.textContent = 'Active';
                right.appendChild(activeBadge);
            }

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

            right.appendChild(deleteBtn);

            cityDiv.appendChild(left);
            cityDiv.appendChild(right);

            cityDiv.addEventListener('dragstart', handleDragStart);
            cityDiv.addEventListener('dragover', handleDragOver);
            cityDiv.addEventListener('drop', handleDrop);

            listElem.appendChild(cityDiv);
        });
    }

    // 2. Render Side Panel: Available Activities (STRICTLY for activeStop.cityId)
    if (availableElem && activeStop) {
        while (availableElem.firstChild) {
            availableElem.removeChild(availableElem.firstChild);
        }

        const cityCatalogActs = getActivitiesByCityId(activeStop.cityId);

        if (cityCatalogActs.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.style.cssText = "padding: 12px; font-size: 12px; color: var(--muted); text-align: center;";
            emptyDiv.textContent = `No catalog activities found for ${activeStop.cityName}. Click "+ Custom" to add your own.`;
            availableElem.appendChild(emptyDiv);
        } else {
            cityCatalogActs.forEach(act => {
                const isAlreadyAdded = activeStop.activities.some(a => a.name.toLowerCase() === act.name.toLowerCase());

                const actCard = document.createElement('div');
                actCard.style.cssText = "padding: 10px; border: 1px solid var(--border); border-radius: 6px; display: flex; justify-content: space-between; align-items: center; background: white;";

                const left = document.createElement('div');
                const title = document.createElement('div');
                title.style.cssText = "font-weight: 600; font-size: 13px; color: var(--dark);";
                title.textContent = act.name;

                const meta = document.createElement('div');
                meta.style.cssText = "font-size: 11px; color: var(--muted);";
                meta.textContent = `${act.cost === 0 ? 'Free' : '₹' + act.cost} | ${act.duration} | ${act.category}`;

                left.appendChild(title);
                left.appendChild(meta);

                const addBtn = document.createElement('button');
                addBtn.className = isAlreadyAdded ? 'btn btn-secondary btn-sm' : 'btn btn-primary btn-sm';
                addBtn.style.cssText = "padding: 3px 8px; font-size: 11px;";
                addBtn.textContent = isAlreadyAdded ? '✓ Added' : '+ Add';
                addBtn.disabled = isAlreadyAdded;

                if (!isAlreadyAdded) {
                    addBtn.addEventListener('click', () => {
                        quickAddActivityToActiveStop(act.id);
                    });
                }

                actCard.appendChild(left);
                actCard.appendChild(addBtn);

                availableElem.appendChild(actCard);
            });
        }
    }

    // 3. Render Main Column: Timeline & Scheduled Activities
    if (timelineElem) {
        while (timelineElem.firstChild) {
            timelineElem.removeChild(timelineElem.firstChild);
        }

        window.GLOBETROTTER_STATE.stops.forEach(stop => {
            const isStopActive = activeStop && stop.id === activeStop.id;

            const stopHeader = document.createElement('div');
            stopHeader.style.cssText = `padding: 10px 14px; border-radius: 6px; font-weight: 700; margin: 16px 0 8px 0; display: flex; justify-content: space-between; align-items: center; ${
                isStopActive
                ? 'background: var(--primary-light); border-left: 5px solid var(--primary); color: var(--primary-dark);'
                : 'background: var(--background); border-left: 5px solid var(--muted); color: var(--dark);'
            }`;

            const title = document.createElement('span');
            title.textContent = `📍 Stop: ${stop.cityName} (${stop.stateName})`;

            const rightBox = document.createElement('div');
            rightBox.style.cssText = "display: flex; gap: 10px; align-items: center;";

            const dates = document.createElement('span');
            dates.style.cssText = "font-size: 12px; opacity: 0.8; font-weight: 400;";
            dates.textContent = `${stop.startDate} to ${stop.endDate}`;

            const addActBtn = document.createElement('button');
            addActBtn.className = 'btn btn-primary btn-sm';
            addActBtn.style.cssText = "padding: 2px 8px; font-size: 11px;";
            addActBtn.textContent = '+ Add Activity';
            addActBtn.addEventListener('click', () => {
                openAddActivityModalWithData(stop.cityId, null, stop.id);
            });

            rightBox.appendChild(dates);
            rightBox.appendChild(addActBtn);

            stopHeader.appendChild(title);
            stopHeader.appendChild(rightBox);
            timelineElem.appendChild(stopHeader);

            if (stop.activities.length === 0) {
                const emptyItem = document.createElement('div');
                emptyItem.style.cssText = "padding: 14px; color: var(--muted); font-size: 12px; font-style: italic; background: #fff; border: 1px dashed var(--border); border-radius: 6px;";
                emptyItem.textContent = `⚠ No activities planned for ${stop.cityName} yet. Click "+ Add Activity" to schedule tours.`;
                timelineElem.appendChild(emptyItem);
            } else {
                // Ensure conflicts are resolved before rendering timeline
                resolveStopScheduleConflicts(stop);

                stop.activities.forEach(act => {
                    const item = document.createElement('div');
                    item.className = 'timeline-item';

                    const startMins = parseTimeToMinutes(act.time);
                    const durMins = parseDurationToMinutes(act.duration);
                    const endMins = startMins + durMins;
                    const endTimeStr = minutesToFormattedTime(endMins);

                    const timeDiv = document.createElement('div');
                    timeDiv.className = 'timeline-time';
                    timeDiv.textContent = `Scheduled Slot: ${act.time} – ${endTimeStr}`;

                    const titleDiv = document.createElement('div');
                    titleDiv.className = 'timeline-title';
                    titleDiv.textContent = act.name;

                    if (act.ticketRequired || isTicketConstrainedActivity(act.name)) {
                        const ticketBadge = document.createElement('span');
                        ticketBadge.className = 'badge badge-warning';
                        ticketBadge.style.cssText = "margin-left: 8px; font-size: 10px;";
                        ticketBadge.textContent = '🎟️ Timed Entry Ticket';
                        titleDiv.appendChild(ticketBadge);
                    }

                    const metaDiv = document.createElement('div');
                    metaDiv.className = 'timeline-meta';
                    metaDiv.textContent = `Category: ${act.category} • Duration: ${act.duration} (+30m transit buffer)`;

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
        renderItineraryViewPage();
        syncCalendarView();
        showToast('✓ Stop order updated', 'success');
    }
    return false;
}

function deleteCityStop(stopId) {
    window.GLOBETROTTER_STATE.stops = window.GLOBETROTTER_STATE.stops.filter(s => s.id !== stopId);
    if (window.GLOBETROTTER_STATE.activeTargetStopId === stopId) {
        window.GLOBETROTTER_STATE.activeTargetStopId = window.GLOBETROTTER_STATE.stops[0]?.id || null;
    }

    renderItineraryBuilderStops();
    renderItineraryViewPage();
    recalculateBudget();
    updateTripReadiness();
    syncCalendarView();
    showToast('City stop removed', 'warning');
}

function deleteActivityFromStop(stopId, actId) {
    const stop = window.GLOBETROTTER_STATE.stops.find(s => s.id === stopId);
    if (stop) {
        stop.activities = stop.activities.filter(a => a.id !== actId);
        resolveStopScheduleConflicts(stop);

        renderItineraryBuilderStops();
        renderItineraryViewPage();
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
            const startMins = parseTimeToMinutes(act.time);
            const durMins = parseDurationToMinutes(act.duration);
            const endTimeStr = minutesToFormattedTime(startMins + durMins);

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
            meta.textContent = `Slot: ${act.time} – ${endTimeStr} • Est. Cost: ${act.cost === 0 ? 'Free' : '₹' + act.cost.toLocaleString()}`;

            card.appendChild(header);
            card.appendChild(meta);

            calendarContainer.appendChild(card);
        });
    });
}
