// Global state
let currentContributionData = null;
let projectionContributionType = 'percentage'; // Track projection type independently

// Contribution limits
const ANNUAL_CONTRIBUTION_LIMIT = 24500;
const PER_PAYCHECK_LIMIT = ANNUAL_CONTRIBUTION_LIMIT / 26; // 942.31

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
const currentContributionFixed = document.getElementById('currentContributionFixed');
const currentAge = document.getElementById('currentAge');
const retirementAgeStatus = document.getElementById('retirementAgeStatus');
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
const ageInput = document.getElementById('ageInput');
const salaryInput = document.getElementById('salaryInput');
const balanceInput = document.getElementById('balanceInput');
const retirementAgeInput = document.getElementById('retirementAgeInput');
const salaryIncreaseInput = document.getElementById('salaryIncreaseInput');
const expectedReturnInput = document.getElementById('expectedReturnInput');
const inflationInput = document.getElementById('inflationInput');

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    loadContributionData();
    attachEventListeners();
    // Hide yearly projections area on load
    const projectionChartWrap = document.getElementById('projectionChartWrap');
    if (projectionChartWrap) projectionChartWrap.classList.add('hidden');
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
    if (currentAge) currentAge.textContent = currentContributionData.age || '';
    if (retirementAgeStatus) retirementAgeStatus.textContent = currentContributionData.retirementAge || '';

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
        // Calculate max percentage based on salary
        const salary = currentContributionData.annualSalary || 0;
        const maxPercentage = salary > 0 ? Math.min(100, (ANNUAL_CONTRIBUTION_LIMIT / salary) * 100) : 100;
        contributionSlider.max = maxPercentage.toFixed(2);
        contributionSlider.value = Math.min(currentContributionData.contributionAmount, maxPercentage);
        updateSliderDisplay();
        sliderLabel.innerHTML = `Contribution Rate: <span id="sliderValue">${currentContributionData.contributionAmount}</span>%`;
        projectionUnit.textContent = '%';
    } else {
        contributionTextInput.value = currentContributionData.contributionAmount;
        contributionTextInput.max = PER_PAYCHECK_LIMIT.toFixed(2);
        projectionUnit.textContent = '$';
    }

    // Populate manual fields if present
    if (ageInput) ageInput.value = currentContributionData.age || '';
    if (salaryInput) salaryInput.value = currentContributionData.annualSalary || currentContributionData.salary || '';
    if (balanceInput) balanceInput.value = currentContributionData.currentBalance || 0;
    if (retirementAgeInput) retirementAgeInput.value = currentContributionData.retirementAge || '';
    if (salaryIncreaseInput) salaryIncreaseInput.value = currentContributionData.salaryIncrease || '';
    if (expectedReturnInput) expectedReturnInput.value = (currentContributionData.annualReturn !== undefined) ? (currentContributionData.annualReturn * 100) : '';
    if (inflationInput) inflationInput.value = currentContributionData.inflationRate || '';

    updatePerPaycheckAmount();

    // Update current contribution display
    // Always show both: percentage and fixed (per-paycheck)
    const salaryVal = salaryInput ? parseFloat(salaryInput.value) : currentContributionData.annualSalary || 0;
    const perPaycheckSalary = (salaryVal && !isNaN(salaryVal)) ? (salaryVal / 26) : 0;

    let percentDisplay = 0;
    let fixedPerPaycheckDisplay = 0;

    if (currentContributionData.contributionType === 'percentage') {
        percentDisplay = parseFloat(currentContributionData.contributionAmount) || 0;
        fixedPerPaycheckDisplay = perPaycheckSalary * percentDisplay / 100;
    } else {
        fixedPerPaycheckDisplay = parseFloat(currentContributionData.contributionAmount) || 0;
        percentDisplay = perPaycheckSalary > 0 ? (fixedPerPaycheckDisplay / perPaycheckSalary * 100) : 0;
    }

    // Update UI elements
    currentContribution.textContent = `${Math.round(percentDisplay * 100) / 100}%`;
    if (currentContributionFixed) currentContributionFixed.textContent = formatCurrency(fixedPerPaycheckDisplay);

    // Update projection field with smart conversion based on projection type
    let projectionValue = currentContributionData.contributionAmount;
    if (projectionContributionType === 'percentage' && currentContributionData.contributionType === 'fixed') {
        // Need to convert fixed dollar to percentage for projection field
        const salary = salaryInput ? parseFloat(salaryInput.value) : currentContributionData.annualSalary;
        const perPaycheckSalary = salary / 26;
        projectionValue = perPaycheckSalary > 0 ? Math.round((projectionValue / perPaycheckSalary * 100) * 100) / 100 : 0;
    } else if (projectionContributionType === 'fixed' && currentContributionData.contributionType === 'percentage') {
        // Need to convert percentage to fixed dollar for projection field
        const salary = salaryInput ? parseFloat(salaryInput.value) : currentContributionData.annualSalary;
        const perPaycheckSalary = salary / 26;
        projectionValue = Math.round((perPaycheckSalary * projectionValue / 100) * 100) / 100;
    }
    projectionContribution.value = projectionValue;
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
    if (ageInput) ageInput.addEventListener('input', () => {});
    if (salaryInput) salaryInput.addEventListener('input', () => {
        // Recalculate slider max when salary changes
        if (currentContributionData.contributionType === 'percentage') {
            const salary = parseFloat(salaryInput.value) || 0;
            const maxPercentage = salary > 0 ? Math.min(100, (ANNUAL_CONTRIBUTION_LIMIT / salary) * 100) : 100;
            contributionSlider.max = maxPercentage.toFixed(2);
            // Adjust current value if it exceeds new max
            if (parseFloat(contributionSlider.value) > maxPercentage) {
                contributionSlider.value = maxPercentage.toFixed(2);
                updateSliderDisplay();
            }
        }
        updatePerPaycheckAmount();
    });
    if (balanceInput) balanceInput.addEventListener('input', () => {});
    if (retirementAgeInput) retirementAgeInput.addEventListener('input', () => {});
    if (salaryIncreaseInput) salaryIncreaseInput.addEventListener('input', () => {});
    if (expectedReturnInput) expectedReturnInput.addEventListener('input', () => {});
    if (inflationInput) inflationInput.addEventListener('input', () => {});
    saveButton.addEventListener('click', saveContributionRate);
    calculateButton.addEventListener('click', calculateRetirementImpact);
}

