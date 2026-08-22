/**
 * GlobeTrotter - State Engine, Interactions & Date-Aware Multi-Day Scheduler
 * Backed by the real travel API (travel/api_urls.py) - no more localStorage/mock data.
 */

// -------------------------------------------------------------
// SERVER API HELPERS
// -------------------------------------------------------------

function getCookie(name) {
    const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
}

async function apiRequest(method, url, data) {
    const opts = { method, headers: {} };
    if (method !== 'GET') {
        opts.headers['X-CSRFToken'] = getCookie('csrftoken');
        const params = new URLSearchParams();
        Object.entries(data || {}).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') params.append(k, v);
        });
        opts.body = params;
    }
    const res = await fetch(url, opts);
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || 'Request failed');
    return json;
}

// -------------------------------------------------------------
// CATALOG: map real City/Activity API records into the shape the
// rendering code below already understands (id, name, state, country,
// costIndex, activities[]...).
// -------------------------------------------------------------

function mapApiCityToLegacy(c) {
    const costMap = { 1: 'Low', 2: 'Low', 3: 'Medium', 4: 'High', 5: 'High' };
    return {
        id: String(c.id),
        name: c.name,
        state: c.country,
        country: c.country,
        region: c.country,
        costIndex: costMap[c.cost_index] || 'Medium',
        popularity: c.popularity || 50,
        activitiesCount: 0,
        activities: []
    };
}

function mapApiActivityToLegacy(a) {
    return {
        id: String(a.id),
        cityId: String(a.city_id),
        name: a.name,
        category: a.type_display || 'Sightseeing',
        cost: parseFloat(a.cost) || 0,
        duration: `${parseFloat(a.duration_hours || 2).toFixed(1)} Hours`,
        preferredTime: null,
        fixedSlot: false,
        description: a.description || ''
    };
}

async function loadRealCatalog() {
    const cityRes = await apiRequest('GET', '/api/travel/cities/?limit=200');
    const cities = cityRes.results.map(mapApiCityToLegacy);

    const actRes = await apiRequest('GET', '/api/travel/activities/?limit=1000');
    actRes.results.forEach(a => {
        const city = cities.find(c => c.id === String(a.city_id));
        if (city) {
            city.activities.push(mapApiActivityToLegacy(a));
            city.activitiesCount = city.activities.length;
        }
    });

    GLOBETROTTER_CITIES = cities;
    return cities;
}

// Kicked off immediately (script executes synchronously during page parse),
// so it's already in flight by the time DOMContentLoaded fires below.
window.GLOBETROTTER_CATALOG_READY = loadRealCatalog();

// -------------------------------------------------------------
// TRIP STATE: hydrate the working state from the real trip on the
// server instead of localStorage. window.GLOBETROTTER_TRIP_ID is set
// by the page template (itinerary_builder.html / itinerary_view.html).
// -------------------------------------------------------------

function formatTimeAmPm(timeStr) {
    if (!timeStr) return "09:00 AM";
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr, 10);
    if (isNaN(h)) return "09:00 AM";
    const m = (mStr || "00").padStart(2, '0');
    const period = h >= 12 ? "PM" : "AM";
    if (h === 0) h = 12; else if (h > 12) h -= 12;
    return `${String(h).padStart(2, '0')}:${m} ${period}`;
}

function emptyTripState() {
    return {
        trip: { id: null, title: 'No Trip Selected', targetBudget: 0, startDate: '', endDate: '', description: '', shareToken: '' },
        stops: [],
        expenses: [],
        activeTargetStopId: null
    };
}

function mapApiTripToLegacyState(data) {
    const trip = data.trip;
    const stops = data.stops.map(s => ({
        id: String(s.id),
        cityId: String(s.city.id),
        cityName: s.city.name,
        stateName: s.city.country,
        startDate: s.arrival_date || trip.start_date,
        endDate: s.departure_date || trip.end_date,
        activities: s.activities.map(ta => ({
            id: String(ta.id),
            activityId: String(ta.activity.id),
            name: ta.activity.name,
            category: ta.activity.type_display || 'Sightseeing',
            cost: parseFloat(ta.cost) || 0,
            date: ta.scheduled_date,
            time: formatTimeAmPm(ta.scheduled_time),
            duration: `${parseFloat(ta.activity.duration_hours || 2).toFixed(1)} Hours`,
            fixedSlot: false,
            preferredTime: null
        }))
    }));

    return {
        trip: {
            id: String(trip.id),
            title: trip.name,
            targetBudget: parseFloat(trip.budget) || 0,
            startDate: trip.start_date,
            endDate: trip.end_date,
            description: trip.description,
            shareToken: trip.share_token || ''
        },
        stops,
        expenses: [],
        activeTargetStopId: stops[0] ? stops[0].id : null
    };
}

