# Frontend Regression Checklist (Phase 6)

## Overview

This document provides comprehensive regression testing guidelines for the PancakeSwap UI rebrand. It covers visual validation, interactivity, responsiveness, accessibility, and backward compatibility across browsers and devices.

**Scope:** crypto/crypto.html, crypto/src/css/main.css, crypto/src/js/core/app.js, and frontend integration with planner advisory.

**Execution:** Can be performed manually using browser DevTools or automated using Puppeteer/Playwright/Cypress.

**Success Criteria:** All existing trading flows remain functional, new planner UI renders correctly at all breakpoints, no visual regressions, accessibility passes WCAG 2.1 Level AA.

---

## Section 1: Visual Regression Tests

### 1.1 CSS Color System Validation

**Test: Primary Accent Color Applied**
- Navigate to `crypto/crypto.html`
- Open browser DevTools → Elements
- Inspect any primary button (e.g., "Generate Advisory", "Open PancakeSwap")
- Verify computed background color is `#00d4ff` (cyan) or gradient containing cyan
- Check across: Chrome, Firefox, Safari (macOS), Chrome Mobile
- **Expected:** Consistent cyan gradient applied without fallback colors

**Test: Confidence Badge Color Coding**
- Enable planner in Trading tab
- Click "Generate Advisory"
- Inspect planner panel → `.planner-confidence-badge` element
- When confidence >= 0.7: background should be green (`#00ff88`)
- When confidence 0.5-0.7: background should be amber (`#ffaa00`)
- When confidence < 0.5: background should be red (`#ff3366`)
- **Expected:** Badge color matches confidence threshold exactly

**Test: Risk Chip Color Applied**
- Generate advisory with risk flags present
- Inspect `.planner-risk-chip` elements
- Verify background color is `#ff3366` (danger) with contrasting text
- Verify border and shadow properties applied
- **Expected:** All risk chips display with consistent styling

**Test: Button Hover/Focus States**
- Focus planner action button using Tab key
- Verify `:focus-visible` outline appears (2px solid cyan)
- Hover button with mouse
- Verify background color change or opacity adjustment occurs
- **Expected:** Clear focus indicator and hover feedback visible

### 1.2 Typography Validation

**Test: Display Font Applied**
- Navigate to crypto/crypto.html
- Inspect `.trading-header` or major panel titles
- Verify computed `font-family` includes Trebuchet MS or Lucida Grande (not fallback)
- Check font rendering in DevTools → Computed Styles
- **Expected:** Non-default display font applied across headers

**Test: Body Font Stack**
- Inspect form labels, descriptive text
- Verify `font-family` includes Segoe UI, Roboto, or Oxygen (not generic serif/sans-serif)
- **Expected:** Professional body font stack applied

**Test: Monospace Font in Code Areas**
- Inspect any generated code/token fields in advisory
- Verify `font-family` matches monospace stack (Courier New or similar)
- **Expected:** Code text displays in monospace font

### 1.3 Responsive Layout Tests

**Test: 360px Mobile Layout**
- Open DevTools → Device Toolbar
- Set viewport to 360x667 (iPhone SE/8)
- Verify crypto/crypto.html loads without horizontal scroll
- Check planner panel stacking (should stack vertically, not side-by-side)
- Verify form inputs are touch-friendly (min height 44px)
- Inspect `.trading-grid` layout (should be single column on 360px)
- **Expected:** No horizontal scroll, vertical stacking, readable text (min 16px base)

**Test: 768px Tablet Layout**
- Set viewport to 768x1024 (iPad portrait)
- Verify `.trading-grid` switches to 2-column layout
- Check planner panel width (should be responsive, not fixed)
- Verify buttons/inputs retain touch-friendly sizing
- Check chart height and responsiveness
- **Expected:** Appropriate columnar layout, no overflow

**Test: 1024px Desktop Layout**
- Set viewport to 1024x768 (desktop minimum)
- Verify `.trading-grid` displays 3+ columns
- Check planner panel alignment with main trading form
- Verify sidebar/panels don't overlap main content
- **Expected:** Full-width desktop layout, no content overflow

**Test: 1440px+ Wide Desktop Layout**
- Set viewport to 1440x900 (modern wide screen)
- Verify content remains readable (not stretched)
- Check max-width constraints applied
- Verify spacing/margins appropriate for wide layout
- **Expected:** Proper content centering and spacing at wide widths

