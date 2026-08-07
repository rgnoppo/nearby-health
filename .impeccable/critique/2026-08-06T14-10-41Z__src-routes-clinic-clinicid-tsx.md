---
target: clinic page
total_score: 33
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-08-06T14-10-41Z
slug: src-routes-clinic-clinicid-tsx
---
#### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Excellent use of structural skeleton loader |
| 2 | Match System / Real World | 4 | Localized Arabic terminology and standard icons |
| 3 | User Control and Freedom | 4 | Sticky back button provides immediate "emergency exit" |
| 4 | Consistency and Standards | 3 | Standardized card layouts |
| 5 | Error Prevention | 3 | Disabled WhatsApp button prevents invalid clicks |
| 6 | Recognition Rather Than Recall | 3 | Sticky header persistently reminds user of context |
| 7 | Flexibility and Efficiency | 3 | Direct deep links to native dialer and WhatsApp |
| 8 | Aesthetic and Minimalist Design | 4 | Clean, card-based interface with no extraneous visual noise |
| 9 | Error Recovery | 3 | Custom 404 state provides clear reasoning and recovery path |
| 10 | Help and Documentation | 2 | No explicit help, though interface is largely self-explanatory |
| **Total** | | **33/40** | **Good** |

#### Design Specificity Verdict

**LLM assessment**: The design delivers a highly focused, mobile-optimized, and culturally attuned experience for Arabic speakers. It excels in mobile ergonomics with thumb-friendly action buttons, a sticky header for easy navigation, and clear typographic hierarchy, making clinic details instantly scannable. It feels specifically authored for this product's regional use case.

**Deterministic scan**: 0 findings. No automated issues were detected in the source markup.

**Visual overlays**: No reliable user-visible overlay is available (browser injection unsupported in this environment).

#### Overall Impression
What works best is the exceptional mobile ergonomics and robust handling of loading/error states. The single biggest opportunity is to fix the missing interactive map integration and ensure accessibility compliance on disabled states.

#### What's Working
1. **Exceptional Mobile Ergonomics:** The sticky back navigation and large action buttons at the bottom are perfectly designed for one-handed mobile use.
2. **Robust State Management:** Flawless handling of loading, 404, and partial data states (e.g. conditionally rendering the WhatsApp button).
3. **Smart Typography & RTL Handling:** The custom `Row` component cleverly uses an `ltr` prop to ensure phone numbers render correctly in a right-to-left layout without breaking alignment.

#### Priority Issues
- **[P1] Missing Accessibility on Disabled State**
  - **Why it matters**: Screen readers won't properly convey its purpose or state to accessibility-dependent users.
  - **Fix**: Add `role="button"` and `aria-disabled="true"` to the `btn-whatsapp-disabled` div.
  - **Suggested command**: `/impeccable harden`

- **[P2] Non-Interactive Address**
  - **Why it matters**: Mobile users naturally expect tapping the address or MapPin icon to open Google Maps or Apple Maps.
  - **Fix**: Wrap the address text/icon in an anchor tag linked to a map search.
  - **Suggested command**: `/impeccable polish`

- **[P2] Potential Layout Shift**
  - **Why it matters**: The `categoryName` badge relies on a separate `categories` query. It might pop in after the main content renders, causing a slight layout shift.
  - **Fix**: Integrate the categories query into the skeleton loading state or ensure it is pre-fetched.
  - **Suggested command**: `/impeccable optimize`

#### Persona Red Flags
- **Sam (Accessibility-Dependent User)**: The missing ARIA labels on the disabled WhatsApp button will cause confusion when navigating via screen reader.
- **Casey (Distracted Mobile User)**: Will likely try to tap the physical address and get frustrated when it doesn't open the maps app to navigate directly.

#### Minor Observations
- The tactile feedback added to the back button (`active:scale-95`) is a great touch for mobile responsiveness.
- The phone number regex `.replace(/\s/g, "")` is functional but might fail if numbers are entered with unexpected characters like hyphens or parentheses.
- The "Suggest a Clinic" CTA is beautifully integrated using dashed borders, visually separating it from the core clinic data.

#### Questions to Consider
- What happens if a clinic has multiple phone numbers or both a primary and emergency contact? 
- Could the header dynamically shrink on scroll to maximize reading space on smaller devices?
