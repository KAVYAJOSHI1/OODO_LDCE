/**
 * GLOBETROTTER — CUSTOM ADMIN PANEL JAVASCRIPT
 * Modular state management, API client, modal controls, and dynamic table rendering.
 */

// CSRF Token Helper
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Toast Notification Manager
function showAdminToast(message, type = 'success') {
    let container = document.getElementById('adminToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'adminToastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;font-size:16px;margin-left:12px;color:#718096;">&times;</button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) toast.remove();
    }, 4000);
}

// Generic API Fetch Client
async function apiFetch(url, options = {}) {
    options.headers = options.headers || {};
    options.headers['Content-Type'] = 'application/json';
    const csrfToken = getCookie('csrftoken');
    if (csrfToken) {
        options.headers['X-CSRFToken'] = csrfToken;
    }

    try {
        const response = await fetch(url, options);
        const data = await response.json();
        if (!response.ok || data.ok === false) {
            const errMsg = (data.error && data.error.message) ? data.error.message : 'An API error occurred.';
            showAdminToast(errMsg, 'error');
            return { ok: false, error: errMsg };
        }
        return data;
    } catch (err) {
        showAdminToast('Network connection or server error.', 'error');
        return { ok: false, error: err.message };
    }
}

// Modal Controllers
function openAdminModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeAdminModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Helper to escape HTML strings safely
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* =========================================================
   1. DASHBOARD PAGE
   ========================================================= */

async function initAdminDashboard() {
    // Stats
    const statsRes = await apiFetch('/api/admin/dashboard/stats/');
    if (statsRes.ok && statsRes.stats) {
        if (document.getElementById('statTotalUsers')) document.getElementById('statTotalUsers').textContent = statsRes.stats.total_users;
        if (document.getElementById('statActiveTrips')) document.getElementById('statActiveTrips').textContent = statsRes.stats.active_trips;
        if (document.getElementById('statTotalCities')) document.getElementById('statTotalCities').textContent = statsRes.stats.total_cities;
        if (document.getElementById('statTotalActivities')) document.getElementById('statTotalActivities').textContent = statsRes.stats.total_activities;
        if (document.getElementById('statPublicTrips')) document.getElementById('statPublicTrips').textContent = statsRes.stats.total_public_trips;
        if (document.getElementById('statAvgBudget')) document.getElementById('statAvgBudget').textContent = '$' + statsRes.stats.avg_trip_budget;
        if (document.getElementById('statTotalBudget')) document.getElementById('statTotalBudget').textContent = '$' + statsRes.stats.total_planned_budget;
        if (document.getElementById('statTotalExpenses')) document.getElementById('statTotalExpenses').textContent = '$' + statsRes.stats.total_expenses;
        if (document.getElementById('statBudgetUtil')) document.getElementById('statBudgetUtil').textContent = statsRes.stats.budget_utilization;
    }

    // Charts
    const chartsRes = await apiFetch('/api/admin/dashboard/charts/');
    if (chartsRes.ok && chartsRes.charts) {
        renderStatusChart(chartsRes.charts.status_distribution);
        renderPopularCitiesChart(chartsRes.charts.popular_destinations);
        renderBudgetBreakdownChart(chartsRes.charts.budget_breakdown);
    }
}