### 1.4 Planner UI Component Rendering

**Test: Planner Panel Visibility**
- Enable planner in settings
- Click "Generate Advisory"
- Verify planner panel appears after form (DOM id="plannerOutput")
- Check background color/borders visible
- Verify panel doesn't cover form fields
- **Expected:** Panel visible, positioned correctly, not obstructing form

**Test: Confidence Badge Presence**
- Generate advisories multiple times
- Verify `.planner-confidence-badge` element present with:
  - Numerical confidence percentage (e.g., "78%")
  - Color matching threshold
  - Font size readable (not too small on mobile)
- **Expected:** Badge visible and styled on all generations

**Test: Risk Chips Layout**
- Generate advisory with multiple risk flags
- Inspect `.planner-risk-chip` elements
- Verify chips wrap properly on narrow screens (not overflow)
- Check spacing between chips (margin applied)
- Verify text inside chips is readable
- **Expected:** Chips display inline with text wrapping, proper spacing

**Test: Execution Steps Display**
- Generate advisory
- Locate execution plan steps (should be in `<details>` or similar expandable element)
- Click to expand/collapse
- Verify step numbers visible (1, 2, 3, etc.)
- Check step descriptions render without mojibake
- **Expected:** Steps expand/collapse properly, text readable

**Test: Action Buttons (Open PancakeSwap / Open Binance)**
- Generate advisory
- Verify "Open PancakeSwap" or "Open Binance" button present
- Check button styling (primary or secondary style, clear label)
- Click button (intercept URL if possible)
- Verify deep-link URL contains correct parameters (symbol, side, amount)
- **Expected:** Button renders, URL format correct

**Test: Advisory Source Label**
- Generate advisory with provider=local
- Verify text "Local Heuristic" or "Local Planner" displayed in meta
- Generate advisory with provider=sidecar (if available)
- Verify text "Sidecar AI" or equivalent displayed
- Check label styling (subtle but visible)
- **Expected:** Source label displayed accurately

### 1.5 Existing UI Backward Compatibility

**Test: Trading Form Still Visible**
- Navigate to Trading tab
- Verify all existing form fields present:
  - Symbol dropdown
  - Side (BUY/SELL) selector
  - Order Type (MARKET/LIMIT) selector
  - Quantity input
  - Price input (for LIMIT orders)
- Check form layout unchanged from baseline
- **Expected:** All form fields present and functional

**Test: Chart Display Unchanged**
- Verify Chart.js chart renders (id="priceChart")
- Check RSI indicator visible (id="rsiChart")
- Verify price/RSI data updates on refresh
- Check chart responsiveness at different viewport sizes
- **Expected:** Charts render and update correctly

**Test: Settings Modal Accessible**
- Click settings icon/button
- Verify modal opens without errors
- Check existing settings options (theme, currency, etc.)
- Verify new planner settings present (enable, venue, provider, chainId inputs)
- Verify modal closes properly
- **Expected:** Modal accessible, all settings functional

**Test: Tab Navigation**
- Verify all existing tabs present (Market, Trading, Account, etc.)
- Click each tab
- Verify content switches correctly
- Check tab styling consistent with rebrand
- **Expected:** All tabs functional, styling updated

---

## Section 2: Interactivity & Functionality Tests

### 2.1 Planner Workflows

**Test: Planner Enable/Disable Toggle**
- Navigate to settings
- Toggle planner_enabled checkbox
- Verify when disabled: planner panel hidden, form works normally
- Verify when enabled: planner panel visible, advisory generation works
- Refresh page and verify toggle state persists (localStorage)
- **Expected:** Toggle state saves and controls panel visibility

**Test: Venue Selection**
- Open settings or planner workspace
- Change venue from "binance" to "pancakeswap"
- Verify form updates to show DEX fields (chainId, tokenIn, tokenOut)
- Click "Generate Advisory"
- Verify backend receives venue=pancakeswap
- Check advisory response includes pancakeswap deep-link
- **Expected:** Venue selection triggers form field changes and advisory generation

**Test: Provider Selection**
- Open settings
- Set provider to "local"
- Generate advisory
- Check meta.provider in response is "local"
- Change provider to "sidecar"
- Generate advisory
- Check meta.provider is "sidecar" (or "local" if sidecar unavailable/timeout)
- **Expected:** Provider selection affects advisory source

