/**
 * GlobeTrotter - Inline Form Validation Helper
 */

function setFieldError(fieldInput, errorMessage) {
    if (typeof fieldInput === 'string') {
        fieldInput = document.getElementById(fieldInput);
    }
    if (!fieldInput) return;

    fieldInput.classList.add('input-error');

    let errorElem = fieldInput.parentElement.querySelector('.form-error');
    if (!errorElem) {
        errorElem = document.createElement('div');
        errorElem.className = 'form-error';
        fieldInput.parentElement.appendChild(errorElem);
    }
    errorElem.innerHTML = `${errorMessage}`;
}

function clearFieldError(fieldInput) {
    if (typeof fieldInput === 'string') {
        fieldInput = document.getElementById(fieldInput);
    }
    if (!fieldInput) return;

    fieldInput.classList.remove('input-error');
    const errorElem = fieldInput.parentElement.querySelector('.form-error');
    if (errorElem) {
        errorElem.remove();
    }
}

function clearFormErrors(formElement) {
    if (!formElement) return;
    formElement.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    formElement.querySelectorAll('.form-error').forEach(el => el.remove());
}
