// Global state
let currentContributionData = null;
let projectionContributionType = 'percentage'; // Track projection type independently

// DOM Elements
const typePercentageBtn = document.getElementById('typePercentage');
const typeFixedBtn = document.getElementById('typeFixed');
const projectionTypePercentage = document.getElementById('projectionTypePercentage');
const projectionTypeFixed = document.getElementById('projectionTypeFixed');
const sliderGroup = document.getElementById('sliderGroup');
const textFieldGroup = document.getElementById('textFieldGroup');
const contributionSlider = document.getElementById('contributionSlider');
const contributionTextInput = document.getElementById('contributionTextInput');
const sliderValue = document.getElementById('sliderValue');
const sliderLabel = document.getElementById('sliderLabel');
const perPaycheckAmount = document.getElementById('perPaycheckAmount');
const saveButton = document.getElementById('saveButton');
const saveMessage = document.getElementById('saveMessage');
const ytdContributions = document.getElementById('ytdContributions');
const annualSalary = document.getElementById('annualSalary');
const currentContribution = document.getElementById('currentContribution');
const ageInfo = document.getElementById('ageInfo');
const calculateButton = document.getElementById('calculateButton');
const projectionContribution = document.getElementById('projectionContribution');
const projectionPrefix = document.getElementById('projectionPrefix');
const projectionUnit = document.getElementById('projectionUnit');
const retirementResults = document.getElementById('retirementResults');
const currentRetirementValue = document.getElementById('currentRetirementValue');
const projectedRetirementValue = document.getElementById('projectedRetirementValue');
const additionalSavings = document.getElementById('additionalSavings');
const currentRateDisplay = document.getElementById('currentRateDisplay');
const projectedRateDisplay = document.getElementById('projectedRateDisplay');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadContributionData();
    attachEventListeners();
});

// Fetch and display current contribution data
async function loadContributionData() {
    try {
        const response = await fetch('/api/contributions');
        if (!response.ok) {
            throw new Error('Failed to load contribution data');
        }
        currentContributionData = await response.json();
        updateUI();
    } catch (error) {
        console.error('Error loading data:', error);
        showMessage('Error loading data. Please refresh the page.', 'error');
    }
}

// Update the UI based on current data
function updateUI() {
    if (!currentContributionData) return;

    // Update status section
    ytdContributions.textContent = formatCurrency(currentContributionData.ytdContributions);
    annualSalary.textContent = formatCurrency(currentContributionData.annualSalary);
    ageInfo.textContent = `${currentContributionData.age} / ${currentContributionData.retirementAge}`;

    // Update contribution type buttons
    if (currentContributionData.contributionType === 'percentage') {
        typePercentageBtn.classList.add('active');
        typeFixedBtn.classList.remove('active');
        sliderGroup.classList.remove('hidden');
        textFieldGroup.classList.add('hidden');
    } else {
        typeFixedBtn.classList.add('active');
        typePercentageBtn.classList.remove('active');
        textFieldGroup.classList.remove('hidden');
        sliderGroup.classList.add('hidden');
    }

    // Update slider
    if (currentContributionData.contributionType === 'percentage') {
        contributionSlider.value = currentContributionData.contributionAmount;
        updateSliderDisplay();
        sliderLabel.innerHTML = `Contribution Rate: <span id="sliderValue">${currentContributionData.contributionAmount}</span>%`;
        projectionUnit.textContent = '%';
    } else {
        contributionTextInput.value = currentContributionData.contributionAmount;
        projectionUnit.textContent = '$';
    }

    updatePerPaycheckAmount();

    // Update current contribution display
    if (currentContributionData.contributionType === 'percentage') {
        currentContribution.textContent = `${currentContributionData.contributionAmount}%`;
    } else {
        currentContribution.textContent = formatCurrency(currentContributionData.contributionAmount);
    }

    // Update projection field
    projectionContribution.value = currentContributionData.contributionAmount;
    currentRateDisplay.textContent = currentContributionData.contributionAmount;
}

// Attach event listeners
function attachEventListeners() {
    typePercentageBtn.addEventListener('click', () => selectContributionType('percentage'));
    typeFixedBtn.addEventListener('click', () => selectContributionType('fixed'));
    projectionTypePercentage.addEventListener('click', () => selectProjectionType('percentage'));
    projectionTypeFixed.addEventListener('click', () => selectProjectionType('fixed'));
    contributionSlider.addEventListener('input', () => {
        updateSliderDisplay();
        updatePerPaycheckAmount();
    });
    contributionTextInput.addEventListener('input', () => {
        updatePerPaycheckAmount();
    });
    saveButton.addEventListener('click', saveContributionRate);
    calculateButton.addEventListener('click', calculateRetirementImpact);
}