**Test: DEX Fields Interaction (PancakeSwap)**
- Select venue=pancakeswap
- Verify form shows: chainId dropdown, tokenIn input, tokenOut input, slippageBps input, routeType selector
- Input sample values (chainId=56, tokenIn=BNB contract, tokenOut=BUSD contract)
- Click "Generate Advisory"
- Verify DEX fields included in request
- Check response includes deep-link with token parameters
- **Expected:** DEX fields accepted and processed correctly

### 2.2 Order Submission Flow

**Test: Order Submission Not Blocked by Planner**
- Enable planner advisory
- Generate advisory (should display in panel)
- Fill order form (symbol, side, type, quantity, etc.)
- Click "Place Order"
- Verify order submission continues despite planner panel presence
- Check backend receives order action without planner-related errors
- **Expected:** Planner advisory displays but order submits normally (advisory-only, non-blocking)

**Test: Order Submission Without Planner**
- Disable planner in settings
- Verify planner panel hidden
- Fill order form
- Click "Place Order"
- Verify order submission works (baseline functionality)
- **Expected:** Existing workflow unchanged

### 2.3 Deep-Link Functionality

**Test: PancakeSwap Deep-Link Format**
- Enable planner, select venue=pancakeswap
- Fill DEX fields and generate advisory
- Right-click "Open PancakeSwap" button → Copy Link
- Inspect URL format
- Verify URL contains: chainId parameter, inputCurrency, outputCurrency
- Verify URL points to PancakeSwap domain
- **Expected:** URL format matches PancakeSwap specification, valid parameters

**Test: Binance Deep-Link Format**
- Enable planner, keep venue=binance
- Generate advisory
- Right-click "Open Binance" button → Copy Link
- Inspect URL format
- Verify URL contains: symbol, side (BUY/SELL), quantity, price (if applicable)
- Verify URL points to Binance domain
- **Expected:** URL format matches Binance specification

**Test: Deep-Link Click Behavior**
- Click "Open PancakeSwap" button (if testing with sidecar, may need to allow pop-ups)
- Verify browser opens new tab/window (not same window)
- Check external link opens to correct exchange
- **Expected:** Deep-link opens correctly in new tab/window

---

## Section 3: Accessibility Tests

### 3.1 Keyboard Navigation

**Test: Tab Order Through Planner Controls**
- Enable planner in settings
- Navigate to Trading tab
- Press Tab key repeatedly through all controls
- Verify tab order is logical (left-to-right, top-to-bottom)
- Check none of the focus becomes trapped
- Verify planner panel controls reachable via Tab
- **Expected:** All interactive elements accessible via Tab, logical order

**Test: Enter Key Activation**
- Tab to "Generate Advisory" button
- Press Enter key
- Verify advisory generates (same as mouse click)
- Tab to "Open PancakeSwap" button
- Press Enter key
- Verify URL opens or link triggers correctly
- **Expected:** Enter key activates buttons correctly

**Test: Escape Key Dismissal**
- Generate advisory
- Press Escape key
- Verify planner panel dismisses or closes (if have close button)
- Verify form remains intact
- **Expected:** Escape key provides escape path from planner panel

**Test: Space Key Support**
- Tab to checkboxes (enable planner, enable chart, etc.)
- Press Space key
- Verify checkbox toggles state
- Tab to buttons
- Press Space key
- Verify button activates (same as Enter)
- **Expected:** Space key works for buttons/checkboxes

### 3.2 Screen Reader Compatibility

**Test: Confidence Badge Description**
- Enable screen reader (NVDA on Windows, JAWS, or Mac VoiceOver)
- Generate advisory
- Navigate to confidence badge element
- Verify screen reader announces:
  - "Confidence: 78 percent" or similar
  - Badge color context (optional but helpful: "green, high confidence")
- **Expected:** Confidence percentage and context announced

**Test: Risk Chip Announcements**
- Generate advisory with risk flags
- Navigate to risk chips
- Verify screen reader announces each chip:
  - "Risk flag: price impact high" or similar
  - Should announce all flags, not just first one
- **Expected:** Each risk chip announced independently

**Test: Action Button Labels**
- Navigate to "Open PancakeSwap" button
- Verify screen reader announces: "Open PancakeSwap, button"
- Check aria-label or aria-describedby provides context:
  - E.g., "Open PancakeSwap with pre-filled parameters" (optional but helpful)
- **Expected:** Button purpose clear from announced label