function renderStatusChart(data) {
    const container = document.getElementById('statusChartContainer');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<div class="admin-loading">No status data available.</div>';
        return;
    }

    const total = data.reduce((sum, item) => sum + item.count, 0) || 1;
    container.innerHTML = data.map(item => {
        const pct = Math.round((item.count / total) * 100);
        return `
            <div class="bar-chart-row">
                <div class="bar-chart-label-group">
                    <span style="text-transform:capitalize;">${item.status}</span>
                    <span>${item.count} (${pct}%)</span>
                </div>
                <div class="bar-chart-bar-outer">
                    <div class="bar-chart-bar-inner" style="width: ${pct}%;"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderPopularCitiesChart(data) {
    const container = document.getElementById('popularCitiesContainer');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<div class="admin-loading">No destination data yet.</div>';
        return;
    }

    const maxStops = Math.max(...data.map(d => d.stops_count), 1);
    container.innerHTML = data.map(city => {
        const pct = Math.round((city.stops_count / maxStops) * 100);
        return `
            <div class="bar-chart-row">
                <div class="bar-chart-label-group">
                    <span>${escapeHtml(city.name)}, ${escapeHtml(city.country)}</span>
                    <span>${city.stops_count} trip stops</span>
                </div>
                <div class="bar-chart-bar-outer">
                    <div class="bar-chart-bar-inner" style="width: ${pct}%; background-color: var(--admin-accent);"></div>
                </div>
            </div>
        `;
    }).join('');
}

function renderBudgetBreakdownChart(data) {
    const container = document.getElementById('budgetBreakdownContainer');
    if (!container) return;

    if (!data || data.length === 0) {
        container.innerHTML = '<div class="admin-loading">No expense data logged.</div>';
        return;
    }

    const totalSpent = data.reduce((sum, item) => sum + item.total_amount, 0) || 1;
    container.innerHTML = data.map(item => {
        const pct = Math.round((item.total_amount / totalSpent) * 100);
        return `
            <div class="bar-chart-row">
                <div class="bar-chart-label-group">
                    <span style="text-transform:capitalize;">${item.category}</span>
                    <span>$${item.total_amount.toFixed(2)} (${pct}%)</span>
                </div>
                <div class="bar-chart-bar-outer">
                    <div class="bar-chart-bar-inner" style="width: ${pct}%; background-color: var(--admin-info);"></div>
                </div>
            </div>
        `;
    }).join('');
}

async function triggerSystemReseed() {
    if (!confirm('Are you sure you want to reseed demo travel data? This will reset the travel catalog.')) {
        return;
    }
    const res = await apiFetch('/api/admin/system/reseed/', { method: 'POST' });
    if (res.ok) {
        showAdminToast(res.message, 'success');
        setTimeout(() => location.reload(), 1200);
    }
}

/* =========================================================
   2. CITIES & ACTIVITIES STUDIO
   ========================================================= */

let currentCityPage = 1;
let currentActivityPage = 1;
let selectedCityForActivities = null;

async function initAdminCitiesPage() {
    loadCities(1);
    loadActivities(1);
}

async function loadCities(page = 1) {
    currentCityPage = page;
    const search = document.getElementById('citySearchInput')?.value || '';
    const country = document.getElementById('countryFilter')?.value || '';
    const costIndex = document.getElementById('costIndexFilter')?.value || '';

    const query = new URLSearchParams({
        page: page,
        search: search,
        country: country,
        cost_index: costIndex
    });

    const tbody = document.getElementById('citiesTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="admin-loading">⟳ Loading cities...</td></tr>';

    const res = await apiFetch(`/api/admin/cities/?${query}`);
    if (res.ok) {
        renderCitiesTable(res.cities);
        renderPagination('citiesPagination', res.current_page, res.total_pages, (p) => loadCities(p));
        populateCityDropdowns(res.cities);
    } else if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="admin-empty-state">Unable to load cities. <button onclick="loadCities(1)" class="admin-btn admin-btn-sm admin-btn-secondary">Retry</button></td></tr>';
    }
}

function renderCitiesTable(cities) {
    const tbody = document.getElementById('citiesTableBody');
    if (!tbody) return;

    if (!cities || cities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="admin-empty-state">No cities found.</td></tr>';
        return;
    }

    tbody.innerHTML = cities.map(c => `
        <tr>
            <td><strong>${escapeHtml(c.name)}</strong></td>
            <td>${escapeHtml(c.country)}</td>
            <td><span class="admin-badge admin-badge-info">Cost ${c.cost_index}/5</span></td>
            <td>${c.popularity}/100</td>
            <td>${c.activity_count} activities</td>
            <td>${c.stop_count} stops</td>
            <td>
                <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="editCityModal(${JSON.stringify(c).replace(/"/g, '&quot;')})">Edit</button>
                <button class="admin-btn admin-btn-sm admin-btn-primary" onclick="filterActivitiesByCity(${c.id}, '${escapeHtml(c.name)}')">View Activities</button>
            </td>
        </tr>
    `).join('');
}

function openAddCityModal() {
    document.getElementById('cityModalTitle').textContent = 'Add New City';
    document.getElementById('cityFormId').value = '';
    document.getElementById('cityFormName').value = '';
    document.getElementById('cityFormCountry').value = '';
    document.getElementById('cityFormCostIndex').value = '3';
    document.getElementById('cityFormPopularity').value = '50';
    document.getElementById('cityFormHotelCost').value = '50.00';
    document.getElementById('cityFormMealCost').value = '15.00';
    document.getElementById('cityFormTransportCost').value = '10.00';
    document.getElementById('cityFormImage').value = '';
    document.getElementById('cityFormDescription').value = '';

    openAdminModal('cityModal');
}

function editCityModal(city) {
    document.getElementById('cityModalTitle').textContent = `Edit City: ${city.name}`;
    document.getElementById('cityFormId').value = city.id;
    document.getElementById('cityFormName').value = city.name;
    document.getElementById('cityFormCountry').value = city.country;
    document.getElementById('cityFormCostIndex').value = city.cost_index;
    document.getElementById('cityFormPopularity').value = city.popularity;
    document.getElementById('cityFormHotelCost').value = city.avg_hotel_cost;
    document.getElementById('cityFormMealCost').value = city.avg_meal_cost;
    document.getElementById('cityFormTransportCost').value = city.avg_transport_cost;
    document.getElementById('cityFormImage').value = city.image_url || '';
    document.getElementById('cityFormDescription').value = city.description || '';

    openAdminModal('cityModal');
}

async function saveCityForm(event) {
    if (event) event.preventDefault();

    const payload = {
        id: document.getElementById('cityFormId').value || null,
        name: document.getElementById('cityFormName').value,
        country: document.getElementById('cityFormCountry').value,
        cost_index: document.getElementById('cityFormCostIndex').value,
        popularity: document.getElementById('cityFormPopularity').value,
        avg_hotel_cost: document.getElementById('cityFormHotelCost').value,
        avg_meal_cost: document.getElementById('cityFormMealCost').value,
        avg_transport_cost: document.getElementById('cityFormTransportCost').value,
        image_url: document.getElementById('cityFormImage').value,
        description: document.getElementById('cityFormDescription').value
    };

    const res = await apiFetch('/api/admin/cities/save/', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        showAdminToast(res.message, 'success');
        closeAdminModal('cityModal');
        loadCities(currentCityPage);
    }
}

// Activities Section
async function loadActivities(page = 1) {
    currentActivityPage = page;
    const cityId = selectedCityForActivities || document.getElementById('activityCityFilter')?.value || '';
    const category = document.getElementById('activityCategoryFilter')?.value || '';
    const search = document.getElementById('activitySearchInput')?.value || '';

    const query = new URLSearchParams({
        page: page,
        city_id: cityId,
        category: category,
        search: search
    });

    const tbody = document.getElementById('activitiesTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="admin-loading">⟳ Loading activities...</td></tr>';

    const res = await apiFetch(`/api/admin/activities/?${query}`);
    if (res.ok) {
        renderActivitiesTable(res.activities);
        renderPagination('activitiesPagination', res.current_page, res.total_pages, (p) => loadActivities(p));
        if (res.activity_types) {
            populateCategoryDropdown(res.activity_types);
        }
    } else if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="admin-empty-state">Unable to load activities.</td></tr>';
    }
}

function renderActivitiesTable(activities) {
    const tbody = document.getElementById('activitiesTableBody');
    if (!tbody) return;

    if (!activities || activities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="admin-empty-state">No activities found.</td></tr>';
        return;
    }

    tbody.innerHTML = activities.map(a => `
        <tr>
            <td>
                <strong>${escapeHtml(a.name)}</strong>
                <div style="font-size:12px;color:var(--admin-muted);">City: ${escapeHtml(a.city_name)}</div>
            </td>
            <td><span class="admin-badge admin-badge-primary">${escapeHtml(a.category)}</span></td>
            <td>$${a.cost}</td>
            <td>${a.duration_hours} hrs</td>
            <td>★ ${a.rating}</td>
            <td>${a.popularity}/100</td>
            <td>
                <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="editActivityModal(${JSON.stringify(a).replace(/"/g, '&quot;')})">Edit</button>
                <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="confirmDeleteActivity(${a.id}, '${escapeHtml(a.name)}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function filterActivitiesByCity(cityId, cityName) {
    selectedCityForActivities = cityId;
    const filterSelect = document.getElementById('activityCityFilter');
    if (filterSelect) filterSelect.value = cityId;

    const label = document.getElementById('selectedCityNotice');
    if (label) {
        label.style.display = 'inline-block';
        label.textContent = `Showing activities for ${cityName}`;
    }
    loadActivities(1);
}

