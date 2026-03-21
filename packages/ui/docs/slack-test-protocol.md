# Slack Test Protocol — Visual Validation Gate

## Purpose

Manual validation gate to verify that FrontShell's design system produces production-quality UI that is indistinguishable from established products. Run once before the first module ships.

## When to Run

- Feature-complete for MVP (after all Epic 3 stories are done)
- NOT automatable — one-time manual gate

## Procedure

1. Take TWO screenshots of the same page layout (e.g., a tenant list with table, filters, and actions):
   - **(A)** Default MUI or Ant Design scaffold rendering the same data
   - **(B)** FrontShell scaffold rendering the same data

2. Post both screenshots to a Slack channel with 5 engineers, with no context:
   > "Which of these two screenshots looks like the real product?"

3. Do NOT label which is FrontShell — let engineers judge independently.

## Pass Criteria

### Test 1: Product Identity
- **Pass:** 3+ out of 5 engineers identify FrontShell (screenshot B) as "the real product" or ask "what tool is B?"
- **Fail:** Majority identifies the MUI/Ant Design scaffold as the real product

### Test 2: Bundled Glance Test
- Post screenshot B again with the question: "What's the primary action on this screenshot?"
- **Pass:** 4 out of 5 engineers answer correctly within 3 seconds
- **Fail:** Engineers cannot identify the primary action quickly

## Recording Results

Document results in the Epic 3 retrospective:
- Number of engineers who identified FrontShell
- Verbatim feedback quotes
- Any usability concerns raised
- Pass/fail determination