**Test: Form Labels Association**
- Navigate through form fields (symbol, side, quantity, etc.)
- Verify each input has associated label announced:
  - "Symbol" input, "Side" selector, "Quantity" input, etc.
- Check DEX fields also have labels:
  - "Token In", "Token Out", "Chain ID", "Slippage", etc.
- **Expected:** All form fields have clear label associations

**Test: Header Structure (H1, H2, H3)**
- Enable screen reader
- Navigate by headings (press H in NVDA)
- Verify page structure:
  - H1 or main title for Trading tab
  - H2 for "Planner Advisory" section
  - H3 for subsections (Execution Plan, Risk Assessment, etc.)
- **Expected:** Semantic heading structure present, logical hierarchy

**Test: Table/List Markup (if advisory shows structured data)**
- If advisory displays data as table/list
- Verify screen reader announces table headers/list structure
- Check each row/item has context
- **Expected:** Structured data announced with proper semantics

### 3.3 Color Contrast Validation

**Test: Cyan Primary Button Contrast**
- Use browser DevTools → Inspect element on primary button
- Check computed foreground and background colors
- Calculate WCAG contrast ratio (can use online calculators or DevTools built-in)
- Verify ratio >= 4.5:1 for normal text, >= 3:1 for large text
- **Expected:** Contrast ratio meets WCAG AA standard (4.5:1)