async function hydrateStateFromServer() {
    if (!window.GLOBETROTTER_TRIP_ID) {
        window.GLOBETROTTER_STATE = emptyTripState();
        return;
    }
    const data = await apiRequest('GET', `/api/travel/trips/${window.GLOBETROTTER_TRIP_ID}/itinerary/`);
    window.GLOBETROTTER_STATE = mapApiTripToLegacyState(data);
}

window.GLOBETROTTER_STATE = emptyTripState();

// -------------------------------------------------------------
// DATE & TIME UTILITIES + PER-DATE CONFLICT RESOLUTION
// -------------------------------------------------------------

function getDatesArrayForStop(startDateStr, endDateStr) {
    const dates = [];
    if (!startDateStr || !endDateStr) return dates;
    let curr = new Date(startDateStr);
    const end = new Date(endDateStr);

    while (curr <= end) {
        dates.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
    }
    return dates;
}

function formatDateToReadable(dateStr) {
    if (!dateStr) return "";
    const dt = new Date(dateStr);
    return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 540;
    const str = timeStr.trim().toUpperCase();
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
    if (!durStr) return 120;
    const match = durStr.match(/([\d.]+)/);
    if (!match) return 120;
    const val = parseFloat(match[1]);
    if (durStr.toLowerCase().includes("min")) return Math.round(val);
    return Math.round(val * 60);
}

function getContextBadgeMeta(actName, timeStr) {
    if (!actName) return null;
    const name = actName.toLowerCase();
    const mins = parseTimeToMinutes(timeStr);

    if (name.includes("sunrise") || (mins >= 330 && mins <= 450)) {
        return { label: "Sunrise Slot", type: "warning" };
    }
    if (name.includes("sunset") || (mins >= 990 && mins <= 1140)) {
        return { label: "Sunset Slot", type: "warning" };
    }
    if (name.includes("food") || name.includes("night market") || (mins >= 1110 && mins <= 1380)) {
        return { label: "Evening/Night Food", type: "primary" };
    }
    if (name.includes("taj mahal") || name.includes("qutub") || name.includes("fort") || name.includes("museum") || name.includes("palace") || name.includes("safari")) {
        return { label: "Timed Entry Ticket", type: "success" };
    }
    return null;
}

function getProTipForActivity(actName) {
    if (!actName) return "Recommended highlight for itinerary planning.";
    const name = actName.toLowerCase();
    if (name.includes("taj mahal")) return "Best visited at 06:00 AM to avoid crowds and catch soft sunrise lighting.";
    if (name.includes("qutub")) return "Open until dusk. Wheelchair accessible path around the main minaret.";
    if (name.includes("chandni chowk")) return "Includes rickshaw ride. Best explored around 06:30 PM for street food.";
    if (name.includes("amer fort")) return "Jeep safari included up the hill. Book morning slot to skip line.";
    if (name.includes("hawa mahal")) return "Great photo point from opposing rooftop café across the main avenue.";
    if (name.includes("nahargarh")) return "Panoramic sunset spot overlooking the Pink City. Arrive by 05:00 PM.";
    if (name.includes("baga")) return "High demand for water sports. Best early morning or late afternoon.";
    if (name.includes("cruise")) return "Fixed 05:30 PM sunset departure from Panjim jetty with live cultural show.";
    return "Popular experience with high traveler rating. Reserve early for optimal slot.";
}