// Select contribution type
function selectContributionType(type) {
    currentContributionData.contributionType = type;
    updateUI();
    updatePerPaycheckAmount();
}

// Select projection type
function selectProjectionType(type) {
    projectionContributionType = type;
    
    // Update button states
    if (type === 'percentage') {
        projectionTypePercentage.classList.add('active');
        projectionTypeFixed.classList.remove('active');
        projectionUnit.textContent = '%';
        projectionPrefix.textContent = '%';
        projectionContribution.max = '100';
    } else {
        projectionTypeFixed.classList.add('active');
        projectionTypePercentage.classList.remove('active');
        projectionUnit.textContent = '$';
        projectionPrefix.textContent = '$';
        projectionContribution.max = '';
    }
}

// Update slider display
function updateSliderDisplay() {
    const value = parseFloat(contributionSlider.value);
    const sliderSpan = sliderLabel.querySelector('#sliderValue');

    if (currentContributionData.contributionType === 'percentage') {
        sliderSpan.textContent = value;
        sliderLabel.innerHTML = `Contribution Rate: <span id="sliderValue">${value}</span>%`;
    } else {
        sliderSpan.textContent = `$${value}`;
        sliderLabel.innerHTML = `Contribution Amount: <span id="sliderValue">$${value}</span>`;
    }
}

// Update per-paycheck amount display
function updatePerPaycheckAmount() {
    const amount = parseFloat(contributionSlider.value);
    let perPaycheck = 0;

    if (currentContributionData.contributionType === 'percentage') {
        const perPaycheckSalary = currentContributionData.annualSalary / 26;
        perPaycheck = (perPaycheckSalary * amount) / 100;
    } else {
        perPaycheck = amount;
    }

    perPaycheckAmount.textContent = formatCurrency(perPaycheck);
}

// Save contribution rate to backend
async function saveContributionRate() {
    try {
        let amount;
        if (currentContributionData.contributionType === 'percentage') {
            amount = parseFloat(contributionSlider.value);
        } else {
            amount = parseFloat(contributionTextInput.value);
        }

        if (isNaN(amount) || amount < 0) {
            showMessage('Please enter a valid contribution amount', 'error');
            return;
        }

        const type = currentContributionData.contributionType;

        const response = await fetch('/api/contributions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contributionType: type,
                contributionAmount: amount
            })
        });

        if (!response.ok) {
            throw new Error('Failed to save contribution rate');
        }

        const result = await response.json();
        currentContributionData = result.data;
        updateUI();
        showMessage('✓ Contribution rate saved successfully!', 'success');
    } catch (error) {
        console.error('Error saving:', error);
        showMessage('Error saving contribution rate. Please try again.', 'error');
    }
}

// Calculate retirement impact
async function calculateRetirementImpact() {
    try {
        const projectionAmount = parseFloat(projectionContribution.value);

        if (isNaN(projectionAmount) || projectionAmount < 0) {
            showMessage('Please enter a valid projection amount', 'error');
            return;
        }

        const response = await fetch('/api/calculate-retirement-impact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                futureContributionRate: projectionAmount,
                futureContributionType: projectionContributionType
            })
        });

        if (!response.ok) {
            throw new Error('Failed to calculate retirement impact');
        }

        const result = await response.json();
        displayRetirementImpact(result, projectionAmount, projectionContributionType);
    } catch (error) {
        console.error('Error calculating:', error);
        showMessage('Error calculating retirement impact. Please try again.', 'error');
    }
}

// Display retirement impact results
function displayRetirementImpact(data, projectionAmount, projectionType) {
    currentRetirementValue.textContent = formatCurrency(data.currentRetirementValue);
    projectedRetirementValue.textContent = formatCurrency(data.futureRetirementValue);
    additionalSavings.textContent = formatCurrency(data.additionalSavings);

    const currentAmount = currentContributionData.contributionAmount;
    const currentUnit = currentContributionData.contributionType === 'percentage' ? '%' : '$';
    const projectionUnit = projectionType === 'percentage' ? '%' : '$';

    currentRateDisplay.textContent = `${currentAmount}${currentUnit}`;
    projectedRateDisplay.textContent = `${projectionAmount}${projectionUnit}`;

    retirementResults.classList.remove('hidden');
}

// Show message
function showMessage(text, type) {
    saveMessage.textContent = text;
    saveMessage.className = `message ${type}`;

    // Auto-hide success messages after 4 seconds
    if (type === 'success') {
        setTimeout(() => {
            saveMessage.textContent = '';
            saveMessage.className = 'message';
        }, 4000);
    }
}

// Format currency
function formatCurrency(value) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value);
}