**Test: Green Confidence Badge (High) Contrast**
- On background color, check cyan text on green (#00ff88) background
- Verify contrast >= 4.5:1
- **Expected:** Green badge text readable

**Test: Amber Confidence Badge (Medium) Contrast**
- Check text on amber (#ffaa00) background
- Verify contrast >= 4.5:1
- **Expected:** Amber badge text readable

**Test: Red Confidence Badge (Low) & Risk Chip Contrast**
- Check text on red (#ff3366) background
- Verify contrast >= 4.5:1
- **Expected:** Red elements have sufficient contrast

**Test: Form Label to Background Contrast**
- Check label text color against background
- Verify contrast >= 4.5:1
- **Expected:** All text meets contrast requirements

### 3.4 Responsive Text & Focus Indicators

**Test: Font Size Scaling**
- At 360px viewport, verify base font size >= 16px (no zoom needed)
- Check form labels, descriptions readable
- Increase browser zoom to 200%
- Verify content remains usable (no overlap, reflow proper)
- **Expected:** Text readable at 100% and 200% zoom

**Test: Focus Visible Indicator**
- Navigate using Tab key
- Verify every interactive element shows focus indicator:
  - 2px solid outline in cyan (#00d4ff) as per CSS
  - Not just background color change (color-blind users must see change in border/outline)
- **Expected:** All focused elements have visible outline

**Test: Focus Not Lost**
- Navigate with Tab
- Verify focus never becomes visually hidden
- Check no scrolling required to see focused element (unless viewport constraint)
- **Expected:** Focus always visible on screen

---

## Section 4: Cross-Browser & Cross-Device Testing

### 4.1 Browser Compatibility

**Test: Chrome (Latest)**
- Open crypto/crypto.html in Chrome
- Enable planner, generate advisory
- Verify all styles, animations, colors render correctly
- Check DevTools console for errors (should be clean)
- **Expected:** No errors, all features functional

**Test: Firefox (Latest)**
- Open crypto/crypto.html in Firefox
- Enable planner, generate advisory
- Verify CSS gradients, colors, fonts render (may differ slightly from Chrome)
- Check DevTools console for errors
- Check CSS variable fallbacks are applied (if gradient not supported)
- **Expected:** No errors, acceptable visual appearance

**Test: Safari (macOS, Latest)**
- Open crypto/crypto.html in Safari (macOS)
- Enable planner, generate advisory
- Verify cyan gradient renders correctly
- Check font rendering (may be different from Chrome due to rendering engine)
- Check DevTools console for errors
- **Expected:** No errors, visual appearance acceptable

**Test: Edge (Latest)**
- Open crypto/crypto.html in Edge
- Enable planner, generate advisory
- Verify styles render (Edge uses same engine as Chrome)
- **Expected:** Same appearance as Chrome

**Test: Mobile Chrome (Android)**
- Open crypto/crypto.html on Android device/emulator
- Enable planner, generate advisory
- Verify responsive layout at 360px+
- Check touch interactions work (no hover issues)
- Verify buttons clickable (not too small)
- **Expected:** Mobile-friendly layout, touch-responsive

**Test: Mobile Safari (iOS)**
- Open crypto/crypto.html on iOS device/emulator
- Enable planner, generate advisory
- Verify responsive layout
- Check touch interactions
- Verify no iOS-specific issues (e.g., autocorrect, zoom)
- **Expected:** Works on iOS, mobile-friendly

### 4.2 Device Compatibility

**Test: iPhone SE (360px)**
- Emulate with DevTools, or test on actual device
- Verify layout stacks vertically
- Check form fields touch-friendly (min 44px height)
- Navigate through all fields
- **Expected:** Fully functional on small screen

**Test: iPad (768px)**
- Emulate with DevTools, or test on actual device
- Verify 2-column layout applies
- Check landscape orientation works
- Verify portrait orientation also works
- **Expected:** Responsive layout adapts to tablet

**Test: Desktop 1080p (1920x1080)**
- Set viewport to 1920x1080
- Verify content doesn't stretch excessively
- Check max-width constraints (if any)
- Verify sidebar/panels don't cause issues
- **Expected:** Content readable and usable

---

## Section 5: Performance & Load Testing

### 5.1 CSS Performance

**Test: CSS Variables Load Time**
- Monitor network tab in DevTools
- Load crypto/crypto.html
- Verify main.css loads in < 100ms (typical for 974 line file)
- Check no render-blocking resources
- **Expected:** CSS loads quickly, no performance regression

**Test: Gradient Rendering Performance**
- On 360px screen with planner panel open
- Perform 100 advisory generations (automated via script)
- Monitor frame rate in DevTools (should stay near 60fps)
- Check no jank or stuttering
- **Expected:** Smooth performance, no dropped frames

### 5.2 JavaScript Performance

**Test: Planner Panel Rendering**
- Generate advisory
- Monitor DevTools Performance tab
- Verify DOM insertion takes < 50ms
- Check no script errors in console
- Verify memory usage doesn't balloon after 10+ advisories
- **Expected:** Fast panel rendering, no memory leaks

---

## Section 6: Baseline Regression Summary

**Existing Features That Must Continue Working:**

- [ ] Chart.js price chart loads and displays OHLCV data
- [ ] RSI indicator calculates and displays correctly
- [ ] Dark/Light theme toggle works (if implemented)
- [ ] Order form validation works (minimum size, price bounds)
- [ ] Account info retrieves without errors
- [ ] Klines endpoint returns data correctly
- [ ] Cancel order functionality works
- [ ] Settings modal opens/closes
- [ ] No console errors on page load
- [ ] No visual regressions in layout

**New Features That Must Work:**

- [ ] Planner panel renders with confidence badge
- [ ] Risk chips display with proper styling
- [ ] Action buttons generate correct deep-links
- [ ] Venue selector enables DEX field form inputs
- [ ] Provider selector routes to local/sidecar correctly
- [ ] Keyboard navigation includes planner controls
- [ ] Screen reader announces planner content
- [ ] Responsive layout works at 360/768/1024/1440px
- [ ] No mojibake in advisory text

---

## Manual QA Execution Guide

### Step-by-Step Manual Test

1. **Setup:** Open crypto/crypto.html in browser, open DevTools (F12)
2. **Visual Check:**
   - Inspect primary button, verify cyan color (`#00d4ff`)
   - Inspect header fonts, verify Trebuchet MS or similar
   - No purple/pink/bright magenta gradients (old colors should be replaced)
3. **Planner Enable:**
   - Open Settings modal
   - Check "Enable Planner" checkbox
   - Refresh page, verify setting persists
4. **Generate Advisory (Binance):**
   - Keep venue=binance, provider=local
   - Fill form: symbol=BTCUSDT, side=BUY, type=MARKET, size=0.01, marketPrice=50000
   - Click "Generate Advisory"
   - Verify panel appears with confidence badge (green/yellow/red based on confidence)
   - Click "Open Binance" button, verify deep-link correct
5. **Generate Advisory (PancakeSwap):**
   - Change venue=pancakeswap
   - Fill DEX fields: chainId=56, tokenIn=BNB, tokenOut=BUSD, slippageBps=100
   - Click "Generate Advisory"
   - Verify panel shows pancakeswap deep-link
   - Click "Open PancakeSwap" button
6. **Responsive Test:**
   - Resize browser to 360px width
   - Verify planner panel stacks vertically, no horizontal scroll
   - Resize to 768px, verify 2-column layout
   - Resize to 1440px, verify wide layout
7. **Keyboard Navigation:**
   - Press Tab repeatedly through form and planner controls
   - Verify tab order logical
   - Press Enter on buttons, verify they activate
8. **Accessibility (if using screen reader):**
   - Enable screen reader
   - Navigate to confidence badge
   - Verify "confidence 78 percent" announced
   - Navigate to risk chips
   - Verify risks announced
9. **Order Submission (Non-Blocking Check):**
   - Keep planner panel visible
   - Try to submit an order (will fail without real API key, but should reach backend)
   - Verify order attempt isn't blocked by planner presence
10. **Baseline Check:**
    - Disable planner
    - Verify charts still render
    - Verify settings modal still works
    - Verify all tabs still accessible

---

## Test Result Report Template

```
Test Run Date: YYYY-MM-DD
Tester: [Name]
Browser: [Chrome/Firefox/Safari/Edge] [Version]
Device: [Desktop 1920x1080 / iPhone 12 / iPad / etc.]
OS: [Windows 11 / macOS 13 / iOS 16 / Android 13]

VISUAL REGRESSION:
[ ] Primary button cyan color verified
[ ] Typography fonts verified
[ ] Responsive layout verified at 360/768/1024/1440px
[ ] Planner panel styling verified
[ ] Confidence badge color-coding verified
[ ] Risk chips display verified
[ ] No mojibake detected

FUNCTIONALITY:
[ ] Planner enable/disable toggle works
[ ] Venue selection changes form fields
[ ] Advisory generation successful (Binance)
[ ] Advisory generation successful (PancakeSwap)
[ ] Deep-links generated correctly
[ ] Order submission not blocked by planner
[ ] Charts render and update

ACCESSIBILITY:
[ ] Keyboard Tab navigation logical
[ ] Escape key provides escape path
[ ] Focus visible on all interactive elements
[ ] Screen reader announces badge/chips (if tested)
[ ] Color contrast >= 4.5:1 on all text
[ ] Font size readable at 100% zoom

BASELINES:
[ ] All existing crypto features still work
[ ] No console errors
[ ] No visual regressions from baseline

NOTES:
[Any issues found, browser-specific quirks, recommendations]

PASS/FAIL: [ ] PASS  [ ] FAIL (if FAIL, list blockers)
```

---

## Continuous Integration Integration

If automating these tests with Puppeteer/Playwright/Cypress:

```javascript
// Example Puppeteer test pseudo-code
describe('Planner Panel Regression', () => {
  test('Confidence badge color changes with confidence value', async () => {
    await page.goto('crypto/crypto.html');
    await page.click('[data-enable-planner]');
    await page.click('[data-generate-advisory]');
    const badgeColor = await page.evaluate(() => {
      const badge = document.querySelector('.planner-confidence-badge');
      return window.getComputedStyle(badge).backgroundColor;
    });
    expect(badgeColor).toMatch(/(rgb\(0, 212, 255|rgb\(0, 255, 136|rgb\(255, 51, 102)/); // cyan, green, or red
  });

  test('Keyboard Tab navigates through planner controls', async () => {
    await page.goto('crypto/crypto.html');
    await page.keyboard.press('Tab'); // Focus first element
    // Continue tabbing and verify focus changes
    const focusedElement = await page.evaluate(() => document.activeElement.id);
    expect(focusedElement).not.toBe(''); // Some element focused
  });

  test('Responsive layout stacks at 360px', async () => {
    await page.setViewport({ width: 360, height: 667 });
    await page.goto('crypto/crypto.html');
    const gridColumns = await page.evaluate(() => {
      const grid = document.querySelector('.trading-grid');
      return window.getComputedStyle(grid).getPropertyValue('grid-template-columns');
    });
    expect(gridColumns).toMatch(/1fr/); // Single column
  });
});
```

---

## Approval Sign-Off

**Manual QA Complete:** [ ] Yes [ ] No  
**Date:** ___________________  
**Tester Name:** ___________________  
**Tester Signature:** ___________________  

**All Regression Tests Passed:** [ ] Yes [ ] No  
**Blockers Resolved:** [ ] Yes [ ] No / N/A  

**Approved for Merge:** [ ] Yes [ ] No  
**Review Date:** ___________________  
**Reviewer Name:** ___________________  
**Reviewer Signature:** ___________________  

