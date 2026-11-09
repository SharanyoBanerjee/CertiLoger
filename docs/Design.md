# CertiLedger: Design

## 1. Direction

Calm, official, trustworthy. It should feel like a public-service verification portal, not a crypto dashboard. Light theme, lots of whitespace, one strong accent, status colors that carry meaning.

Principles
1. **The result comes first.** On the verify page, the outcome is the biggest thing on screen.
2. **Show the checks.** Every verification lists each check with pass, fail, or skipped, plus a one-line reason.
3. **Never color alone.** Every status has an icon and a text label.
4. **Technical detail on demand.** Hashes, signatures and tx IDs live in expandable sections.
5. **Always say it's a prototype.** A slim banner on every page.

## 2. Colors

Defined as CSS variables / Tailwind theme tokens.

### Brand and surface

| Token | Hex | Use |
|---|---|---|
| `--navy-900` | `#0B1F3A` | Header, headings, primary buttons |
| `--navy-700` | `#1E3A5F` | Hover states, secondary text on light |
| `--blue-600` | `#1D4ED8` | Links, focus ring, active nav |
| `--bg` | `#F7F8FA` | Page background |
| `--surface` | `#FFFFFF` | Cards, forms |
| `--border` | `#D9DEE7` | Dividers, input borders |
| `--text` | `#111827` | Body text |
| `--text-muted` | `#5B6472` | Secondary text |

### Verification status

| State | Color | Background | Icon |
|---|---|---|---|
| `VALID` | `#15803D` | `#ECFDF3` | check-circle |
| `REVOKED` | `#B91C1C` | `#FEF2F2` | x-circle |
| `DOCUMENT_MISMATCH` | `#B91C1C` | `#FEF2F2` | file-warning |
| `SIGNATURE_INVALID` | `#B91C1C` | `#FEF2F2` | shield-off |
| `ISSUER_UNTRUSTED` | `#C2410C` | `#FFF4ED` | shield-alert |
| `EXPIRED` | `#B45309` | `#FFFBEB` | clock |
| `NOT_FOUND` | `#475569` | `#F1F5F9` | search-x |
| `UNAVAILABLE` | `#475569` | `#F1F5F9` | cloud-off |

`UNAVAILABLE` and `NOT_FOUND` are grey on purpose. They aren't "valid" or "bad", they're "can't conclude".

Check all text/background pairs for WCAG AA (4.5:1 for body text, 3:1 for large text and UI components).

## 3. Typography

| Role | Font | Fallback |
|---|---|---|
| UI and body | Inter | system-ui, sans-serif |
| Hashes, IDs, signatures, code | JetBrains Mono | ui-monospace, monospace |
| Certificate PDF headings | Source Serif 4 | Georgia, serif |

Scale (rem, 16px base)

| Token | Size | Weight | Use |
|---|---|---|---|
| `display` | 2.25 | 700 | Landing headline |
| `h1` | 1.75 | 700 | Page title |
| `h2` | 1.375 | 600 | Section title |
| `h3` | 1.125 | 600 | Card title |
| `body` | 1 | 400 | Default |
| `small` | 0.875 | 400 | Labels, hints |
| `mono` | 0.875 | 400 | Hashes and IDs |

Line height 1.5 for body, 1.25 for headings. Max line width ~70 characters for prose.

Long hashes: show first 8 + last 8 characters (`8a3f21c0…d91c77e2`) with a copy button and a "show full" toggle.

## 4. Layout and spacing

- 4px base unit. Spacing scale: 4, 8, 12, 16, 24, 32, 48.
- Content max width 1120px, centered. Verify page narrower (720px) for focus.
- Cards: white, 1px `--border`, radius 8px, light shadow (`0 1px 2px rgba(0,0,0,.05)`).
- Inputs: 40px height, radius 6px, 2px blue focus ring with 2px offset.
- Buttons: primary (navy fill), secondary (outlined), danger (red, only for revoke). 40px height, radius 6px.
- Desktop first, but every page works down to 360px wide.

## 5. Key components

### Verification result card

```text
┌──────────────────────────────────────────────┐
│ [icon]  VALID                                │
│         The document matches the registered  │
│         certificate and is currently valid.  │
├──────────────────────────────────────────────┤
│ ✓ Certificate found on ledger                │
│ ✓ Issuer and signing key trusted             │
│ ✓ Document hash matches                      │
│ ✓ Digital signature valid                    │
│ ✓ Not revoked                                │
│ ✓ Not expired                                │
├──────────────────────────────────────────────┤
│ ▸ Technical details (hash, key ID, tx ID)    │
└──────────────────────────────────────────────┘
```