// Select contribution type
function selectContributionType(type) {
    const currentType = currentContributionData.contributionType;
    // Read from actual form fields instead of stored data
    const currentAmount = currentType === 'percentage' 
        ? parseFloat(contributionSlider.value) || 0
        : parseFloat(contributionTextInput.value) || 0;
    const salary = parseFloat(salaryInput ? salaryInput.value : currentContributionData.annualSalary) || currentContributionData.annualSalary || 0;
    const perPaycheckSalary = salary / 26;
    
    let newAmount = currentAmount;
    
    // Convert between percentage and fixed dollar (using per-paycheck amounts)
    if (currentType === 'percentage' && type === 'fixed') {
        // Convert from percentage to fixed dollar per paycheck
        // Per-paycheck contribution = (per-paycheck salary) * (percentage / 100)
        newAmount = Math.round((perPaycheckSalary * currentAmount / 100) * 100) / 100;
        // Enforce per-paycheck limit
        newAmount = Math.min(newAmount, PER_PAYCHECK_LIMIT);
    } else if (currentType === 'fixed' && type === 'percentage') {
        // Convert from fixed dollar per paycheck to percentage
        // Percentage = (fixed per-paycheck / per-paycheck salary) * 100
        newAmount = perPaycheckSalary > 0 ? Math.round((currentAmount / perPaycheckSalary * 100) * 100) / 100 : 0;
        // Enforce max percentage based on annual limit
        const maxPercentage = salary > 0 ? Math.min(100, (ANNUAL_CONTRIBUTION_LIMIT / salary) * 100) : 100;
        newAmount = Math.min(newAmount, maxPercentage);
    }
    
    currentContributionData.contributionType = type;
    currentContributionData.contributionAmount = newAmount;
    updateUI();
    updatePerPaycheckAmount();
}

