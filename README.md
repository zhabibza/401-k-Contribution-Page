# 401(k) Contribution Page

A web application for managing 401(k) contributions with real-time calculations and a Node.js/Express backend.

## Features

- Set contribution type (percentage or fixed dollar amount)
- Adjust contribution rate with slider or text input
- View Year-to-Date contributions and key statistics
- Compare retirement impact across different contribution types
- Data persistence across sessions

## Tech Stack

- Frontend: HTML5, CSS3, JavaScript
- Backend: Node.js, Express.js
- Storage: JSON file (no external DB required)

## Quick Start

### Prerequisites

- Node.js v14+ ([Download](https://nodejs.org/))
- npm (comes with Node.js)

### Installation

```bash
cd /workspaces/401-k-Contribution-Page
npm install
npm start
```

Open `http://localhost:3000` in your browser.

**Default mock data:**
- Salary: $80,000
- Age: 30
- Retirement Age: 65
- Initial Contribution: 6%

## API Endpoints

**GET `/api/contributions`** - Get current contribution settings

**POST `/api/contributions`** - Update contribution settings
```json
{ "contributionType": "percentage", "contributionAmount": 8 }
```

**POST `/api/calculate-retirement-impact`** - Calculate retirement value with new contribution
```json
{ 
  "futureContributionRate": 10,
  "futureContributionType": "percentage"
}
```

## Customization

Edit `server.js` to modify user data:
- `contributionType`: 'percentage' or 'fixed'
- `contributionAmount`: Default amount
- `annualSalary`: Base salary
- `age` / `retirementAge`: For calculations
- `annualReturn`: Investment return assumption (default 0.07 = 7%)

Change port by editing `const PORT = 3000` in `server.js`.

## Data Storage

User settings are saved to `data.json`. To reset, delete the file and restart the server.