On failure, the failing check shows the reason. Checks after the failure show "Not checked". When no file was uploaded, file-based checks show "Not checked: upload the PDF to verify".

### Status badge

Pill, 24px tall, status color on status background, icon + label. Used in tables and headers.

### Lifecycle timeline

Vertical list, newest first: event type, actor, time, tx ID (mono, copyable). Used on certificate detail and ledger explorer.

### Upload dropzone

Dashed border, accepts PDF only, shows file name and size, keyboard accessible (button inside, not just drag target).

### Tables

Sticky header, zebra off (use row borders), status badge column, row actions in a menu. Search + status filter above.

### Prototype banner

Slim bar under the header, `#FEF3C7` background, text: "Academic prototype. Fictional institutions and data. Not a legal verification service."

## 6. Pages

| Page | Notes |
|---|---|
| Landing + public verify | Big upload/ID box, three-step "how it works", prototype banner |
| Login | Centered card, role-aware redirect |
| Network admin | Institutions table, enable/disable, network audit summary |
| Institution dashboard | Totals: issued, valid, expired, revoked. Recent activity |
| Issue certificate | Form with live field validation, template picker, review step |
| Issued certificates | Search/filter table, status badges, row menu (view, download, revoke) |
| Certificate detail | Metadata, status, timeline, QR, download, share link |
| Holder portal | List of own certificates, download, copy verify link |
| Revocation | Reason code dropdown, confirm dialog stating revoke is permanent |
| Key management | Keys table with status, register, retire, mark compromised (confirm dialog) |
| Ledger explorer | Entries / transactions, "Verify chain" button, result banner |
| Number Theory Lab | Tabs per algorithm, input fields, step-by-step output table |
| Audit logs | Filterable table |

## 7. Number Theory Lab look

Treat it like a worksheet. Inputs at the top, then numbered steps in a table:

- **GCD:** each row `a = b·q + r`
- **Extended GCD:** rows with `x`, `y` columns, final line `a·x + b·y = gcd`
- **Mod exponentiation:** table of `bit | base | result`
- **Toy RSA:** key table, sign and verify blocks, with a red warning box: "Textbook RSA. Educational only. The real system uses RSA-PSS."

Use mono font for numbers, right-aligned in columns. Small "Why this works" accordion under each tool linking to `docs/number-theory/`.

## 8. Certificate PDF

A4 portrait, 20mm margins, plain and printable (no heavy backgrounds).

```text
┌──────────────────────────────────────────┐
│            [Institution name]            │   Source Serif 4, 22pt, navy
│                                          │
│          CERTIFICATE OF [TYPE]           │   small caps, letter-spaced
│                                          │
│       This is to certify that            │
│            HOLDER NAME                   │   Source Serif 4, 26pt
│   has completed [qualification]          │
│        Grade: [grade] · [date]           │
│                                          │
│  Certificate ID: CERT-7F92A1             │   mono 9pt
│  ┌────┐   Verify at                      │
│  │ QR │   {BASE_URL}/verify/CERT-7F92A1  │
│  └────┘                                  │
│  Academic prototype. Fictional data.     │   8pt, muted
└──────────────────────────────────────────┘
```

The PDF is final once the ID and QR are placed. Nothing gets added after hashing.

## 8. Accessibility checklist

- Labels on every input, errors linked with `aria-describedby`
- Visible focus on every interactive element
- Full keyboard path for issue, verify, revoke
- Status conveyed by icon + text + color
- Contrast AA minimum
- `aria-live="polite"` on the verification result region
- Respect `prefers-reduced-motion` (no required animation)
- Dialogs trap focus and close with Escape

## 9. Microcopy

| Situation | Text |
|---|---|
| VALID | "This document matches the registered certificate and is currently valid." |
| NOT_FOUND | "No matching certificate was found." |
| DOCUMENT_MISMATCH | "The uploaded file doesn't match the issued document." |
| SIGNATURE_INVALID | "The digital signature couldn't be verified." |
| ISSUER_UNTRUSTED | "The issuing institution or signing key isn't trusted." |
| REVOKED | "This certificate has been revoked." |
| EXPIRED | "This certificate has expired." |
| UNAVAILABLE | "Verification is temporarily unavailable. No conclusion can be drawn about this certificate." |
| Issue pending | "Recording on the ledger. This can take a few seconds." |
| Issue failed | "Couldn't record this certificate. Nothing was issued." |
| Revoke confirm | "Revoking is permanent and will be recorded in the certificate's history." |

Tone: plain, short, no jargon. Don't say "tampered" unless the evidence is a hash or signature failure, and even then prefer "doesn't match".