function resolveStopScheduleConflicts(stop) {
    if (!stop || !stop.activities || stop.activities.length === 0) return false;

    let shiftOccurred = false;
    const dates = getDatesArrayForStop(stop.startDate, stop.endDate);

    dates.forEach(dStr => {
        const dayActs = stop.activities.filter(a => a.date === dStr || !a.date);
        dayActs.forEach(a => { if (!a.date) a.date = dStr; });
        dayActs.forEach(act => {
            if (act.preferredTime && act.fixedSlot) {
                act.time = act.preferredTime;
            }
        });
        dayActs.sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

        const bufferMinutes = 30;
        for (let i = 0; i < dayActs.length - 1; i++) {
            const current = dayActs[i];
            const next = dayActs[i + 1];

            const startMin = parseTimeToMinutes(current.time);
            const durMin = parseDurationToMinutes(current.duration);
            const currentEndMin = startMin + durMin;
            const nextStartMin = parseTimeToMinutes(next.time);

            if (nextStartMin < currentEndMin + bufferMinutes) {
                if (!next.fixedSlot) {
                    const newNextStartMins = currentEndMin + bufferMinutes;
                    next.time = minutesToFormattedTime(newNextStartMins);
                    shiftOccurred = true;
                } else if (!current.fixedSlot) {
                    const nextFixedStart = parseTimeToMinutes(next.time);
                    const availableEnd = nextFixedStart - bufferMinutes;
                    if (currentEndMin > availableEnd) {
                        const newCurrentStart = Math.max(360, availableEnd - durMin);
                        current.time = minutesToFormattedTime(newCurrentStart);
                        shiftOccurred = true;
                    }
                }
            }
        }
    });

    stop.activities.sort((a, b) => {
        if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
        return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
    });

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

async function initApp() {
    try {
        await window.GLOBETROTTER_CATALOG_READY;
    } catch (e) {
        console.warn('Catalog load failed:', e);
    }

    try {
        await hydrateStateFromServer();
    } catch (e) {
        console.warn('Trip load failed:', e);
        showToast('Could not load trip data from the server.', 'error');
    }

    window.GLOBETROTTER_STATE.stops.forEach(s => resolveStopScheduleConflicts(s));

    renderCityCatalogSearch();
    renderActivitySearchCatalog();
    renderItineraryBuilderStops();
    renderItineraryViewPage();
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
        spanState.textContent = `(${city.country})`;

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
    if (stateInput) stateInput.value = `${city.country}`;
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

async function handleAddCitySubmit(event) {
    if (event) event.preventDefault();

    if (!window.GLOBETROTTER_TRIP_ID) {
        showToast('Create a trip first, then add cities to it.', 'error');
        return false;
    }

    const nameInput = document.getElementById('modalCityName');
    const idInput = document.getElementById('modalCityId');

    clearFieldError(nameInput);

    const cityId = idInput?.value;
    if (!cityId || !nameInput.value.trim()) {
        setFieldError(nameInput, 'Pick a city from the search results');
        return false;
    }

    try {
        const trip = window.GLOBETROTTER_STATE.trip;
        await apiRequest('POST', `/api/travel/trips/${window.GLOBETROTTER_TRIP_ID}/stops/add/`, {
            city_id: cityId,
            arrival_date: trip.startDate,
            departure_date: trip.endDate,
        });

        await hydrateStateFromServer();
        window.GLOBETROTTER_STATE.stops.forEach(s => resolveStopScheduleConflicts(s));

        renderItineraryBuilderStops();
        renderItineraryViewPage();
        recalculateBudget();
        updateTripReadiness();
        syncCalendarView();
        closeModal('addCityModal');

        showToast(`${nameInput.value.trim()} added to itinerary`, 'success');
    } catch (e) {
        showToast(`Could not add city: ${e.message}`, 'error');
    }
    return false;
}

// -------------------------------------------------------------
// 2. MASTER ACTIVITY CATALOG & AI DISCOVERY HUB (USPs)
// -------------------------------------------------------------

function renderActivitySearchCatalog() {
    const citySelect = document.getElementById('activityCityFilter');

    if (citySelect && typeof GLOBETROTTER_CITIES !== 'undefined') {
        const previousValue = citySelect.value;
        while (citySelect.firstChild) {
            citySelect.removeChild(citySelect.firstChild);
        }
        GLOBETROTTER_CITIES.forEach(city => {
            const opt = document.createElement('option');
            opt.value = city.id;
            opt.textContent = `${city.name} (${city.country})`;
            citySelect.appendChild(opt);
        });
        if (GLOBETROTTER_CITIES.some(c => c.id === previousValue)) {
            citySelect.value = previousValue;
        }
    }

    filterActivityCatalogTable();
}

function filterActivityCatalogTable() {
    const defaultCity = (typeof GLOBETROTTER_CITIES !== 'undefined' && GLOBETROTTER_CITIES[0]) ? GLOBETROTTER_CITIES[0].id : '';
    const cityFilter = document.getElementById('activityCityFilter')?.value || defaultCity;
    const catFilter = document.getElementById('activityCategoryFilter')?.value || '';
    const budgetFilter = document.getElementById('activityBudgetFilter')?.value || '';
    const windowFilter = document.getElementById('activityWindowFilter')?.value || '';
    const searchQuery = document.getElementById('activitySearchInput')?.value.trim().toLowerCase() || '';
    const tableBody = document.getElementById('activityCatalogTableBody');

    if (!tableBody) return;

    while (tableBody.firstChild) {
        tableBody.removeChild(tableBody.firstChild);
    }

    const cityActivities = getActivitiesByCityId(cityFilter);

    const filtered = cityActivities.filter((act) => {
        const matchesCat = !catFilter || act.category === catFilter;
        const matchesSearch = !searchQuery || act.name.toLowerCase().includes(searchQuery) || act.description.toLowerCase().includes(searchQuery);

        let matchesBudget = true;
        if (budgetFilter === 'free') matchesBudget = act.cost === 0;
        else if (budgetFilter === '500') matchesBudget = act.cost <= 500;
        else if (budgetFilter === '1500') matchesBudget = act.cost <= 1500;

        let matchesWindow = true;
        if (windowFilter) {
            const mins = parseTimeToMinutes(act.preferredTime || "09:00 AM");
            if (windowFilter === 'morning') matchesWindow = mins < 720;
            else if (windowFilter === 'evening') matchesWindow = mins >= 960 && mins <= 1140;
            else if (windowFilter === 'night') matchesWindow = mins > 1140;
        }

        return matchesCat && matchesSearch && matchesBudget && matchesWindow;
    });

    if (filtered.length === 0) {
        const row = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 6;
        td.className = 'text-center text-muted';
        td.style.padding = '20px';
        td.textContent = 'No matching activities found for the selected city & filters.';
        row.appendChild(td);
        tableBody.appendChild(row);
        return;
    }

    filtered.forEach((act, idx) => {
        const row = document.createElement('tr');

        const tdName = document.createElement('td');
        const titleLine = document.createElement('div');
        titleLine.style.cssText = "display: flex; align-items: center; gap: 8px; flex-wrap: wrap;";

        const strong = document.createElement('strong');
        strong.style.cssText = "font-size: 14px; color: var(--dark);";
        strong.textContent = act.name;
        titleLine.appendChild(strong);

        const matchScores = ["98% AI Match", "96% AI Match", "94% AI Match", "Top Rated"];
        const matchScore = matchScores[idx % matchScores.length];
        const matchBadge = document.createElement('span');
        matchBadge.className = 'badge badge-success';
        matchBadge.style.cssText = "font-size: 10px; padding: 2px 6px;";
        matchBadge.textContent = matchScore;
        titleLine.appendChild(matchBadge);

        const badgeMeta = getContextBadgeMeta(act.name, act.preferredTime || "09:00 AM");
        if (badgeMeta) {
            const contextBadge = document.createElement('span');
            contextBadge.className = `badge badge-${badgeMeta.type}`;
            contextBadge.style.cssText = 'font-size: 10px; padding: 2px 6px;';
            contextBadge.textContent = badgeMeta.label;
            titleLine.appendChild(contextBadge);
        }

        const descDiv = document.createElement('div');
        descDiv.style.cssText = "font-size: 12px; color: var(--muted); margin-top: 4px;";
        descDiv.textContent = act.description;

        const proTip = document.createElement('div');
        proTip.style.cssText = "font-size: 11px; color: var(--primary-dark); background: var(--primary-light); padding: 4px 8px; border-radius: 4px; margin-top: 6px; display: inline-block;";
        proTip.textContent = getProTipForActivity(act.name);

        tdName.appendChild(titleLine);
        tdName.appendChild(descDiv);
        tdName.appendChild(proTip);

        const tdDest = document.createElement('td');
        const cityObj = getCityById(act.cityId);
        tdDest.style.cssText = "font-size: 13px; font-weight: 600;";
        tdDest.textContent = cityObj ? `${cityObj.name}, ${cityObj.country}` : act.cityId;

        const tdCat = document.createElement('td');
        const badge = document.createElement('span');
        badge.className = 'badge badge-primary';
        badge.textContent = act.category;
        tdCat.appendChild(badge);

        const tdDur = document.createElement('td');
        tdDur.style.fontSize = "12px";
        const durText = document.createElement('div');
        durText.textContent = act.duration;
        const timeText = document.createElement('div');
        timeText.style.cssText = "color: var(--muted); font-size: 11px;";
        timeText.textContent = `Slot: ${act.preferredTime || 'Flexible'}`;
        tdDur.appendChild(durText);
        tdDur.appendChild(timeText);

        const tdCost = document.createElement('td');
        tdCost.style.cssText = "font-weight: 700; color: var(--primary); font-size: 13px;";
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
    if (!window.GLOBETROTTER_TRIP_ID || window.GLOBETROTTER_STATE.stops.length === 0) {
        showToast('Add a city stop to your trip before scheduling activities.', 'error');
        return;
    }

    if (targetStopId) {
        window.GLOBETROTTER_STATE.activeTargetStopId = targetStopId;
    }

    let activeStop = window.GLOBETROTTER_STATE.stops.find(s => s.id === window.GLOBETROTTER_STATE.activeTargetStopId);
    if (!activeStop) {
        activeStop = window.GLOBETROTTER_STATE.stops[0];
        window.GLOBETROTTER_STATE.activeTargetStopId = activeStop.id;
    }

    const fallbackCityId = (typeof GLOBETROTTER_CITIES !== 'undefined' && GLOBETROTTER_CITIES[0]) ? GLOBETROTTER_CITIES[0].id : null;
    const effectiveCityId = cityId || activeStop.cityId || fallbackCityId;
    const city = getCityById(effectiveCityId);
    if (!city) {
        showToast('No catalog data available for this city yet.', 'error');
        return;
    }

    const dateSelect = document.getElementById('modalActivityDate');
    if (dateSelect) {
        while (dateSelect.firstChild) {
            dateSelect.removeChild(dateSelect.firstChild);
        }
        const stopDates = getDatesArrayForStop(activeStop.startDate, activeStop.endDate);
        stopDates.forEach((dStr, idx) => {
            const opt = document.createElement('option');
            opt.value = dStr;
            opt.textContent = `Day ${idx + 1}: ${formatDateToReadable(dStr)}`;
            dateSelect.appendChild(opt);
        });
    }

    const timeInput = document.getElementById('modalActivityTime');
    if (timeInput) timeInput.value = "09:00";

    const badgeElem = document.getElementById('activityModalCityBadge');
    if (badgeElem) {
        badgeElem.textContent = `Target Stop: ${activeStop.cityName} (${activeStop.startDate} to ${activeStop.endDate})`;
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

async function handleAddActivitySubmit(event) {
    if (event) event.preventDefault();

    const selectElem = document.getElementById('modalActivitySelect');
    const dateInput = document.getElementById('modalActivityDate');
    const timeInput = document.getElementById('modalActivityTime');

    const activityId = selectElem ? selectElem.value : '';
    if (!activityId) {
        showToast('Please select an activity from the catalog dropdown.', 'error');
        return false;
    }

    let targetStop = window.GLOBETROTTER_STATE.stops.find(s => s.id === window.GLOBETROTTER_STATE.activeTargetStopId);
    if (!targetStop && window.GLOBETROTTER_STATE.stops.length > 0) {
        targetStop = window.GLOBETROTTER_STATE.stops[0];
    }

    if (!targetStop) {
        showToast('Please add a destination stop to your trip first!', 'error');
        return false;
    }

    const selectedDate = dateInput ? dateInput.value : targetStop.startDate;
    const selectedTime = timeInput && timeInput.value ? timeInput.value : '09:00';

    try {
        await apiRequest('POST', `/api/travel/stops/${targetStop.id}/activities/add/`, {
            activity_id: activityId,
            scheduled_date: selectedDate,
            scheduled_time: selectedTime,
        });

        await hydrateStateFromServer();
        window.GLOBETROTTER_STATE.activeTargetStopId = targetStop.id;
        window.GLOBETROTTER_STATE.stops.forEach(s => resolveStopScheduleConflicts(s));

        renderItineraryBuilderStops();
        renderItineraryViewPage();
        recalculateBudget();
        updateTripReadiness();
        syncCalendarView();
        closeModal('addActivityModal');

        showToast(`Added activity to ${targetStop.cityName} on ${formatDateToReadable(selectedDate)}`, 'success');
    } catch (e) {
        showToast(`Could not add activity: ${e.message}`, 'error');
    }

    return false;
}

// -------------------------------------------------------------
// 3. ITINERARY BUILDER & PREVIEW PAGE MAPPING (DATE-AWARE)
// -------------------------------------------------------------

function renderItineraryViewPage() {
    const titleElem = document.getElementById('previewTripTitle');
    const routeSubtitleElem = document.getElementById('previewTripSubtitle');
    const overviewStatsElem = document.getElementById('previewOverviewStats');
    const container = document.getElementById('previewDaysContainer');

    if (!container && !titleElem) return;

    const state = window.GLOBETROTTER_STATE;
    const cityNames = state.stops.map(s => s.cityName).join(" → ") || "No stops yet";
    let totalActs = 0;
    let totalActCost = 0;

    state.stops.forEach(s => {
        totalActs += s.activities.length;
        s.activities.forEach(a => {
            totalActCost += a.cost;
        });
    });

    if (titleElem) titleElem.textContent = state.trip.title;
    if (routeSubtitleElem) {
        routeSubtitleElem.textContent = `${cityNames} • ${state.trip.startDate || 'TBD'} to ${state.trip.endDate || 'TBD'}`;
    }

    if (overviewStatsElem) {
        overviewStatsElem.textContent = `${state.stops.length} Destination Stops • ${totalActs} Scheduled Activities • ₹${totalActCost.toLocaleString()} Activity Spend`;
    }

    if (container) {
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }

        if (state.stops.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'card';
            empty.style.cssText = "text-align: center; padding: 32px; color: var(--muted);";
            empty.textContent = window.GLOBETROTTER_TRIP_ID
                ? 'No stops added yet. Head to the Itinerary Builder to add cities and activities.'
                : 'No trip selected. Create a trip to see its itinerary here.';
            container.appendChild(empty);
            return;
        }

        state.stops.forEach((stop, index) => {
            resolveStopScheduleConflicts(stop);

            const card = document.createElement('div');
            card.className = 'card';
            card.style.marginBottom = '24px';

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
            sub.textContent = `Dates: ${stop.startDate} to ${stop.endDate} (${stop.activities.length} total activities)`;

            left.appendChild(badge);
            left.appendChild(title);
            left.appendChild(sub);

            let stopActTotal = 0;
            stop.activities.forEach(a => stopActTotal += a.cost);

            const rightCost = document.createElement('span');
            rightCost.style.cssText = "font-weight: 600; color: var(--primary); font-size: 15px;";
            rightCost.textContent = `Est. ₹${stopActTotal.toLocaleString()}`;

            header.appendChild(left);
            header.appendChild(rightCost);
            card.appendChild(header);

            const stopDates = getDatesArrayForStop(stop.startDate, stop.endDate);

            stopDates.forEach((dStr, dIdx) => {
                const dayBox = document.createElement('div');
                dayBox.style.cssText = "margin-top: 14px; padding: 12px 14px; background: var(--background); border-radius: 6px; border: 1px solid var(--border);";

                const dayHeader = document.createElement('div');
                dayHeader.style.cssText = "font-weight: 700; font-size: 14px; color: var(--dark); margin-bottom: 8px; display: flex; justify-content: space-between;";
                dayHeader.textContent = `Day ${dIdx + 1} — ${formatDateToReadable(dStr)}`;

                const dayActs = stop.activities.filter(a => a.date === dStr);

                dayBox.appendChild(dayHeader);

                if (dayActs.length === 0) {
                    const emptyItem = document.createElement('div');
                    emptyItem.style.cssText = "padding: 8px; color: var(--muted); font-size: 12px; font-style: italic;";
                    emptyItem.textContent = `No activities scheduled for Day ${dIdx + 1}.`;
                    dayBox.appendChild(emptyItem);
                } else {
                    const timeline = document.createElement('div');
                    timeline.className = 'timeline';

                    dayActs.forEach(act => {
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

                        const contextMeta = getContextBadgeMeta(act.name, act.time);
                        if (contextMeta) {
                            const contextBadge = document.createElement('span');
                            contextBadge.className = `badge badge-${contextMeta.type}`;
                            contextBadge.style.cssText = "margin-left: 8px; font-size: 10px;";
                            contextBadge.textContent = contextMeta.label;
                            tTitle.appendChild(contextBadge);
                        }

                        const tMeta = document.createElement('div');
                        tMeta.className = 'timeline-meta';
                        tMeta.textContent = `${act.category} • Duration: ${act.duration} • Est: ${act.cost === 0 ? 'Free' : '₹' + act.cost.toLocaleString()}`;

                        item.appendChild(tTime);
                        item.appendChild(tTitle);
                        item.appendChild(tMeta);

                        timeline.appendChild(item);
                    });

                    dayBox.appendChild(timeline);
                }

                card.appendChild(dayBox);
            });

            container.appendChild(card);
        });
    }
}

function renderItineraryBuilderStops() {
    const listElem = document.getElementById('builderCityList');
    const timelineElem = document.getElementById('builderTimeline');

    if (!listElem && !timelineElem) return;

    let activeStop = window.GLOBETROTTER_STATE.stops.find(s => s.id === window.GLOBETROTTER_STATE.activeTargetStopId);
    if (!activeStop && window.GLOBETROTTER_STATE.stops.length > 0) {
        activeStop = window.GLOBETROTTER_STATE.stops[0];
        window.GLOBETROTTER_STATE.activeTargetStopId = activeStop.id;
    }

    if (listElem) {
        while (listElem.firstChild) {
            listElem.removeChild(listElem.firstChild);
        }

        if (window.GLOBETROTTER_STATE.stops.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = "padding: 12px; color: var(--muted); font-size: 12px; font-style: italic;";
            empty.textContent = window.GLOBETROTTER_TRIP_ID
                ? 'No cities yet — click "+ Add City" to start building your itinerary.'
                : 'Create a trip first to start adding cities.';
            listElem.appendChild(empty);
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
            dragIcon.textContent = "";

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

            cityDiv.addEventListener('dragstart', handleStopDragStart);
            cityDiv.addEventListener('dragover', handleStopDragOver);
            cityDiv.addEventListener('drop', handleStopDrop);

            listElem.appendChild(cityDiv);
        });
    }

    if (timelineElem) {
        while (timelineElem.firstChild) {
            timelineElem.removeChild(timelineElem.firstChild);
        }

        window.GLOBETROTTER_STATE.stops.forEach(stop => {
            const isStopActive = activeStop && stop.id === activeStop.id;

            const stopHeader = document.createElement('div');
            stopHeader.style.cssText = `padding: 12px 16px; border-radius: 6px; font-weight: 700; margin: 20px 0 12px 0; display: flex; justify-content: space-between; align-items: center; ${
                isStopActive
                ? 'background: var(--primary-light); border-left: 5px solid var(--primary); color: var(--primary-dark);'
                : 'background: var(--background); border-left: 5px solid var(--muted); color: var(--dark);'
            }`;

            const title = document.createElement('span');
            title.textContent = `Destination Stop: ${stop.cityName} (${stop.stateName})`;

            const rightBox = document.createElement('div');
            rightBox.style.cssText = "display: flex; gap: 10px; align-items: center;";

            const dates = document.createElement('span');
            dates.style.cssText = "font-size: 12px; opacity: 0.8; font-weight: 400;";
            dates.textContent = `${stop.startDate} to ${stop.endDate}`;

            const addActBtn = document.createElement('button');
            addActBtn.className = 'btn btn-primary btn-sm';
            addActBtn.style.cssText = "padding: 3px 10px; font-size: 11px;";
            addActBtn.textContent = '+ Add Activity';
            addActBtn.addEventListener('click', () => {
                openAddActivityModalWithData(stop.cityId, null, stop.id);
            });

            rightBox.appendChild(dates);
            rightBox.appendChild(addActBtn);

            stopHeader.appendChild(title);
            stopHeader.appendChild(rightBox);
            timelineElem.appendChild(stopHeader);

            resolveStopScheduleConflicts(stop);

            const stopDates = getDatesArrayForStop(stop.startDate, stop.endDate);

            stopDates.forEach((dStr, dIdx) => {
                const dayBox = document.createElement('div');
                dayBox.style.cssText = "margin-bottom: 16px; padding: 14px; background: white; border: 1px solid var(--border); border-radius: 8px;";

                const dayHeader = document.createElement('div');
                dayHeader.style.cssText = "font-weight: 700; font-size: 14px; color: var(--dark); margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 6px;";

                const dayTitle = document.createElement('span');
                dayTitle.textContent = `Day ${dIdx + 1} — ${formatDateToReadable(dStr)}`;

                const dayAddBtn = document.createElement('button');
                dayAddBtn.className = 'btn btn-secondary btn-sm';
                dayAddBtn.style.cssText = "padding: 2px 8px; font-size: 11px;";
                dayAddBtn.textContent = '+ Add to Day';
                dayAddBtn.addEventListener('click', () => {
                    openAddActivityModalWithData(stop.cityId, null, stop.id);
                    const dSelect = document.getElementById('modalActivityDate');
                    if (dSelect) dSelect.value = dStr;
                });

                dayHeader.appendChild(dayTitle);
                dayHeader.appendChild(dayAddBtn);
                dayBox.appendChild(dayHeader);

                const dayActs = stop.activities.filter(a => a.date === dStr);

                if (dayActs.length === 0) {
                    const emptyItem = document.createElement('div');
                    emptyItem.style.cssText = "padding: 10px; color: var(--muted); font-size: 12px; font-style: italic;";
                    emptyItem.textContent = `No activities planned for Day ${dIdx + 1}. Click "+ Add to Day" to schedule tours.`;
                    dayBox.appendChild(emptyItem);
                } else {
                    dayActs.forEach((act) => {
                        const item = document.createElement('div');
                        item.className = 'timeline-item';
                        item.style.cssText = "position: relative; padding-left: 28px; margin-bottom: 12px;";

                        const startMins = parseTimeToMinutes(act.time);
                        const durMins = parseDurationToMinutes(act.duration);
                        const endMins = startMins + durMins;
                        const endTimeStr = minutesToFormattedTime(endMins);

                        const timeDiv = document.createElement('div');
                        timeDiv.className = 'timeline-time';
                        timeDiv.textContent = `Slot: ${act.time} – ${endTimeStr}`;

                        const titleDiv = document.createElement('div');
                        titleDiv.className = 'timeline-title';
                        titleDiv.textContent = act.name;

                        const contextMeta = getContextBadgeMeta(act.name, act.time);
                        if (contextMeta) {
                            const contextBadge = document.createElement('span');
                            contextBadge.className = `badge badge-${contextMeta.type}`;
                            contextBadge.style.cssText = "margin-left: 8px; font-size: 10px;";
                            contextBadge.textContent = contextMeta.label;
                            titleDiv.appendChild(contextBadge);
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

                        dayBox.appendChild(item);
                    });
                }

                timelineElem.appendChild(dayBox);
            });
        });
    }
}

// Drag & Drop Handler Functions for City Stops (persisted via the real API)
let draggedStopIndex = null;

function handleStopDragStart(e) {
    draggedStopIndex = parseInt(this.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
}

function handleStopDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    return false;
}

async function handleStopDrop(e) {
    if (e.stopPropagation) e.stopPropagation();

    const targetIndex = parseInt(this.dataset.index);
    if (draggedStopIndex !== null && draggedStopIndex !== targetIndex) {
        const stops = window.GLOBETROTTER_STATE.stops;
        const [moved] = stops.splice(draggedStopIndex, 1);
        stops.splice(targetIndex, 0, moved);
        renderItineraryBuilderStops();

        try {
            await apiRequest('POST', `/api/travel/trips/${window.GLOBETROTTER_TRIP_ID}/stops/reorder/`, {
                order: stops.map(s => s.id).join(','),
            });
            showToast('Destination stop order updated', 'success');
        } catch (err) {
            showToast(`Could not save new order: ${err.message}`, 'error');
            await hydrateStateFromServer();
            renderItineraryBuilderStops();
        }

        renderItineraryViewPage();
        syncCalendarView();
    }
    return false;
}

function deleteCityStop(stopId) {
    apiRequest('POST', `/api/travel/stops/${stopId}/delete/`)
        .then(async () => {
            await hydrateStateFromServer();
            window.GLOBETROTTER_STATE.stops.forEach(s => resolveStopScheduleConflicts(s));

            renderItineraryBuilderStops();
            renderItineraryViewPage();
            recalculateBudget();
            updateTripReadiness();
            syncCalendarView();
            showToast('City stop removed', 'warning');
        })
        .catch(e => showToast(`Could not remove stop: ${e.message}`, 'error'));
}

function deleteActivityFromStop(stopId, actId) {
    apiRequest('POST', `/api/travel/trip-activities/${actId}/delete/`)
        .then(async () => {
            await hydrateStateFromServer();
            window.GLOBETROTTER_STATE.activeTargetStopId = stopId;
            window.GLOBETROTTER_STATE.stops.forEach(s => resolveStopScheduleConflicts(s));

            renderItineraryBuilderStops();
            renderItineraryViewPage();
            recalculateBudget();
            updateTripReadiness();
            syncCalendarView();
            showToast('Activity removed', 'warning');
        })
        .catch(e => showToast(`Could not remove activity: ${e.message}`, 'error'));
}

// -------------------------------------------------------------
// 4. BUDGET SUMMARY WIDGET (full breakdown lives on the
//    server-rendered budget.html; this just keeps the readiness
//    widget and any inline stat elements in sync where present)
// -------------------------------------------------------------

function recalculateBudget() {
    let activityTotal = 0;
    window.GLOBETROTTER_STATE.stops.forEach(s => {
        s.activities.forEach(a => {
            activityTotal += a.cost;
        });
    });

    const totalSpent = activityTotal;
    const targetBudget = window.GLOBETROTTER_STATE.trip.targetBudget || 0;
    const remaining = targetBudget - totalSpent;
    const utilPercent = targetBudget > 0 ? Math.min(Math.round((totalSpent / targetBudget) * 100), 100) : 0;

    const totalAllocElem = document.getElementById('statTotalAllocated');
    if (totalAllocElem) totalAllocElem.textContent = `₹${targetBudget.toLocaleString()}`;

    const totalSpentElem = document.getElementById('statTotalSpent');
    if (totalSpentElem) totalSpentElem.textContent = `₹${totalSpent.toLocaleString()}`;

    const remainingElem = document.getElementById('statRemaining');
    if (remainingElem) {
        remainingElem.textContent = `₹${remaining.toLocaleString()}`;
        remainingElem.style.color = remaining < 0 ? 'var(--danger)' : 'var(--success)';
    }

    const progressBar = document.getElementById('budgetProgressBar');
    if (progressBar) progressBar.style.width = `${utilPercent}%`;
}

// -------------------------------------------------------------
// 5. TRIP READINESS & CALENDAR SYNC
// -------------------------------------------------------------

function updateTripReadiness() {
    let score = 20;

    if (window.GLOBETROTTER_STATE.stops.length > 0) score += 20;

    let hasActivities = false;
    window.GLOBETROTTER_STATE.stops.forEach(s => {
        if (s.activities.length > 0) hasActivities = true;
    });
    if (hasActivities) score += 20;

    if (hasActivities) score += 20;
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
            header.textContent = `${stop.cityName} — ${act.name}`;

            const badge = document.createElement('span');
            badge.className = 'badge badge-primary';
            badge.textContent = act.category;
            header.appendChild(badge);

            const meta = document.createElement('div');
            meta.style.cssText = "font-size: 12px; color: var(--muted); margin-top: 4px;";
            meta.textContent = `Date: ${formatDateToReadable(act.date)} • Slot: ${act.time} – ${endTimeStr} • Est. Cost: ${act.cost === 0 ? 'Free' : '₹' + act.cost.toLocaleString()}`;

            card.appendChild(header);
            card.appendChild(meta);

            calendarContainer.appendChild(card);
        });
    });
}
