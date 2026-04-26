// Minimal TypeScript declarations for `firebase/firestore` used in this repo.
// These are intentionally permissive (`any`) so editor type-checking works
// while you rebuild node_modules or install the official SDK types.
declare module 'firebase/firestore' {
  export function addDoc(...args: any[]): any;
  export function collection(...args: any[]): any;
  export function deleteDoc(...args: any[]): any;
  export function doc(...args: any[]): any;
  export function getDoc(...args: any[]): any;
  export function getDocs(...args: any[]): any;
  export function query(...args: any[]): any;
  export const serverTimestamp: any;
  export function setDoc(...args: any[]): any;
  export function where(...args: any[]): any;

  // allow other imports without errors
  const _any: any;
  export default _any;
}