// Select projection type
function selectProjectionType(type) {
    const currentType = projectionContributionType;
    const currentAmount = parseFloat(projectionContribution.value) || 0;
    const salary = parseFloat(salaryInput ? salaryInput.value : currentContributionData.annualSalary) || currentContributionData.annualSalary || 0;
    const perPaycheckSalary = salary / 26;
    
    let newAmount = currentAmount;
    
    // Convert between percentage and fixed dollar (using per-paycheck amounts)
    if (currentType === 'percentage' && type === 'fixed') {
        // Convert from percentage to fixed dollar per paycheck
        newAmount = Math.round((perPaycheckSalary * currentAmount / 100) * 100) / 100;
        // Enforce per-paycheck limit
        newAmount = Math.min(newAmount, PER_PAYCHECK_LIMIT);
    } else if (currentType === 'fixed' && type === 'percentage') {
        // Convert from fixed dollar per paycheck to percentage
        newAmount = perPaycheckSalary > 0 ? Math.round((currentAmount / perPaycheckSalary * 100) * 100) / 100 : 0;
        // Enforce max percentage based on annual limit
        const maxPercentage = salary > 0 ? Math.min(100, (ANNUAL_CONTRIBUTION_LIMIT / salary) * 100) : 100;
        newAmount = Math.min(newAmount, maxPercentage);
    }
    
    projectionContributionType = type;
    projectionContribution.value = newAmount;
    
    // Update button states
    if (type === 'percentage') {
        projectionTypePercentage.classList.add('active');
        projectionTypeFixed.classList.remove('active');
        projectionUnit.textContent = '%';
        projectionPrefix.textContent = '%';
        // Set max based on salary and annual limit
        const maxPercentage = salary > 0 ? Math.min(100, (ANNUAL_CONTRIBUTION_LIMIT / salary) * 100) : 100;
        projectionContribution.max = maxPercentage.toFixed(2);
    } else {
        projectionTypeFixed.classList.add('active');
        projectionTypePercentage.classList.remove('active');
        projectionUnit.textContent = '$';
        projectionPrefix.textContent = '$';
        projectionContribution.max = PER_PAYCHECK_LIMIT.toFixed(2);
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
    let amount = 0;
    if (currentContributionData.contributionType === 'percentage') {
        amount = parseFloat(contributionSlider.value) || 0;
    } else {
        amount = parseFloat(contributionTextInput.value) || 0;
    }

    const salaryVal = parseFloat(salaryInput ? salaryInput.value : currentContributionData.annualSalary) || currentContributionData.annualSalary || currentContributionData.salary || 0;

    let perPaycheck = 0;
    if (currentContributionData.contributionType === 'percentage') {
        const perPaycheckSalary = salaryVal / 26;
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
        
        // Validate contribution limits
        if (type === 'fixed' && amount > PER_PAYCHECK_LIMIT) {
            showMessage(`Per-paycheck contribution cannot exceed $${PER_PAYCHECK_LIMIT.toFixed(2)} (annual limit of $${ANNUAL_CONTRIBUTION_LIMIT})`, 'error');
            return;
        }
        
        if (type === 'percentage') {
            const salary = salaryInput ? parseFloat(salaryInput.value) : currentContributionData.annualSalary;
            const annualContribution = (salary * amount) / 100;
            if (annualContribution > ANNUAL_CONTRIBUTION_LIMIT) {
                const maxPercentage = (ANNUAL_CONTRIBUTION_LIMIT / salary) * 100;
                showMessage(`Contribution percentage cannot exceed ${maxPercentage.toFixed(2)}% (annual limit of $${ANNUAL_CONTRIBUTION_LIMIT})`, 'error');
                return;
            }
        }

        const response = await fetch('/api/contributions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contributionType: type,
                contributionAmount: amount,
                age: ageInput ? parseInt(ageInput.value) : undefined,
                annualSalary: salaryInput ? parseFloat(salaryInput.value) : undefined,
                currentBalance: balanceInput ? parseFloat(balanceInput.value) : undefined,
                retirementAge: retirementAgeInput ? parseInt(retirementAgeInput.value) : undefined,
                salaryIncrease: salaryIncreaseInput ? parseFloat(salaryIncreaseInput.value) : undefined,
                annualReturn: expectedReturnInput ? (parseFloat(expectedReturnInput.value) / 100) : undefined,
                inflationRate: inflationInput ? parseFloat(inflationInput.value) : undefined
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
            showMessage('Please enter a valid projection amount', 'error', true);
            return;
        }
        
        // Validate projection contribution limits
        if (projectionContributionType === 'fixed' && projectionAmount > PER_PAYCHECK_LIMIT) {
            showMessage(`Per-paycheck contribution cannot exceed $${PER_PAYCHECK_LIMIT.toFixed(2)} (annual limit of $${ANNUAL_CONTRIBUTION_LIMIT})`, 'error', true);
            return;
        }
        
        if (projectionContributionType === 'percentage') {
            const salary = salaryInput ? parseFloat(salaryInput.value) : currentContributionData.annualSalary;
            const annualContribution = (salary * projectionAmount) / 100;
            if (annualContribution > ANNUAL_CONTRIBUTION_LIMIT) {
                const maxPercentage = (ANNUAL_CONTRIBUTION_LIMIT / salary) * 100;
                showMessage(`Projection percentage cannot exceed ${maxPercentage.toFixed(2)}% (annual limit of $${ANNUAL_CONTRIBUTION_LIMIT})`, 'error', true);
                return;
            }
        }
        
        // Clear any previous error messages in calculator section
        const calculatorMessage = document.getElementById('calculatorMessage');
        if (calculatorMessage) {
            calculatorMessage.textContent = '';
            calculatorMessage.className = 'message';
        }

        const response = await fetch('/api/calculate-retirement-impact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                futureContributionRate: projectionAmount,
                futureContributionType: projectionContributionType,
                age: ageInput ? parseInt(ageInput.value) : undefined,
                annualSalary: salaryInput ? parseFloat(salaryInput.value) : undefined,
                currentBalance: balanceInput ? parseFloat(balanceInput.value) : undefined,
                retirementAge: retirementAgeInput ? parseInt(retirementAgeInput.value) : undefined,
                salaryIncrease: salaryIncreaseInput ? parseFloat(salaryIncreaseInput.value) : undefined,
                annualReturn: expectedReturnInput ? (parseFloat(expectedReturnInput.value) / 100) : undefined,
                inflationRate: inflationInput ? parseFloat(inflationInput.value) : undefined
            })
        });

        if (!response.ok) {
            throw new Error('Failed to calculate retirement impact');
        }

        const result = await response.json();
        displayRetirementImpact(result, projectionAmount, projectionContributionType);
    } catch (error) {
        console.error('Error calculating:', error);
        showMessage('Error calculating retirement impact. Please try again.', 'error', true);
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

    // Show yearly projections area
    const projectionChartWrap = document.getElementById('projectionChartWrap');
    if (projectionChartWrap) projectionChartWrap.classList.remove('hidden');

    // Build yearly projections and render chart
    const initialBalance = balanceInput ? parseFloat(balanceInput.value) || 0 : (currentContributionData.currentBalance || 0);
    const salaryVal = salaryInput ? parseFloat(salaryInput.value) || currentContributionData.annualSalary : currentContributionData.annualSalary;
    const useSalaryIncrease = salaryIncreaseInput ? (parseFloat(salaryIncreaseInput.value) || 0) / 100 : (currentContributionData.salaryIncrease ? currentContributionData.salaryIncrease / 100 : 0);
    const useReturn = expectedReturnInput ? (parseFloat(expectedReturnInput.value) || (currentContributionData.annualReturn * 100)) / 100 : (currentContributionData.annualReturn || 0.07);
    const useRetirementAge = retirementAgeInput ? parseInt(retirementAgeInput.value) || currentContributionData.retirementAge : currentContributionData.retirementAge;
    const useAge = ageInput ? parseInt(ageInput.value) || currentContributionData.age : currentContributionData.age;
    const years = Math.max(1, useRetirementAge - useAge + 1); // +1 to include the retirement year

    const currentProj = computeYearlyProjection(
        initialBalance,
        salaryVal,
        currentContributionData.contributionType,
        currentContributionData.contributionAmount,
        useReturn,
        years,
        useSalaryIncrease
    );

    const futureProj = computeYearlyProjection(
        initialBalance,
        salaryVal,
        projectionType,
        projectionAmount,
        useReturn,
        years,
        useSalaryIncrease
    );

    renderProjectionChart('projectionChart', currentProj, futureProj);
}

