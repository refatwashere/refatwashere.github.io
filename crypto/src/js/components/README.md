# Components Folder

This folder is for modular JavaScript components.

## Purpose
Break down the main app.js into reusable components:
- **CryptoCard.js**: Individual crypto card component
- **Chart.js**: Chart management component
- **TradeForm.js**: Trade journal form component
- **AlertManager.js**: Price alert component

## Example
```javascript
// CryptoCard.js
export class CryptoCard {
  constructor(symbol, data) {
    this.symbol = symbol;
    this.data = data;
  }
  
  render() {
    // Return DOM element
  }
}
```
