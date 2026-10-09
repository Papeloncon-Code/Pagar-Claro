---
name: Pagar Claro product constraints
description: User-stated implementation constraints and the currency-unit caveat for the price comparison.
---

Keep Pagar Claro's user-facing app in plain HTML, CSS, and vanilla JavaScript, without UI frameworks or external databases.

**Why:** the user explicitly requested a simple browser app with no frameworks or external databases.

**How to apply:** continue implementing the product in the existing static page and native JavaScript modules; do not introduce React or a database for this app.

The app's implicit rate is expressed in Bs per USD, while the official euro rate is expressed in Bs per EUR. The current requested classification compares the raw numeric values, and the UI labels that as a numeric reference comparison.

**Why:** comparing those values directly is not a currency-equivalent comparison and can otherwise mislead shoppers.

**How to apply:** keep the euro unit visible and disclosed; if changing how euro BCV affects classification, establish a dimensionally valid comparison with the user first.