// Compute yearly projection breakdown
function computeYearlyProjection(initialBalance, annualSalary, contributionType, contributionAmount, annualReturn, years, salaryIncrease) {
    const rows = [];
    let balance = initialBalance || 0;
    let salary = annualSalary || 0;

    // Match backend: use fixed annual contribution for all years
    let annualContribution = 0;
    if (contributionType === 'percentage') {
        annualContribution = (annualSalary) * (contributionAmount / 100);
    } else {
        annualContribution = (parseFloat(contributionAmount) || 0) * 26;
    }
    for (let y = 1; y <= years; y++) {
        const preReturn = balance + annualContribution;
        const returnsThisYear = preReturn * (annualReturn || 0);
        const endValue = preReturn + returnsThisYear;

        rows.push({
            year: y,
            salary: annualSalary,
            startValue: balance,
            contribution: annualContribution,
            returns: returnsThisYear,
            endValue: endValue,
            cumulativeContribution: (rows.length > 0 ? rows[rows.length - 1].cumulativeContribution : 0) + annualContribution,
            cumulativeReturns: (rows.length > 0 ? rows[rows.length - 1].cumulativeReturns : 0) + returnsThisYear
        });

        // prepare next year
        balance = endValue;
        // salary stays constant to match backend
    }

    return rows;
}

