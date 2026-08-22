/**
 * GlobeTrotter - Toast Notification System
 * Standardized Toast Alerts (Success, Error, Warning)
 */

function getToastContainer() {
    let container = document.getElementById('gt-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'gt-toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function showToast(message, type = 'success', duration = 3500) {
    const container = getToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = '✓';
    if (type === 'error') icon = '✕';
    if (type === 'warning') icon = '';

    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="font-size: 15px;">${icon}</strong>
            <span>${message}</span>
        </div>
        <button style="background: none; border: none; font-size: 16px; cursor: pointer; color: var(--muted); margin-left: 12px;" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}
