// Number theory package - algorithms will be added in commits 3, 4, 7
// Pure TypeScript, no dependencies. Educational use only.

export { gcd, type GcdResult, type GcdStep } from './gcd.js';
export { extendedGcd, type ExtendedGcdResult } from './extendedGcd.js';
export { modInverse } from './modInverse.js';
export { totient, totientPrimeProduct, type TotientResult } from './totient.js';
export { modExp, type ModExpResult, type ModExpStep } from './modExp.js';
export {
  checkEulerTheorem,
  checkFermatLittle,
  checkEulerForRSA,
  type TheoremCheckResult,
} from './theoremCheck.js';
export { isPrimeTrial, type PrimeTrialResult } from './isPrimeTrial.js';
export { millerRabin, type MillerRabinResult, type MillerRabinStep } from './millerRabin.js';
export {
  toyRsaGenerate,
  toyRsaSign,
  toyRsaVerify,
  type ToyRsaKeys,
  type ToyRsaResult,
} from './toyRsa.js';