// Render SVG stacked bar chart comparing two projections
function renderProjectionChart(svgId, currentRows, futureRows) {
    const svg = document.getElementById(svgId);
    if (!svg) return;

    // Clear
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    const wrap = document.getElementById('projectionChartWrap');
    const tooltip = document.getElementById('chartTooltip');

    const width = svg.clientWidth || svg.getBoundingClientRect().width || 800;
    const height = 320;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const years = currentRows.length;
    const padding = 40;
    const chartW = width - padding * 2;
    const chartH = height - padding * 2;

    // find max cumulative total (contributions-to-date + returns-to-date) so bars compare totals
    const maxTotal = Math.max(
        ...currentRows.map(r => (r.cumulativeContribution || 0) + (r.cumulativeReturns || 0)),
        ...futureRows.map(r => (r.cumulativeContribution || 0) + (r.cumulativeReturns || 0))
    ) || 1;
    // add small headroom so the largest bar isn't flush with the top
    const yMax = maxTotal * 1.08;

    // Calculate spacing: allocate gap space between year groups
    const betweenGroupSpacing = 24; // Space between year groups
    const totalSpacing = betweenGroupSpacing * (years - 1);
    const availableForBars = chartW - totalSpacing;
    const barGroupWidth = availableForBars / years; // Width allocated per year group for the bars
    const withinGroupSpacing = 1; // Small space between current and projected bars
    const singleBarWidth = Math.max(6, (barGroupWidth - withinGroupSpacing) / 2);

    // draw baseline and year labels
    for (let i = 0; i < years; i++) {
        // Calculate position accounting for gaps between groups
        let xOffset = 0;
        for (let j = 0; j < i; j++) {
            xOffset += barGroupWidth + betweenGroupSpacing;
        }
        const gX = padding + xOffset;
        const groupCenter = gX + barGroupWidth / 2;
        const pairWidth = singleBarWidth * 2 + withinGroupSpacing;
        const cx = groupCenter - pairWidth / 2; // current bar on the left
        const fx = cx + singleBarWidth + withinGroupSpacing; // projected bar on the right

        const cur = currentRows[i];
        const fut = futureRows[i];
        const startAge = (ageInput && parseInt(ageInput.value)) || (currentContributionData && currentContributionData.age) || 0;
        const labelAge = startAge + (cur.year - 1);

        // map cumulative contribution and cumulative returns (to-date) to pixel heights using yMax
        const curContributionH = ((cur.cumulativeContribution || 0) / yMax) * chartH;
        const curReturnH = ((cur.cumulativeReturns || 0) / yMax) * chartH;
        const futContributionH = ((fut.cumulativeContribution || 0) / yMax) * chartH;
        const futReturnH = ((fut.cumulativeReturns || 0) / yMax) * chartH;

        // helper to create rect
        function rect(x, y, w, h, fill, data) {
            const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            r.setAttribute('x', x);
            r.setAttribute('y', y);
            r.setAttribute('width', w);
            r.setAttribute('height', h);
            r.setAttribute('fill', fill);
            r.style.transition = 'opacity 0.15s';
            if (data) {
                r.dataset.info = JSON.stringify(data);
                r.addEventListener('mousemove', onRectHover);
                r.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
            }
            svg.appendChild(r);
            return r;
        }

        // current bars: draw contribution at bottom, returns above it
        const curContribY = padding + chartH - curContributionH;
        const curReturnY = curContribY - curReturnH;
        rect(cx, curReturnY, singleBarWidth, Math.max(0.5, curReturnH), '#85b9ff', { type: 'current', year: cur.year, age: labelAge, total: cur.endValue, cumulativeContribution: cur.cumulativeContribution, cumulativeReturns: cur.cumulativeReturns });
        rect(cx, curContribY, singleBarWidth, Math.max(0.5, curContributionH), '#4f8ef7', { type: 'current', year: cur.year, age: labelAge, total: cur.endValue, cumulativeContribution: cur.cumulativeContribution, cumulativeReturns: cur.cumulativeReturns });

        // projected bars: draw contribution at bottom, returns above it
        const futContribY = padding + chartH - futContributionH;
        const futReturnY = futContribY - futReturnH;
        rect(fx, futReturnY, singleBarWidth, Math.max(0.5, futReturnH), '#8fe3a1', { type: 'future', year: fut.year, age: labelAge, total: fut.endValue, cumulativeContribution: fut.cumulativeContribution, cumulativeReturns: fut.cumulativeReturns });
        rect(fx, futContribY, singleBarWidth, Math.max(0.5, futContributionH), '#28a745', { type: 'future', year: fut.year, age: labelAge, total: fut.endValue, cumulativeContribution: fut.cumulativeContribution, cumulativeReturns: fut.cumulativeReturns });

        // year label -> use actual ages instead of +1, +2...
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', gX + barGroupWidth / 2);
        txt.setAttribute('y', padding + chartH + 16);
        txt.setAttribute('text-anchor', 'middle');
        txt.setAttribute('fill', '#666');
        txt.setAttribute('font-size', '10');
        txt.textContent = `${labelAge}`;
        svg.appendChild(txt);
    }

    // legend
    let legend = document.getElementById('chartLegend');
    // Get contribution rate labels
    const currentType = currentContributionData?.contributionType;
    const currentAmount = currentContributionData?.contributionAmount;
    const currentLabel = currentType === 'percentage' ? `${currentAmount}%` : `$${currentAmount}`;

    // Try to get projected rate from UI
    let projectedType = projectionContributionType;
    let projectedAmount = document.getElementById('projectionContribution')?.value;
    let projectedLabel = '';
    if (projectedType === 'percentage') {
        projectedLabel = `${projectedAmount}%`;
    } else {
        projectedLabel = `$${projectedAmount}`;
    }

    if (!legend) {
        legend = document.createElement('div');
        legend.id = 'chartLegend';
        legend.className = 'chart-legend';
        legend.innerHTML = `
            <div class="legend-item"><div class="legend-color" style="background:#4f8ef7"></div><div>Current Contributions To Date (${currentLabel})</div></div>
            <div class="legend-item"><div class="legend-color" style="background:#85b9ff"></div><div>Current Returns To Date (${currentLabel})</div></div>
            <div class="legend-item"><div class="legend-color" style="background:#28a745"></div><div>Projected Contributions To Date (${projectedLabel})</div></div>
            <div class="legend-item"><div class="legend-color" style="background:#8fe3a1"></div><div>Projected Returns To Date (${projectedLabel})</div></div>
        `;
        wrap.appendChild(legend);
    } else {
        legend.innerHTML = `
            <div class="legend-item"><div class="legend-color" style="background:#4f8ef7"></div><div>Current Contributions To Date (${currentLabel})</div></div>
            <div class="legend-item"><div class="legend-color" style="background:#85b9ff"></div><div>Current Returns To Date (${currentLabel})</div></div>
            <div class="legend-item"><div class="legend-color" style="background:#28a745"></div><div>Projected Contributions To Date (${projectedLabel})</div></div>
            <div class="legend-item"><div class="legend-color" style="background:#8fe3a1"></div><div>Projected Returns To Date (${projectedLabel})</div></div>
        `;
    }

    function onRectHover(e) {
        const d = JSON.parse(e.currentTarget.dataset.info || '{}');
        if (!d) return;
        tooltip.style.display = 'block';
        const ageLabel = d.age !== undefined ? `Age ${d.age}` : `Year ${d.year}`;
        const contrib = (d.cumulativeContribution !== undefined) ? d.cumulativeContribution : d.contribution;
        const ret = (d.cumulativeReturns !== undefined) ? d.cumulativeReturns : d.returns;
        tooltip.innerHTML = `<strong>${ageLabel}</strong><br>Total: ${formatCurrency(d.total)}<br>Contributions to date: ${formatCurrency(contrib)}<br>Returns to date: ${formatCurrency(ret)}`;
        // position
        const rect = wrap.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }
}

// Show message
function showMessage(text, type, showInCalculator = false) {
    saveMessage.textContent = text;
    saveMessage.className = `message ${type}`;
    
    // Also show in calculator section if requested
    const calculatorMessage = document.getElementById('calculatorMessage');
    if (showInCalculator && calculatorMessage) {
        calculatorMessage.textContent = text;
        calculatorMessage.className = `message ${type}`;
    }

    // Auto-hide success messages after 4 seconds
    if (type === 'success') {
        setTimeout(() => {
            saveMessage.textContent = '';
            saveMessage.className = 'message';
            if (calculatorMessage) {
                calculatorMessage.textContent = '';
                calculatorMessage.className = 'message';
            }
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
