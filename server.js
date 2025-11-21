import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Mock database to store user contributions (in-memory)
let userContributions = {
  userId: 'user123',
  contributionType: 'percentage', // 'fixed' or 'percentage'
  contributionAmount: 6, // 6% or $300
  ytdContributions: 4800,
  salary: 80000,
  annualSalary: 80000,
  paychecksProcessed: 20,
  age: 30,
  retirementAge: 65,
  annualReturn: 0.07 // 7% average annual return
};

// Load persisted data if it exists
const dataFile = path.join(__dirname, 'data.json');
if (fs.existsSync(dataFile)) {
  try {
    userContributions = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch (err) {
    console.log('Could not load data.json, using defaults');
  }
}

// Helper function to save data
function saveData() {
  fs.writeFileSync(dataFile, JSON.stringify(userContributions, null, 2));
}

// API Endpoints

// Get current contribution settings
app.get('/api/contributions', (req, res) => {
  res.json(userContributions);
});

// Update contribution settings
app.post('/api/contributions', (req, res) => {
  const {
    contributionType,
    contributionAmount,
    age,
    annualSalary,
    currentBalance,
    retirementAge,
    salaryIncrease,
    annualReturn,
    inflationRate,
    paychecksProcessed
  } = req.body;

  // Basic validation for contribution fields
  if (!contributionType || contributionAmount === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!['fixed', 'percentage'].includes(contributionType)) {
    return res.status(400).json({ error: 'Invalid contribution type' });
  }

  // Update provided fields only
  userContributions.contributionType = contributionType;
  userContributions.contributionAmount = contributionAmount;

  if (age !== undefined) userContributions.age = age;
  if (annualSalary !== undefined) userContributions.annualSalary = annualSalary;
  if (currentBalance !== undefined) userContributions.currentBalance = currentBalance;
  if (retirementAge !== undefined) userContributions.retirementAge = retirementAge;
  if (salaryIncrease !== undefined) userContributions.salaryIncrease = salaryIncrease;
  if (annualReturn !== undefined) userContributions.annualReturn = annualReturn;
  if (inflationRate !== undefined) userContributions.inflationRate = inflationRate;
  if (paychecksProcessed !== undefined) userContributions.paychecksProcessed = paychecksProcessed;

  // Recalculate YTD contributions based on new rate and possibly updated salary/paychecks
  const perPaycheckAmount =
    contributionType === 'percentage'
      ? (userContributions.annualSalary / 26) * (contributionAmount / 100)
      : contributionAmount;

  userContributions.ytdContributions = perPaycheckAmount * (userContributions.paychecksProcessed || 0);

  saveData();

  res.json({
    success: true,
    message: 'Contribution settings updated',
    data: userContributions
  });
});

// Calculate retirement impact
app.post('/api/calculate-retirement-impact', (req, res) => {
  const {
    futureContributionRate,
    futureContributionType,
    age,
    annualSalary,
    currentBalance,
    retirementAge,
    salaryIncrease,
    annualReturn,
    inflationRate
  } = req.body;

  if (futureContributionRate === undefined) {
    return res.status(400).json({ error: 'futureContributionRate is required' });
  }

  // Use provided type or fallback to current type
  const projectionType = futureContributionType || userContributions.contributionType;

  // Use overrides from request or fall back to stored values
  const currentAge = age !== undefined ? age : userContributions.age;
  const useRetirementAge = retirementAge !== undefined ? retirementAge : userContributions.retirementAge;
  const yearsToRetirement = useRetirementAge - currentAge;
  const useAnnualReturn = annualReturn !== undefined ? annualReturn : userContributions.annualReturn;
  const useAnnualSalary = annualSalary !== undefined ? annualSalary : userContributions.annualSalary;
  const initialBalance = currentBalance !== undefined ? currentBalance : (userContributions.currentBalance || 0);

  // Calculate current trajectory
  const currentPerPaycheckAmount =
    userContributions.contributionType === 'percentage'
      ? (useAnnualSalary / 26) * (userContributions.contributionAmount / 100)
      : userContributions.contributionAmount;
  const currentAnnualContribution = currentPerPaycheckAmount * 26;
  const currentRetirementValue = calculateFutureValue(
    currentAnnualContribution,
    useAnnualReturn,
    yearsToRetirement,
    initialBalance
  );

  // Calculate future trajectory with new rate (use projection type)
  const futurePerPaycheckAmount =
    projectionType === 'percentage'
      ? (useAnnualSalary / 26) * (futureContributionRate / 100)
      : futureContributionRate;
  const futureAnnualContribution = futurePerPaycheckAmount * 26;
  const futureRetirementValue = calculateFutureValue(
    futureAnnualContribution,
    useAnnualReturn,
    yearsToRetirement,
    initialBalance
  );

  const additionalSavings = futureRetirementValue - currentRetirementValue;

  res.json({
    currentRetirementValue: Math.round(currentRetirementValue),
    futureRetirementValue: Math.round(futureRetirementValue),
    additionalSavings: Math.round(additionalSavings),
    yearsToRetirement: yearsToRetirement
  });
});

// Helper function to calculate future value with compound interest
function calculateFutureValue(annualContribution, annualReturn, years, initialBalance = 0) {
  let value = initialBalance;
  for (let i = 0; i < years; i++) {
    value = (value + annualContribution) * (1 + annualReturn);
  }
  return value;
}

// Serve the main HTML file for any other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`401(k) Contribution Page server running on http://localhost:${PORT}`);
});