function clearCityActivityFilter() {
    selectedCityForActivities = null;
    const filterSelect = document.getElementById('activityCityFilter');
    if (filterSelect) filterSelect.value = '';

    const label = document.getElementById('selectedCityNotice');
    if (label) label.style.display = 'none';

    loadActivities(1);
}

function populateCityDropdowns(cities) {
    const formSelect = document.getElementById('activityFormCity');
    const filterSelect = document.getElementById('activityCityFilter');

    if (formSelect) {
        formSelect.innerHTML = '<option value="">Select City...</option>' +
            cities.map(c => `<option value="${c.id}">${escapeHtml(c.name)} (${escapeHtml(c.country)})</option>`).join('');
    }
    if (filterSelect && !selectedCityForActivities) {
        filterSelect.innerHTML = '<option value="">All Cities</option>' +
            cities.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
    }
}

function populateCategoryDropdown(types) {
    const formSelect = document.getElementById('activityFormCategory');
    if (formSelect && formSelect.options.length <= 1) {
        formSelect.innerHTML = '<option value="">Select Category...</option>' +
            types.map(t => `<option value="${t.code}">${escapeHtml(t.label)}</option>`).join('');
    }
}

function openAddActivityModal() {
    document.getElementById('activityModalTitle').textContent = 'Add New Activity';
    document.getElementById('activityFormId').value = '';
    document.getElementById('activityFormName').value = '';
    document.getElementById('activityFormCity').value = selectedCityForActivities || '';
    document.getElementById('activityFormCategory').value = '';
    document.getElementById('activityFormCost').value = '0.00';
    document.getElementById('activityFormDuration').value = '2.0';
    document.getElementById('activityFormRating').value = '4.0';
    document.getElementById('activityFormPopularity').value = '50';
    document.getElementById('activityFormImage').value = '';
    document.getElementById('activityFormDescription').value = '';

    openAdminModal('activityModal');
}

