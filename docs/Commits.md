# Commit Plan

| #  | Owner     | Commit message                                                     | Needs | Status |
|----|-----------|--------------------------------------------------------------------|-------|--------|
| 1  | Sharanyo  | docs: add PRD, architecture, rules, phases, design and commit plan | —     | todo   |
| 2  | Sharanyo  | chore: scaffold monorepo, tooling, docker compose and env example  | 1     | todo   |
| 3  | Teammate  | feat(number-theory): add gcd, extended gcd and modular inverse     | 2     | todo   |
| 4  | Teammate  | feat(number-theory): add totient, fast modular exponentiation and euler/fermat checks | 3     | todo   |
| 5  | Sharanyo  | feat(auth): add prisma schema, seed data, login and role middleware | 2,4   | todo   |
| 6  | Sharanyo  | feat(institutions): add institution and signing key registration   | 5     | todo   |
| 7  | Teammate  | feat(number-theory): add primality tests, toy rsa and lab api endpoints | 4     | todo   |
| 8  | Teammate  | feat(crypto): add sha-256 hashing and rsa-pss signing and verification | 2     | todo   |
| 9  | Sharanyo  | feat(pdf): add certificate template rendering and qr generation    | 5,8   | todo   |
| 10 | Teammate  | feat(ledger): add ledger interface and hash-chained local ledger   | 5,8   | todo   |
| 11 | Sharanyo  | feat(certificates): add certificate issuance with ledger commit    | 6,9,10| todo   |
| 12 | Teammate  | feat(verify): add verification service and revocation              | 10,11 | todo   |
| 13 | Sharanyo  | feat(web): add login, issue, verify, admin, keys, holder, explorer and lab pages | 11,12 | todo   |
| 14 | Teammate  | test: add end-to-end demo scenario and performance measurements    | 13    | todo   |
| 15 | Sharanyo  | docs: add setup guide, security review and final report            | 14    | todo   |

Status values: todo / in review / merged. Update only your own rows.