function editActivityModal(activity) {
    document.getElementById('activityModalTitle').textContent = `Edit Activity: ${activity.name}`;
    document.getElementById('activityFormId').value = activity.id;
    document.getElementById('activityFormName').value = activity.name;
    document.getElementById('activityFormCity').value = activity.city_id;
    document.getElementById('activityFormCategory').value = activity.category_code || '';
    document.getElementById('activityFormCost').value = activity.cost;
    document.getElementById('activityFormDuration').value = activity.duration_hours;
    document.getElementById('activityFormRating').value = activity.rating;
    document.getElementById('activityFormPopularity').value = activity.popularity;
    document.getElementById('activityFormImage').value = activity.image_url || '';
    document.getElementById('activityFormDescription').value = activity.description || '';

    openAdminModal('activityModal');
}

async function saveActivityForm(event) {
    if (event) event.preventDefault();

    const payload = {
        id: document.getElementById('activityFormId').value || null,
        name: document.getElementById('activityFormName').value,
        city_id: document.getElementById('activityFormCity').value,
        category: document.getElementById('activityFormCategory').value,
        cost: document.getElementById('activityFormCost').value,
        duration_hours: document.getElementById('activityFormDuration').value,
        rating: document.getElementById('activityFormRating').value,
        popularity: document.getElementById('activityFormPopularity').value,
        image_url: document.getElementById('activityFormImage').value,
        description: document.getElementById('activityFormDescription').value
    };

    const res = await apiFetch('/api/admin/activities/save/', {
        method: 'POST',
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        showAdminToast(res.message, 'success');
        closeAdminModal('activityModal');
        loadActivities(currentActivityPage);
    }
}

let pendingDeleteActivityId = null;

function confirmDeleteActivity(id, name) {
    pendingDeleteActivityId = id;
    document.getElementById('deleteConfirmText').textContent = `Are you sure you want to delete activity "${name}"? This action cannot be undone.`;
    openAdminModal('deleteConfirmModal');
}

async function executeDeleteActivity() {
    if (!pendingDeleteActivityId) return;

    const res = await apiFetch(`/api/admin/activities/${pendingDeleteActivityId}/`, {
        method: 'DELETE'
    });

    if (res.ok) {
        showAdminToast(res.message, 'success');
        closeAdminModal('deleteConfirmModal');
        loadActivities(currentActivityPage);
    }
}

/* =========================================================
   3. TRIPS INSPECTION PAGE
   ========================================================= */

let currentTripPage = 1;

async function initAdminTripsPage() {
    loadTrips(1);
}

async function loadTrips(page = 1) {
    currentTripPage = page;
    const isPublic = document.getElementById('tripPublicFilter')?.value || '';
    const status = document.getElementById('tripStatusFilter')?.value || '';
    const search = document.getElementById('tripSearchInput')?.value || '';

    const query = new URLSearchParams({
        page: page,
        is_public: isPublic,
        status: status,
        search: search
    });

    const tbody = document.getElementById('tripsTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="8" class="admin-loading">⟳ Loading trips...</td></tr>';

    const res = await apiFetch(`/api/admin/trips/?${query}`);
    if (res.ok) {
        renderTripsTable(res.trips);
        renderPagination('tripsPagination', res.current_page, res.total_pages, (p) => loadTrips(p));
    } else if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="admin-empty-state">Unable to load trips.</td></tr>';
    }
}

function renderTripsTable(trips) {
    const tbody = document.getElementById('tripsTableBody');
    if (!tbody) return;

    if (!trips || trips.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="admin-empty-state">No trips found.</td></tr>';
        return;
    }

    tbody.innerHTML = trips.map(t => {
        const statusBadge = t.status === 'completed' ? 'admin-badge-success' : (t.status === 'cancelled' ? 'admin-badge-danger' : 'admin-badge-info');
        const dests = t.destinations && t.destinations.length > 0 ? t.destinations.join(', ') : 'None';
        return `
            <tr>
                <td><strong>${escapeHtml(t.name)}</strong></td>
                <td>
                    ${escapeHtml(t.user_username)}
                    <div style="font-size:11px;color:var(--admin-muted);">${escapeHtml(t.user_email)}</div>
                </td>
                <td>${escapeHtml(dests)}</td>
                <td>${t.travelers} travelers</td>
                <td>$${t.total_cost} / $${t.budget}</td>
                <td><span class="admin-badge ${statusBadge}">${t.status}</span></td>
                <td>
                    <button class="admin-btn admin-btn-sm ${t.is_public ? 'admin-btn-primary' : 'admin-btn-secondary'}" onclick="toggleTripPublic(${t.id})">
                        ${t.is_public ? '✓ Public' : 'Private'}
                    </button>
                </td>
                <td>
                    <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="inspectTripDetail(${t.id})">Inspect</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function inspectTripDetail(tripId) {
    const res = await apiFetch(`/api/admin/trips/${tripId}/detail/`);
    if (!res.ok || !res.trip) return;

    const t = res.trip;
    document.getElementById('tripInspectTitle').textContent = t.name;

    let html = `
        <div style="margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:12px;background:#f8fafc;padding:16px;border-radius:8px;">
            <div><strong>Owner:</strong> ${escapeHtml(t.user_username)} (${escapeHtml(t.user_email)})</div>
            <div><strong>Travelers:</strong> ${t.travelers} person(s)</div>
            <div><strong>Dates:</strong> ${t.start_date || 'N/A'} → ${t.end_date || 'N/A'} (${t.duration_days} days)</div>
            <div><strong>Status:</strong> <span class="admin-badge admin-badge-info">${t.status}</span></div>
            <div><strong>Budget:</strong> $${t.budget} | <strong>Total Cost:</strong> $${t.total_cost}</div>
            <div><strong>Share Token:</strong> ${t.share_token || 'None'}</div>
        </div>

        <h4 style="margin-bottom:12px;">Itinerary Stops (${t.stops.length})</h4>
    `;

    if (t.stops.length === 0) {
        html += '<p style="color:var(--admin-muted);">No stops added to this trip itinerary yet.</p>';
    } else {
        t.stops.forEach(stop => {
            html += `
                <div style="border:1px solid var(--admin-border);border-radius:8px;padding:14px;margin-bottom:12px;">
                    <div style="display:flex;justify-content:space-between;font-weight:700;margin-bottom:6px;">
                        <span>Stop #${stop.order}: ${escapeHtml(stop.city_name)}, ${escapeHtml(stop.country)}</span>
                        <span>$${stop.stop_cost}</span>
                    </div>
                    <div style="font-size:12px;color:var(--admin-muted);margin-bottom:8px;">
                        Stay: ${escapeHtml(stop.accommodation_name)} ($${stop.accommodation_cost}/night) | Transport: ${escapeHtml(stop.transport_mode)} ($${stop.transport_cost})
                    </div>
            `;

            if (stop.activities && stop.activities.length > 0) {
                html += '<ul style="margin:0;padding-left:20px;font-size:13px;">';
                stop.activities.forEach(act => {
                    html += `<li>${escapeHtml(act.name)} - $${act.cost}</li>`;
                });
                html += '</ul>';
            } else {
                html += '<div style="font-size:12px;color:var(--admin-muted);">No scheduled activities</div>';
            }
            html += '</div>';
        });
    }

    if (t.expenses && t.expenses.length > 0) {
        html += '<h4 style="margin:16px 0 10px 0;">Logged Expenses</h4><ul style="padding-left:20px;font-size:13px;">';
        t.expenses.forEach(exp => {
            html += `<li>[${escapeHtml(exp.category)}] ${escapeHtml(exp.description)}: <strong>$${exp.amount}</strong></li>`;
        });
        html += '</ul>';
    }

    document.getElementById('tripInspectContent').innerHTML = html;
    openAdminModal('tripInspectModal');
}

async function toggleTripPublic(tripId) {
    const res = await apiFetch(`/api/admin/trips/${tripId}/toggle-public/`, { method: 'POST' });
    if (res.ok) {
        showAdminToast(res.message, 'success');
        loadTrips(currentTripPage);
    }
}

/* =========================================================
   4. USER MANAGEMENT PAGE
   ========================================================= */

let currentUserPage = 1;

async function initAdminUsersPage() {
    loadUsers(1);
}

async function loadUsers(page = 1) {
    currentUserPage = page;
    const search = document.getElementById('userSearchInput')?.value || '';
    const isStaff = document.getElementById('userStaffFilter')?.value || '';

    const query = new URLSearchParams({
        page: page,
        q: search,
        is_staff: isStaff
    });

    const tbody = document.getElementById('usersTableBody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="admin-loading">⟳ Loading users...</td></tr>';

    const res = await apiFetch(`/api/admin/users/?${query}`);
    if (res.ok) {
        renderUsersTable(res.users);
        renderPagination('usersPagination', res.current_page, res.total_pages, (p) => loadUsers(p));
    } else if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="admin-empty-state">Unable to load users.</td></tr>';
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="admin-empty-state">No users found.</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(u => {
        const roleBadge = u.is_staff ? '<span class="admin-badge admin-badge-primary">Staff Admin</span>' : '<span class="admin-badge admin-badge-secondary">Traveler</span>';
        const statusBadge = u.is_active ? '<span class="admin-badge admin-badge-success">Active</span>' : '<span class="admin-badge admin-badge-danger">Deactivated</span>';

        return `
            <tr>
                <td><strong>${escapeHtml(u.username)}</strong></td>
                <td>${escapeHtml(u.email)}</td>
                <td>${u.trip_count} trips</td>
                <td>${roleBadge}</td>
                <td>${statusBadge}</td>
                <td>${u.date_joined}</td>
                <td>
                    <button class="admin-btn admin-btn-sm ${u.is_active ? 'admin-btn-danger' : 'admin-btn-primary'}" onclick="updateUserStatusAction(${u.id}, '${u.is_active ? 'deactivate' : 'activate'}')">
                        ${u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="updateUserStatusAction(${u.id}, '${u.is_staff ? 'demote_staff' : 'promote_staff'}')">
                        ${u.is_staff ? 'Remove Staff' : 'Make Staff'}
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

async function updateUserStatusAction(userId, action) {
    const res = await apiFetch(`/api/admin/users/${userId}/update-status/`, {
        method: 'POST',
        body: JSON.stringify({ action: action })
    });

    if (res.ok) {
        showAdminToast(res.message, 'success');
        loadUsers(currentUserPage);
    }
}

/* =========================================================
   PAGINATION UTILITY
   ========================================================= */

function renderPagination(containerId, currentPage, totalPages, pageCallback) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    let buttonsHtml = '';
    for (let i = 1; i <= totalPages; i++) {
        const activeClass = i === currentPage ? 'admin-btn-primary' : 'admin-btn-secondary';
        buttonsHtml += `<button class="admin-btn admin-btn-sm ${activeClass}" onclick="pageCallbackWrapper('${containerId}', ${i})">${i}</button>`;
    }

    container.innerHTML = `
        <div>Showing Page <strong>${currentPage}</strong> of <strong>${totalPages}</strong></div>
        <div class="pagination-buttons">
            <button class="admin-btn admin-btn-sm admin-btn-secondary" ${currentPage <= 1 ? 'disabled' : ''} onclick="pageCallbackWrapper('${containerId}', ${currentPage - 1})">Previous</button>
            ${buttonsHtml}
            <button class="admin-btn admin-btn-sm admin-btn-secondary" ${currentPage >= totalPages ? 'disabled' : ''} onclick="pageCallbackWrapper('${containerId}', ${currentPage + 1})">Next</button>
        </div>
    `;

    window[`${containerId}_callback`] = pageCallback;
}

function pageCallbackWrapper(containerId, targetPage) {
    const cb = window[`${containerId}_callback`];
    if (typeof cb === 'function') {
        cb(targetPage);
    }
}
